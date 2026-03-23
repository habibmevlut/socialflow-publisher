# Video + Resim Medya Tipi Desteği – Tasarım Dokümanı

## Genel Bakış

Şu an Post modeli sadece `videoUrl` ile video destekliyor. Bu doküman **video + resim + çoklu resim (carousel)** desteğini best practice ile nasıl ekleyeceğimizi tanımlar.

---

## Platform Desteği Matrisi

| Platform   | Video | Tek Resim | Çoklu Resim (Carousel) | Notlar |
|-----------|-------|-----------|------------------------|--------|
| YouTube   | ✅    | ❌        | ❌                     | Sadece video |
| Instagram | ✅    | ✅        | ✅ (2–10)               | Reels/Video, PHOTO, CAROUSEL |
| TikTok    | ✅    | ❌        | ❌                     | Sadece video |
| Facebook  | ✅    | ✅        | ✅ (child_attachments)  | /videos, /photos, feed carousel |

---

## Önerilen Tasarım

### 1. Veri Modeli (Prisma)

**Medya tek tabloda tutulur – tek video, tek resim veya çoklu resim hepsi `PostMedia` üzerinden:**

```prisma
enum MediaType {
  video
  image
}

model Post {
  id             String    @id @default(cuid())
  organizationId String
  title          String
  mediaType      MediaType @default(video)
  status         String    @default("draft")
  scheduledAt    DateTime?
  createdById    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization Organization  @relation(...)
  createdBy    User?         @relation(...)
  targets      PostTarget[]
  media        PostMedia[]
}

model PostMedia {
  id        String   @id @default(cuid())
  postId    String
  mediaUrl  String
  sortOrder Int      @default(0)  // carousel sirasi
  mimetype  String?

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@index([postId])
}
```

**Kurallar:**
- `mediaType=video` → Post.media tam 1 kayıt (video URL)
- `mediaType=image` → Post.media 1 kayıt (tek resim) veya 2–10 kayıt (carousel)
- Carousel: sadece Instagram ve Facebook destekler

**Migration stratejisi:**
1. `PostMedia` tablosu ekle
2. `Post.mediaType` ekle (default: video)
3. Mevcut `videoUrl` değerlerini `PostMedia` tablosuna tek satır olarak taşı
4. `Post.videoUrl` kolonunu kaldır

### 2. Depolama (MinIO)

**Path yapısı:**
```
{videos|images}/{timestamp}-{random}.{ext}
```

- `videos/` → mp4, mov, webm, avi
- `images/` → jpeg, jpg, png, webp

**Kısıtlamalar:**
- Video: 500MB (mevcut)
- Resim: 20MB (her biri; platform limitleri düşünülerek)
- Carousel: toplam en fazla 10 resim

### 3. API Değişiklikleri

#### Upload endpoint (`/v1/media/upload`)

**Tek dosya (mevcut davranış):**
```ts
POST /v1/media/upload
Content-Type: multipart/form-data
file: File

// Response
{ url: string, mediaType: "video" | "image", mimetype: string }
```

**Çoklu dosya (carousel için):**
```ts
POST /v1/media/upload
Content-Type: multipart/form-data
files: File[]   // veya files[0], files[1], ...

// Response
{
  uploads: Array<{
    url: string,
    mediaType: "image",
    mimetype: string,
    sortOrder?: number
  }>
}
```

- Tek `file` → mevcut davranış
- Çoklu `files` → sadece image; max 10, her biri 20MB
- `mediaType` belirtilmezse: mimetype'a göre otomatik

#### Post oluşturma

```ts
{
  title: string,
  mediaType: "video" | "image",
  mediaUrls: string[],   // video: 1 eleman, image: 1 veya 2–10 eleman (carousel)
  publishNow?: boolean,
  scheduledAt?: string,
  targets: [...]
}
```

- `mediaType=video` → `mediaUrls.length === 1`
- `mediaType=image` → `mediaUrls.length >= 1 && mediaUrls.length <= 10`
- Carousel (2–10 resim) → sadece Instagram ve Facebook için geçerli

#### Platform + medya uyumluluk validasyonu

- `mediaType=image` → sadece `instagram`, `facebook`
- `mediaType=video` → tüm platformlar
- `mediaUrls.length > 1` (carousel) → sadece `instagram`, `facebook`; YouTube/TikTok target varsa 400

