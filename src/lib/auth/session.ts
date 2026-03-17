import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { unauthorized } from './errors';

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

  return {
    userId,
    isComplete: Boolean(session.user?.isComplete),
  };
}
