import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';

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
    const { url } = await req.json();

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
      // 일반 블로그/웹페이지의 경우 기존처럼 텍스트를 스크래핑하여 넘김
      console.log('Gemini: 일반 웹페이지 감지, 크롤링 시작');
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

        let extractedText = $(
          'article, main, .post-content, .entry-content, .se-main-container, body',
        )
          .text()
          .replace(/\s+/g, ' ')
          .trim();

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

    // 2. Gemini 호출
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 프롬프트 구성
    const systemInstruction =
      "너는 최고의 요리 전문가이자 레시피 구조화 AI야. 주어진 동영상이나 텍스트를 보고 오직 '요리 레시피'와 관련된 필수 정보(제목, 난이도, 몇인분, 재료, 스텝)만 정확하게 추출해야 해. 영상에 자막이나 설명이 부족하면 화면의 시각 정보를 종합하여 최대한 논리적인 레시피를 만들어내라. 결과는 반드시 정해진 JSON 스키마에 맞추어서 반환해라.";
    contentsToAnalyze.push('위 컨텐츠를 바탕으로 요리 레시피를 정리해서 JSON으로 추출해줘.');

    // Structured Output 스키마 구성 (Gemini 지원 형태)
    const recipeSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: '요리 또는 레시피의 제목. 명확하지 않으면 적절히 생성.',
        },
        difficulty: {
          type: Type.STRING,
          description: '요리 난이도 (Easy, Medium, Hard 중 하나)',
        },
        servings: {
          type: Type.INTEGER,
          description: '레시피 기준 인원 수',
        },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: '재료 이름' },
              amount: {
                type: Type.NUMBER,
                description: '재료 양 (숫자. 없으면 생략)',
                nullable: true,
              },
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

    console.log('Gemini API 호출 시작...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contentsToAnalyze,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
        temperature: 0.1,
      },
    });

    const llmContent = response.text;
    if (!llmContent) {
      throw new Error('Gemini API did not return any content.');
    }

    const recipeData = JSON.parse(llmContent);

    // 메타데이터 병합
    recipeData.source_url = url;
    recipeData.thumbnail_url = thumbnailUrl;
    if (!recipeData.title || recipeData.title.trim() === '') {
      recipeData.title = fallbackTitle || '이름 모를 레시피';
    }

    console.log('Gemini API 파싱 완료:', recipeData.title);

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
