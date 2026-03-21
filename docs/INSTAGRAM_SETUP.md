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

## 6. Video URL Gereksinimi

Instagram API videoyu **public URL** üzerinden çeker. Meta sunuculari localhost'a erisemez. Local'de `ngrok http 9000` calistirip `.env`'de `MINIO_PUBLIC_BASE_URL` ayarlayin. MinIO bucket’ı public olmalı (zaten ayarlı).

## Notlar

- İlk bağlantıda **Standard Access** yeterli (kendi hesapların için)
- Başka kullanıcı hesapları için **Advanced Access** + App Review gerekir
- Reels için video URL public erişilebilir olmalı
- **ngrok** free tier’da her çalıştırmada URL değişir; `.env` ve Meta’yı güncelle
