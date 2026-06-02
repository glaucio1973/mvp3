import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSales() {
  console.log('🔄 Iniciando reset das tabelas de venda...\n');

  // Step 1: Restore stock from completed sales before deleting anything
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { status: 'COMPLETED' } },
  });

  const stockToRestore: Record<string, number> = {};
  for (const item of saleItems) {
    stockToRestore[item.productId] = (stockToRestore[item.productId] || 0) + item.quantity;
  }

  console.log(`📦 Restaurando estoque de ${Object.keys(stockToRestore).length} produtos...`);
  for (const [productId, qty] of Object.entries(stockToRestore)) {
    await prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: qty } },
    });
  }

  // Step 2: Delete in correct FK order
  const deletedSaleItems = await prisma.saleItem.deleteMany();
  console.log(`🗑  SaleItems removidos: ${deletedSaleItems.count}`);

  const deletedSales = await prisma.sale.deleteMany();
  console.log(`🗑  Vendas removidas: ${deletedSales.count}`);

  const deletedMovements = await prisma.cashMovement.deleteMany();
  console.log(`🗑  Movimentos de caixa removidos: ${deletedMovements.count}`);

  const deletedRegisters = await prisma.cashRegister.deleteMany();
  console.log(`🗑  Registros de caixa removidos: ${deletedRegisters.count}`);

  const deletedStockMov = await prisma.stockMovement.deleteMany({
    where: { type: 'EXIT' },
  });
  console.log(`🗑  Movimentações de estoque (saídas por venda) removidas: ${deletedStockMov.count}`);

  const deletedLogs = await prisma.activityLog.deleteMany({
    where: {
      action: { in: ['CREATE_SALE', 'CANCEL_SALE', 'OPEN_CASH', 'CLOSE_CASH', 'CASH_MOVEMENT'] },
    },
  });
  console.log(`🗑  Logs de atividade removidos: ${deletedLogs.count}`);

  console.log('\n✅ Reset concluído! O sistema está zerado e pronto para uso.');
}

resetSales()
  .catch((e) => {
    console.error('❌ Erro durante o reset:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
