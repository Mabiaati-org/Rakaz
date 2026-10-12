/**
 * Seeds the first administrator, and (only with SEED_DEMO=true) a small demo data set.
 * Safe to run repeatedly: existing rows are left untouched.
 */
import 'dotenv/config';

import { randomBytes } from 'node:crypto';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { formatIraqiPhoneLocal, normalizeIraqiPhone } from '@rakaz/contract';
import bcrypt from 'bcryptjs';

import { PrismaClient, type Role } from '../src/generated/prisma/client.js';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to run the seed`);
  return value;
};

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(required('DATABASE_URL')) });

async function ensureUser(input: {
  phone: string;
  name: string;
  role: Role;
  password: string;
  mustChangePassword: boolean;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) return { id: existing.id, created: false };
  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      name: input.name,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 12),
      mustChangePassword: input.mustChangePassword,
    },
  });
  return { id: user.id, created: true };
}

async function seedAdmin(): Promise<string> {
  const phone = normalizeIraqiPhone(required('ADMIN_PHONE'));
  if (!phone) throw new Error('ADMIN_PHONE is not a valid Iraqi mobile number');
  const password = required('ADMIN_PASSWORD');
  if (password.length < 8 || /CHANGE_ME/i.test(password)) {
    throw new Error('ADMIN_PASSWORD must be a real password of at least 8 characters');
  }

  const admin = await ensureUser({
    phone,
    name: process.env.ADMIN_NAME || 'مدير النظام',
    role: 'ADMIN',
    password,
    mustChangePassword: false,
  });
  console.log(admin.created ? `✔ Admin created: ${formatIraqiPhoneLocal(phone)}` : '• Admin already exists');

  for (const [key, value] of [
    ['adminPhone', phone],
    ['whatsappNumber', phone.replace('+', '')],
    ['privacyPolicyUrl', ''],
  ] as const) {
    await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  return admin.id;
}

async function seedDemo(): Promise<void> {
  if (await prisma.route.findUnique({ where: { code: 'R-204' } })) {
    console.log('• Demo data already present');
    return;
  }
  // One shared password for every demo account, so it can be handed to testers.
  const password = process.env.SEED_DEMO_PASSWORD || `demo${randomBytes(3).toString('hex')}`;

  const school = await prisma.school.create({
    data: {
      name: 'مدارس البصرة الأهلية',
      address: 'البصرة، العشار، شارع الكورنيش',
      locationLabel: 'البوابة رقم ٣ — المدخل الرئيسي',
      lat: 30.5156,
      lng: 47.8125,
      phone: '07801112233',
      startTime: '07:45',
      endTime: '13:15',
    },
  });

  const driver = await ensureUser({
    phone: '+9647705551234',
    name: 'كريم حسّون',
    role: 'DRIVER',
    password,
    mustChangePassword: true,
  });
  await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    create: {
      userId: driver.id,
      vehicleLabel: 'باص 17',
      plateNumber: 'بصرة 14 أ 204',
      vehicleModel: 'Toyota Coaster',
      vehicleColor: 'أبيض',
      vehicleCapacity: 22,
      hiredAt: new Date(),
    },
    update: {},
  });

  const route = await prisma.route.create({
    data: {
      code: 'R-204',
      name: 'خط العشار — الكورنيش',
      schoolId: school.id,
      driverId: driver.id,
      depotLat: 30.542,
      depotLng: 47.83,
    },
  });

  const students = [
    { code: 'STU-24031', fullName: 'لبان أحمد محمد', firstName: 'لبان', grade: 'الصف الرابع', gender: 'FEMALE' as const, guardianName: 'أحمد محمد علي', guardianPhone: '+9647701234567', lat: 30.528, lng: 47.792 },
    { code: 'STU-24032', fullName: 'راشد أحمد محمد', firstName: 'راشد', grade: 'الصف الثاني', gender: 'MALE' as const, guardianName: 'أحمد محمد علي', guardianPhone: '+9647701234567', lat: 30.528, lng: 47.792 },
    { code: 'STU-24033', fullName: 'مريم سعد كاظم', firstName: 'مريم', grade: 'الصف الثالث', gender: 'FEMALE' as const, guardianName: 'سعد كاظم', guardianPhone: '+9647701112233', lat: 30.525, lng: 47.788 },
    { code: 'STU-24034', fullName: 'يوسف كريم يوسف', firstName: 'يوسف', grade: 'الصف الخامس', gender: 'MALE' as const, guardianName: 'كريم يوسف', guardianPhone: '+9647702223344', lat: 30.522, lng: 47.781 },
    { code: 'STU-24035', fullName: 'نور الهدى ناصر', firstName: 'نور', grade: 'الصف الثاني', gender: 'FEMALE' as const, guardianName: 'هدى ناصر', guardianPhone: '+9647703334455', lat: 30.518, lng: 47.775 },
  ];

  for (const [index, s] of students.entries()) {
    const guardian = await ensureUser({
      phone: s.guardianPhone,
      name: s.guardianName,
      role: 'GUARDIAN',
      password,
      mustChangePassword: true,
    });
    const student = await prisma.student.create({
      data: {
        code: s.code,
        internalNumber: s.code.replace('STU', 'RKZ'),
        fullName: s.fullName,
        firstName: s.firstName,
        grade: s.grade,
        stage: 'الابتدائية',
        gender: s.gender,
        schoolId: school.id,
        routeId: route.id,
        guardianId: guardian.id,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        governorate: 'البصرة',
        area: 'العشار',
        street: 'شارع الكورنيش',
        homeLat: s.lat,
        homeLng: s.lng,
      },
    });
    await prisma.routeStop.create({
      data: {
        routeId: route.id,
        studentId: student.id,
        sequence: index + 1,
        pickupTime: `06:${String(40 + index * 5).padStart(2, '0')}`,
        dropoffTime: `13:${String(55 - index * 5).padStart(2, '0')}`,
      },
    });
    await prisma.subscription.create({
      data: {
        studentId: student.id,
        periodTitle: 'العام الدراسي الحالي',
        monthlyFee: 85_000,
        yearlyFee: 850_000,
        dueAmount: 850_000,
        dueDate: new Date(Date.now() + 14 * 86_400_000),
      },
    });
  }

  console.log('✔ Demo data created (school, route R-204, driver 07705551234, 5 students)');
  console.log(`  Demo accounts password: ${password} — each account must change it at first sign-in.`);
}

try {
  await seedAdmin();
  if (process.env.SEED_DEMO === 'true') await seedDemo();
} finally {
  await prisma.$disconnect();
}