API tarafında `targets` + `mediaType` + `mediaUrls.length` uyumluluğunu kontrol et.

### 4. Worker (Yayınlama Mantığı)

**Strateji tablosu:**
| Platform  | Video | Tek Resim | Carousel (2–10) |
|-----------|-------|-----------|-----------------|
| YouTube   | ✅ youtube-upload | ❌ atla | ❌ atla |
| Instagram | ✅ instagram-upload (REELS/VIDEO) | ✅ instagram-image (PHOTO) | ✅ instagram-carousel |
| TikTok    | ✅ tiktok-upload | ❌ atla | ❌ atla |
| Facebook  | ✅ facebook-upload | ✅ facebook-image | ✅ facebook-carousel |

**Carousel akışı (Instagram):**
1. Her resim için `is_carousel_item=true` ile container oluştur, `status_code=FINISHED` bekle
2. `media_type=CAROUSEL`, `children=<container_idleri>` ile carousel container oluştur
3. `media_publish` ile yayınla

**Carousel akışı (Facebook):**
1. `/{page-id}/feed` + `child_attachments` ile birden fazla `{ link, picture }` gönder

Worker'da her job için:
1. `mediaType` + `media` (PostMedia[]) oku
2. Platform + mediaType + count matrisine bak
3. Uyumsuzsa: PostTarget status="failed", errorMessage açıklayıcı
4. Uyumluysa: tek resim → image upload; 2–10 resim → carousel upload

### 5. Frontend

- **Medya tipi seçici:** Video | Resim | Carousel (resim seçildiğinde “Çoklu resim ekle” seçeneği)
- **Tek video:** Mevcut tek dosya upload
- **Tek resim:** Tek dosya upload
- **Carousel:** Çoklu dosya (2–10), sürükle-bırak sıralama, önizleme grid
- **Platform seçimi:** Image/carousel seçildiyse YouTube ve TikTok disable
- **Validasyon:** Carousel seçilip YouTube/TikTok hedef varsa uyarı

### 6. Uygulama Sırası

1. **Schema:** `PostMedia` modeli, `Post.mediaType`, `Post.videoUrl` → migration ile `PostMedia`'ya taşı
2. **MinIO:** `isAllowedImageType`, `images/` prefix, çoklu resim upload
3. **API:** `createPostSchema` `mediaUrls[]`, platform + carousel validasyonu, çoklu upload endpoint
4. **Worker:** Image upload, carousel upload (Instagram + Facebook)
5. **Web:** Medya tipi UI, çoklu resim upload, sürükle-bırak sıralama, platform filtresi

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|------------|
| `packages/db/prisma/schema.prisma` | PostMedia modeli, Post.mediaType, Post.videoUrl kaldır |
| `apps/api/src/lib/minio.ts` | ALLOWED_IMAGE_TYPES, isAllowedImageType, getMaxImageSizeBytes |
| `apps/api/src/main.ts` | media/upload tek+çoklu, createPost mediaUrls[], platform validasyonu |
| `apps/worker/src/index.ts` | mediaType + media count branch, carousel handling |
| `apps/worker/src/instagram-image-upload.ts` | **yeni** (PHOTO) |
| `apps/worker/src/instagram-carousel-upload.ts` | **yeni** (CAROUSEL) |
| `apps/worker/src/facebook-image-upload.ts` | **yeni** |
| `apps/worker/src/facebook-carousel-upload.ts` | **yeni** (child_attachments) |
| `apps/web/src/app/page.tsx` | medya tipi, çoklu upload, sıralama, platform filtresi |
| `apps/web/src/lib/api.ts` | Post.media[], CreatePostPayload mediaUrls[] |

---

## Notlar

- **Instagram resim:** Sadece JPEG. PNG/WebP yüklense worker tarafında JPEG'e dönüştürme veya kabul etmeyip hata verme tercihi yapılabilir.
- **Instagram carousel:** 2–10 resim; ilk resmin aspect ratio'su diğerlerine uygulanır (genelde 1:1 veya 4:5).
- **Facebook resim:** `url` veya multipart file. Biz URL kullanıyoruz (MinIO'dan); mevcut video mantığıyla uyumlu.
- **Facebook carousel:** `child_attachments` ile `{ link, picture }` dizisi; feed post olarak yayınlanır.
