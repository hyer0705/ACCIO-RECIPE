import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import * as authService from '@/services/authService';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 신규 회원 가입 (추가 정보 입력)
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

    const updatedUser = await authService.completeSignup(userId, {
      nickname,
      terms_agreements,
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
