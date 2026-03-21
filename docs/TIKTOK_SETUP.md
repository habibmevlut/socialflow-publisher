# TikTok OAuth + Video Upload Kurulumu

## Gereksinimler

- TikTok for Developers hesabi (business email)
- Content Posting API erisimi

## 1. TikTok Uygulamasi Olusturma

1. [developers.tiktok.com](https://developers.tiktok.com/) → **Create an app**
2. **Login Kit** veya **Content Posting API** sec
3. Uygulama adi gir, olustur

## 2. Content Posting API Ayarlari

1. **Add products** → **Content Posting API** ekle
2. **Scopes**: `user.info.basic`, `video.publish` iste
3. **Redirect URIs** ekle (TikTok query parametre kabul etmez, statik URL):
   - Local: `https://xxx.loca.lt/auth/tiktok/callback` (localtunnel URL)
   - Production: `https://API_BASE_URL/auth/tiktok/callback` (API deploy URL'in)

## 3. TikTok Developer Portal – Web / Terms / Privacy URL'leri

TikTok uygulama ayarlarinda su URL'leri ekle:

| Alan | Production degeri |
|------|-------------------|
| **Website URL** | `https://socialflow-publisher.vercel.app` |
| **Terms of Service** | `https://socialflow-publisher.vercel.app/terms` |
| **Privacy Policy** | `https://socialflow-publisher.vercel.app/privacy` |

## 4. .env Tanimlari

### Local (tunnel gerekli)

```env
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx
# TikTok redirect icin tunnel URL (Instagram ile ayni kullanilabilir)
TIKTOK_REDIRECT_BASE=https://xxx.loca.lt
# veya INSTAGRAM_REDIRECT_BASE zaten varsa otomatik kullanilir
```

### Production (API deploy edildikten sonra)

**API sunucusunda (.env):**

```env
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx
TIKTOK_REDIRECT_BASE=https://api.yourdomain.com
WEB_BASE_URL=https://socialflow-publisher.vercel.app
```

**Vercel (Environment Variables):**

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 5. Video URL (PULL_FROM_URL)

TikTok PULL_FROM_URL kullaniyor. Video URL **public** olmali (Instagram gibi).

- Local: `MINIO_PUBLIC_BASE_URL` ile MinIO'yu ac (localtunnel port 9000)
- Production: MinIO veya S3 public URL
- **Onemli**: PULL_FROM_URL icin TikTok Developer Portal'da **domain verification** gerekebilir. Audited olmayan uygulamalar sadece private hesaba post atar.

## 6. Notlar

- Audited olmayan uygulamalar: Tum postlar **private** (SELF_ONLY) gorunur
- Gunluk 5 kullanici yetkilendirme limiti (development)
- Token: 24 saat gecerlidir, refresh_token ile yenilenir
- Rate limit: 6 istek/dakika (publish), 30 istek/dakika (status)
