import { GoogleGenAI } from '@google/genai';
import { load } from 'cheerio';
import prisma from '@/lib/prisma';
import { SYSTEM_PROMPT, GEMINI_SCHEMA } from '@/lib/recipe/extractPrompts';
import { SSEWriter } from '@/lib/recipe/sse';
import { validateSafeUrl, fetchWithSsrfProtection } from '@/lib/security';

interface ExtractionIngredient {
  name: string;
  amount: number | string;
  unit?: string;
}

interface ExtractionStep {
  step_order: number;
  instruction: string;
  timer_seconds?: number;
  step_image_url?: string | null;
  step_ingredients?: ExtractionIngredient[];
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite-preview';

// ── 유틸: Exponential Backoff 재시도 ──────────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  label = 'API',
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new Error('Aborted');
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = process.env.NODE_ENV === 'test' ? 0 : 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      console.warn(`${label} 실패 (${attempt}/${retries}회), ${delay}ms 후 재시도...`);

      await new Promise<void>((res, rej) => {
        const t = setTimeout(res, delay);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(t);
            rej(new Error('Aborted'));
          },
          { once: true },
        );
      });
    }
  }
  throw new Error(`${label}: 최대 재시도 횟수 초과`);
}

// ── Gemini 호출 ────────────────────────────────────────────────────────────────
async function callGemini(
  contents: Array<string | { fileData: { fileUri: string; mimeType: string } }>,
  signal?: AbortSignal,
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
      abortSignal: signal,
    },
  });
  if (!response.text) throw new Error('Gemini API did not return any content.');
  return response.text;
}

// ── difficulty 정규화 ──────────────────────────────────────────────────────────
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
  return normalized ?? null;
}

// ── amount 정규화 ──────────────────────────────────────────────────────────────
function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  if (typeof raw === 'string') {
    const rangeMatch = raw.match(/([\d.]+)\s*[~\-\u2013]\s*([\d.]+)/);
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1]);
      const b = parseFloat(rangeMatch[2]);
      return isNaN(a) || isNaN(b) ? null : parseFloat(((a + b) / 2).toFixed(2));
    }
    const numMatch = raw.match(/^[\d.]+/);
    if (numMatch) return parseFloat(numMatch[0]);
  }
  return null;
}

// ── 레시피 추출 프로세스 ───────────────────────────────────────────────────────
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
      } catch (e) {
        console.error(`[Recipe ${recipeId}] Cleanup failed:`, e);
      }
      throw new Error('Aborted');
    }
  };

  try {
    await checkAborted();
    sse.write({ step: 2, total: 4, message: 'AI 셰프가 요리 과정을 분석 중입니다 👨‍🍳' });
    llmContent = await withRetry(() => callGemini(contentsToAnalyze, signal), 3, 'Gemini', signal);

    await checkAborted();
    sse.write({ step: 3, total: 4, message: '재료와 순서를 깔끔하게 구조화하고 있어요 ✨' });
    const recipeData = JSON.parse(llmContent!);

    await checkAborted();
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
          data: (recipeData.ingredients as ExtractionIngredient[]).map((ing) => ({
            recipe_id: recipeId,
            name: ing.name,
            amount: normalizeAmount(ing.amount),
            unit: ing.unit || null,
          })),
        });
      }

      if (recipeData.steps?.length > 0) {
        await tx.recipe_steps.createMany({
          data: (recipeData.steps as ExtractionStep[]).map((step) => ({
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
          })),
        });
      }
    });

    sse.write({
      step: 4,
      total: 4,
      message: '완료!',
      recipeId: recipeId,
      title: finalTitle,
    });
    sse.close();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Aborted') return;
    throw err;
  }
}

