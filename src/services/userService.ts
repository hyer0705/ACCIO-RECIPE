import prisma from '@/lib/prisma';
import { notFound } from '@/lib/auth/errors';

/**
 * 사용자 프로필 및 설정 정보 조회
 */
export async function getUserProfile(userId: number) {
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

  if (!userProfile) throw notFound('존재하지 않는 사용자입니다.');

  return userProfile;
}

/**
 * 회원 탈퇴
 */
export async function deleteUser(userId: number) {
  const existingUser = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!existingUser) throw notFound('존재하지 않는 사용자입니다.');

  await prisma.users.delete({
    where: { user_id: userId },
  });
}
