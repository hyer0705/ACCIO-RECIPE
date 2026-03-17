import prisma from '@/lib/prisma';

/**
 * 회원가입 추가 정보 업데이트
 */
export async function completeSignup(
  userId: number,
  data: {
    nickname: string;
    terms_agreements: boolean;
  },
) {
  return await prisma.users.update({
    where: { user_id: userId },
    data: {
      nickname: data.nickname,
      terms_agreements: data.terms_agreements,
      terms_agreed_at: data.terms_agreements ? new Date() : null,
    },
    select: {
      user_id: true,
      nickname: true,
      email: true,
      terms_agreements: true,
    },
  });
}
