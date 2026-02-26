import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 신규 회원 가입 (추가 정보 입력)
 *     description: 소셜 로그인 완료 후, 닉네임, 약관 동의 등의 추가 정보를 입력하여 회원가입을 완료합니다.
 *     tags:
 *       - Auth & User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickname
 *               - terms_agreements
 *             properties:
 *               nickname:
 *                 type: string
 *                 example: "요리왕"
 *               terms_agreements:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: 가입 완료 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 내부 오류
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login with a social provider first.' },
        { status: 401 },
      );
    }

    const { nickname, terms_agreements } = await req.json();

    if (!nickname || typeof terms_agreements !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data. Nickname and terms_agreements are required.' },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10);

    // Update the user with new info
    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        nickname: nickname,
        terms_agreements: terms_agreements,
        terms_agreed_at: new Date(),
      },
      select: {
        user_id: true,
        nickname: true,
        email: true,
        terms_agreements: true,
      },
    });

    return NextResponse.json(
      { message: 'Signup completed successfully.', user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in POST /api/auth/signup:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
