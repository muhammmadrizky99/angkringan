
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Cleaning up database...');

    // Delete in order of dependencies (child tables first)
    console.log('   Deleting Transaction Items...');
    await prisma.transactionItem.deleteMany({});

    console.log('   Deleting Transactions...');
    await prisma.transaction.deleteMany({});

    console.log('   Deleting Stock Movements...');
    await prisma.stockMovement.deleteMany({});

    console.log('   Deleting Predictions...');
    await prisma.prediction.deleteMany({});

    console.log('   Deleting Daily Records...');
    await prisma.dailyRecord.deleteMany({});

    console.log('   Deleting Products...');
    await prisma.product.deleteMany({});

    console.log('   Deleting Suppliers...');
    await prisma.supplier.deleteMany({});

    console.log('   Deleting Users...');
    await prisma.user.deleteMany({});

    console.log('✨ Database successfully reset! All data cleared.');
    console.log('👉 Next steps:');
    console.log('   1. npx ts-node src/create_admin.ts');
    console.log('   2. npx ts-node src/import_data.ts');
}

main()
    .catch((e) => {
        console.error('❌ Error resetting database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