// ── 레시피 목록 조회 (통계 포함) ────────────────────────────────────────────────
export async function getRecipesByUser(userId: number) {
  const [recipes, allLogs] = await Promise.all([
    prisma.recipes.findMany({
      where: { user_id: userId, status: 'COMPLETED' },
      select: {
        recipe_id: true,
        title: true,
        thumbnail_url: true,
        difficulty: true,
        servings: true,
        created_at: true,
        cooking_logs: {
          orderBy: { cooked_at: 'desc' },
          take: 1,
          select: {
            log_id: true,
            status: true,
            lesson_note: true,
            cooked_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.cooking_logs.findMany({
      where: { user_id: userId },
      select: { status: true },
    }),
  ]);

  const totalCount = allLogs.length;
  const successCount = allLogs.filter((l) => l.status === 'SUCCESS').length;
  const overallSuccessRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : null;

  return {
    stats: {
      total_cooking_count: totalCount,
      overall_success_rate: overallSuccessRate,
    },
    data: recipes.map((r) => ({
      recipe_id: r.recipe_id,
      title: r.title,
      thumbnail_url: r.thumbnail_url,
      difficulty: r.difficulty,
      servings: r.servings,
      created_at: r.created_at,
      latest_log: r.cooking_logs[0] ?? null,
    })),
  };
}

// ── 레시피 상세 조회 (배율 계산 포함) ───────────────────────────────────────────
export async function getRecipeDetail(
  recipeId: number,
  userId: number,
  requestedServings?: number,
) {
  const recipe = await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    select: {
      recipe_id: true,
      user_id: true,
      title: true,
      source_url: true,
      thumbnail_url: true,
      difficulty: true,
      servings: true,
      status: true,
      errorReason: true,
      created_at: true,
      recipe_ingredients: {
        select: { ri_id: true, name: true, amount: true, unit: true },
        orderBy: { ri_id: 'asc' },
      },
      recipe_steps: {
        select: {
          step_id: true,
          step_order: true,
          instruction: true,
          step_image_url: true,
          timer_seconds: true,
          step_ingredients: true,
        },
        orderBy: { step_order: 'asc' },
      },
      cooking_logs: {
        where: { user_id: userId },
        orderBy: { cooked_at: 'desc' },
        take: 1,
        select: { log_id: true, status: true, lesson_note: true, companion: true, cooked_at: true },
      },
    },
  });

  if (!recipe) return null;

  const baseServings = recipe.servings ?? 1;
  const targetServings =
    requestedServings && requestedServings > 0 ? requestedServings : baseServings;
  const ratio = targetServings / baseServings;

  const ingredients = recipe.recipe_ingredients.map((ing) => ({
    ri_id: ing.ri_id,
    name: ing.name,
    amount: ing.amount !== null ? parseFloat((Number(ing.amount) * ratio).toFixed(2)) : null,
    unit: ing.unit,
  }));

  return {
    recipe_id: recipe.recipe_id,
    user_id: recipe.user_id,
    title: recipe.title,
    source_url: recipe.source_url,
    thumbnail_url: recipe.thumbnail_url,
    difficulty: recipe.difficulty,
    base_servings: baseServings,
    requested_servings: targetServings,
    status: recipe.status,
    errorReason: recipe.errorReason,
    created_at: recipe.created_at,
    latest_log: recipe.cooking_logs[0] ?? null,
    ingredients,
    steps: recipe.recipe_steps,
  };
}

export interface UpsertRecipeBody {
  recipe_id?: number;
  title: string;
  servings?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
  ingredients: ExtractionIngredient[];
  steps: ExtractionStep[];
}

// ── 레시피 생성/업데이트 ───────────────────────────────────────────────────────
export async function upsertRecipe(userId: number, body: UpsertRecipeBody) {
  const {
    recipe_id,
    title,
    servings = 1,
    difficulty,
    source_url,
    thumbnail_url,
    ingredients,
    steps,
  } = body;

  if (recipe_id) {
    return await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipes.update({
        where: { recipe_id },
        data: {
          user_id: userId,
          title: title.trim(),
          servings: servings,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          difficulty: difficulty as any,
          source_url: source_url || null,
          thumbnail_url: thumbnail_url || null,
          status: 'COMPLETED',
        },
        select: { recipe_id: true, title: true },
      });

      await tx.recipe_ingredients.deleteMany({ where: { recipe_id } });
      if (ingredients.length > 0) {
        await tx.recipe_ingredients.createMany({
          data: (ingredients as ExtractionIngredient[]).map((ing) => ({
            recipe_id,
            name: ing.name.trim(),
            amount: normalizeAmount(ing.amount),
            unit: ing.unit ? ing.unit.trim() : null,
          })),
        });
      }

      await tx.recipe_steps.deleteMany({ where: { recipe_id } });
      if (steps.length > 0) {
        await tx.recipe_steps.createMany({
          data: (steps as ExtractionStep[]).map((step) => ({
            recipe_id,
            step_order: step.step_order,
            instruction: step.instruction.trim(),
            timer_seconds: step.timer_seconds || 0,
            step_image_url: step.step_image_url || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            step_ingredients: step.step_ingredients ? (step.step_ingredients as any) : [],
          })),
        });
      }
      return recipe;
    });
  }

  return await prisma.recipes.create({
    data: {
      user_id: userId,
      title: title.trim(),
      servings: servings,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      difficulty: difficulty as any,
      source_url: source_url || null,
      thumbnail_url: thumbnail_url || null,
      recipe_ingredients: {
        create: (ingredients as ExtractionIngredient[]).map((ing) => ({
          name: ing.name.trim(),
          amount: normalizeAmount(ing.amount),
          unit: ing.unit ? ing.unit.trim() : null,
        })),
      },
      recipe_steps: {
        create: (steps as ExtractionStep[]).map((step) => ({
          step_order: step.step_order,
          instruction: step.instruction.trim(),
          timer_seconds: step.timer_seconds || 0,
          step_image_url: step.step_image_url || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          step_ingredients: step.step_ingredients ? (step.step_ingredients as any) : [],
        })),
      },
    },
    select: { recipe_id: true, title: true },
  });
}

// ── 레시피 삭제 ────────────────────────────────────────────────────────────────
export async function deleteRecipe(recipeId: number, userId: number) {
  const recipe = await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    select: { user_id: true },
  });

  if (!recipe) throw new Error('NOT_FOUND');
  if (recipe.user_id !== userId) throw new Error('FORBIDDEN');

  await prisma.recipes.delete({ where: { recipe_id: recipeId } });
  return true;
}

