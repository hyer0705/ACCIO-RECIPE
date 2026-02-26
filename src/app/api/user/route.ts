import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/user:
 *   delete:
 *     summary: 회원 탈퇴
 *     description: |
 *       인증된 사용자의 계정을 삭제합니다.
 *       - DB Cascade로 `user_settings`, `fridge_items`, `cooking_logs`, `recipes`(→ `recipe_ingredients`, `recipe_steps`)가 함께 삭제됩니다.
 *       - 탈퇴 성공 후 클라이언트에서 `signOut()`을 호출하여 세션을 종료해야 합니다.
 *     tags:
 *       - Auth & User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 회원 탈퇴 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { user_id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 사용자입니다.' },
        { status: 404 },
      );
    }

    await prisma.users.delete({ where: { user_id: userId } });

    return NextResponse.json(
      { success: true, message: '회원 탈퇴가 완료되었습니다.' },
      { status: 200 },
    );
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
