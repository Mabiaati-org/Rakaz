import { execFileSync } from 'node:child_process';

/** Creates the test database if needed and brings its schema up to date before the suite runs. */
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL ?? 'mysql://root:rakaz_dev_root@127.0.0.1:33306/rakaz_test';
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
