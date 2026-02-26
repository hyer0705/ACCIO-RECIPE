// vitest.setup.ts
import { vi } from 'vitest';

// prisma global mock
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      users: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user_settings: {
        upsert: vi.fn(),
      },
    },
  };
});

// next-auth global mock
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));
