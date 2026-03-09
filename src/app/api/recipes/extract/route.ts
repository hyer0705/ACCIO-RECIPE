import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { processExtraction } from '@/lib/recipe/extractHelpers';
import { SSEWriter } from '@/lib/recipe/sse';

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
  let url: string;
  try {
    const json = await req.json();
    url = json.url;
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ success: false, error: 'URL을 제공해야 합니다.' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: '서버 환경변수에 GEMINI_API_KEY가 설정되어 있지 않습니다.' },
      { status: 500 },
    );
  }

  // 세션 확인 (유저 ID 할당을 위함)
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }
  const userId = parseInt(session.user.id as string, 10);

  // SSE 스트림 생성
  const stream = new ReadableStream({
    async start(controller) {
      const sse = new SSEWriter(controller);

      try {
        const contentsToAnalyze: Array<
          string | { fileData: { fileUri: string; mimeType: string } }
        > = [];
        let thumbnailUrl: string | null = null;
        let fallbackTitle = '';

        sse.write({
          step: 1,
          total: 4,
          message: '원본 링크에서 정보를 추출하고 있어요 🌐',
          thumbnailUrl: null, // 아직은 모름
        });

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

          sse.write({
            step: 1,
            total: 4,
            message: '유튜브 영상 정보를 가져왔습니다 🎬',
            thumbnailUrl: thumbnailUrl,
          });
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
              sse.write({
                step: 1,
                total: 4,
                message: '추출된 텍스트가 부족하여 분석할 수 없습니다.',
                error: 'Insufficient text',
              });
              sse.close();
              return;
            }

            fallbackTitle = $('title').text() || $('h1').first().text() || '';
            thumbnailUrl = $('meta[property="og:image"]').attr('content') || null;

            contentsToAnalyze.push(
              `다음 텍스트에서 레시피 정보를 추출해서 제공해줘:\n\n${extractedText}`,
            );

            // 크롤링으로 얻은 정보 즉시 전달
            sse.write({
              step: 1,
              total: 4,
              message: '정보 수집 완료! 이제 분석을 시작합니다 🔎',
              title: fallbackTitle,
              thumbnailUrl: thumbnailUrl,
            });
          } catch (err: unknown) {
            console.error('웹페이지 스크래핑 실패:', err);
            sse.write({
              step: 1,
              total: 4,
              message: '해당 웹페이지에서 내용을 추출할 수 없습니다.',
              error: 'Scraping failed',
            });
            sse.close();
            return;
          }
        }

        // 2. 초기 PENDING 레시피 생성
        const newRecipe = await prisma.recipes.create({
          data: {
            user_id: userId,
            title: fallbackTitle || '이름 모를 레시피',
            source_url: url,
            status: 'PENDING',
            thumbnail_url: thumbnailUrl,
          },
        });

        // 3. 백그라운드 추출 프로세스 실행 (이제 await 하여 끝날 때까지 대기하고 SSE로 알림)
        try {
          await processExtraction(newRecipe.recipe_id, contentsToAnalyze, fallbackTitle, sse);
          // 완료되면 sse.close()는 processExtraction 혹은 여기서 담당.
          // processExtraction 정상 종료 시 complete 시그널은 processExtraction 내부에서 보냄
        } catch (err) {
          console.error('Background execution failed implicitly:', err);
          // 실패 시 DB 업데이트 (선택 사항이지만 안전을 위해)
          await prisma.recipes.update({
            where: { recipe_id: newRecipe.recipe_id },
            data: { status: 'FAILED' },
          });
          sse.write({
            step: 4,
            total: 4,
            message: '레시피 추출 중 오류가 발생했습니다.',
            error: err instanceof Error ? err.message : String(err),
          });
          sse.close();
        }
      } catch (globalErr) {
        console.error('SSE Stream Error:', globalErr);
        sse.error(globalErr);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
