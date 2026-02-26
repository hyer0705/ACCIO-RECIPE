import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

/**
 * @swagger
 * /api/auth/check:
 *   get:
 *     summary: 현재 로그인 상태 및 유저 정보 확인
 *     description: 클라이언트에서 현재 인증된 사용자의 세션 및 상태를 확인합니다.
 *     tags:
 *       - Auth & User
 *     responses:
 *       200:
 *         description: 로그인 상태 및 유저 정보
 *       401:
 *         description: 인증되지 않은 사용자 (로그인 필요)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { authenticated: false, message: 'Not authenticated' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: session.user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in GET /api/auth/check:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
