import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/fridge/route';

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
//    - ingredients_master.findFirst : 마스터 재료 조회
//    - fridge_items.create          : 냉장고 항목 저장
// ─────────────────────────────────────────────
const { mockMasterFindFirst, mockFridgeCreate } = vi.hoisted(() => {
  return {
    mockMasterFindFirst: vi.fn(),
    mockFridgeCreate: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    ingredients_master: {
      findFirst: mockMasterFindFirst,
    },
    fridge_items: {
      create: mockFridgeCreate,
    },
  },
}));

// authOptions 모킹 (getServerSession 인자로 전달되므로 빈 객체로 충분)
vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));

// ─────────────────────────────────────────────
// 테스트 헬퍼
// ─────────────────────────────────────────────
const createRequest = (body: unknown) =>
  new Request('http://localhost:3000/api/fridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const MOCK_SESSION = {
  user: { id: '1', name: '루시', email: 'lucy@test.com' },
};

// 마스터에 존재하는 재료 mock 데이터
const MOCK_MASTER = {
  master_id: 10,
  default_unit: '개',
  base_shelf_life: 7,
};

// 생성된 fridge_items mock 데이터
const MOCK_CREATED_ITEM = {
  item_id: 1,
  master_id: 10,
  custom_name: null,
  quantity: 2,
  unit: '개',
  expiry_date: new Date('2026-03-05'),
};

// ─────────────────────────────────────────────
// 내일 날짜 문자열 (YYYY-MM-DD)
// ─────────────────────────────────────────────
function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// 어제 날짜 문자열 (YYYY-MM-DD)
// ─────────────────────────────────────────────
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

describe('POST /api/fridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 ──────────────────────────────────

  test('세션이 없으면 401을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(createRequest({ name: '대파' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('인증이 필요합니다.');
  });

  // ── Validation ────────────────────────────

  test('name이 없으면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('재료 이름(name)은 필수입니다.');
  });

  test('name이 공백 문자열이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ name: '   ' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('재료 이름(name)은 필수입니다.');
  });

  test('quantity가 0이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ name: '대파', quantity: 0 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('수량(quantity)은 0보다 큰 숫자여야 합니다.');
  });

  test('quantity가 음수이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ name: '대파', quantity: -1 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('수량(quantity)은 0보다 큰 숫자여야 합니다.');
  });

  test('expiry_date가 잘못된 형식이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ name: '대파', expiry_date: '26-02-99' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('유통기한(expiry_date)은 YYYY-MM-DD 형식이어야 합니다.');
  });

  test('expiry_date가 과거 날짜이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ name: '대파', expiry_date: getYesterdayString() }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('유통기한(expiry_date)은 오늘 이후 날짜여야 합니다.');
  });

  // ── 마스터 재료 분기 ──────────────────────

  test('마스터에 있는 재료는 master_id를 연결하여 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파', quantity: 2 }));

    expect(mockFridgeCreate).toHaveBeenCalledTimes(1);

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.master_id).toBe(10);
    expect(callArg.data.custom_name).toBeNull();
  });

  test('마스터에 없는 재료는 custom_name으로 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(null); // 마스터 미존재

    mockFridgeCreate.mockResolvedValueOnce({
      item_id: 2,
      master_id: null,
      custom_name: '직접 만든 소스',
      quantity: 1,
      unit: null,
      expiry_date: null,
    });

    const res = await POST(createRequest({ name: '직접 만든 소스' }));

    expect(res.status).toBe(201);

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.master_id).toBeNull();
    expect(callArg.data.custom_name).toBe('직접 만든 소스');
  });

  // ── expiry_date 결정 로직 ─────────────────

  test('expiry_date를 입력하면 해당 날짜로 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    const tomorrow = getTomorrowString();
    await POST(createRequest({ name: '대파', expiry_date: tomorrow }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.expiry_date).toEqual(new Date(tomorrow));
  });

  test('expiry_date 미입력 + 마스터 있음: base_shelf_life로 자동 계산한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER); // base_shelf_life: 7
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    const savedDate: Date = callArg.data.expiry_date;

    // 오늘 + 7일과 동일한지 확인 (날짜만 비교)
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() + 7);

    expect(savedDate.toDateString()).toBe(expected.toDateString());
  });

  test('expiry_date 미입력 + 마스터 없음: expiry_date를 null로 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(null);
    mockFridgeCreate.mockResolvedValueOnce({
      item_id: 3,
      master_id: null,
      custom_name: '직접 만든 소스',
      quantity: 1,
      unit: null,
      expiry_date: null,
    });

    await POST(createRequest({ name: '직접 만든 소스' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.expiry_date).toBeNull();
  });

  // ── unit 결정 로직 ────────────────────────

  test('unit을 입력하면 입력값을 우선 사용한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER); // default_unit: '개'
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파', unit: 'g' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.unit).toBe('g'); // 입력값 'g' 우선
  });

  test('unit 미입력 + 마스터 있음: default_unit을 사용한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER); // default_unit: '개'
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.unit).toBe('개');
  });

  // ── 성공 케이스 ───────────────────────────

  test('정상 요청 시 201과 생성된 item 데이터를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    const res = await POST(
      createRequest({ name: '대파', quantity: 2, expiry_date: getTomorrowString() }),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('식재료가 성공적으로 추가되었습니다.');
    expect(data.data.item_id).toBe(1);
  });

  test('정상 요청 시 user_id가 세션 id로 올바르게 전달된다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION); // id: '1'
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.user_id).toBe(1); // "1" → parseInt → 1
  });

  test('quantity 미입력 시 기본값 1로 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockResolvedValueOnce(MOCK_CREATED_ITEM);

    await POST(createRequest({ name: '대파' }));

    const callArg = mockFridgeCreate.mock.calls[0][0];
    expect(callArg.data.quantity).toBe(1);
  });

  // ── 서버 에러 ─────────────────────────────

  test('Prisma fridge_items.create가 에러를 던지면 500을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockMasterFindFirst.mockResolvedValueOnce(MOCK_MASTER);
    mockFridgeCreate.mockRejectedValueOnce(new Error('DB 연결 실패'));

    const res = await POST(createRequest({ name: '대파' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('서버 에러가 발생했습니다.');
    expect(data.error).toBe('DB 연결 실패');
  });
});
