# MinIO için tunnel (Instagram resim/video için)

Instagram medyayı **public URL** üzerinden çeker. Local'de MinIO (port 9000) bir tunnel ile dışarı açılmalı.

## Seçenek A: ngrok (önerilen — Meta crawler ile uyumlu)

### 1. Tek seferlik kurulum

1. [ngrok.com](https://ngrok.com) → ücretsiz hesap aç
2. [Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) sayfasından token'ı kopyala
3. Terminal: `ngrok config add-authtoken BURAYA_TOKEN_YAPIŞTIR`

### 2. Her geliştirme oturumunda

**Terminal 1:**
```bash
nvm use
pnpm dev
```

**Terminal 2:**
```bash
pnpm tunnel:minio:ngrok
# veya doğrudan: ngrok http 9000
```

Çıktıda: `Forwarding   https://xxxx-xx-xx.ngrok-free.app -> http://localhost:9000`

### 3. .env

```
MINIO_PUBLIC_BASE_URL=https://xxxx-xx-xx.ngrok-free.app
```

### 4. API restart

`.env` değişti → Terminal 1'de Ctrl+C, sonra tekrar `pnpm dev`.

---

## Seçenek B: localtunnel (hesap yok, test için)

```bash
nvm use
pnpm tunnel:minio
```

`.env`: `MINIO_PUBLIC_BASE_URL=https://xxx.loca.lt`

**Not:** Localtunnel "Friendly Reminder" sayfası gösterebilir; Meta crawler bu sayfayı geçemeyebilir. Instagram paylaşımı çalışmazsa ngrok kullan.

---

## Özet

| Terminal 1 | Terminal 2 |
|------------|------------|
| `pnpm dev` | `ngrok http 9000` veya `pnpm tunnel:minio` |

URL her seferinde değişir → `.env` güncelle → API restart.
