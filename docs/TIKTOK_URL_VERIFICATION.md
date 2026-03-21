# TikTok URL Doğrulama

TikTok Developer Portal'da Terms, Privacy ve Web URL'leri "not verified" hatası veriyorsa bu adımları izle.

## 1. URL Properties Sayfasına Git

1. [developers.tiktok.com](https://developers.tiktok.com/) → **Manage apps** → Uygulamanı seç
2. Sayfanın **üst kısmında** **"URL properties"** veya **"Verify URL properties"** butonuna tıkla
3. Bu sayfada domain veya URL prefix doğrulaması yapılır

## 2. Domain ile Doğrulama (Önerilen)

Tüm URL'leri tek seferde doğrulamak için **domain** doğrulaması kullan:

1. **Verify by Domain** seç
2. Domain gir: `socialflow-publisher.vercel.app` (https:// olmadan)
3. **Verify** tıkla
4. TikTok bir **DNS TXT kaydı** veya **imza dosyası** verecek

### DNS TXT Kaydı Verirse

- Vercel'de custom domain kullanıyorsan: Domain ayarlarından DNS'e TXT kaydı ekle
- `vercel.app` subdomain kullanıyorsan: Vercel DNS'e erişim yok; **URL prefix** doğrulaması kullan

### İmza Dosyası Verirse

1. TikTok'tan indirilen dosyayı (örn. `tiktok_verify_xxxxx.html`) `apps/web/public/` klasörüne kopyala
2. Deploy et: `npx vercel --prod`
3. `https://socialflow-publisher.vercel.app/tiktok_verify_xxxxx.html` erişilebilir olmalı
4. TikTok'ta **Verify** tıkla

## 3. URL Prefix ile Doğrulama

Her URL için ayrı doğrulama gerekebilir:

| URL | Doğrulama |
|-----|-----------|
| `https://socialflow-publisher.vercel.app` | Ana domain – imza dosyası `public/` içine |
| `https://socialflow-publisher.vercel.app/terms` | Terms sayfası – imza dosyası `public/terms/` veya meta tag |
| `https://socialflow-publisher.vercel.app/privacy` | Privacy sayfası – aynı şekilde |

TikTok her URL için farklı bir imza dosyası verebilir. Dosyayı indir, `apps/web/public/` altına uygun yere koy (örn. `public/terms/tiktok_verify_xxx.html` → `/terms/tiktok_verify_xxx.html`).

## 4. Vercel Custom Domain + DNS

`socialflow-publisher.vercel.app` yerine kendi domain kullanıyorsan (örn. `app.socialflow.com`):

1. Domain sağlayıcında DNS ayarlarına gir
2. TikTok'un verdiği TXT kaydını ekle
3. Propagasyon 5–30 dakika sürebilir
4. TikTok'ta **Verify** tıkla

## Notlar

- `vercel.app` subdomain'de DNS TXT eklenemez; bu yüzden **imza dosyası** yöntemi kullanılmalı
- İmza dosyası genelde `tiktok_verify_*.html` formatındadır
- Deploy sonrası URL'nin erişilebilir olduğundan emin ol
