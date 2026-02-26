import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 사용자 프로필 및 맞춤 설정 정보 조회
 *     description: 인증된 사용자의 프로필 정보와 설정 데이터(알림 동의 여부 등)를 가져옵니다.
 *     tags:
 *       - Auth & User
 *     responses:
 *       200:
 *         description: 유저 프로필 및 설정 정보 응답
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    const userProfile = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        nickname: true,
        email: true,
        profile_image: true,
        social_provider: true,
        terms_agreements: true,
        created_at: true,
        user_settings: {
          select: {
            alert_timer: true,
            alert_expiry: true,
            auto_export_enabled: true,
            external_link: true,
          },
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
