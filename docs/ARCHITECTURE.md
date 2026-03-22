# Socialflow Publisher - Mimari Belgesi

## Genel Bakış

Socialflow Publisher, YouTube, Instagram, TikTok ve Facebook'a tek panelden video paylaşımı yapan çoklu kullanıcılı (multi-tenant) bir SaaS uygulamasıdır.

---

## Kimlik Doğrulama ve Yetkilendirme

### Yaklaşım

- **NextAuth.js** ile kullanıcı girişi (Credentials + OAuth)
- Her kullanıcı kendi verisine erişir; veri izolasyonu organization bazlı

### Veri Modeli

```
User (1) ─────── (1) Organization  [owner]
   │                      │
   │                      ├── SocialAccount[]
   │                      └── Post[]
   │
   └── (gelecekte) OrganizationMember[]  [takım/workspace desteği]
```

- **User:** Giriş yapan kişi (email, name, passwordHash veya OAuth)
- **Organization:** Kullanıcının workspace'i. İlk kayıtta otomatik oluşturulur.
- **ownerId:** Organization'ın sahibi (User.id)

### Akış

1. Kullanıcı `/login` veya giriş gerektiren sayfaya gider
2. NextAuth ile giriş (Credentials veya OAuth)
3. `session.callbacks` içinde User + Organization oluşturulur/yüklenir
4. JWT'ye `userId` ve `organizationId` eklenir
5. Frontend, API'ye `Authorization: Bearer <jwt>` header ile istek atar
6. API JWT'yi doğrular, `organizationId`'yi çıkarır, tüm işlemler bu org ile sınırlı yapılır

### API Güvenliği

- Tüm `/v1/*` istekleri (health hariç) JWT doğrulaması gerektirir
- `organizationId` artık query/body'den alınmaz; JWT'den gelir
- OAuth callback'lerde `state` parametresi organizationId içerir (giriş yapmış kullanıcının org'u)

---

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Web | Next.js 16, NextAuth.js |
| API | Fastify |
| Worker | BullMQ, Redis |
| DB | PostgreSQL, Prisma |
| Storage | MinIO |

---

## Dizin Yapısı

```
apps/
  web/          # Next.js, NextAuth, dashboard
  api/          # Fastify REST API
  worker/       # BullMQ job processor
packages/
  db/           # Paylaşılan Prisma schema ve client
```

---

## Gelecek Genişlemeler

- **OrganizationMember:** Birden fazla kullanıcı aynı workspace'e erişebilir
- **Plan / Billing:** Organization.plan (free, pro, enterprise)
- **OAuth Providers:** Google, GitHub ile giriş
