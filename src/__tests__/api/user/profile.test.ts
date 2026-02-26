import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/user/profile/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

describe('GET /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[성공] 존재하는 유저 정보 정상 조회', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '1' },
      expires: '9999-12-31T23:59:59.999Z',
    });

    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      user_id: 1,
      nickname: '테스터',
      profile_image: null,
      email: 'tester@test.com',
      social_provider: 'naver',
      social_id: 'test',
      terms_agreements: true,
      created_at: new Date(),
      terms_agreed_at: new Date(),
      user_settings: {
        setting_id: 1,
        user_id: 1,
        alert_timer: true,
        alert_expiry: false,
        auto_export_enabled: true,
        external_link: null,
      },
    } as NonNullable<Awaited<ReturnType<typeof prisma.users.findUnique>>>);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.user.nickname).toBe('테스터');
    expect(json.user.user_settings.alert_timer).toBe(true);
  });

  it('[실패] DB에 유저가 없을 경우 404 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '999' },
      expires: '9999',
    });

    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe('User not found');
  });
});
