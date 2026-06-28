import { PrismaClient, Role, DayOfWeek } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GlamBook database...');

  // ─── Users ────────────────────────────────────────────────────────────────

  const adminPass = await bcrypt.hash('Admin123!', 12);
  const ownerPass = await bcrypt.hash('Owner123!', 12);
  const customerPass = await bcrypt.hash('Customer123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@glambook.ba' },
    update: {},
    create: {
      email: 'admin@glambook.ba',
      passwordHash: adminPass,
      firstName: 'GlamBook',
      lastName: 'Admin',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: 'owner@lumiere.ba' },
    update: {},
    create: {
      email: 'owner@lumiere.ba',
      passwordHash: ownerPass,
      firstName: 'Lejla',
      lastName: 'Kovačević',
      role: Role.SALON_OWNER,
      phone: '+38761111111',
      isVerified: true,
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'ndm1337@gmail.com' },
    update: {},
    create: {
      email: 'ndm1337@gmail.com',
      passwordHash: customerPass,
      firstName: 'Nedim',
      lastName: 'Golos',
      role: Role.CUSTOMER,
      phone: '+38761000000',
      isVerified: true,
    },
  });

  // ─── Salon 1: Lumière Beauty ───────────────────────────────────────────────

  const salon1 = await prisma.salon.upsert({
    where: { slug: 'lumiere-beauty' },
    update: {},
    create: {
      ownerId: owner1.id,
      name: 'Lumière Beauty',
      slug: 'lumiere-beauty',
      type: 'hair',
      description: 'Premium hair and color studio in the heart of Mostar.',
      city: 'Mostar',
      address: 'Bulevar 12, Mostar',
      phone: '+38736100100',
      email: 'info@lumiere.ba',
      instagram: '@lumierebeauty',
      rating: 4.9,
      reviewCount: 218,
      isVerified: true,
      isFeatured: true,
      isActive: true,
    },
  });

  // Working hours for salon1
  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  for (const day of days) {
    await prisma.workingHours.upsert({
      where: { salonId_dayOfWeek: { salonId: salon1.id, dayOfWeek: day } },
      update: {},
      create: {
        salonId: salon1.id,
        dayOfWeek: day,
        openTime: '09:00',
        closeTime: '18:00',
      },
    });
  }
  await prisma.workingHours.upsert({
    where: { salonId_dayOfWeek: { salonId: salon1.id, dayOfWeek: 'SUNDAY' } },
    update: {},
    create: { salonId: salon1.id, dayOfWeek: 'SUNDAY', openTime: '09:00', closeTime: '14:00', isClosed: true },
  });

  // Service categories
  const hairCat = await prisma.serviceCategory.create({
    data: { salonId: salon1.id, name: 'Hair', color: '#C9A84C', sortOrder: 1 },
  });
  const colorCat = await prisma.serviceCategory.create({
    data: { salonId: salon1.id, name: 'Color', color: '#E8593C', sortOrder: 2 },
  });
  const treatCat = await prisma.serviceCategory.create({
    data: { salonId: salon1.id, name: 'Treatment', color: '#4A90D9', sortOrder: 3 },
  });

  // Services
  const s1 = await prisma.service.create({ data: { salonId: salon1.id, categoryId: hairCat.id, name: 'Haircut & Style', duration: 45, price: 35, color: '#C9A84C' } });
  const s2 = await prisma.service.create({ data: { salonId: salon1.id, categoryId: colorCat.id, name: 'Full Color', duration: 90, price: 80, color: '#E8593C' } });
  const s3 = await prisma.service.create({ data: { salonId: salon1.id, categoryId: colorCat.id, name: 'Highlights', duration: 120, price: 95, color: '#E8593C' } });
  const s4 = await prisma.service.create({ data: { salonId: salon1.id, categoryId: treatCat.id, name: 'Keratin Treatment', duration: 150, price: 120, color: '#4A90D9' } });
  const s5 = await prisma.service.create({ data: { salonId: salon1.id, categoryId: hairCat.id, name: 'Blowout', duration: 30, price: 25, color: '#C9A84C' } });

  // Staff: Amra
  const amraUser = await prisma.user.upsert({
    where: { email: 'amra@lumiere.ba' },
    update: {},
    create: {
      email: 'amra@lumiere.ba',
      passwordHash: await bcrypt.hash('Staff123!', 12),
      firstName: 'Amra',
      lastName: 'Kovač',
      role: Role.EMPLOYEE,
    },
  });

  const amraStaff = await prisma.staffMember.create({
    data: {
      userId: amraUser.id,
      salonId: salon1.id,
      title: 'Senior Stylist',
      bio: 'Specializing in cuts and styling. 8 years of experience.',
      rating: 4.9,
      reviewCount: 145,
    },
  });

  // Assign all services to Amra
  for (const s of [s1, s2, s3, s4, s5]) {
    await prisma.staffService.create({ data: { staffId: amraStaff.id, serviceId: s.id } });
  }

  // Amra's schedule
  for (const day of days) {
    await prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek: { staffId: amraStaff.id, dayOfWeek: day } },
      update: {},
      create: { staffId: amraStaff.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00' },
    });
  }

  // ─── Sample appointment ────────────────────────────────────────────────────

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      salonId: salon1.id,
      customerId: customer1.id,
      staffId: amraStaff.id,
      serviceId: s1.id,
      date: tomorrow,
      startTime: '10:30',
      endTime: '11:15',
      totalPrice: 35,
      status: 'CONFIRMED',
      note: 'Please keep it natural, not too short',
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin:    admin@glambook.ba    / Admin123!');
  console.log('  Owner:    owner@lumiere.ba     / Owner123!');
  console.log('  Customer: ndm1337@gmail.com    / Customer123!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
