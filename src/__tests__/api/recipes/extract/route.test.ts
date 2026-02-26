import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/recipes/extract/route';
import { YoutubeTranscript } from 'youtube-transcript';

// 1. Mocking OpenAI
const { mockCreate } = vi.hoisted(() => {
  return { mockCreate: vi.fn() };
});

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// 2. Mocking YoutubeTranscript
vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

// 3. Mocking global fetch for Web scraping
global.fetch = vi.fn();

describe('POST /api/recipes/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
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

  test('추출할 텍스트가 없는 유효하지 않은 HTML일 경우 400 에러를 반환한다', async () => {
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

  test('유튜브 URL 요청 시 YoutubeTranscript와 OpenAI를 올바르게 호출하고 결과를 반환한다', async () => {
    const req = createRequest({ url: 'https://www.youtube.com/watch?v=123ABCTest' });

    // 유튜브 자막 모킹
    vi.mocked(YoutubeTranscript.fetchTranscript).mockResolvedValueOnce([
      { text: '오늘은 김치찌개 레시피입니다.', duration: 1, offset: 0 },
      { text: '맛있게 끓여볼게요.', duration: 1, offset: 0 },
    ]);

    const expectedRecipe = {
      title: '맛있는 김치찌개',
      difficulty: 'Easy',
      servings: 2,
      ingredients: [{ name: '김치', amount: 1, unit: '포기' }],
      steps: [{ step_order: 1, instruction: '김치를 끓입니다.', timer_seconds: 600 }],
    };

    // OpenAI LLM 응답 모킹
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: JSON.stringify(expectedRecipe) },
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=123ABCTest',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1); // LLM 호출 검증

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // API 내부 로직에 의해 썸네일 URL 파생 여부 검증
    expect(data.data.source_url).toBe('https://www.youtube.com/watch?v=123ABCTest');
    expect(data.data.thumbnail_url).toBe('https://img.youtube.com/vi/123ABCTest/maxresdefault.jpg');
    // LLM으로 받아온 데이터 매핑 검증
    expect(data.data.title).toBe('맛있는 김치찌개');
    expect(data.data.steps[0].timer_seconds).toBe(600);
  });

  test('일반 웹페이지 URL 요청 시 Cheerio를 통해 HTML을 스크래핑하고 파싱한다', async () => {
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
            오늘은 엄청 맛있는 김치 볶음밥 레시피입니다. 
            마지막에 참기름을 두르고 1분간 뜸을 들이세요.
          </article>
        </body>
      </html>
    `;

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(mockHtml),
    } as unknown as Response);

    const expectedRecipe = {
      title: '대여 맛집 볶음밥',
      difficulty: 'Medium',
      servings: 1,
      ingredients: [{ name: '참기름', amount: 1, unit: '큰술' }],
      steps: [{ step_order: 1, instruction: '참기름 뜸들이기', timer_seconds: 60 }],
    };

    // OpenAI 응답 모킹
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: JSON.stringify(expectedRecipe) },
        },
      ],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://blog.example.com/recipe',
      expect.any(Object),
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Cheerio 파싱 및 og:image 추출이 적용되었는지 검증
    expect(data.data.source_url).toBe('https://blog.example.com/recipe');
    expect(data.data.thumbnail_url).toBe('https://example.com/img.jpg');
    // fallback title 확인이 아닌, LLM의 응답으로 정상 덮어씌어지는지 검증
    expect(data.data.title).toBe('대여 맛집 볶음밥');
  });
});
