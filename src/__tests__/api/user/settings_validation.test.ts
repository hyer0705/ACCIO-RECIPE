import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/user/settings/route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

describe('PUT /api/user/settings validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockSession = (userId: string) => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: userId },
      expires: '9999-12-31T23:59:59.999Z',
    });
  };

  it('[실패] 잘못된 닉네임 (빈 문자열) 요청 시 400 반환', async () => {
    setupMockSession('1');
    const req = new NextRequest('http://localhost:3000/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ nickname: '' }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('[실패] 잘못된 프로필 이미지 URL 요청 시 400 반환', async () => {
    setupMockSession('1');
    const req = new NextRequest('http://localhost:3000/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ profile_image: 'not-a-url' }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('[실패] 잘못된 알림 설정 (boolean 아님) 요청 시 400 반환', async () => {
    setupMockSession('1');
    const req = new NextRequest('http://localhost:3000/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ alert_timer: 'true' }), // string instead of boolean
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('[성공] 유효한 데이터 요청 시 200 반환', async () => {
    setupMockSession('1');
    const updatedUser = {
      user_id: 1,
      nickname: 'new-nick',
      profile_image: 'https://example.com/img.png',
      user_settings: {},
    };
    vi.mocked(prisma.users.update).mockResolvedValue(
      updatedUser as unknown as Awaited<ReturnType<typeof prisma.users.update>>,
    );

    const req = new NextRequest('http://localhost:3000/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({
        nickname: 'new-nick',
        profile_image: 'https://example.com/img.png',
        alert_timer: false,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.nickname).toBe('new-nick');
  });
});
