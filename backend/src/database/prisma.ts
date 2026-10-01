import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não está definida. Configure backend/.env antes de iniciar o backend.');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
