# Instagram OAuth + Reel Upload Kurulumu

## Gereksinimler

- **Instagram Business** veya **Creator** hesabı
- Meta for Developers hesabı

## 1. Meta Uygulaması Oluşturma

1. [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **Create App**
2. **Business** tipini seç
3. Uygulama adı gir, **Create App** tıkla

## 2. Instagram Ürününü Ekleme

1. **App Dashboard** → **Add Product**
2. **Instagram** → **Set Up**
3. **API setup with Instagram login** seç
4. **Business login** bölümüne git

## 3. Business Login Ayarları

Meta **localhost** kabul etmiyor. **ngrok** kullan (localtunnel yerine – daha stabil, şifre sayfası yok).

### Local Development (ngrok)

```bash
# Terminal 1: Projeyi başlat
pnpm dev

# Terminal 2: Tunnel başlat
pnpm tunnel
# Çıktı: Forwarding https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:4000
```

**OAuth redirect URI** (Meta’da ekle):
- Local: `https://xxxx.ngrok-free.app/auth/instagram/callback` (pnpm tunnel çıktısındaki URL)
- Production: `https://your-api-domain.com/auth/instagram/callback`

### Production

Production’da tunnel gerekmez. API’yi gerçek domain’e deploy et:

```
INSTAGRAM_REDIRECT_BASE=https://api.yourdomain.com
```

Meta’da bu URL’i **Valid OAuth Redirect URIs** listesine ekle.

## 4. .env Tanımları

```env
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
# Local: ngrok URL (pnpm tunnel çıktısından)
# Production: https://api.yourdomain.com
INSTAGRAM_REDIRECT_BASE=https://xxxx.ngrok-free.app
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3001
```

## 5. App Roles & Instagram Tester

- **App roles** → **Administrators**: Meta uygulamasını yöneten hesaplar
- **Instagram Testers**: OAuth ile bağlanacak Instagram hesapları burada olmalı
  - **Add** → Instagram kullanıcı adı veya e-posta gir
  - Davet **Pending** ise: Instagram’da **Ayarlar** → **Uygulamalar ve web siteleri** → **Tester davetleri** → Kabul et

## 6. Media URL Gereksinimi (Video + Resim + Carousel)

Instagram API medyayı **public HTTPS URL** üzerinden çeker. Meta sunuculari localhost'a erisemez. **ngrok** (authtoken gerekli — [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)) veya **localtunnel** (`npx localtunnel --port 9000`, hesap yok). Cloudflare Quick Tunnel değil. `.env`: `MINIO_PUBLIC_BASE_URL=https://xxx.ngrok-free.app` veya `https://xxx.loca.lt`. MinIO bucket’ı public olmalı (zaten ayarlı).

## OAuth Redirect URI nerede eklenir?

1. **Meta Dashboard** → Uygulamanı seç
2. Sol menü: **Use cases** > **Customize** → **Instagram API** sekmesi
3. **API setup with Instagram login** seç
4. **Step 4: Set up Instagram business login** bölümünde **"Business login settings"** linkine tıkla
5. **OAuth redirect URIs** kısmına tam URL ekle (örn: `https://xxx.trycloudflare.com/auth/instagram/callback`)
6. **Save** tıkla

## 7. Hata: "Only photo or video can be accepted as media type"

Detaylı çözüm: [INSTAGRAM_MEDIA_URL_TROUBLESHOOTING.md](./INSTAGRAM_MEDIA_URL_TROUBLESHOOTING.md). Özet: MinIO için **ngrok** kullanın, Cloudflare tunnel değil.

## 8. Hata: "Invalid platform app"

Bu hata genelde Meta uygulaması yapılandırmasından kaynaklanır.

### Kontrol listesi

1. **App ID doğru mu?** Meta for Developers → **My Apps** → Uygulama → **Settings** → **Basic** → **App ID**. Bu değer `INSTAGRAM_APP_ID` ile aynı olmalı. Ayrı "Instagram App ID" yok; Meta App ID kullanılır.

2. **Instagram ürünü** App Dashboard → **Add Product** → **Instagram** → **API setup with Instagram login** → **Business login** yapılandırıldı mı?

3. **Valid OAuth Redirect URIs** tam URL eklendi mi? Örn: `https://xxx.ngrok-free.app/auth/instagram/callback` (trailing slash yok).

4. **INSTAGRAM_REDIRECT_BASE** ile callback URL tutarlı mı? `INSTAGRAM_REDIRECT_BASE=https://xxx.ngrok-free.app` ise callback `https://xxx.ngrok-free.app/auth/instagram/callback` olur.

5. **Instagram Testers** eklendi ve davet kabul edildi mi? App roles → Instagram Testers → Add. Pending daveti Instagram'da kabul et.

6. Uygulama tipi **Business** olmalı.

## Notlar

- İlk bağlantıda **Standard Access** yeterli (kendi hesapların için)
- Başka kullanıcı hesapları için **Advanced Access** + App Review gerekir
- Reels için video URL public erişilebilir olmalı
- **ngrok** free tier’da her çalıştırmada URL değişir; `.env` ve Meta’yı güncelle
