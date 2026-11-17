import { Prisma } from '@prisma/client';

/**
 * Re-calculates and fixes customer ledger running balances from top to bottom
 * in chronological order (date ASC, createdAt ASC).
 * Updates each row's runningBalance if out of sync, and synchronizes customer.currentReceivable.
 */
export async function recalculateCustomerRunningBalance(customerId: string, tx: any): Promise<number> {
  if (!customerId) return 0;

  const customer = await tx.customer.findUnique({ where: { id: customerId } });
  if (!customer) return 0;

  const isWalkIn = customer.phone === '00000000000' || (customer.shopName && customer.shopName.toLowerCase().includes('walk-in'));
  if (isWalkIn) {
    await tx.customer.update({
      where: { id: customerId },
      data: { currentReceivable: new Prisma.Decimal(0) },
    });
    return 0;
  }

  const entries = await tx.customerLedger.findMany({
    where: { customerId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  let running = 0;
  for (const entry of entries) {
    if (entry.transactionType === 'OPENING_BALANCE') {
      running = Number(entry.debit) > 0 ? Number(entry.debit) : -Number(entry.credit);
    } else {
      running = running + Number(entry.debit) - Number(entry.credit);
    }

    if (Math.abs(Number(entry.runningBalance) - running) > 0.001) {
      await tx.customerLedger.update({
        where: { id: entry.id },
        data: { runningBalance: new Prisma.Decimal(running) },
      });
    }
  }

  await tx.customer.update({
    where: { id: customerId },
    data: { currentReceivable: new Prisma.Decimal(running) },
  });

  return running;
}
