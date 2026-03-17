import { expect, test, describe, vi, beforeEach } from 'vitest';
import * as authService from '@/services/authService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    users: {
      update: vi.fn(),
    },
  },
}));

describe('authService', () => {
  const userId = 1;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('completeSignup', () => {
    test('회원가입 추가 정보를 성공적으로 업데이트한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockResult: any = {
        user_id: userId,
        nickname: '요리왕',
        terms_agreements: true,
      };
      vi.mocked(prisma.users.update).mockResolvedValue(mockResult);

      const result = await authService.completeSignup(userId, {
        nickname: '요리왕',
        terms_agreements: true,
      });

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: userId },
          data: expect.objectContaining({
            nickname: '요리왕',
            terms_agreements: true,
          }),
        }),
      );
      expect(result.nickname).toBe('요리왕');
    });
  });
});
