import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cantina.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@cantina.com',
      password: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  // Create operator user
  const operatorPassword = await bcrypt.hash('op123', 10);
  const operator = await prisma.user.upsert({
    where: { email: 'operador@cantina.com' },
    update: {},
    create: {
      name: 'Operador Padrão',
      email: 'operador@cantina.com',
      password: operatorPassword,
      role: 'OPERATOR',
      active: true,
    },
  });

  console.log('Users created:', { admin: admin.email, operator: operator.email });

  // Sample products
  const products = [
    { name: 'Refrigerante Lata 350ml', category: 'Bebidas', sku: 'BEB001', price: 5.00, stock: 48, minStock: 10, description: 'Refrigerante gelado em lata' },
    { name: 'Suco de Laranja 300ml', category: 'Bebidas', sku: 'BEB002', price: 6.00, stock: 30, minStock: 10, description: 'Suco natural de laranja' },
    { name: 'Água Mineral 500ml', category: 'Bebidas', sku: 'BEB003', price: 3.00, stock: 60, minStock: 20, description: 'Água mineral sem gás' },
    { name: 'Café Expresso', category: 'Bebidas', sku: 'BEB004', price: 4.00, stock: 100, minStock: 20, description: 'Café expresso tradicional' },
    { name: 'Chá Gelado 350ml', category: 'Bebidas', sku: 'BEB005', price: 5.50, stock: 3, minStock: 10, description: 'Chá gelado sabor pêssego' },
    { name: 'Coxinha', category: 'Salgados', sku: 'SAL001', price: 4.50, stock: 20, minStock: 10, description: 'Coxinha de frango' },
    { name: 'Esfiha', category: 'Salgados', sku: 'SAL002', price: 4.00, stock: 15, minStock: 10, description: 'Esfiha aberta de carne' },
    { name: 'Pastel de Queijo', category: 'Salgados', sku: 'SAL003', price: 5.00, stock: 2, minStock: 10, description: 'Pastel frito recheado com queijo' },
    { name: 'Pão de Queijo', category: 'Salgados', sku: 'SAL004', price: 3.00, stock: 40, minStock: 15, description: 'Pão de queijo mineiro' },
    { name: 'Empada de Frango', category: 'Salgados', sku: 'SAL005', price: 5.50, stock: 12, minStock: 10, description: 'Empada assada de frango' },
    { name: 'Bolo de Chocolate', category: 'Doces', sku: 'DOC001', price: 7.00, stock: 8, minStock: 5, description: 'Fatia de bolo de chocolate' },
    { name: 'Brigadeiro', category: 'Doces', sku: 'DOC002', price: 2.50, stock: 30, minStock: 15, description: 'Brigadeiro tradicional' },
    { name: 'Pudim', category: 'Doces', sku: 'DOC003', price: 6.00, stock: 4, minStock: 5, description: 'Pudim de leite condensado' },
    { name: 'Brownie', category: 'Doces', sku: 'DOC004', price: 6.50, stock: 10, minStock: 8, description: 'Brownie de chocolate com nozes' },
    { name: 'Sanduíche Natural', category: 'Lanches', sku: 'LAN001', price: 9.00, stock: 8, minStock: 5, description: 'Sanduíche com frango, cenoura e requeijão' },
    { name: 'Misto Quente', category: 'Lanches', sku: 'LAN002', price: 8.00, stock: 0, minStock: 5, description: 'Pão de forma com queijo e presunto' },
    { name: 'Bauru', category: 'Lanches', sku: 'LAN003', price: 12.00, stock: 6, minStock: 5, description: 'Bauru completo' },
    { name: 'Chips de Batata', category: 'Snacks', sku: 'SNK001', price: 4.00, stock: 25, minStock: 10, description: 'Batata chips original' },
    { name: 'Amendoim', category: 'Snacks', sku: 'SNK002', price: 3.50, stock: 20, minStock: 10, description: 'Amendoim salgado torrado' },
    { name: 'Barra de Cereal', category: 'Snacks', sku: 'SNK003', price: 3.00, stock: 18, minStock: 10, description: 'Barra de cereal integral' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log(`${products.length} products created`);

  // Create some sample sales for reports
  const allProducts = await prisma.product.findMany();
  const sampleDates = [
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    new Date(),
  ];

  const paymentMethods: ('CASH' | 'CARD' | 'PIX')[] = ['CASH', 'CARD', 'PIX'];

  for (const date of sampleDates) {
    const numSales = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numSales; i++) {
      const numItems = Math.floor(Math.random() * 3) + 1;
      const saleItems = [];
      let total = 0;

      for (let j = 0; j < numItems; j++) {
        const product = allProducts[Math.floor(Math.random() * allProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const subtotal = product.price * quantity;
        total += subtotal;
        saleItems.push({ productId: product.id, quantity, unitPrice: product.price, subtotal });
      }

      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      await prisma.sale.create({
        data: {
          operatorId: admin.id,
          total,
          paymentMethod,
          status: 'COMPLETED',
          createdAt: date,
          items: {
            create: saleItems,
          },
        },
      });
    }
  }

  console.log('Sample sales created');
  console.log('Seed complete!');
  console.log('');
  console.log('Admin credentials:');
  console.log('  Email: admin@cantina.com');
  console.log('  Password: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
