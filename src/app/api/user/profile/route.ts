import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import * as userService from '@/services/userService';

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 사용자 프로필 및 맞춤 설정 정보 조회
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    try {
      const userProfile = await userService.getUserProfile(userId);
      return NextResponse.json({ user: userProfile }, { status: 200 });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error(
      'Error in GET /api/user/profile:',
      error instanceof Error ? error.stack : String(error),
    );
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
