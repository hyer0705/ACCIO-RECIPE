import { expect, test, describe, vi, beforeEach } from 'vitest';
import * as cookingLogService from '@/services/cookingLogService';
import prisma from '@/lib/prisma';

// Prisma 모킹
vi.mock('@/lib/prisma', () => ({
  default: {
    cooking_logs: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipes: {
      findUnique: vi.fn(),
    },
  },
}));

describe('cookingLogService', () => {
  const userId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCookingLogs', () => {
    test('사용자의 요리 기록 목록을 최신순으로 가져온다', async () => {
      const mockLogs = [
        {
          log_id: 1,
          recipe_id: 10,
          status: 'SUCCESS',
          lesson_note: '맛있어요',
          companion: '친구',
          cooked_at: new Date('2024-03-17'),
          recipes: { title: '김치찌개' },
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockResult: any = mockLogs;
      vi.mocked(prisma.cooking_logs.findMany).mockResolvedValue(mockResult);

      const result = await cookingLogService.getCookingLogs(userId);

      expect(prisma.cooking_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: userId }),
          orderBy: { cooked_at: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].recipe_title).toBe('김치찌개');
    });
  });

  describe('createCookingLog', () => {
    const validData = {
      recipe_id: 10,
      status: 'SUCCESS' as const,
      lesson_note: '정말 맛있게 됨',
      companion: '가족',
    };

    test('유효한 데이터로 요리 기록을 생성한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRecipe: any = { recipe_id: 10 };
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue(mockRecipe);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLog: any = { log_id: 1, ...validData, cooked_at: new Date() };
      vi.mocked(prisma.cooking_logs.create).mockResolvedValue(mockLog);

      const result = await cookingLogService.createCookingLog(userId, validData);

      expect(prisma.recipes.findUnique).toHaveBeenCalledWith({
        where: {
          recipe_id: validData.recipe_id,
          user_id: userId,
          status: 'COMPLETED',
        },
        select: { recipe_id: true },
      });
      expect(prisma.cooking_logs.create).toHaveBeenCalled();
      expect(result.log_id).toBe(1);
    });

    test('존재하지 않는 레시피 ID로 생성 시 에러를 던진다', async () => {
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue(null);

      await expect(cookingLogService.createCookingLog(userId, validData)).rejects.toThrow(
        '존재하지 않는 레시피입니다.',
      );
    });

    test('다른 사용자의 레시피면 에러를 던진다', async () => {
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue(null);

      await expect(cookingLogService.createCookingLog(userId, validData)).rejects.toThrow(
        '존재하지 않는 레시피입니다.',
      );
    });

    test('완료되지 않은 레시피면 에러를 던진다', async () => {
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue(null);

      await expect(cookingLogService.createCookingLog(userId, validData)).rejects.toThrow(
        '존재하지 않는 레시피입니다.',
      );
    });

    test('lesson_note가 공백이면 에러를 던진다', async () => {
      const invalidData = { ...validData, lesson_note: '   ' };

      await expect(cookingLogService.createCookingLog(userId, invalidData)).rejects.toThrow(
        'lesson_note는 필수입니다.',
      );
    });
  });

  describe('updateCookingLog', () => {
    const logId = 1;
    const updateData = {
      status: 'REGRET' as const,
      lesson_note: '수정된 메모',
    };

    test('자신의 요리 기록을 수정한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLog: any = { log_id: logId, user_id: userId };
      vi.mocked(prisma.cooking_logs.findUnique).mockResolvedValue(mockLog);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockUpdate: any = { log_id: logId, ...updateData };
      vi.mocked(prisma.cooking_logs.update).mockResolvedValue(mockUpdate);

      const result = await cookingLogService.updateCookingLog(logId, userId, updateData);

      expect(prisma.cooking_logs.update).toHaveBeenCalled();
      expect(result.status).toBe('REGRET');
    });

    test('타인의 기록 수정 시 에러를 던진다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLog: any = { log_id: logId, user_id: 999 };
      vi.mocked(prisma.cooking_logs.findUnique).mockResolvedValue(mockLog);

      await expect(cookingLogService.updateCookingLog(logId, userId, updateData)).rejects.toThrow(
        '수정 권한이 없습니다.',
      );
    });

    test('존재하지 않는 기록 수정 시 에러를 던진다', async () => {
      vi.mocked(prisma.cooking_logs.findUnique).mockResolvedValue(null);

      await expect(cookingLogService.updateCookingLog(logId, userId, updateData)).rejects.toThrow(
        '존재하지 않는 요리 기록입니다.',
      );
    });
  });

  describe('deleteCookingLog', () => {
    const logId = 1;

    test('자신의 기록을 삭제한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLog: any = { log_id: logId, user_id: userId };
      vi.mocked(prisma.cooking_logs.findUnique).mockResolvedValue(mockLog);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDelete: any = { log_id: logId };
      vi.mocked(prisma.cooking_logs.delete).mockResolvedValue(mockDelete);

      await cookingLogService.deleteCookingLog(logId, userId);

      expect(prisma.cooking_logs.delete).toHaveBeenCalled();
    });

    test('타인의 기록 삭제 시 에러를 던진다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLog: any = { log_id: logId, user_id: 999 };
      vi.mocked(prisma.cooking_logs.findUnique).mockResolvedValue(mockLog);

      await expect(cookingLogService.deleteCookingLog(logId, userId)).rejects.toThrow(
        '삭제 권한이 없습니다.',
      );
    });
  });
});
