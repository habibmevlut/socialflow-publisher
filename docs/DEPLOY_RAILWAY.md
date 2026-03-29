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

1. Proje içinde **+ New** (veya **Create**) → **Database** → **Add Redis** (veya şablondan Redis).
2. Oluşan **Redis** kutucuğuna tıkla → üstte **Variables** sekmesi → listede **`REDIS_URL`** görünmeli (değer `redis://...` gibi). **Kopyalamana gerek yok** — birazdan API’de “referans” ile bağlayacağız.

---

## 3.5 Adım 1–3 doğru mu? (API’ye geçmeden)

Railway proje ekranında **üç ayrı kutu** görmelisin:

| Kutu | Beklenen |
|------|-----------|
| **PostgreSQL** | Tıklayınca Variables’ta `DATABASE_URL` var |
| **Redis** | Variables’ta `REDIS_URL` var |
| (isteğe bağlı) İlk açılışta oluşan **boş / hatalı servis** | Bunu **API’ye çevireceğiz** veya **silip** yeni servis ekleyeceğiz |

Eğer sadece Postgres + Redis var, **henüz kod deploy olmadı** — normal. API servisini bir sonraki bölümde ekliyorsun.

---

## 4. API servisi (adım adım)

Burada amaç: **aynı GitHub repo**sunu, **Dockerfile.api** ile build edip dışarıdan **HTTPS URL** almak.

### 4.1 Servisi ekle

1. Proje boşluğunda **+ New** → **GitHub Repo** (veya **Service** → **GitHub Repo**).
2. Repo olarak **`socialflow-publisher`** seç (zaten bağlıysa listeden seç).
3. Railway bir **yeni servis** oluşturur; adını istersen **api** yap (kutucuğa tıkla → isim).

**Önemli:** İlk deploy **başarısız** olabilir — sıradaki adımda build tipini düzelteceğiz.

### 4.2 Build’ın Docker olması (çoğu kişi burada takılıyor)

1. **api** servisine tıkla → sol veya üstte **Settings** (Ayarlar).
2. **Build** bölümünü bul:
   - **Builder** → **Dockerfile** seç (Nixpacks / Railpack değil).
   - **Dockerfile path** → tam yaz: **`Dockerfile.api`**
3. **Root directory** varsa **boş bırak** veya **`/`** — monorepo kökü repodur; `Dockerfile.api` da kökte.
4. **Save** / değişikliklerin kaydedildiğinden emin ol.
5. **Deployments** sekmesine dön → **Redeploy** (veya otomatik yeni deploy başlar).

Build logunda `docker build` ve `turbo run build --filter=@socialflow/api` benzeri satırlar görmelisin. Hata olursa logun son 30 satırına bak.

### 4.3 Ortam değişkenleri (Variables)

**api** servisi → **Variables** sekmesi.

**Önce zorunlu minimum** (bunlar olmadan API ayakta kalkmaz):

| Değişken | Nasıl girilir |
|----------|----------------|
| `DATABASE_URL` | **Add Reference** → listeden **PostgreSQL** servisini seç → **`DATABASE_URL`** |
| `REDIS_URL` | **Add Reference** → **Redis** → **`REDIS_URL`** |
| `AUTH_SECRET` | Elle yapıştır — **Vercel ve yerel `.env` ile aynı** olmalı (NextAuth JWT imzası). |

**Uygulama davranışı için** (OAuth’suz bile tutarlı olsun diye):

| Değişken | Örnek |
|----------|--------|
| `WEB_BASE_URL` | `https://socialflow-publisher.vercel.app` (OAuth bittikten sonra yönlendirme) |

**Railway `PORT`:** Eklemene gerek yok — Railway verir, API zaten `PORT` ile dinliyor.

**OAuth ve depolama** (hangi platformu kullanacaksan o satırlar):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `INSTAGRAM_*`, `FACEBOOK_*`, `TIKTOK_*` … — yereldeki `.env` ile aynı mantık.
- **MinIO / video:** `MINIO_*` ve **`MINIO_PUBLIC_BASE_URL`** — ilk kurulumda yoksa video yükleme çalışmaz; sadece `GET /health` ve DB ile test etmek istiyorsan sonra da ekleyebilirsin.

**`TIKTOK_REDIRECT_BASE` / Meta URL’leri — henüz yazma (4.4’te):**  
Public adresi henüz bilmiyorsun; domain ürettikten sonra tek seferde yazacaksın.

### 4.4 Public URL ve redirect adresleri

1. **api** servisi → **Settings** → **Networking** (veya **Public Networking**).
2. **Generate Domain** → Railway sana bir adres verir, örn.  
   `https://socialflow-api-production-xxxx.up.railway.app`
3. Bu adresin **sadece kökünü** kopyala:  
   - Sonunda **`/` yok**  
   - `https://` **var**

4. **Variables**’a dön, **yeni** veya güncelle:
   - `TIKTOK_REDIRECT_BASE` = bu kök (örn. `https://socialflow-api-production-xxxx.up.railway.app`)
   - Meta kullanıyorsan: `INSTAGRAM_REDIRECT_BASE`, `FACEBOOK_REDIRECT_BASE` çoğu kurulumda **aynı kök** (Meta konsolunda kayıtlı olanla birebir).

5. **Deploy** yenilensin (env değişince genelde otomatik).

6. Tarayıcıda test:  
   `https://senin-api-adresin/health`  
   → JSON benzeri bir cevap görmelisin (proje `/health` endpoint’i var).

7. TikTok / Meta developer portallarında Redirect URI:  
   `https://<PUBLIC_API_DOMAIN>/auth/tiktok/callback`  
   (ve YouTube / Instagram / Facebook için projedeki path’ler — `auth-youtube` vb. dokümantasyonda).

### 4.5 Sık hatalar

| Durum | Ne yap |
|-------|--------|
| Build “No start command” / Node bulamadım | Builder **Dockerfile** mi, path **`Dockerfile.api`** mi kontrol et |
| Container exit / crash | **Variables**’ta `DATABASE_URL` ve `REDIS_URL` referansı gerçekten bu serviste görünüyor mu |
| `/health` açılmıyor | **Networking**’te domain ürettin mi; URL’de typo var mı |
| OAuth “redirect_uri mismatch” | TikTok/Meta’daki URI **karakter karakter** API public URL + `/auth/.../callback` ile aynı mı |
| Referans göremiyorum | Önce projede Postgres ve Redis servislerinin **aynı projede** olduğundan emin ol; Reference bazen servis adıyla listelenir |

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
