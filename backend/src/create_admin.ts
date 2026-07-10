
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for existing users...');
    const existingUser = await prisma.user.findFirst();

    if (existingUser) {
        console.log('Users already exist in database.');
        console.log('   You can login with existing credentials.');
        return;
    }

    console.log('No users found. Creating initial users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const superadmin = await prisma.user.create({
        data: {
            name: 'Pak Budi (Pemilik)',
            email: 'superadmin@angkringan.com',
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
    });
    console.log('Superadmin created: superadmin@angkringan.com');

    const admin = await prisma.user.create({
        data: {
            name: 'Siti (Kasir)',
            email: 'admin@angkringan.com',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });
    console.log('Admin created: admin@angkringan.com');

    console.log('------------------------------------------------');
    console.log('� Login Credentials:');
    console.log('   Superadmin: superadmin@angkringan.com / password123');
    console.log('   Admin:      admin@angkringan.com      / password123');
    console.log('------------------------------------------------');
    console.log('You can now run the import_data script.');
}

main()
    .catch((e) => {
        console.error(' Error creating admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
