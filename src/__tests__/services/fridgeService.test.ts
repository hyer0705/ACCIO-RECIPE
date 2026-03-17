import { expect, test, describe, vi, beforeEach } from 'vitest';
import * as fridgeService from '@/services/fridgeService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    fridge_items: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ingredients_master: {
      findFirst: vi.fn(),
    },
  },
}));

describe('fridgeService', () => {
  const userId = 1;

  beforeEach(() => vi.resetAllMocks());

  describe('getFridgeItems', () => {
    test('냉장고 아이템 목록을 가져온다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockItems: any = [
        {
          item_id: 1,
          custom_name: '우유',
          quantity: 1,
          unit: '팩',
          expiry_date: new Date('2026-03-20'),
          ingredients_master: { icon_url: 'milk-icon.png' },
        },
        {
          item_id: 2,
          custom_name: '계란',
          quantity: 1,
          unit: '알',
          expiry_date: new Date('2026-03-05'),
          ingredients_master: null,
        },
      ];
      vi.mocked(prisma.fridge_items.findMany).mockResolvedValue(mockItems);

      const result = await fridgeService.getFridgeItems(userId);
      expect(result[0].name).toBe('우유');
      expect(result[0].d_day).toBeDefined();
    });
  });

  describe('addFridgeItem', () => {
    test('새로운 재료를 추가한다 (마스터 매칭 포함)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockMaster: any = {
        master_id: 10,
        name: '계란',
        default_unit: '개',
        base_shelf_life: 7,
      };
      vi.mocked(prisma.ingredients_master.findFirst).mockResolvedValue(mockMaster);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockCreated: any = {
        item_id: 100,
        custom_name: '계란',
        quantity: 2,
        unit: '개',
        expiry_date: new Date('2026-03-08'),
      };
      vi.mocked(prisma.fridge_items.create).mockResolvedValue(mockCreated);

      const data = { name: '계란', quantity: 2 };
      const result = await fridgeService.addFridgeItem(userId, data);

      expect(result.item_id).toBe(100);
      expect(prisma.fridge_items.create).toHaveBeenCalled();
    });
  });

  describe('updateFridgeItem', () => {
    test('재료를 수정한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFound: any = {
        item_id: 1,
        user_id: userId,
      };
      vi.mocked(prisma.fridge_items.findUnique).mockResolvedValue(mockFound);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockUpdated: any = {
        item_id: 1,
        quantity: 5,
      };
      vi.mocked(prisma.fridge_items.update).mockResolvedValue(mockUpdated);

      const result = await fridgeService.updateFridgeItem(userId, 1, { quantity: 5 });
      expect(result.quantity).toBe(5);
    });

    test('타인의 재료 수정 시 FORBIDDEN 에러를 던진다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFound: any = {
        item_id: 1,
        user_id: 999, // 타인
      };
      vi.mocked(prisma.fridge_items.findUnique).mockResolvedValue(mockFound);
      await expect(fridgeService.updateFridgeItem(userId, 1, { quantity: 5 })).rejects.toThrow(
        'FORBIDDEN',
      );
    });
  });

  describe('deleteFridgeItem', () => {
    test('재료를 삭제한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFound: any = {
        item_id: 1,
        user_id: userId,
      };
      vi.mocked(prisma.fridge_items.findUnique).mockResolvedValue(mockFound);

      await fridgeService.deleteFridgeItem(userId, 1);
      expect(prisma.fridge_items.delete).toHaveBeenCalledWith({ where: { item_id: 1 } });
    });
  });
});
