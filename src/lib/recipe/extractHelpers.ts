import { GoogleGenAI } from '@google/genai';
import prisma from '@/lib/prisma';
import { SYSTEM_PROMPT, GEMINI_SCHEMA, GEMINI_MODEL } from '@/lib/recipe/extractPrompts';
import { SSEWriter } from '@/lib/recipe/sse';

// ── 유틸: Exponential Backoff 재시도 ──────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, retries = 3, label = 'API'): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      console.warn(`${label} 실패 (${attempt}/${retries}회), ${delay}ms 후 재시도...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error(`${label}: 최대 재시도 횟수 초과`);
}

// ── Gemini 호출 ────────────────────────────────────────────────────────────────
async function callGemini(
  contents: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [...contents, '위 컨텐츠를 바탕으로 요리 레시피를 정리해서 JSON으로 추출해줘.'],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCHEMA,
      temperature: 0.1,
    },
  });
  if (!response.text) throw new Error('Gemini API did not return any content.');
  return response.text;
}

// ── difficulty 정규화 (AI가 한국어로 반환할 경우 English enum으로 변환) ────────────
type AllowedDifficulty = 'Easy' | 'Medium' | 'Hard';
function normalizeDifficulty(raw: string | undefined | null): AllowedDifficulty | null {
  if (!raw) return null;
  const map: Record<string, AllowedDifficulty> = {
    easy: 'Easy',
    쉬움: 'Easy',
    초급: 'Easy',
    하: 'Easy',
    medium: 'Medium',
    보통: 'Medium',
    중급: 'Medium',
    중: 'Medium',
    hard: 'Hard',
    어려움: 'Hard',
    상급: 'Hard',
    상: 'Hard',
  };
  const normalized = map[raw.toLowerCase().trim()];
  return normalized ?? null; // 매핑 불가 시 null → DB에 저장 안 함
}

// ── amount 정규화 (AI가 문자열로 반환할 경우 안전하게 숫자로 변환) ────────────
function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  if (typeof raw === 'string') {
    // 연속된 숫자 범위(예: "0.5~0.6") → 두 수의 평균
    const rangeMatch = raw.match(/([\d.]+)\s*[~\-\u2013]\s*([\d.]+)/);
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1]);
      const b = parseFloat(rangeMatch[2]);
      return isNaN(a) || isNaN(b) ? null : parseFloat(((a + b) / 2).toFixed(2));
    }
    // 숫자로 시작하는 문자열(예: "1공기") → 앞 숫자만 추출
    const numMatch = raw.match(/^[\d.]+/);
    if (numMatch) return parseFloat(numMatch[0]);
  }
  return null; // "넓널하게" 같은 텍스트 → null
}

// ── 추출 로직 메인 함수 ────────────────────────────────────────────────────────
export async function processExtraction(
  recipeId: number,
  contentsToAnalyze: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
  fallbackTitle: string,
  sse: SSEWriter,
  signal?: AbortSignal,
) {
  let llmContent: string | null = null;

  const checkAborted = async () => {
    if (signal?.aborted) {
      console.log(`[Recipe ${recipeId}] Cleaning up aborted extraction...`);
      try {
        await prisma.recipes.delete({ where: { recipe_id: recipeId } });
        console.log(`[Recipe ${recipeId}] Deleted pending recipe after abort.`);
      } catch (e) {
        console.error(`[Recipe ${recipeId}] Cleanup failed:`, e);
      }
      throw new Error('Aborted');
    }
  };

  try {
    await checkAborted();

    // 1. AI 호출 (Gemini 단일 경로)
    sse.write({ step: 2, total: 4, message: 'AI 셰프가 요리 과정을 분석 중입니다 👨‍🍳' });
    console.log(`[Recipe ${recipeId}] Gemini(${GEMINI_MODEL}) 호출 시작...`);
    llmContent = await withRetry(() => callGemini(contentsToAnalyze), 3, 'Gemini');
    console.log(`[Recipe ${recipeId}] Gemini 성공`);

    await checkAborted();

    // 2. 결과 파싱
    sse.write({ step: 3, total: 4, message: '재료와 순서를 깔끔하게 구조화하고 있어요 ✨' });
    const recipeData = JSON.parse(llmContent!);
    console.log(`[Recipe ${recipeId}] JSON 파싱 완료 (모델: ${GEMINI_MODEL})`);

    await checkAborted();

    // 3. DB 저장 (Transaction)
    // DB 저장과 SSE 완료 이벤트 양쪽에서 동일한 title을 보장하기 위해 한 번만 계산
    const finalTitle =
      recipeData.title && recipeData.title.trim() !== ''
        ? recipeData.title
        : fallbackTitle || '이름 모를 레시피';

    await prisma.$transaction(async (tx) => {
      if (signal?.aborted) throw new Error('Aborted');

      await tx.recipes.update({
        where: { recipe_id: recipeId },
        data: {
          title: finalTitle,
          difficulty: normalizeDifficulty(recipeData.difficulty),
          servings: recipeData.servings,
          status: 'COMPLETED',
        },
      });

      if (recipeData.ingredients?.length > 0) {
        await tx.recipe_ingredients.createMany({
          data: recipeData.ingredients.map(
            (ing: { name: string; amount?: unknown; unit?: string }) => ({
              recipe_id: recipeId,
              name: ing.name,
              amount: normalizeAmount(ing.amount),
              unit: ing.unit || null,
            }),
          ),
        });
      }

      if (recipeData.steps?.length > 0) {
        await tx.recipe_steps.createMany({
          data: recipeData.steps.map(
            (step: {
              step_order: number;
              instruction: string;
              timer_seconds?: number;
              step_ingredients?: Array<{ name: string; amount?: unknown; unit?: string }>;
            }) => ({
              recipe_id: recipeId,
              step_order: step.step_order,
              instruction: step.instruction,
              timer_seconds: step.timer_seconds || 0,
              step_ingredients: step.step_ingredients
                ? step.step_ingredients.map((ing) => ({
                    name: ing.name,
                    amount: normalizeAmount(ing.amount),
                    unit: ing.unit || null,
                  }))
                : [],
            }),
          ),
        });
      }
    });

    console.log(`[Recipe ${recipeId}] DB 저장 완료 ✅`);
    sse.write({
      step: 4,
      total: 4,
      message: '완료!',
      recipeId: recipeId,
      title: finalTitle, // DB와 동일한 값 사용
    });
    sse.close();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Aborted') {
      return; // 이미 처리됨
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}
