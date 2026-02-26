import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/dashboard/route';

// ─────────────────────────────────────────────
// 1. next-auth 세션 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => {
  return { mockGetServerSession: vi.fn() };
});

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// ─────────────────────────────────────────────
// 2. Prisma 모킹
// ─────────────────────────────────────────────
const { mockLogsFind, mockLogsCount, mockFridgeFind, mockLogsFindFirst } = vi.hoisted(() => ({
  mockLogsFind: vi.fn(),
  mockLogsCount: vi.fn(),
  mockFridgeFind: vi.fn(),
  mockLogsFindFirst: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    cooking_logs: {
      findMany: mockLogsFind,
      count: mockLogsCount,
      findFirst: mockLogsFindFirst,
    },
    fridge_items: {
      findMany: mockFridgeFind,
    },
  },
}));

vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

// ─────────────────────────────────────────────
// 테스트 공통 데이터
// ─────────────────────────────────────────────
const MOCK_SESSION = { user: { id: '1', name: '루시', email: 'lucy@test.com' } };

const MOCK_THIS_MONTH_LOGS = [
  { status: 'SUCCESS' },
  { status: 'SUCCESS' },
  { status: 'FAIL' },
  { status: 'REGRET' },
];

const MOCK_EXPIRING_ITEMS = [
  {
    item_id: 1,
    custom_name: null,
    expiry_date: new Date('2026-03-01'),
    ingredients_master: { name: '달걀', icon_url: null },
  },
  {
    item_id: 2,
    custom_name: '직접 담근 김치',
    expiry_date: new Date('2026-03-05'),
    ingredients_master: null,
  },
];

const MOCK_LATEST_LESSON = {
  log_id: 5,
  lesson_note: '인덕션 6단은 소스가 쉽게 탑니다.',
  cooked_at: new Date('2026-02-20T12:00:00Z'),
  recipes: { title: '매콤 닭볶음탕' },
};

// ─────────────────────────────────────────────
// 테스트 헬퍼: 모든 mock 정상 응답으로 세팅
// ─────────────────────────────────────────────
function setHappyPath() {
  mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
  mockLogsFind.mockResolvedValueOnce(MOCK_THIS_MONTH_LOGS);
  mockLogsCount.mockResolvedValueOnce(9);
  mockFridgeFind.mockResolvedValueOnce(MOCK_EXPIRING_ITEMS);
  mockLogsFindFirst.mockResolvedValueOnce(MOCK_LATEST_LESSON);
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 ──────────────────────────────────

  test('세션이 없으면 401을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('인증이 필요합니다.');
  });

  // ── 정상 응답 구조 ─────────────────────────

  test('정상 요청 시 200과 올바른 data 구조를 반환한다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('monthly_cooking_count');
    expect(body.data).toHaveProperty('prev_month_cooking_count');
    expect(body.data).toHaveProperty('monthly_success_rate');
    expect(body.data).toHaveProperty('expiring_items');
    expect(body.data).toHaveProperty('latest_lesson');
  });

  // ── monthly_cooking_count ─────────────────

  test('이번 달 요리 횟수(monthly_cooking_count)를 올바르게 반환한다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    expect(body.data.monthly_cooking_count).toBe(4); // MOCK_THIS_MONTH_LOGS.length
  });

  // ── prev_month_cooking_count ──────────────

  test('지난달 요리 횟수(prev_month_cooking_count)를 올바르게 반환한다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    expect(body.data.prev_month_cooking_count).toBe(9);
  });

  // ── monthly_success_rate ──────────────────

  test('성공률을 올바르게 계산한다 (SUCCESS 2개 / 전체 4개 = 50%)', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    expect(body.data.monthly_success_rate).toBe(50);
  });

  test('이번 달 로그가 없으면 monthly_success_rate를 null로 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockLogsFind.mockResolvedValueOnce([]); // 기록 없음
    mockLogsCount.mockResolvedValueOnce(0);
    mockFridgeFind.mockResolvedValueOnce([]);
    mockLogsFindFirst.mockResolvedValueOnce(null);

    const res = await GET();
    const body = await res.json();

    expect(body.data.monthly_success_rate).toBeNull();
  });

  // ── expiring_items ────────────────────────

  test('expiring_items에 D-Day 값이 포함된다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    const items = body.data.expiring_items;
    expect(Array.isArray(items)).toBe(true);
    items.forEach((item: { d_day: unknown }) => {
      expect(typeof item.d_day).toBe('number');
    });
  });

  test('마스터 재료명이 없으면 custom_name을 사용한다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    const customItem = body.data.expiring_items.find(
      (i: { name: string }) => i.name === '직접 담근 김치',
    );
    expect(customItem).toBeDefined();
  });

  // ── latest_lesson ─────────────────────────

  test('latest_lesson에 recipe_title과 lesson_note가 포함된다', async () => {
    setHappyPath();

    const res = await GET();
    const body = await res.json();

    expect(body.data.latest_lesson).not.toBeNull();
    expect(body.data.latest_lesson.recipe_title).toBe('매콤 닭볶음탕');
    expect(body.data.latest_lesson.lesson_note).toBe('인덕션 6단은 소스가 쉽게 탑니다.');
  });

  test('회고가 없으면 latest_lesson을 null로 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockLogsFind.mockResolvedValueOnce(MOCK_THIS_MONTH_LOGS);
    mockLogsCount.mockResolvedValueOnce(9);
    mockFridgeFind.mockResolvedValueOnce([]);
    mockLogsFindFirst.mockResolvedValueOnce(null);

    const res = await GET();
    const body = await res.json();

    expect(body.data.latest_lesson).toBeNull();
  });

  // ── 서버 에러 ─────────────────────────────

  test('Prisma 에러 발생 시 500을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockLogsFind.mockRejectedValueOnce(new Error('DB 연결 실패'));
    mockLogsCount.mockResolvedValueOnce(0);
    mockFridgeFind.mockResolvedValueOnce([]);
    mockLogsFindFirst.mockResolvedValueOnce(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('서버 에러가 발생했습니다.');
  });
});
