import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/recipes/extract:
 *   post:
 *     summary: URL에서 레시피 정보 추출 (Gemini 사용)
 *     description: 유튜브 영상이나 블로그 글의 URL을 입력받아 AI를 통해 요리 레시피 제목, 재료, 조리 순서를 JSON 형태로 추출합니다.
 *     tags: [Recipes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: 추출할 레시피가 있는 웹페이지 또는 유튜브 URL
 *                 example: "https://www.youtube.com/watch?v=kYJBy0t-59Y"
 *     responses:
 *       200:
 *         description: 레시피 추출 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       description: 레시피 제목
 *                       example: "초간단 김치찌개 레시피"
 *                     source_url:
 *                       type: string
 *                       description: 원본 URL
 *                     thumbnail_url:
 *                       type: string
 *                       description: 썸네일 이미지 URL (가능한 경우 추출)
 *                       nullable: true
 *                     difficulty:
 *                       type: string
 *                       description: 요리 난이도 (Easy, Medium, Hard 중 하나)
 *                       example: "Easy"
 *                     servings:
 *                       type: integer
 *                       description: 기준 인원 수 (기본 1)
 *                       example: 2
 *                     ingredients:
 *                       type: array
 *                       description: 재료 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "김치"
 *                           amount:
 *                             type: number
 *                             example: 200
 *                           unit:
 *                             type: string
 *                             example: "g"
 *                     steps:
 *                       type: array
 *                       description: 조리 순서 목록
 *                       items:
 *                         type: object
 *                         properties:
 *                           step_order:
 *                             type: integer
 *                             example: 1
 *                           instruction:
 *                             type: string
 *                             example: "김치를 먹기 좋은 크기로 썹니다."
 *                           timer_seconds:
 *                             type: integer
 *                             description: 해당 스텝에서 대기(조리)해야 하는 시간(초 단위). 0이면 타이머 없음.
 *                             example: 0
 *       400:
 *         description: 잘못된 요청 (URL 누락 또는 유효하지 않은 URL)
 *       500:
 *         description: 서버 내부 오류 (스크래핑 실패 또는 LLM 오류)
 */
export async function POST(req: Request) {
  try {
    let { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL을 제공해야 합니다.' },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: '서버 환경변수에 GEMINI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 },
      );
    }

    const contentsToAnalyze: Array<string | { fileData: { fileUri: string; mimeType: string } }> =
      [];
    let thumbnailUrl: string | null = null;
    let fallbackTitle = '';

    // 1. YouTube 영상 vs 일반 웹페이지 분기
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      console.log('Gemini: YouTube URL 감지');

      // 구글 문서 가이드에 따라 YouTube URL을 직접 파트로 구성
      contentsToAnalyze.push({
        fileData: {
          fileUri: url,
          mimeType: 'video/mp4',
        },
      });

      // 썸네일 추출
      const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
      }
    } else {
      // 네이버 블로그는 모바일 버전으로 변환 (JS 렌더링 없이 본문 추출 가능)
      if (url.includes('blog.naver.com') && !url.includes('m.blog.naver.com')) {
        url = url.replace('blog.naver.com', 'm.blog.naver.com');
        console.log('네이버 블로그 감지 → 모바일 버전으로 변환:', url);
      }

      // 일반 블로그/웹페이지의 경우 텍스트를 스크래핑하여 넘김
      console.log('일반 웹페이지 감지, 크롤링 시작');
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = load(html);

        // 네이버 블로그 전용 셀렉터 우선, 그 외 일반 셀렉터 순으로 시도
        let extractedText = '';
        const selectors = [
          '.se-main-container', // 네이버 블로그 스마트에디터
          '.post-view', // 네이버 블로그 구버전
          '#postViewArea', // 네이버 블로그 아주 구버전
          'article',
          'main',
          '.post-content',
          '.entry-content',
          'body',
        ];

        for (const selector of selectors) {
          const text = $(selector).text().replace(/\s+/g, ' ').trim();
          if (text.length > 100) {
            extractedText = text;
            console.log(`크롤링 성공 (셀렉터: "${selector}", 길이: ${text.length}자)`);
            break;
          }
        }

        if (extractedText.length > 30000) {
          extractedText = extractedText.substring(0, 30000);
        }

        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json(
            { success: false, error: '추출된 텍스트가 부족하여 분석할 수 없습니다.' },
            { status: 400 },
          );
        }

        fallbackTitle = $('title').text() || $('h1').first().text() || '';
        thumbnailUrl = $('meta[property="og:image"]').attr('content') || null;

        contentsToAnalyze.push(
          `다음 텍스트에서 레시피 정보를 추출해서 제공해줘:\n\n${extractedText}`,
        );
      } catch (err: unknown) {
        console.error('웹페이지 스크래핑 실패:', err);
        return NextResponse.json(
          { success: false, error: '해당 웹페이지에서 내용을 추출할 수 없습니다.' },
          { status: 400 },
        );
      }
    }

    // 2. 초기 PENDING 레시피 생성 및 응답 (즉시 응답)
    const newRecipe = await prisma.recipes.create({
      data: {
        title: fallbackTitle || '이름 모를 레시피',
        source_url: url,
        status: 'PENDING',
        thumbnail_url: thumbnailUrl,
      },
    });

    // 3. 백그라운드 추출 프로세스 실행 트리거 (await 하지 않음)
    processExtraction(newRecipe.recipe_id, contentsToAnalyze, fallbackTitle).catch((err) => {
      console.error('Background execution failed implicitly:', err);
    });

    // 4. 즉각적인 응답 반환
    return NextResponse.json({ success: true, recipeId: newRecipe.recipe_id }, { status: 202 });
  } catch (error: unknown) {
    console.error('API Error (/api/recipes/extract):', error);
    const errorMessage =
      error instanceof Error ? error.message : '레시피 추출 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

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

// ── 공통 프롬프트 ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "너는 최고의 요리 전문가이자 레시피 구조화 AI야. 주어진 동영상이나 텍스트를 보고 오직 '요리 레시피'와 관련된 필수 정보(제목, 난이도, 몇인분, 재료, 스텝)만 정확하게 추출해야 해. 영상에 자막이나 설명이 부족하면 화면의 시각 정보를 종합하여 최대한 논리적인 레시피를 만들어내라. 결과는 반드시 정해진 JSON 스키마에 맞추어서 반환해라. **중요: 재료의 계량(숫자, 단위)은 영상의 음성이나 자막에서 언급된 텍스트를 100% 최우선으로 따르며, 임의로 수치를 추정하거나 변경하지 마라.**";

// ── 공통 JSON 스키마(Gemini용) ────────────────────────────────────────────────
const GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: '요리 또는 레시피의 제목. 명확하지 않으면 적절히 생성.',
    },
    difficulty: { type: Type.STRING, description: '요리 난이도 (Easy, Medium, Hard 중 하나)' },
    servings: { type: Type.INTEGER, description: '레시피 기준 인원 수' },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '재료 이름' },
          amount: { type: Type.NUMBER, description: '재료 양 (숫자. 없으면 생략)', nullable: true },
          unit: { type: Type.STRING, description: '재료 단위', nullable: true },
        },
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_order: { type: Type.INTEGER, description: '조리 순서 (1, 2, 3...)' },
          instruction: { type: Type.STRING, description: '조리 지시사항' },
          timer_seconds: {
            type: Type.INTEGER,
            description: '대기 시간이 필요한 경우 초 단위 분량 (보통 0)',
          },
        },
      },
    },
  },
  required: ['title', 'difficulty', 'servings', 'ingredients', 'steps'],
};

