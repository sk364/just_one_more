module.exports = {
  apps: [
    {
      name: "sportorg-frontend",
      cwd: "./frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "sportorg-celery",
      cwd: "./backend",
      script: ".venv/bin/celery",
      args: "-A config worker -l info -Q celery --concurrency=2",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        DJANGO_SETTINGS_MODULE: "config.settings.production",
      },
    },
    {
      name: "sportorg-celery-beat",
      cwd: "./backend",
      script: ".venv/bin/celery",
      args: "-A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "128M",
      env: {
        DJANGO_SETTINGS_MODULE: "config.settings.production",
      },
    },
  ],
};
