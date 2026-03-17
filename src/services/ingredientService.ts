import prisma from '@/lib/prisma';

/**
 * 마스터 식재료 검색 (자동완성용)
 */
export async function searchMasterIngredients(query: string) {
  const q = query.trim();

  return await prisma.ingredients_master.findMany({
    where: q
      ? {
          name: {
            contains: q,
          },
        }
      : undefined,
    select: {
      master_id: true,
      name: true,
      category: true,
      icon_url: true,
      default_unit: true,
    },
    orderBy: { name: 'asc' },
    take: 50,
  });
}
