import { PrismaClient } from '../generated/client/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

declare global {
  var prisma: PrismaClient | undefined;
}

// In Prisma v7, the constructor expects an adapter when using the client-side adapter approach
const adapter = new PrismaMariaDb(process.env.DATABASE_URL || '');

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
