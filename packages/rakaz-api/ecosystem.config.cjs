/**
 * pm2 process file. Run from this folder:  pm2 start ecosystem.config.cjs
 *
 * Keep `instances: 1` and fork mode: live dashboard updates are fanned out in memory,
 * so a second process would miss events raised in the first.
 */
module.exports = {
  apps: [
    {
      name: 'rakaz-api',
      script: 'dist/main.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
