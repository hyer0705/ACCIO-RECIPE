// vitest.setup.ts
import { vi } from 'vitest';

// prisma global mock
vi.mock('@/lib/prisma', () => {
  const mockModel = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });

  const prismaMock = {
    users: mockModel(),
    user_settings: mockModel(),
    cooking_logs: mockModel(),
    fridge_items: mockModel(),
    recipes: mockModel(),
    ingredients_master: mockModel(),
    recipe_ingredients: mockModel(),
    recipe_steps: mockModel(),
    $transaction: vi.fn(async (arg) => {
      if (typeof arg === 'function') {
        return await arg(prismaMock);
      }
      return arg;
    }),
  };

  return {
    default: prismaMock,
  };
});

// next-auth global mock
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));
