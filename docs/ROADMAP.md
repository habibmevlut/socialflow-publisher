# Socialflow Publisher – Geliştirme Yol Haritası

Projenin ana akışını takip etmek için adım adım yol haritası.

---

## Tamamlanan Adımlar

- [x] **1. Monorepo iskeleti** – web, api, worker paketleri, turbo, pnpm
- [x] **2. Veritabanı** – Prisma + PostgreSQL, docker-compose (postgres, redis)
- [x] **3. Şema** – organizations, users, social_accounts, posts, post_targets
- [x] **4. API temel** – POST/GET /v1/posts, health endpoint
- [x] **5. Worker temel** – BullMQ + Redis, publish-post queue iskeleti
- [x] **6. Web temel** – Next.js, post listesi, yeni post formu, API’ye bağlı
- [x] **7. Publish akışı** – "Şimdi yayınla" checkbox, Yayınla butonu, BullMQ job, Worker DB güncelleme
- [x] **8. Sosyal hesap bağlama (YouTube OAuth)** – SocialToken model, OAuth connect/callback, "YouTube Bağla" butonu
- [x] **9. Platform seçimi UI** – Bağlı hesaplardan "burada paylaş" seçimi, her hesap için ayrı caption
- [x] **10. Video dosya yükleme + MinIO** – Docker MinIO, multipart upload API, dosya veya URL ile post oluşturma
- [x] **11. Zamanlama** – Tarih/saatte paylaş, scheduler (60 sn), zamanlanmış post listesi
- [x] **YouTube gerçek upload** – Worker videoyu MinIO'dan indirip YouTube API ile yükler (private)
- [x] **Instagram** – OAuth (Business Login), "Instagram Bağla", Reel upload (Graph API)
- [x] **Facebook** – OAuth (Facebook Login), "Facebook Bağla", Page video upload (Graph API)

---

## Sıradaki Adımlar (öncelik sırasıyla)

### 12. Onay akışı (opsiyonel MVP)
- Draft → Pending Approval → Approved → Published
- Roller: Admin, Editör, Onaylayan

### 13. Raporlama (opsiyonel MVP)
- Yayın sayısı, platform bazında gönderi
- Basit dashboard

---

## Şu an neredeyiz?

**Son tamamlanan:** Facebook OAuth + Page video upload  
**Sıradaki:** Video + resim medya tipi desteği, Adım 12 (Onay akışı), TikTok (onay bekliyor)

---

## Notlar

- Her adım tamamlandığında bu dosyada `[x]` işaretle.
- Yeni adım eklenirse listeye ekle.
- Karışırsan bu dosyaya bak; “Sıradaki” bölümünden devam et.
