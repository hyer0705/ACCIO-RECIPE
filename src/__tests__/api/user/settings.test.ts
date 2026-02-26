import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/user/settings/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

describe('PUT /api/user/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[성공] 닉네임과 알림 설정 동시 변경 시 200 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '1' },
      expires: '9999-12-31T23:59:59.999Z',
    });

    vi.mocked(prisma.users.update).mockResolvedValue({
      user_id: 1,
      nickname: '수정된닉네임',
      email: 'tester@test.com',
      social_provider: 'kakao',
      social_id: 'kakao123',
      terms_agreements: true,
      created_at: new Date(),
      terms_agreed_at: new Date(),
      profile_image: null,
    });

    const req = {
      json: async () => ({
        nickname: '수정된닉네임',
        alert_timer: false,
        auto_export_enabled: false,
      }),
    } as unknown as NextRequest;

    const response = await PUT(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Settings updated successfully');

    // Prisma 내부 호출 검증
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 1 },
        data: expect.objectContaining({
          nickname: '수정된닉네임',
          user_settings: expect.objectContaining({
            upsert: expect.objectContaining({
              update: expect.objectContaining({
                alert_timer: false,
                auto_export_enabled: false,
              }),
              create: expect.objectContaining({
                alert_timer: false,
                auto_export_enabled: false,
              }),
            }),
          }),
        }),
        select: expect.objectContaining({
          user_id: true,
          user_settings: true,
        }),
      }),
    );
  });

  it('[실패] 비로그인 요청 시 401 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = {
      json: async () => ({ nickname: 'hack' }),
    } as unknown as NextRequest;

    const response = await PUT(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});
