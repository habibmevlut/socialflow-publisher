# Instagram: "Only photo or video can be accepted as media type"

Bu hata genelde **medya URL'sine Meta crawler erişemediğinde** oluşur.

## Olası nedenler

| Neden | Çözüm |
|-------|-------|
| Cloudflare Quick Tunnel (`trycloudflare.com`) | `ERR_CERT_AUTHORITY_INVALID` — ngrok kullan |
| robots.txt veya CDN bot engeli | Meta crawler’a izin ver |
| Yanlış format (PNG, WebP) | API PNG/WebP’yi JPEG’e dönüştürüyor; yeni upload’lar geçmeli |

## MinIO için tunnel (önerilen: ngrok)

### ngrok (ücretsiz hesap gerekli)

1. [ngrok.com](https://ngrok.com) → **Sign up** (ücretsiz)
2. [Dashboard → Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) → token'ı kopyala
3. `ngrok config add-authtoken TOKEN`
4. `ngrok http 9000`

`.env`:
```
MINIO_PUBLIC_BASE_URL=https://xxxx.ngrok-free.app
```

### localtunnel (hesap gerekmez)

```bash
npx localtunnel --port 9000
```

Çıktıdaki `https://xxx.loca.lt` adresini al. `.env`: `MINIO_PUBLIC_BASE_URL=https://xxx.loca.lt` (bucket path otomatik eklenir).

Cloudflare Quick Tunnel (`trycloudflare.com`) kullanmayın — SSL hatası, Meta crawler medyayı indiremez.

## Test

Meta crawler’ın URL’e erişip erişemediğini kontrol et:

```bash
curl -I -A "facebookexternalhit/1.1" https://SENIN_MEDYA_URL.jpg
```

`200 OK` ve `Content-Type: image/jpeg` görmelisin.
