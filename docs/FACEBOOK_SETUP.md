# Facebook Paylaşım Kurulumu

Facebook Page'e video/resim paylaşmak için Meta (Facebook) Developer uygulaması gerekir. Instagram ile aynı Meta uygulaması kullanılabilir.

## 1. Meta Developer Portal

1. [developers.facebook.com](https://developers.facebook.com/) → Uygulamanı seç (Instagram için kullandığın)
2. **Add Product** → **Facebook Login** ekle (yoksa)
3. **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs**:
   - `https://TUNNEL_URL/auth/facebook/callback` (local)
   - `https://API_URL/auth/facebook/callback` (production)

## 2. İzinler (Permissions)

**App Review** veya **App Roles** → şu izinleri ekle:
- `pages_manage_posts` – Sayfaya post atma
- `pages_read_engagement` – Sayfa bilgisi
- `pages_show_list` – Kullanıcının sayfalarını listeleme

## 3. .env

```env
# Instagram ile aynı Meta uygulaması kullanilabilir
FACEBOOK_APP_ID=942453968474175
FACEBOOK_APP_SECRET=2e64e1fa9b0b473d4ce0c7a08ed37830
# Redirect base (tunnel veya API URL)
FACEBOOK_REDIRECT_BASE=https://xxx.loca.lt
```

## 4. Notlar

- Kullanıcı **Facebook Page** sahibi veya yöneticisi olmalı
- Video URL **public** olmalı (MinIO için tunnel)
- Facebook Reels için ayrı endpoint; şu an standart video post
