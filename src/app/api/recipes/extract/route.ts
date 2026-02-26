import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

/**
 * @swagger
 * /api/recipes/extract:
 *   post:
 *     summary: URL에서 레시피 정보 추출 (LLM 사용)
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
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL을 제공해야 합니다.' },
        { status: 400 },
      );
    }

    let extractedText = '';
    let thumbnailUrl: string | null = null;
    let fallbackTitle = '';

    // 1. URL 분석 및 텍스트 추출
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // 유튜브 자막 스크래핑
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        extractedText = transcript.map((item) => item.text).join(' ');

        // 썸네일 추출 (임시 방식 - 간단히 URL 형태 변환 가능성)
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
        if (videoIdMatch && videoIdMatch[1]) {
          thumbnailUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
        }
      } catch (err: unknown) {
        console.error('유튜브 자막 추출 실패:', err);
        return NextResponse.json(
          {
            success: false,
            error:
              '유튜브 영상에서 자막을 추출할 수 없습니다. 자막이 활성화된 영상인지 확인해주세요.',
          },
          { status: 400 },
        );
      }
    } else {
      // 일반 웹페이지 (블로그, 레시피 사이트) 스크래핑
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = load(html);

        // 블로그나 기사의 본문일 확률이 높은 태그들의 텍스트만 추출
        extractedText = $('article, main, .post-content, .entry-content, .se-main-container, body')
          .text()
          // 불필요한 공백 제거
          .replace(/\s+/g, ' ')
          .trim();

        fallbackTitle = $('title').text() || $('h1').first().text() || '';
        thumbnailUrl = $('meta[property="og:image"]').attr('content') || null;

        // 텍스트가 너무 많으면 앞부분 자르기 (토큰 제한 방지 및 핵심 내용 집중)
        if (extractedText.length > 30000) {
          extractedText = extractedText.substring(0, 30000);
        }
      } catch (err: unknown) {
        console.error('웹페이지 스크래핑 실패:', err);
        return NextResponse.json(
          { success: false, error: '해당 웹페이지에서 내용을 추출할 수 없습니다.' },
          { status: 400 },
        );
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '추출된 텍스트가 부족하여 분석할 수 없습니다.' },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: '서버 환경변수에 OPENAI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 },
      );
    }

    // 2. LLM에 텍스트를 넘겨서 구조화된 JSON 응답 요청
    console.log('LLM 분석 시작 (텍스트 길이):', extractedText.length);

    // JSON Schema 정의 (OpenAI의 Structured Outputs)
    const recipeSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '요리 또는 레시피의 제목. 제목이 명확하지 않으면 적절히 생성해라.',
        },
        difficulty: {
          type: 'string',
          enum: ['Easy', 'Medium', 'Hard'],
          description: '조리 과정과 재료를 바탕으로 한 요리의 전반적인 난이도. 선택해야 함.',
        },
        servings: { type: 'integer', description: '레시피가 몇 인분인지. 모르면 1.' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '재료 이름 (예: 양파, 돼지고기)' },
              amount: {
                type: 'number',
                description:
                  "재료의 수량. 숫자만 입력. (예: 1, 0.5, 200). '적당량', '약간' 등 숫자로 표현이 안되면 null.",
              },
              unit: {
                type: 'string',
                description: '재료의 단위 (예: 개, g, ml, 큰술, 꼬집, 약간). 없으면 빈 문자열.',
              },
            },
            required: ['name', 'amount', 'unit'],
            additionalProperties: false,
          },
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step_order: { type: 'integer', description: '조리 순서 번호 (1부터 시작)' },
              instruction: {
                type: 'string',
                description: '스텝별 조리 지시사항. 명확하고 간결하게 작성.',
              },
              timer_seconds: {
                type: 'integer',
                description:
                  '이 스텝에서 대기하거나 시간이 걸리는 작업이 있다면 그 시간을 초(seconds) 단위로 계산할 것. (예: 3분간 볶는다 -> 180, 10분 끓인다 -> 600) 없으면 0.',
              },
            },
            required: ['step_order', 'instruction', 'timer_seconds'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'difficulty', 'servings', 'ingredients', 'steps'],
      additionalProperties: false,
    };

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 가장 비용 효율적인 모델 사용
      messages: [
        {
          role: 'system',
          content:
            "너는 최고의 요리 전문가이자 레시피 구조화 AI야. 사용자로부터 블로그 글이나 유튜브 영상의 자막 텍스트를 받을 건데, 거기서 오직 '요리 레시피'와 관련된 필수 정보(제목, 난이도, 몇인분, 재료, 스텝)만 정확하게 추출해야 해. 잡담이나 불필요한 인사는 제외해라. 한국어로 출력해라.",
        },
        {
          role: 'user',
          content: `다음 텍스트에서 레시피 정보를 추출해서 제공해줘:\n\n${extractedText}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'recipeResponse', schema: recipeSchema, strict: true },
      },
      temperature: 0.1, // 정확한 파싱을 위해 낮은 temperature
    });

    const llmContent = completion.choices[0].message.content;

    if (!llmContent) {
      throw new Error('LLM did not return any content.');
    }

    const recipeData = JSON.parse(llmContent);

    // 스크래핑한 기본 메타데이터 추가
    recipeData.source_url = url;
    recipeData.thumbnail_url = thumbnailUrl;

    // LLM이 제목을 잘 못 뽑았을 때를 대비한 폴백
    if (!recipeData.title || recipeData.title.trim() === '') {
      recipeData.title = fallbackTitle || '이름 모를 레시피';
    }

    return NextResponse.json({
      success: true,
      data: recipeData,
    });
  } catch (error: unknown) {
    console.error('API Error (/api/recipes/extract):', error);
    const errorMessage =
      error instanceof Error ? error.message : '레시피 추출 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
