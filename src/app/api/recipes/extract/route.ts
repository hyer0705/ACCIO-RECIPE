import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import prisma from '@/lib/prisma';
import { processExtraction } from '@/lib/recipe/extractHelpers';

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