// ── Gemini 호출 ────────────────────────────────────────────────────────────────
async function callGemini(
  contents: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

// ── OpenAI Fallback 호출 ───────────────────────────────────────────────────────
async function callOpenAI(
  contents: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
): Promise<string> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // OpenAI는 YouTube 영상 직접 분석 불가 → 텍스트만 추출
  const textContent = contents.filter((c): c is string => typeof c === 'string').join('\n\n');

  const isYouTube = contents.some(
    (c) => typeof c === 'object' && c.fileData?.mimeType === 'video/mp4',
  );

  if (isYouTube) {
    throw new Error(
      '유튜브 영상은 현재 백업 AI(OpenAI)로 분석할 수 없습니다. 잠시 후 다시 시도해주세요.',
    );
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n반드시 JSON으로만 응답해.' },
      {
        role: 'user',
        content: `다음 텍스트에서 레시피 정보를 추출해줘. difficulty는 반드시 "Easy", "Medium", "Hard" 셋 중 하나의 영어로만 반환해. 형식: {"title":..., "difficulty":"Easy|Medium|Hard", "servings":..., "ingredients":[{"name":..., "amount":..., "unit":...}], "steps":[{"step_order":..., "instruction":..., "timer_seconds":...}]}\n\n${textContent}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI API did not return any content.');
  return content;
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
async function processExtraction(
  recipeId: number,
  contentsToAnalyze: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
  fallbackTitle: string,
) {
  let llmContent: string;
  let usedModel = 'Gemini';

  try {
    // 1차: Gemini (최대 3회 재시도)
    console.log(`[Recipe ${recipeId}] Gemini 호출 시작...`);
    llmContent = await withRetry(() => callGemini(contentsToAnalyze), 3, 'Gemini');
    console.log(`[Recipe ${recipeId}] Gemini 성공`);
  } catch {
    console.warn(`[Recipe ${recipeId}] Gemini 3회 모두 실패. OpenAI(gpt-4o-mini)로 전환...`);
    usedModel = 'OpenAI';
    try {
      // 2차: OpenAI fallback (최대 2회 재시도)
      llmContent = await withRetry(() => callOpenAI(contentsToAnalyze), 2, 'OpenAI');
      console.log(`[Recipe ${recipeId}] OpenAI 성공`);
    } catch (openaiErr: unknown) {
      // 두 모델 모두 실패
      const msg =
        openaiErr instanceof Error ? openaiErr.message : '모든 AI 모델 호출에 실패했습니다.';
      throw new Error(msg);
    }
  }

  try {
    const recipeData = JSON.parse(llmContent!);
    console.log(`[Recipe ${recipeId}] JSON 파싱 완료 (모델: ${usedModel})`);

    // DB 저장 (Transaction)
    await prisma.$transaction(async (tx) => {
      await tx.recipes.update({
        where: { recipe_id: recipeId },
        data: {
          title:
            recipeData.title && recipeData.title.trim() !== ''
              ? recipeData.title
              : fallbackTitle || '이름 모를 레시피',
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
            (step: { step_order: number; instruction: string; timer_seconds?: number }) => ({
              recipe_id: recipeId,
              step_order: step.step_order,
              instruction: step.instruction,
              timer_seconds: step.timer_seconds || 0,
            }),
          ),
        });
      }
    });

    console.log(`[Recipe ${recipeId}] DB 저장 완료 ✅`);
  } catch (parseErr: unknown) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`JSON 파싱 또는 DB 저장 실패: ${msg}`);
  }
}
