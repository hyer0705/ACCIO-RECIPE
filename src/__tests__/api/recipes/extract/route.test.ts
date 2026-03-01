import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/recipes/extract/route';

// 1. Mocking @google/genai
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    Type: {
      OBJECT: 'object',
      STRING: 'string',
      INTEGER: 'integer',
      ARRAY: 'array',
      NUMBER: 'number',
    },
  };
});

// 2. Mocking global fetch for Web scraping (Cheerio)
global.fetch = vi.fn();

describe('POST /api/recipes/extract (Gemini)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-api-key';
  });

  const createRequest = (body: unknown) => {
    return new Request('http://localhost:3000/api/recipes/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  test('URL 누락 시 400 에러를 반환한다', async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('URL을 제공해야 합니다.');
  });

  test('유효하지 않은 빈 웹페이지 텍스트일 경우 400 에러를 반환한다', async () => {
    const req = createRequest({ url: 'https://fake-blog.com' });

    // 텍스트가 전혀 없는 빈 HTML 목업 반환
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue('<html/>'),
    } as unknown as Response);

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('추출된 텍스트가 부족하여 분석할 수 없습니다.');
  });

  test('유튜브 URL 요청 시 Gemini를 호출하고 결과를 반환한다', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=123ABCTest';
    const req = createRequest({ url: testUrl });

    const expectedRecipe = {
      title: '바스크 치즈케이크',
      difficulty: 'Medium',
      servings: 2,
      ingredients: [{ name: '크림치즈', amount: 400, unit: 'g' }],
      steps: [{ step_order: 1, instruction: '크림치즈를 풉니다.', timer_seconds: 0 }],
    };

    // Gemini API 응답 모킹
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(expectedRecipe),
    });

    const res = await POST(req);
    const res = await POST(req);
    const data = await res.json();

    // Gemini API 호출 검증
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3-flash-preview',
        contents: expect.arrayContaining([
          expect.objectContaining({
            fileData: { fileUri: testUrl, mimeType: 'video/mp4' },
          }),
        ]),
      }),
    );

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // 썸네일 규칙 확인
    expect(data.data.source_url).toBe(testUrl);
    expect(data.data.thumbnail_url).toBe('https://img.youtube.com/vi/123ABCTest/maxresdefault.jpg');
    // 반환 데이터 확인
    expect(data.data.title).toBe('바스크 치즈케이크');
    expect(data.data.ingredients[0].name).toBe('크림치즈');
  });

  test('일반 웹페이지 URL 요청 시 Cheerio 파싱 후 Gemini로 요약한다', async () => {
    const req = createRequest({ url: 'https://blog.example.com/recipe' });

    // Cheerio에서 읽어갈 HTML 목업
    const mockHtml = `
      <html>
        <head>
          <title>대박 맛집 볶음밥</title>
          <meta property="og:image" content="https://example.com/img.jpg" />
        </head>
        <body>
          <article>
            오늘은 엄청 맛있는 김치 볶음밥 레시피입니다. 참기름을 두르고 1분간 뜸을 들이세요.
          </article>
        </body>
      </html>
    `;

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(mockHtml),
    } as unknown as Response);

    const expectedRecipe = {
      title: '대접 맛집 볶음밥',
      difficulty: 'Easy',
      servings: 1,
      ingredients: [{ name: '참기름', amount: 1, unit: '큰술' }],
      steps: [{ step_order: 1, instruction: '참기름 두르기', timer_seconds: 60 }],
    };

    // Gemini 응답 모킹
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(expectedRecipe),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://blog.example.com/recipe',
      expect.any(Object),
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // 메타 속성 추출 확인
    expect(data.data.source_url).toBe('https://blog.example.com/recipe');
    expect(data.data.thumbnail_url).toBe('https://example.com/img.jpg');
    // 제목 추출 확인 (Fallback이 아니라 모델 응답 제목 확인)
    expect(data.data.title).toBe('대접 맛집 볶음밥');
  });
});
