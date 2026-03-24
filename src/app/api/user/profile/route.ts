import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import * as userService from '@/services/userService';

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 사용자 프로필 및 맞춤 설정 정보 조회
 */
export async function GET() {
  try {
    const { userId } = await requireSessionUser('Unauthorized');

    try {
      const userProfile = await userService.getUserProfile(userId);
      return NextResponse.json({ user: userProfile }, { status: 200 });
    } catch (e: unknown) {
      const code =
        typeof e === 'object' && e !== null && 'code' in e
          ? (e as { code?: string }).code
          : undefined;
      if (code === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: '존재하지 않는 사용자입니다.' },
          { status: 404 },
        );
      }
      throw e;
    }
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error, {
      key: 'error',
      includeSuccess: false,
    });
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

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