// ── 조리용 레시피 조회 ─────────────────────────────────────────────────────────
export async function getRecipeForCooking(recipeId: number) {
  return await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    include: {
      recipe_steps: { orderBy: { step_order: 'asc' } },
      recipe_ingredients: true,
    },
  });
}

// ── 스크래핑 로직 (YouTube / Blog) ──────────────────────────────────────────
export async function scrapeUrl(url: string, signal?: AbortSignal) {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();
  const isYouTube =
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be' ||
    hostname.endsWith('.youtu.be');

  const contentsToAnalyze: Array<string | { fileData: { fileUri: string; mimeType: string } }> = [];
  let thumbnailUrl: string | null = null;
  let fallbackTitle = '';

  if (isYouTube) {
    contentsToAnalyze.push({
      fileData: { fileUri: url, mimeType: 'video/mp4' },
    });
    const videoIdMatch = url.match(/(?:v=|\/v\/|embed\/|shorts\/|live\/|youtu\.be\/)([^#\&\?]+)/);
    if (videoIdMatch && videoIdMatch[1]) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
    }
    try {
      const response = await fetchWithSsrfProtection(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        signal,
      });
      if (response.ok) {
        const html = await response.text();
        const $ = load(html);
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const pageTitle = $('title').text();
        fallbackTitle = (ogTitle || pageTitle || '').replace(/ - YouTube$/, '').trim();
        if (fallbackTitle) contentsToAnalyze.push(`참고용 원본 제목: ${fallbackTitle}`);
      }
    } catch (err) {
      console.warn('YouTube title fetch failed:', err);
    }
  } else {
    // 네이버 블로그 모바일 변환
    let targetUrl = url;
    if (
      (hostname === 'blog.naver.com' || hostname.endsWith('.blog.naver.com')) &&
      !hostname.includes('m.blog.naver.com')
    ) {
      targetUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
    }

    const response = await fetchWithSsrfProtection(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
      signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const $ = load(html);

    let extractedText = '';
    const selectors = [
      '.se-main-container',
      '.post-view',
      '#postViewArea',
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
        break;
      }
    }

    if (extractedText.length > 30000) extractedText = extractedText.substring(0, 30000);
    if (!extractedText) throw new Error('본문 내용을 추출할 수 없습니다.');

    fallbackTitle = $('title').text() || $('h1').first().text() || '';
    thumbnailUrl = $('meta[property="og:image"]').attr('content') || null;
    contentsToAnalyze.push(`다음 텍스트에서 레시피 정보를 추출해서 제공해줘:\n\n${extractedText}`);
  }

  return { contentsToAnalyze, thumbnailUrl, fallbackTitle };
}

// ── 통합 추출 프로세스 실행 ──────────────────────────────────────────────────
export async function startExtractionProcess(
  userId: number,
  url: string,
  sse: SSEWriter,
  signal?: AbortSignal,
) {
  let recipeId: number | null = null;
  try {
    const validatedUrl = await validateSafeUrl(url);
    const finalUrl = validatedUrl.toString();

    sse.write({ step: 1, total: 4, message: '원본 링크에서 정보를 추출하고 있어요 🌐' });
    const { contentsToAnalyze, thumbnailUrl, fallbackTitle } = await scrapeUrl(finalUrl, signal);

    if (signal?.aborted) throw new Error('Aborted');

    const recipe = await prisma.recipes.create({
      data: {
        user_id: userId,
        title: fallbackTitle || '이름 모를 레시피',
        source_url: finalUrl,
        status: 'PENDING',
        thumbnail_url: thumbnailUrl,
      },
    });
    recipeId = recipe.recipe_id;

    sse.write({
      step: 1,
      total: 4,
      message: '정보 수집 완료! 이제 분석을 시작합니다 🔎',
      title: fallbackTitle,
      thumbnailUrl,
    });

    await processExtraction(recipeId, contentsToAnalyze, fallbackTitle, sse, signal);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Aborted') return;
    console.error('Extraction Process Error:', error);
    if (recipeId) {
      await prisma.recipes
        .update({
          where: { recipe_id: recipeId },
          data: { status: 'FAILED', errorReason: error.message },
        })
        .catch(() => {});
    }
    sse.write({ step: 4, total: 4, message: `에러 발생: ${error.message}` });
    sse.close();
  }
}
