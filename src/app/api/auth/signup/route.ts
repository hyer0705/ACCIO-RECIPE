import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth/session';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import * as authService from '@/services/authService';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 신규 회원 가입 (추가 정보 입력)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireSessionUser(
      'Unauthorized. Please login with a social provider first.',
    );

    const { nickname, terms_agreements } = await req.json();

    if (!nickname || typeof terms_agreements !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data. Nickname and terms_agreements are required.' },
        { status: 400 },
      );
    }

    const updatedUser = await authService.completeSignup(userId, {
      nickname,
      terms_agreements,
    });

    return NextResponse.json(
      { message: 'Signup completed successfully.', user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    const accessErrorResponse = toAccessControlErrorResponse(error, {
      key: 'error',
      includeSuccess: false,
    });
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('Error in POST /api/auth/signup:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
