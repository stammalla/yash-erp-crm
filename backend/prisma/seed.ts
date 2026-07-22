import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'Admin User', email: 'admin@erp.local', role: 'admin' as const, password: 'Admin@123' },
    { name: 'Sales User', email: 'sales@erp.local', role: 'sales' as const, password: 'Sales@123' },
    { name: 'Warehouse User', email: 'warehouse@erp.local', role: 'warehouse' as const, password: 'Ware@123' },
    { name: 'Accounts User', email: 'accounts@erp.local', role: 'accounts' as const, password: 'Acct@123' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@erp.local' } });

  await prisma.customer.createMany({
    data: [
      { name: 'Acme Traders', mobile: '9990001111', type: 'wholesale', status: 'active', businessName: 'Acme Traders Pvt Ltd', gstNumber: '29ABCDE1234F1Z5', createdBy: admin.id },
      { name: 'Bharat Retail', mobile: '9990002222', type: 'retail', status: 'lead', createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  await prisma.product.createMany({
    data: [
      { name: 'Steel Bolt M8', sku: 'SB-M8', category: 'Fasteners', unitPrice: 2.5, currentStock: 500, minStockQty: 100, warehouseLocation: 'A1', createdBy: admin.id },
      { name: 'Copper Wire 2mm', sku: 'CW-2MM', category: 'Electrical', unitPrice: 45.0, currentStock: 30, minStockQty: 50, warehouseLocation: 'B2', createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete. Login with the credentials in the README.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
