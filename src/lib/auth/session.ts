import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { unauthorized } from './errors';
import prisma from '@/lib/prisma';

export interface SessionUser {
  userId: number;
  isComplete: boolean;
}

export async function requireSessionUser(
  unauthorizedMessage = '인증이 필요합니다.',
): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw unauthorized(unauthorizedMessage);
  }

  const userId = Number.parseInt(sessionUserId, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    throw unauthorized(unauthorizedMessage);
  }

  // DB에서 사용자가 실제로 존재하는지 검증 (탈퇴한 사용자의 세션 토큰 재사용 방지)
  const existingUser = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { user_id: true },
  });

  if (!existingUser) {
    throw unauthorized(unauthorizedMessage);
  }

  return {
    userId,
    isComplete: Boolean(session.user?.isComplete),
  };
}
