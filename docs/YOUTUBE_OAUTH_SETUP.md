# YouTube OAuth + Video Upload Kurulumu

## 1. YouTube Data API v3 Etkinleştirme

1. [Google Cloud Console](https://console.cloud.google.com/) → Proje oluştur veya seç
2. **APIs & Services** → **Library**
3. "YouTube Data API v3" ara → **Enable** tıkla

> Video yükleme için bu API zorunludur. Etkin değilse upload çalışmaz.

## 2. OAuth Client Oluşturma

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. İlk kez ise **Configure consent screen**:
   - User Type: **External** (test için)
   - Gerekli alanları doldur
   - **Test users** bölümüne kendi Gmail adresini ekle
3. Application type: **Web application**
4. **Authorized redirect URIs** ekle:
   - Local: `http://localhost:4000/auth/youtube/callback`
   - Production: `https://your-api-domain.com/auth/youtube/callback`
5. **Create** → Client ID ve Secret'ı kopyala

## 3. .env Tanımları

Proje kökündeki `.env` dosyasına ekle (API ve Worker ikisi de bu dosyayı kullanır):

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3001
```

> `API_BASE_URL` Worker için de gerekli (token refresh sırasında redirect URI eşleşmesi).

## 4. Kontrol

- YouTube bağlama: Web'de "YouTube Bağla" → Google ile giriş
- Video upload: Post oluştur → "Şimdi yayınla" → Worker videoyu YouTube'a yükler (varsayılan: private)
