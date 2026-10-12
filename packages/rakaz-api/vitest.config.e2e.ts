import { defineConfig } from 'vitest/config';

// The e2e suite needs a disposable MySQL database; it wipes every table before running.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://root:rakaz_dev_root@127.0.0.1:33306/rakaz_test';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-0123456789',
      APP_TIMEZONE: 'Asia/Baghdad',
      CORS_ORIGINS: '',
      SWAGGER_ENABLED: 'false',
    },
  },
});
