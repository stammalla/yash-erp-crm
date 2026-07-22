import { execSync } from 'child_process';
import { prisma } from '../lib/prisma';

export async function resetDb() {
  const tables = ['invoices', 'challan_items', 'challans', 'stock_movements', 'customer_notes', 'products', 'customers', 'users'];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
}

export { execSync };
