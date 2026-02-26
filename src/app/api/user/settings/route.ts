import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/user/settings:
 *   put:
 *     summary: 사용자 맞춤 설정 수정
 *     description: 닉네임, 프로필 이미지, 알림 설정, 외부 링크 등의 사용자 정보를 수정합니다.
 *     tags:
 *       - Auth & User
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               profile_image:
 *                 type: string
 *                 nullable: true
 *               alert_timer:
 *                 type: boolean
 *               alert_expiry:
 *                 type: boolean
 *               auto_export_enabled:
 *                 type: boolean
 *               external_link:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: 수정 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 서버 내부 오류
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = await req.json();

    // 입력받은 데이터 필터링
    const {
      nickname,
      profile_image,
      alert_timer,
      alert_expiry,
      auto_export_enabled,
      external_link,
    } = body;

    const userUpdateData: { nickname?: string; profile_image?: string | null } = {};
    if (nickname !== undefined) userUpdateData.nickname = nickname;
    if (profile_image !== undefined) userUpdateData.profile_image = profile_image;

    const settingsUpdateData: {
      alert_timer?: boolean;
      alert_expiry?: boolean;
      auto_export_enabled?: boolean;
      external_link?: string | null;
    } = {};
    if (alert_timer !== undefined) settingsUpdateData.alert_timer = alert_timer;
    if (alert_expiry !== undefined) settingsUpdateData.alert_expiry = alert_expiry;
    if (auto_export_enabled !== undefined)
      settingsUpdateData.auto_export_enabled = auto_export_enabled;
    if (external_link !== undefined) settingsUpdateData.external_link = external_link;

    // Users 테이블 및 연관된 User_Settings 동시 업데이트
    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: {
        ...userUpdateData,
        // 만약 세팅 업데이트 정보가 있다면 연결된 테이블도 함께 업데이트/생성
        ...(Object.keys(settingsUpdateData).length > 0 && {
          user_settings: {
            upsert: {
              create: {
                // 기본적인 기본값 보장 (처음 생성 시)
                alert_timer: settingsUpdateData.alert_timer ?? true,
                alert_expiry: settingsUpdateData.alert_expiry ?? true,
                auto_export_enabled: settingsUpdateData.auto_export_enabled ?? false,
                external_link: settingsUpdateData.external_link,
              },
              update: settingsUpdateData,
            },
          },
        }),
      },
      select: {
        user_id: true,
        nickname: true,
        profile_image: true,
        user_settings: true,
      },
    });

    return NextResponse.json(
      { message: 'Settings updated successfully', user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in PUT /api/user/settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
