# ركاز السائق — React Native

تطبيق السائق (Expo + TypeScript + expo-router). يتصل بـ `rakaz-api` ويعمل دون اتصال ثم يزامن تلقائياً.

## التشغيل

```bash
cp .env.example .env    # EXPO_PUBLIC_RAKAZ_API_URL وباقي المتغيرات
npm install
npx expo start          # يحتاج development build (لا يعمل على Expo Go بسبب الموقع بالخلفية)
npm run typecheck
```

الحساب تصدره الإدارة من لوحة التحكم (صفحة السائقون) بكلمة مرور مؤقتة، ويُطلب من السائق تغييرها عند أول دخول.

على هاتف حقيقي أثناء التطوير اجعل `EXPO_PUBLIC_RAKAZ_API_URL` عنوان حاسوبك على الشبكة، مثل `http://192.168.1.20:8787`.

## البناء للمتاجر (EAS)

```bash
npx eas-cli login
npx eas-cli init                      # ينشئ المشروع ويطبع EAS_PROJECT_ID
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all
```

قبل البناء:
- عدّل `EXPO_PUBLIC_RAKAZ_API_URL` في `eas.json` (profiles: `preview`, `production`) إلى عنوان الـ API الحقيقي (HTTPS).
- أضف `GOOGLE_MAPS_API_KEY` و`EAS_PROJECT_ID` كمتغيرات بيئة في EAS (`eas env:create`).
- للإشعارات على أندرويد ارفع مفتاح FCM V1 إلى EAS (`eas credentials`).

المعرّف: `com.alsultan.rikaz.driver` (iOS و Android). **لا يمكن تغييره بعد أول رفع للمتجر.**

### الموقع بالخلفية

أثناء الرحلة فقط يرسل التطبيق موقع الباص كل ~10 ثوانٍ حتى لو كانت الشاشة مقفلة
(`services/busTracking.ts`). يظهر للسائق شرح داخل التطبيق قبل طلب صلاحية «دائماً»
(`components/LocationDisclosure.tsx`)، وهو مطلوب من Google Play و App Store. إذا رفض السائق الصلاحية
يستمر الإرسال والتطبيق مفتوح فقط.

عند الرفع للمتاجر ستحتاج:
- **Google Play**: تعبئة نموذج Background location مع فيديو قصير يوضح الميزة.
- **App Store**: توضيح سبب `UIBackgroundModes: location` في ملاحظات المراجعة.

## القواعد

- **Offline-first**: كل إجراء يُحفظ محلياً ويُضاف لقائمة الانتظار مع وقته وموقعه ونوع الرحلة، ثم يُرسل
  تلقائياً عند عودة الاتصال مع إعادة المحاولة. السيرفر يتجاهل المكرر.
- **السيرفر مصدر الحقيقة** للمسار والطلاب والغياب. الجهاز مصدر الحقيقة للرحلة الجارية عليه.
- **رحلة العودة** بترتيب عكسي وتشمل فقط من استُلم صباحاً.
- **الموقع**: GPS إن كان ضمن 60 كم من المدرسة، وإلا موقع المحطة مع `isEstimatedLocation = true`.
- **الجلسة** محفوظة في Keychain / Keystore عبر `expo-secure-store`.
- **RTL إجباري** عبر `I18nManager.forceRTL(true)` وإضافة `expo-localization`.

## البنية

| المسار | الوظيفة |
| --- | --- |
| `services/api.ts` | عميل الـ API والجلسة |
| `services/sync.ts` | رفع الأحداث وجلب الغياب |
| `services/busTracking.ts` | مشاركة موقع الباص (واجهة + خلفية) |
| `services/push.ts` | تسجيل الإشعارات الفورية |
| `services/serverMapping.ts` | تحويل بيانات السيرفر إلى نماذج التطبيق |
| `store/driverStore.ts` | حالة التطبيق وكل الإجراءات |
| `app/*` | الشاشات |
