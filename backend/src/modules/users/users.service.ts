import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';

const publicSelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

export async function listUsers() {
  return prisma.user.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } });
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, 'Email already in use');
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
    select: publicSelect,
  });
}
