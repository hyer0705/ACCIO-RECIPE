import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signup/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[성공] 올바른 데이터 전달 시 200 반환', async () => {
    // 세션 Mocking: 소셜 로그인이 되어있다고 가정
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '1', email: 'test@test.com' },
      expires: '9999-12-31T23:59:59.999Z',
    });

    // Prisma DB 업데이트 Mocking
    vi.mocked(prisma.users.update).mockResolvedValue({
      user_id: 1,
      nickname: '새로운닉네임',
      email: 'test@test.com',
      social_provider: 'google',
      social_id: '123',
      profile_image: null,
      terms_agreements: true,
      created_at: new Date(),
      terms_agreed_at: new Date(),
    } as NonNullable<Awaited<ReturnType<typeof prisma.users.update>>>);

    const req = {
      json: async () => ({ nickname: '새로운닉네임', terms_agreements: true }),
    } as unknown as NextRequest;

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Signup completed successfully.');
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 1 },
        data: expect.objectContaining({ nickname: '새로운닉네임', terms_agreements: true }),
        select: expect.objectContaining({
          user_id: true,
          nickname: true,
        }),
      }),
    );
  });

  it('[실패] 비로그인(세션없음) 요청 시 401 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ nickname: '새로운닉네임', terms_agreements: true }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized. Please login with a social provider first.');
  });

  it('[실패] 필수 파라미터 누락 시 400 반환', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: '1' },
      expires: '9999',
    });

    const req = {
      json: async () => ({ terms_agreements: true }),
    } as unknown as NextRequest;

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
