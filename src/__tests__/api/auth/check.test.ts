import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/check/route';
import { getServerSession } from 'next-auth/next';

describe('GET /api/auth/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[성공] 로그인 상태 시 유저 정보 및 authenticated: true 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '1', name: 'tester', email: 'test@test.com' },
      expires: '9999-12-31T23:59:59.999Z',
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.authenticated).toBe(true);
    expect(json.user.id).toBe('1');
  });

  it('[실패] 비로그인 상태 시 401 및 authenticated: false 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.authenticated).toBe(false);
  });
});
