# نشر ركاز — CloudPanel + pm2

هذا الدليل ينشر ثلاثة أشياء على سيرفر واحد يعمل بـ CloudPanel:

| الجزء | النوع في CloudPanel | مثال للدومين |
| --- | --- | --- |
| `packages/rakaz-api` | Node.js Site (خلف nginx) | `api.example.com` |
| `rakaz-dashboard` | Static HTML Site | `admin.example.com` |
| قاعدة البيانات | MySQL Database | — |

التطبيقان (`rakaz-driver-rn`, `rakaz-parent-rn`) يُبنيان عبر EAS ويُرفعان للمتاجر — راجع README كل تطبيق.

> استبدل `example.com` بدومينك في كل ما يلي.

## 1) قاعدة البيانات

من CloudPanel ← **Databases** ← **Add Database**:
- Database Name: `rakaz`
- Database User: `rakaz` بكلمة مرور قوية.

يجب أن يكون الإصدار MySQL 8 أو أحدث (أو MariaDB 10.6+).

## 2) موقع الـ API

1. CloudPanel ← **Sites** ← **Add Site** ← **Create a Node.js Site**:
   - Domain: `api.example.com`
   - Node.js Version: **22 LTS** أو أحدث
   - App Port: `8787`
2. فعّل شهادة Let's Encrypt من تبويب **SSL/TLS**.
3. ادخل بـ SSH كمستخدم الموقع واجلب الكود:

```bash
cd ~/htdocs
git clone git@github.com:Mabiaati-org/Rakaz.git rakaz
cd rakaz/packages/rakaz-api
cp .env.example .env
nano .env
```

4. قيم `.env` للإنتاج:

```ini
NODE_ENV=production
PORT=8787
APP_TIMEZONE=Asia/Baghdad
DATABASE_URL="mysql://rakaz:كلمة_المرور@127.0.0.1:3306/rakaz"
# ولّده بـ: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_ACCESS_SECRET=...
CORS_ORIGINS=https://admin.example.com
TRUST_PROXY=true
SWAGGER_ENABLED=false
ADMIN_PHONE=07XXXXXXXXX
ADMIN_PASSWORD="كلمة مرور قوية للمدير"
ADMIN_NAME="مدير النظام"
SEED_DEMO=false
# عنوان موقع السائق من OpenStreetMap (اتركه كما هو، أو فرّغه لإيقاف جلب العنوان)
OSM_NOMINATIM_URL=https://nominatim.openstreetmap.org
OSM_CONTACT_EMAIL=بريدك@example.com
```

> إذا احتوت كلمة مرور قاعدة البيانات على رموز مثل `@` أو `#` فيجب ترميزها في الرابط (`@` → `%40`، `#` → `%23`).

5. التثبيت والبناء وإنشاء الجداول والمدير الأول:

```bash
npm ci
npm run build
npm run db:deploy
npm run db:seed
```

6. التشغيل بـ pm2:

```bash
npm install -g pm2          # مرة واحدة
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                 # نفّذ السطر الذي يطبعه ليعود التطبيق بعد إعادة تشغيل السيرفر
```

> **مهم:** لا تغيّر `instances: 1` في `ecosystem.config.cjs`. البث الحي للوحة يُوزَّع داخل الذاكرة، ونسخة ثانية ستفوّت الأحداث.

7. إعداد nginx (تبويب **Vhost** للموقع). داخل `location /` الموجود أضف الأسطر الثلاثة التالية حتى لا يحجز nginx البث الحي (SSE):

```nginx
location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # البث الحي
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_set_header Connection '';
}
```

8. التحقق:

```bash
curl https://api.example.com/api/v1/health
# {"success":true,"data":{"ok":true,...}}
```

## 3) لوحة الإدارة

1. CloudPanel ← **Add Site** ← **Create a Static HTML Site**: `admin.example.com` ثم فعّل SSL.
2. ابنِ اللوحة (على السيرفر أو على جهازك) مع عنوان الـ API:

```bash
cd ~/htdocs/rakaz/rakaz-dashboard        # أو على جهازك
npm ci
VITE_RAKAZ_API_URL=https://api.example.com npm run build
```

3. انسخ محتوى `dist/` إلى مجلد الموقع الثابت (مثل `~/htdocs/admin.example.com/`).
4. في **Vhost** للموقع الثابت أضف داخل `server { ... }` حتى تعمل روابط الصفحات عند التحديث:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

5. افتح `https://admin.example.com` وادخل برقم وكلمة مرور المدير من `.env`.
6. من **الإعدادات** أدخل هاتف الإدارة، رقم واتساب، ورابط سياسة الخصوصية
   (`https://admin.example.com/privacy.html` بعد مراجعة نصّها).

## 4) بعد أول تشغيل

- احذف `ADMIN_PASSWORD` من `.env` على السيرفر بعد تنفيذ `db:seed` (لا يُقرأ بعدها).
- أضف مدرسة ← مساراً ← سائقاً (تظهر كلمة مروره المؤقتة مرة واحدة) ← أسند السائق للمسار ← أضف الطلاب
  (يُنشأ حساب ولي الأمر تلقائياً وتظهر كلمة مروره المؤقتة مرة واحدة) ← أسند الطلاب للمسار.

## 5) التحديث لاحقاً

```bash
cd ~/htdocs/rakaz && git pull
cd packages/rakaz-api
npm ci && npm run build && npm run db:deploy
pm2 reload rakaz-api

cd ../../rakaz-dashboard
npm ci && VITE_RAKAZ_API_URL=https://api.example.com npm run build
cp -r dist/* ~/htdocs/admin.example.com/
```

## 6) النسخ الاحتياطي والمراقبة

- فعّل النسخ الاحتياطي لقاعدة البيانات من CloudPanel (**Backups**) أو:

```bash
mysqldump -u rakaz -p rakaz | gzip > rakaz-$(date +%F).sql.gz
```

- السجلات: `pm2 logs rakaz-api`. الحالة: `pm2 status`.
- مواقع الحافلات الأقدم من ٣٠ يوماً وسجل مواقع السائقين الأقدم من ٩٠ يوماً تُحذف تلقائياً.
- خدمة العناوين العامة في OpenStreetMap للاستخدام الخفيف (طلب واحد بالثانية تقريباً). أسطول من عشرات السائقين
  ضمن الحد؛ لأسطول أكبر شغّل Nominatim خاصاً بك وضع عنوانه في `OSM_NOMINATIM_URL`.

## قائمة ما قبل الإطلاق

- [ ] `https://api.example.com/api/v1/health` يرد.
- [ ] `JWT_ACCESS_SECRET` قيمة عشوائية حقيقية، و`SWAGGER_ENABLED=false`، و`SEED_DEMO=false`.
- [ ] `CORS_ORIGINS` يحوي عنوان اللوحة فقط.
- [ ] صفحة «الرحلات الحية» في اللوحة تتحدث دون إعادة تحميل (يثبت أن SSE يمر عبر nginx).
- [ ] `EXPO_PUBLIC_RAKAZ_API_URL` في `eas.json` للتطبيقين يشير إلى `https://api.example.com`.
- [ ] وقت دوام السائقين مضبوط من **الإعدادات** في اللوحة (الافتراضي: الأحد–الخميس 06:00–15:00).
- [ ] تمت مراجعة نص سياسة الخصوصية ووضع رابطها في الإعدادات وفي صفحتي التطبيقين بالمتاجر.
- [ ] نسخ احتياطي يومي لقاعدة البيانات مفعّل.
