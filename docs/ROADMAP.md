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
- [x] **Web panel (Tailwind)** – Sidebar, dashboard, postlar, yeni post, zamanlanmış, hesaplar, ayarlar; modern form kontrolleri; proje geneli onay modalı (`ConfirmModal`)

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

**Son tamamlanan:** Panel UI (Tailwind), Instagram resim/carousel + MinIO akışları (mevcut kod tabanında), hesap silme için özel onay penceresi, Ayarlar sayfasında oturum/API özeti.  
**Sıradaki:** TikTok (inceleme / üretim hazırlığı), isteğe bağlı **Adım 12** (onay akışı) ve **Adım 13** (raporlama). Medya tipi (video/resim) create-post akışı panelde mevcut; ROADMAP’teki eski “video+resim sıradaki” maddesi güncellendi.

---

## Notlar

- Her adım tamamlandığında bu dosyada `[x]` işaretle.
- Yeni adım eklenirse listeye ekle.
- Karışırsan bu dosyaya bak; “Sıradaki” bölümünden devam et.
