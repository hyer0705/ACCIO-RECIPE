import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import * as userService from '@/services/userService';

/**
 * @swagger
 * /api/user:
 *   delete:
 *     summary: 회원 탈퇴
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    try {
      await userService.deleteUser(userId);
      return NextResponse.json(
        { success: true, message: '회원 탈퇴가 완료되었습니다.' },
        { status: 200 },
      );
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: '존재하지 않는 사용자입니다.' },
          { status: 404 },
        );
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('DELETE /api/user Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
