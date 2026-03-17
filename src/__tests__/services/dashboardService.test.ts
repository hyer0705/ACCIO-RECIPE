import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import * as dashboardService from '@/services/dashboardService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    cooking_logs: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    fridge_items: {
      findMany: vi.fn(),
    },
    recipes: {
      findMany: vi.fn(),
    },
  },
}));

describe('dashboardService', () => {
  const userId = 1;
  const now = new Date('2026-03-15T10:00:00Z');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // 기본값 설정 (에러 방지)
    vi.mocked(prisma.cooking_logs.findMany).mockResolvedValue([]);
    vi.mocked(prisma.cooking_logs.count).mockResolvedValue(0);
    vi.mocked(prisma.fridge_items.findMany).mockResolvedValue([]);
    vi.mocked(prisma.cooking_logs.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.recipes.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDashboardSummary', () => {
    test('대시보드 요약 데이터를 성공적으로 가져온다', async () => {
      // 1. 이번 달 로그 모킹
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLogs: any = [{ status: 'SUCCESS' }, { status: 'FAIL' }];
      vi.mocked(prisma.cooking_logs.findMany).mockResolvedValue(mockLogs);

      // 2. 지난 달 로그 카운트 모킹
      vi.mocked(prisma.cooking_logs.count).mockResolvedValue(5);

      // 3. 유통기한 임박 재료 모킹
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockItems: any = [
        {
          item_id: 1,
          custom_name: '우유',
          expiry_date: new Date('2026-03-20'),
          ingredients_master: { name: '우유', icon_url: null },
        },
      ];
      vi.mocked(prisma.fridge_items.findMany).mockResolvedValue(mockItems);

      // 4. 최근 회고 모킹
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLesson: any = {
        log_id: 10,
        lesson_note: '좋은 경험',
        cooked_at: new Date('2026-03-14'),
        recipes: { title: '볶음밥' },
      };
      vi.mocked(prisma.cooking_logs.findFirst).mockResolvedValue(mockLesson);

      // 5. 최근 레시피 모킹
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRecipes: any = [{ recipe_id: 1, title: '레시피 1' }];
      vi.mocked(prisma.recipes.findMany).mockResolvedValue(mockRecipes);

      const result = await dashboardService.getDashboardSummary(userId);

      expect(result.monthly_cooking_count).toBe(2);
      expect(result.prev_month_cooking_count).toBe(5);
      expect(result.monthly_success_rate).toBe(50);
      expect(result.expiring_items[0].name).toBe('우유');
      expect(result.expiring_items[0].d_day).toBe(5); // 20 - 15 = 5
      expect(result.latest_lesson?.recipe_title).toBe('볶음밥');
      expect(result.recent_recipes.length).toBe(1);

      const expectedStartOfToday = new Date(2026, 2, 15);
      const expectedExpiryThreshold = new Date(2026, 2, 22);

      expect(prisma.fridge_items.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          expiry_date: {
            gte: expectedStartOfToday,
            lte: expectedExpiryThreshold,
          },
        },
        select: {
          item_id: true,
          custom_name: true,
          expiry_date: true,
          ingredients_master: {
            select: { name: true, icon_url: true },
          },
        },
        orderBy: { expiry_date: 'asc' },
      });
    });

    test('이번 달 기록이 없으면 성공률은 null을 반환한다', async () => {
      vi.mocked(prisma.cooking_logs.findMany).mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(userId);
      expect(result.monthly_success_rate).toBeNull();
    });

    test('유통기한 날짜를 로컬 타임존 기준 YYYY-MM-DD 문자열로 반환한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockItems: any = [
        {
          item_id: 1,
          custom_name: '우유',
          expiry_date: new Date(2026, 2, 20, 0, 30),
          ingredients_master: { name: '우유', icon_url: null },
        },
        {
          item_id: 2,
          custom_name: '치즈',
          expiry_date: null,
          ingredients_master: null,
        },
      ];
      vi.mocked(prisma.fridge_items.findMany).mockResolvedValue(mockItems);

      const result = await dashboardService.getDashboardSummary(userId);

      expect(result.expiring_items[0].expiry_date).toBe('2026-03-20');
      expect(result.expiring_items[1].expiry_date).toBeNull();
    });

    test('이번 달과 지난달 조회에 배타적 종료 시각을 사용한다', async () => {
      await dashboardService.getDashboardSummary(userId);

      expect(prisma.cooking_logs.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          cooked_at: {
            gte: new Date(2026, 2, 1),
            lt: new Date(2026, 2, 16),
          },
        },
        select: { status: true },
      });

      expect(prisma.cooking_logs.count).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          cooked_at: {
            gte: new Date(2026, 1, 1),
            lt: new Date(2026, 2, 1),
          },
        },
      });
    });
  });
});
