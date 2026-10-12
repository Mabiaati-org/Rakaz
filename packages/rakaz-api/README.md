# @rakaz/api — باكند ركاز

NestJS 12 + Prisma 7 + MySQL 8. يخدم لوحة الإدارة وتطبيقي السائق وولي الأمر بنفس عقود `@rakaz/contract`.

## التشغيل محلياً

```bash
# 1) قاعدة بيانات MySQL (مثال بـ Docker)
docker run -d --name rakaz-mysql -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=rakaz -p 3306:3306 mysql:8.4

# 2) الإعداد
cp .env.example .env        # عدّل DATABASE_URL و JWT_ACCESS_SECRET و ADMIN_*
npm install
npm run db:migrate          # ينشئ الجداول
npm run db:seed             # ينشئ حساب المدير (وبيانات تجريبية مع SEED_DEMO=true)

# 3) التشغيل
npm run start:dev           # http://127.0.0.1:8787/api/v1/health
```

Swagger على `/api/docs` عندما `SWAGGER_ENABLED=true`.

## الأوامر

| الأمر | الوظيفة |
| --- | --- |
| `npm run build` | توليد Prisma Client ثم بناء `dist/` |
| `npm run start:prod` | تشغيل النسخة المبنية |
| `npm run db:migrate` | إنشاء/تطبيق migration أثناء التطوير |
| `npm run db:deploy` | تطبيق الـ migrations على الإنتاج |
| `npm run db:seed` | إنشاء المدير الأول |
| `npm test` / `npm run test:e2e` | اختبارات الوحدة / الاختبارات الشاملة (تحتاج قاعدة اختبار، انظر `TEST_DATABASE_URL`) |

## البنية

```
prisma/schema.prisma        مخطط قاعدة البيانات
src/common/                 guards, filters, interceptors, decorators
src/modules/<domain>/       module + controller + service + dto
```

- كل المسارات تحت `/api/v1` ومحمية بـ JWT افتراضياً (`@Public()` للاستثناء، `@Roles()` للأدوار).
- شكل الرد موحّد: `{ success, data, message, meta? }` والخطأ: `{ success:false, message, errors[], statusCode, code? }`.
- الدخول برقم الهاتف وكلمة المرور. الإدارة تنشئ الحسابات بكلمة مرور مؤقتة يُجبر المستخدم على تغييرها.
- السيرفر هو من يحدد الرحلة والمسار من حساب السائق؛ التطبيق لا يختارهما.
- البث الحي للوحة عبر SSE في الذاكرة، لذلك يجب تشغيل نسخة واحدة فقط (انظر `ecosystem.config.cjs`).

للنشر على السيرفر راجع `DEPLOY.md` في جذر المستودع.
