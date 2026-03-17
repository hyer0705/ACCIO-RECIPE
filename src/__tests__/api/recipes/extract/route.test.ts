import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/recipes/extract/route';

// 1. Mocking @google/genai
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
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

// 2. Mocking dns/promises for security utilities
vi.mock('dns/promises', () => ({
  lookup: vi.fn(async (hostname: string, options?: { all?: boolean }) => {
    const isPrivate =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '169.254.169.254' ||
      hostname === '192.168.1.1';

    const resolvedIp = isPrivate ? (hostname === 'localhost' ? '127.0.0.1' : hostname) : '8.8.8.8';

    // { all: true } 옵션이면 배열로 반환 (실제 Node.js dns.lookup 동작)
    if (options?.all) {
      return [{ address: resolvedIp, family: 4 }];
    }
    return { address: resolvedIp, family: 4 };
  }),
}));

// 3. Mocking global fetch for Web scraping (Cheerio)
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: vi.fn().mockResolvedValue('<html><body>No recipe here</body></html>'),
  headers: new Headers(),
} as unknown as Response);

// 3. Mocking Next.js headers & next-auth
vi.mock('next/headers', () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
  }),
}));

vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));

// 4. Mocking Prisma
const mockPrisma = vi.hoisted(() => ({
  recipes: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(mockPrisma)),
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

describe('POST /api/recipes/extract (Gemini)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-api-key';

    // Prisma mocks 초기화
    mockPrisma.recipes.create.mockResolvedValue({ recipe_id: 1, status: 'PENDING' });
    mockPrisma.recipes.update.mockResolvedValue({});
    mockPrisma.recipes.delete.mockResolvedValue({});

    // global.fetch 기본 mock 복구
    vi.mocked(global.fetch).mockImplementation(
      async () =>
        ({
          ok: true,
          status: 200,
          text: async () => '<html><body>No recipe here</body></html>',
          headers: new Headers(),
        }) as unknown as Response,
    );
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
    const textDecoder = new TextDecoder();
    const reader = res.body?.getReader();
    let resultText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += textDecoder.decode(value, { stream: true });
      }
    }

    const events = resultText
      .split('\n\n')
      .filter((e) => e.trim().startsWith('data: '))
      .map((e) => JSON.parse(e.replace(/^data:\s*/, '')));

    const errorEvent = events.find(
      (e) => e.message && e.message.includes('본문 내용을 추출할 수 없습니다'),
    );

    expect(res.status).toBe(200); // SSE 시작은 항상 200
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.message).toContain('본문 내용을 추출할 수 없습니다');
  });

  test('다양한 유튜브 URL 요청 시 올바르게 ID를 추출하고 썸네일을 반환한다', async () => {
    // 가장 일반적인 URL 형식으로 첫 번째 API 테스트 검증
    const baseTestUrl = 'https://www.youtube.com/watch?v=123ABCTest';
    const req = createRequest({ url: baseTestUrl });

    const expectedRecipe = {
      title: '바스크 치즈케이크',
      difficulty: 'Medium',
      servings: 2,
      ingredients: [{ name: '크림치즈', amount: 400, unit: 'g' }],
      steps: [{ step_order: 1, instruction: '크림치즈를 풉니다.', timer_seconds: 0 }],
    };

    // Gemini API 응답 모킹
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(expectedRecipe),
      },
    });

    // 유튜브 페이지 메타데이터 fetch 모킹
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(`
        <html>
          <head>
            <meta property="og:title" content="바스크 치즈케이크 만들기 - YouTube" />
          </head>
        </html>
      `),
    } as unknown as Response);

    const res = await POST(req);

    // 응답 스트림 읽기 대기
    const textDecoder = new TextDecoder();
    const reader = res.body?.getReader();
    let resultText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += textDecoder.decode(value, { stream: true });
      }
    }

    // SSE 이벤트 파싱
    const events = resultText
      .split('\n\n')
      .filter((e) => e.trim().startsWith('data: '))
      .map((e) => {
        try {
          return JSON.parse(e.replace(/^data:\s*/, ''));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // console.log('DEBUG: Youtube Events:', events); // 디버깅용
    const youtubeEvent = events.find((e) => e.step === 1 && e.thumbnailUrl);

    expect(res.status).toBe(200);

    // 썸네일 규칙 확인 (hqdefault)
    expect(youtubeEvent).toBeDefined();
    expect(youtubeEvent?.thumbnailUrl).toBe('https://img.youtube.com/vi/123ABCTest/hqdefault.jpg');
    // 제목 추출 확인 (정규식을 통해 " - YouTube" 제거됨을 검증)
    expect(youtubeEvent?.title).toBe('바스크 치즈케이크 만들기');

    // 추가 URL 형식에 대한 썸네일 추출 검증을 위해 내부 로직 테스트를 모방한 추가 요청 테스트
    const otherYoutubeUrls = [
      'https://youtu.be/123ABCTest',
      'https://www.youtube.com/shorts/123ABCTest',
      'https://www.youtube.com/live/123ABCTest',
      'https://www.youtube.com/embed/123ABCTest',
      'https://www.youtube.com/v/123ABCTest',
    ];

    for (const url of otherYoutubeUrls) {
      const otherReq = createRequest({ url });
      const otherRes = await POST(otherReq);

      let otherResultText = '';
      const otherReader = otherRes.body?.getReader();
      if (otherReader) {
        while (true) {
          const { done, value } = await otherReader.read();
          if (done) break;
          otherResultText += textDecoder.decode(value, { stream: true });
        }
      }

      const otherEvents = otherResultText
        .split('\n\n')
        .filter((e) => e.trim().startsWith('data: '))
        .map((e) => {
          try {
            return JSON.parse(e.replace(/^data:\s*/, ''));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const otherYoutubeEvent = otherEvents.find((e) => e.step === 1 && e.thumbnailUrl);

      expect(otherYoutubeEvent).toBeDefined();
      expect(otherYoutubeEvent?.thumbnailUrl).toBe(
        'https://img.youtube.com/vi/123ABCTest/hqdefault.jpg',
      );
    }
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
            오늘은 엄청 맛있는 김치 볶음밥 레시피입니다. 참기름을 두르고 1분간 뜸을 들이세요. 김치를 잘게 썰어서 밥과 함께 볶아주면 정말 맛있습니다. 누구나 쉽게 따라할 수 있는 초간단 레시피입니다. 지금 바로 시작해보세요!
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
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(expectedRecipe),
      },
    });

    const res = await POST(req);
    const textDecoder = new TextDecoder();
    const reader = res.body?.getReader();
    let resultText = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += textDecoder.decode(value, { stream: true });
      }
    }

    // SSE 이벤트 파싱
    const events = resultText
      .split('\n\n')
      .filter((e) => e.trim().startsWith('data: '))
      .map((e) => {
        try {
          return JSON.parse(e.replace(/^data:\s*/, ''));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // console.log('DEBUG: Blog Events:', events); // 디버깅용
    const blogEvent = events.find((e) => e.step === 1 && e.thumbnailUrl);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://blog.example.com/recipe',
      expect.any(Object),
    );

    expect(res.status).toBe(200);
    // 메타 속성 추출 확인
    expect(blogEvent).toBeDefined();
    expect(blogEvent?.thumbnailUrl).toBe('https://example.com/img.jpg');
  });

  test('사설 IP 또는 localhost URL 요청 시 400 에러를 반환한다', async () => {
    const maliciousUrls = [
      'http://localhost:3000/admin',
      'http://127.0.0.1/config',
      'http://169.254.169.254/latest/meta-data/',
      'http://192.168.1.1/router-settings',
    ];

    for (const url of maliciousUrls) {
      const req = createRequest({ url });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(data.error).toMatch(/사설 IP|허용되지 않는 IP|유효하지 않은 URL/);
    }
  });

  test('교묘하게 위조된 유튜브 URL을 차단한다', async () => {
    const fakeYoutubeUrls = [
      'https://attacker.com/youtube.com/watch?v=123',
      'https://youtube.com.attacker.com/watch?v=123',
      'https://not-youtube.com/v=123',
    ];

    for (const url of fakeYoutubeUrls) {
      const req = createRequest({ url });

      // 일반 웹페이지로 인식되어 fetch를 시도하게 됨
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('<html><body>No recipe here</body></html>'),
      } as unknown as Response);

      const res = await POST(req);
      const textDecoder = new TextDecoder();
      const reader = res.body?.getReader();
      let resultText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          resultText += textDecoder.decode(value, { stream: true });
        }
      }

      // 유튜브로 감지되지 않아야 함 (이벤트 스트림에 유튜브 관련 메시지가 없어야 함)
      expect(resultText).not.toContain('유튜브 영상 정보를 가져왔습니다');
    }
  });
});
