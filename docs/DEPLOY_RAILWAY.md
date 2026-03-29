# Railway ile deploy (Socialflow)

Web panel **Vercel**’de kalır. **API** ve **worker** bu rehberle Railway’e gider.

## 0. Önkoşullar

- GitHub’da repo açık.
- Railway hesabı: [railway.app](https://railway.app)
- Vercel’de `NEXT_PUBLIC_API_URL` ve `NEXTAUTH_URL` sonra güncellenecek.

## 1. Proje oluştur

1. Railway → **New Project** → **Deploy from GitHub repo** → `socialflow-publisher` seç.
2. İlk oluşan boş servisi silebilir veya yapılandırmayı değiştirirsin (aşağıda iki servis ekliyoruz).

## 2. PostgreSQL

1. **New** → **Database** → **PostgreSQL**.
2. Postgres servisine gir → **Variables** → `DATABASE_URL` değerini kopyala (API ve worker’da kullanılacak).

İlk kurulumda şema:

```bash
# Yerel .env'de DATABASE_URL=Railway Postgres URL olacak sekilde:
pnpm db:push
# veya
pnpm db:seed   # gerekiyorsa
```

(Tümünü CLI’den yapmak istemezsen Railway Postgres’e bağlanıp `prisma migrate` akışını dokümante ettiğin gibi uygula.)

## 3. Redis

1. **New** → **database** veya **Redis** şablonu → **Redis** ekle.
2. Redis servisinde **Variables** içinde **`REDIS_URL`** üretilir (internal URL).

## 4. API servisi

1. **New** → **GitHub Repo** (aynı repo) veya mevcut repodan **+ Service** ile ikinci deploy.
2. Servis ayarları:
   - **Settings** → **Build** → **Dockerfile Path:** `Dockerfile.api`
   - **Settings** → (gerekirse) **Root Directory:** repo kökü `/` (boş).
3. **Variables** (Add Variable veya **Reference** ile Postgres/Redis’ten bağla):

   | Değişken | Kaynak |
   |----------|--------|
   | `DATABASE_URL` | PostgreSQL servisinden referans |
   | `REDIS_URL` | Redis servisinden referans |
   | `AUTH_SECRET` | Güçlü rastgele (Vercel / yerel ile aynı olmalı) |
   | `WEB_BASE_URL` | Örn. `https://socialflow-publisher.vercel.app` |
   | OAuth'lar | `GOOGLE_*`, `INSTAGRAM_*`, `TIKTOK_*`, `FACEBOOK_*` … |
   | `TIKTOK_REDIRECT_BASE` | **Public API URL** (https, sonunda `/` yok) |
   | `INSTAGRAM_REDIRECT_BASE` / `FACEBOOK_REDIRECT_BASE` | Aynı API kökü veya Meta’da kayıtlı adres |
   | MinIO | `MINIO_*` + **`MINIO_PUBLIC_BASE_URL`** (TikTok/Instagram için dışarıdan okunur URL; yoksa R2/S3) |

   Railway otomatik **`PORT`** verir; API bunu dinler.

4. Deploy bitince **public domain** aç: servis → **Settings** → **Networking** → **Generate Domain**. Çıkan adres örn. `https://socialflow-api-production.up.railway.app` → bu **`TIKTOK_REDIRECT_BASE`** ve Vercel **`NEXT_PUBLIC_API_URL`**.

5. TikTok / Meta portallarında Redirect URI:  
   `https://<PUBLIC_API_DOMAIN>/auth/tiktok/callback` (ve diğer platformlar).

## 5. Worker servisi

1. Yine **New** → aynı GitHub repo.
2. **Dockerfile Path:** `Dockerfile.worker`
3. **Variables:** API ile **aynı** `DATABASE_URL`, **aynı** `REDIS_URL`, aynı `AUTH_SECRET` (NextAuth token işleri gerekiyorsa), MinIO ve OAuth secret’ları (worker upload yapıyorsa TikTok/Google/Meta anahtarları gerekir — `.env` ile hizala).

Worker HTTP dinlemez; sadece kuyruk + DB + dış API’lere çıkar.

## 6. Vercel (web)

1. Proje → **Settings** → **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = Railway API public URL (sonunda `/` yok)
   - `NEXTAUTH_URL` = panel URL (`https://socialflow-publisher.vercel.app`)
   - `AUTH_SECRET` = API ile **aynı**
2. **Redeploy**.

## 7. Kontrol

- `GET https://<API>/health` (veya projede tanımlı health) cevap veriyor mu?
- Panelden giriş + basit bir işlem (OAuth hariç) API’ye gidiyor mu?
- Queue: Post yayınla → worker loglarında job işlendi mi?

## Sorun giderme

| Belirti | Kontrol |
|---------|---------|
| Worker job yok | API ve worker **`REDIS_URL`** aynı mı? |
| 502 / crash | `DATABASE_URL`, `PORT`, build log |
| OAuth redirect | `TIKTOK_REDIRECT_BASE` tam olarak public API kökü mü? Portal URI ile aynı path |

Genel env listesi: [DEPLOY.md](./DEPLOY.md)
