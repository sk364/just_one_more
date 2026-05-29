# Just One More

> Organise your sports games — better than a WhatsApp thread.

A PWA for recurring sports group coordination. Share a link, collect RSVPs, track payments, form teams, and send push notifications to players — all without the chaos of a group chat.

---

## Features

- **Groups & invites** — create a group, share an invite link, members join with one tap
- **Game management** — schedule games with location, cost, and player limits
- **RSVP flow** — shareable game links; players join/leave, waitlist promotes automatically
- **Payment tracking** — manual paid/pending/waived status per player, visible inline
- **Team formation** — drag-and-drop team builder with player suggestions
- **Calendar view** — month view of all games across groups, colour-coded by status
- **Analytics** — attendance trends, top players, game frequency per group
- **Push notifications** — game reminders, cancellations, payment nudges, custom messages delivered to the phone's notification bar
- **PWA** — installable on Android and iPhone, works offline for cached views

---

## Local Development

### Prerequisites

- Python 3.13 (`pyenv` or `mise`)
- Node 24 (`nvm`)
- PostgreSQL 16
- Redis

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Create database
createdb just_one_more

# Copy and fill in env
cp .env.example .env

# Run migrations
uv run python manage.py migrate

# Start dev server
uv run python manage.py runserver
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill in env
cp .env.local.example .env.local

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000`, API at `http://localhost:8000`.

> In development, Celery tasks run synchronously (`CELERY_TASK_ALWAYS_EAGER = True`) — no Redis or worker needed.

---

## Environment Variables

### Backend (`backend/.env`)

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=<50-char random string>
DEBUG=True
DATABASE_URL=postgresql://localhost/just_one_more
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
REDIS_URL=redis://localhost:6379/0
VAPID_PRIVATE_KEY=<base64url raw EC private key>
VAPID_PUBLIC_KEY=<base64url uncompressed EC public key>
VAPID_EMAIL=mailto:you@example.com
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key as above>
```

> Leave `NEXT_PUBLIC_API_URL` empty to use the built-in Next.js proxy (`/api/*` → `http://localhost:8000/api/*`). Set it to a full URL only when the frontend and backend are on separate origins.

### Generating VAPID Keys

```bash
cd backend
source .venv/bin/activate
python - <<'EOF'
from py_vapid import Vapid
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64

v = Vapid()
v.generate_keys()

pub = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
priv_val = v.private_key.private_numbers().private_value

print("VAPID_PUBLIC_KEY=", base64.urlsafe_b64encode(pub).rstrip(b"=").decode())
print("VAPID_PRIVATE_KEY=", base64.urlsafe_b64encode(priv_val.to_bytes(32, "big")).rstrip(b"=").decode())
EOF
```

---

## Testing on a Phone (Local Network)

Push notifications require HTTPS. Use ngrok to get a trusted HTTPS URL:

```bash
# Start backend on all interfaces
cd backend && uv run python manage.py runserver 0.0.0.0:8000

# Build and start frontend on all interfaces
cd frontend && npm run build && npx next start -H 0.0.0.0 -p 3000

# Open HTTPS tunnel
ngrok http 3000
```

Open the ngrok HTTPS URL on your phone, install the PWA via browser menu, then enable notifications from Settings.

---

## Production

### Redis

Redis is required in production as the Celery message broker.

**macOS (Homebrew)**
```bash
brew install redis
brew services start redis
```

**Ubuntu / Debian**
```bash
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**Verify it's running**
```bash
redis-cli ping   # should return PONG
```

Set the URL in `backend/.env`:
```env
REDIS_URL=redis://localhost:6379/0
```

> In development, Redis is not needed — `CELERY_TASK_ALWAYS_EAGER = True` runs tasks synchronously in-process.

### App processes

Uses `gunicorn` for Django and `pm2` for Next.js + Celery workers.

```bash
# Start all processes
pm2 start ecosystem.config.js

# Run Django via gunicorn separately (add to pm2 or systemd)
cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

## API Overview

| Resource | Base path |
|---|---|
| Auth | `/api/v1/auth/` |
| Groups | `/api/v1/groups/` |
| Games | `/api/v1/games/` |
| Payments | `/api/v1/games/{id}/payments/` |
| Analytics | `/api/v1/analytics/` |
| Notifications | `/api/v1/notifications/` |
| Push | `/api/v1/notifications/push/` |
| Invite | `/api/v1/invite/{token}/` |
| RSVP link | `/api/v1/rsvp/{token}/` |
