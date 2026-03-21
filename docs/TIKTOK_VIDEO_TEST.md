# TikTok Video Yükleme Test Rehberi

TikTok'a video yüklemeyi test etmek için iki yol var: **Local** (hızlı test) veya **Production**.

---

## Seçenek A: Local Test (Önerilen – önce bunu dene)

### 1. TikTok Developer Portal

1. [developers.tiktok.com](https://developers.tiktok.com/) → Uygulaman → **Login Kit** veya **Content Posting API** ayarları
2. **Redirect URIs** bölümüne ekle:
   ```
   https://XXX.ngrok-free.app/auth/tiktok/callback
   ```
   (XXX = ngrok başlattığında verdiği adres)

### 2. .env Ayarları

```env
# TikTok (Developer Portal'dan Client Key & Secret al)
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx

# API tunnel URL – ngrok ile alacaksın
TIKTOK_REDIRECT_BASE=https://XXX.ngrok-free.app

# Web (local)
WEB_BASE_URL=http://localhost:3001

# MinIO tunnel – video URL için (TikTok PULL_FROM_URL public URL ister)
MINIO_PUBLIC_BASE_URL=https://YYY.ngrok-free.app
```

### 3. Çalıştırma Sırası

**Terminal 1 – Altyapı:**
```bash
pnpm dev
```
(PostgreSQL, Redis, MinIO + API, Web, Worker)

**Terminal 2 – API tunnel (OAuth callback):**
```bash
pnpm tunnel
```
→ Çıkan URL'yi kopyala (örn. `https://abc123.ngrok-free.app`)  
→ `.env` → `TIKTOK_REDIRECT_BASE=https://abc123.ngrok-free.app`  
→ TikTok Portal → Redirect URI ekle

**Terminal 3 – MinIO tunnel (video URL):**
```bash
ngrok http 9000
```
→ Çıkan URL'yi kopyala  
→ `.env` → `MINIO_PUBLIC_BASE_URL=https://xyz789.ngrok-free.app`

### 4. Test Akışı

1. http://localhost:3001 aç
2. **+ TikTok Bağla** → OAuth tamamla
3. Video yükle → Post oluştur → **Yayınla**
4. Worker TikTok'a gönderir (videolar varsayılan olarak **private**)

---

## Seçenek B: Production Test

### Ön Koşullar

- API deploy (Railway, Render, Fly.io vb.)
- PostgreSQL (Neon, Supabase, Railway)
- Redis (Upstash, Railway)
- MinIO veya S3 (public video URL için)
- Worker deploy (API ile aynı veya ayrı sunucu)

### 1. TikTok Developer Portal

**Redirect URIs** ekle:
```
https://API_DOMAIN/auth/tiktok/callback
```
(örn. `https://socialflow-api.railway.app/auth/tiktok/callback`)

### 2. Environment Variables

**API sunucusu:**
```env
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx
TIKTOK_REDIRECT_BASE=https://API_DOMAIN
WEB_BASE_URL=https://socialflow-publisher.vercel.app
DATABASE_URL=...
REDIS_HOST=...
MINIO_PUBLIC_BASE_URL=...  # veya S3 public URL
```

**Vercel:**
```env
NEXT_PUBLIC_API_URL=https://API_DOMAIN
```

### 3. Test

1. https://socialflow-publisher.vercel.app aç
2. TikTok bağla → Video yükle → Yayınla

---

## Kontrol Listesi

- [ ] TikTok Developer Portal: Client Key & Secret alındı
- [ ] TikTok Developer Portal: Redirect URI eklendi
- [ ] .env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
- [ ] .env: TIKTOK_REDIRECT_BASE (tunnel veya API URL)
- [ ] .env: MINIO_PUBLIC_BASE_URL (video public URL)
- [ ] pnpm dev çalışıyor
- [ ] API tunnel (ngrok) çalışıyor
- [ ] MinIO tunnel çalışıyor
- [ ] TikTok hesabı bağlandı
- [ ] Video yüklendi ve yayınlandı

---

## Notlar

- **Private videolar:** Audited olmayan uygulamalarda videolar sadece **private** (SELF_ONLY) olur
- **Token süresi:** ~24 saat; süre dolunca tekrar "TikTok Bağla"
- **Domain verification:** PULL_FROM_URL için video URL domain'i TikTok'ta doğrulanmış olmalı (URL properties)
