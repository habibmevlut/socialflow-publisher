# Production / barındırma

Daha önce **web** için [Vercel](https://vercel.com) kullanılmış (`socialflow-publisher.vercel.app`). **API** ve **worker** genelde ayrı servislerde çalışır; repoda bunun için Docker dosyaları var.

## Bileşenler

| Servis   | Ne işe yarar        | Tipik barındırma |
|----------|---------------------|------------------|
| `apps/web` | Next.js panel       | Vercel |
| `apps/api` | Fastify, OAuth, upload | Railway, Fly.io, Render, kendi VPS + Docker |
| `apps/worker` | BullMQ işleri      | İkinci bir konteyner / servis (Redis şart) |

**Railway adım adım:** [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)
| PostgreSQL | Prisma              | Neon, Supabase, Railway Postgres |
| Redis      | Kuyruk              | Upstash, Railway Redis |
| MinIO / S3 | Video dosyası       | Cloudflare R2, AWS S3, veya managed MinIO + **public** taban URL |

## Docker (API ve worker)

Monorepo kökünden:

```bash
docker build -f Dockerfile.api -t socialflow-api .
docker build -f Dockerfile.worker -t socialflow-worker .
```

Çalıştırırken platformda **ortam değişkenlerini** doldur (`.env.example` referans). Hostinger tarafında `PORT` verilir; API bunu dinler (`PORT` yoksa `API_PORT`, o da yoksa 4000).

## Ortam değişkenleri (özet)

Önce yerelde doldurduğun kök `.env` ile aynı mantık; production deperleri:

- `DATABASE_URL`, `REDIS_URL` (Railway) veya `REDIS_HOST` + `REDIS_PORT`
- `AUTH_SECRET`, OAuth secret’ları (Google, Meta, TikTok, …)
- `WEB_BASE_URL` → panelin kesin URL’si (örn. `https://socialflow-publisher.vercel.app`)
- `NEXT_PUBLIC_API_URL` → **sadece Vercel web projesinde**; kullanıcı tarayıcısının çağırdığı API kökü (`https://api.example.com`)
- `TIKTOK_REDIRECT_BASE` / `INSTAGRAM_REDIRECT_BASE` / `FACEBOOK_REDIRECT_BASE` → **HTTPS ile erişilen API kökü** (callback: `.../auth/.../callback`)
- `MINIO_*` veya S3 uyumlu endpoint + **`MINIO_PUBLIC_BASE_URL`** (TikTok / Instagram video URL’leri için dışarıdan okunabilir olmalı)

İlk kurulumda veritabanında şema için yerelde kullandığın `pnpm db:push` veya `prisma migrate deploy` sürecini production DB’ye uygula; seed ihtiyacına göre `db:seed`.

## Vercel (web)

- Repo bağlıysa **main**’i deploy et; **Environment Variables** içinde `NEXT_PUBLIC_API_URL` ve `NEXTAUTH_URL` (panel URL’si) güncel olsun.
- Monorepo için **Root Directory** çoğu kurulumda `apps/web` veya proje kökü + `apps/web/vercel.json` içindeki `buildCommand` (mevcut ayarları koru).

## TikTok / Meta redirect

Production’da Portal’daki **Redirect URI** = `https://<API_DOMAIN>/auth/tiktok/callback` ve `.env` / platform env’de **`TIKTOK_REDIRECT_BASE=https://<API_DOMAIN>`** (sonunda `/` yok).

## Sorun giderme

- `Invalid redirect`: Portal URI ile `TIKTOK_REDIRECT_BASE` + yol birebir mi?
- Worker job gitmiyor: API ve worker **aynı Redis**’i görüyor mu; `REDIS_HOST` container’da bazen servis adı olur (`redis`).
- Video yüklenmiyor: `MINIO_PUBLIC_BASE_URL` dış ağdan `GET` ile açılıyor mu?
