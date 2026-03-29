# Socialflow Publisher

Sifirdan kurulan, kurumsal sosyal medya paylasim yonetimi MVP monoreposu.

**Yol haritasi:** [docs/ROADMAP.md](docs/ROADMAP.md) – Adim adim gelistirme plani

## Uygulamalar

- `apps/web`: Next.js panel
- `apps/api`: Fastify API
- `apps/worker`: BullMQ worker

## Kurulum

```bash
pnpm install
```

### Altyapi (Docker)

```bash
# Postgres + Redis (worker icin)
docker compose up -d postgres redis

# .env olustur (root'ta)
cp .env.example .env
# DATABASE_URL zaten ornek degerle ayarli

# Prisma migration + seed
cd apps/api && pnpm db:push && pnpm db:seed
cd ../..
```

### Calistirma

```bash
pnpm dev
```

## Uygulama adresleri

- Web: `http://localhost:3001`
- API health: `http://localhost:4000/health`
- YouTube OAuth: `docs/YOUTUBE_OAUTH_SETUP.md`

Web arayuzu API'ye `NEXT_PUBLIC_API_URL` (varsayilan: `http://localhost:4000`) uzerinden baglanir.

**Production / Docker:** [docs/DEPLOY.md](docs/DEPLOY.md) — Railway: [docs/DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md) (`Dockerfile.api`, `Dockerfile.worker`).

## API ornek

Seed sonrasi `demo-org-1` organizasyonu mevcut:

```bash
curl -X POST http://localhost:4000/v1/posts \
  -H "content-type: application/json" \
  -d '{
    "organizationId":"demo-org-1",
    "title":"Kampanya videosu",
    "videoUrl":"https://example.com/video.mp4",
    "targets":[
      {"platform":"youtube","accountId":"acc_yt_1","caption":"Yeni video","enabled":true}
    ]
  }'
```
