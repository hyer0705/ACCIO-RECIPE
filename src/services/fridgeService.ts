import prisma from '@/lib/prisma';

export interface FridgeItemResponse {
  item_id: number;
  name: string;
  icon_url: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  d_day: number | null;
}

/**
 * 냉장고 아이템 목록 조회
 */
export async function getFridgeItems(userId: number): Promise<FridgeItemResponse[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = await prisma.fridge_items.findMany({
    where: { user_id: userId },
    select: {
      item_id: true,
      custom_name: true,
      quantity: true,
      unit: true,
      expiry_date: true,
      ingredients_master: {
        select: { name: true, icon_url: true },
      },
    },
    orderBy: { expiry_date: 'asc' },
  });

  return items.map((item) => {
    const name = item.ingredients_master?.name ?? item.custom_name ?? '알 수 없는 재료';
    const iconUrl = item.ingredients_master?.icon_url ?? null;

    let dDay: number | null = null;
    if (item.expiry_date) {
      const expiry = new Date(item.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      dDay = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      item_id: item.item_id,
      name,
      icon_url: iconUrl,
      quantity: item.quantity !== null ? Number(item.quantity) : null,
      unit: item.unit,
      expiry_date: item.expiry_date ? item.expiry_date.toISOString().split('T')[0] : null,
      d_day: dDay,
    };
  });
}

/**
 * 냉장고 아이템 추가
 */
export async function addFridgeItem(
  userId: number,
  data: {
    name: string;
    quantity?: number;
    unit?: string;
    expiry_date?: string;
  },
) {
  const name = data.name.trim();

  // 1. 식재료 마스터 조회
  const master = await prisma.ingredients_master.findFirst({
    where: { name: { equals: name } },
    select: {
      master_id: true,
      default_unit: true,
      base_shelf_life: true,
    },
  });

  // 2. 유통기한 결정
  let resolvedExpiryDate: Date | null = null;
  if (data.expiry_date) {
    resolvedExpiryDate = new Date(data.expiry_date);
  } else if (master?.base_shelf_life != null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + master.base_shelf_life);
    resolvedExpiryDate = today;
  }

  // 3. 단위 결정
  const resolvedUnit = data.unit?.trim() ?? master?.default_unit ?? null;

  // 4. 저장
  return await prisma.fridge_items.create({
    data: {
      user_id: userId,
      master_id: master?.master_id ?? null,
      custom_name: master ? null : name,
      quantity: data.quantity ?? 1,
      unit: resolvedUnit,
      expiry_date: resolvedExpiryDate,
    },
    select: {
      item_id: true,
      master_id: true,
      custom_name: true,
      quantity: true,
      unit: true,
      expiry_date: true,
    },
  });
}

/**
 * 냉장고 아이템 수정
 */
export async function updateFridgeItem(
  userId: number,
  itemId: number,
  data: {
    quantity?: number;
    unit?: string;
    expiry_date?: string;
  },
) {
  // 존재 및 권한 확인
  const existing = await prisma.fridge_items.findUnique({
    where: { item_id: itemId },
    select: { user_id: true },
  });

  if (!existing) throw new Error('NOT_FOUND');
  if (existing.user_id !== userId) throw new Error('FORBIDDEN');

  const updateData: Record<string, unknown> = {};
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unit !== undefined) updateData.unit = data.unit.trim() || null;
  if (data.expiry_date !== undefined) {
    updateData.expiry_date = data.expiry_date ? new Date(data.expiry_date) : null;
  }

  return await prisma.fridge_items.update({
    where: { item_id: itemId },
    data: updateData,
    select: {
      item_id: true,
      custom_name: true,
      quantity: true,
      unit: true,
      expiry_date: true,
    },
  });
}

/**
 * 냉장고 아이템 삭제
 */
export async function deleteFridgeItem(userId: number, itemId: number) {
  const existing = await prisma.fridge_items.findUnique({
    where: { item_id: itemId },
    select: { user_id: true },
  });

  if (!existing) throw new Error('NOT_FOUND');
  if (existing.user_id !== userId) throw new Error('FORBIDDEN');

  await prisma.fridge_items.delete({ where: { item_id: itemId } });
}
