# ركاز (Rakaz)

منصة نقل مدرسي: تطبيق السائق، تطبيق ولي الأمر، لوحة الإدارة، وباكند مشترك.

## محتويات المستودع

| المسار | الوصف |
| --- | --- |
| `packages/rakaz-api/` | الباكند: NestJS + Prisma + MySQL |
| `packages/rakaz-contract/` | عقود TypeScript وعميل HTTP المشترك بين كل الأجزاء |
| `rakaz-dashboard/` | لوحة الإدارة (Vite / React) |
| `rakaz-driver-rn/` | تطبيق السائق (Expo / React Native) |
| `rakaz-parent-rn/` | تطبيق ولي الأمر (Expo / React Native) |
| `legacy/ios-parent-swift/` | الأصل Swift لولي الأمر (مرجع فقط) |
| `DEPLOY.md` | دليل النشر على CloudPanel + pm2 |

## كيف تعمل المنصة

```
لوحة الإدارة ── مدارس / مسارات / سائقون / طلاب / مالية ──► rakaz-api ◄── MySQL
                                                              ▲   │
تطبيق السائق ── أحداث الرحلة + موقع الحافلة ──────────────────┘   │
                                                                  ▼
تطبيق ولي الأمر ◄── حالة رحلة ابنه + موقع الحافلة + إشعارات Push ──┘
تطبيق ولي الأمر ── غياب / عنوان / تأكيد استلام / تذاكر دعم ──► rakaz-api
```

- الدخول برقم الهاتف وكلمة المرور. الإدارة تنشئ الحسابات، وكلمة المرور الأولى مؤقتة يُجبر المستخدم على تغييرها.
- السيرفر هو من يحدد الرحلة والمسار من حساب السائق، ويحسب ما يراه كل ولي أمر لابنه هو فقط.
- تطبيق السائق يعمل دون اتصال ويرسل ما تراكم عند عودة الشبكة.

## تشغيل محلي

يتطلب Node 22+ وقاعدة MySQL 8.

```bash
# 1) قاعدة بيانات
docker run -d --name rakaz-mysql -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=rakaz -p 3306:3306 mysql:8.4

# 2) الباكند
cd packages/rakaz-api
cp .env.example .env          # عدّل DATABASE_URL و JWT_ACCESS_SECRET و ADMIN_*
npm install && npm run db:migrate && npm run db:seed
npm run start:dev             # http://127.0.0.1:8787/api/v1/health

# 3) لوحة الإدارة
cd ../../rakaz-dashboard
cp .env.example .env && npm install && npm run dev      # http://localhost:5173

# 4) التطبيقان
cd ../rakaz-driver-rn && cp .env.example .env && npm install && npx expo start
cd ../rakaz-parent-rn && cp .env.example .env && npm install && npx expo start
```

لتجربة سريعة ببيانات جاهزة ضع `SEED_DEMO=true` في `.env` الباكند قبل `db:seed` (لا تستخدمه في الإنتاج).

## الفحوص

```bash
npm run typecheck      # كل الأجزاء
npm run test:api       # اختبارات الباكند الشاملة (تحتاج قاعدة اختبار)
```

نفس الفحوص تعمل تلقائياً في GitHub Actions (`.github/workflows/ci.yml`).

## النشر

- السيرفر واللوحة: [DEPLOY.md](DEPLOY.md)
- التطبيقان: قسم «البناء للمتاجر» في README كل تطبيق.

## ملاحظات

- لا ترفع ملفات `.env` أو مفاتيح أو فيديوهات إلى Git.
- بعد تعديل `packages/rakaz-contract/src` شغّل `npm run build:contract` وارفع `dist/` مع التعديل.
