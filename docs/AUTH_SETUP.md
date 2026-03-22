# Kimlik Doğrulama Kurulumu

## Ortam Değişkenleri

`.env` dosyasına ekleyin:

```bash
# Auth (NextAuth + API JWT doğrulama)
AUTH_SECRET=your-secret-here   # Oluşturmak için: npx auth secret
NEXTAUTH_URL=http://localhost:3001   # Production: https://yourdomain.com
```

## Veritabanı

**Mevcut veri varsa** (ör. eski demo-org-1), schema `ownerId` zorunlu olduğu için normal `db:push` hata verir:

```bash
# Önce veritabanını sıfırla (TÜM VERİ SİLİNİR)
pnpm db:reset

# Sonra seed çalıştır
pnpm db:seed
```

**Yeni kurulum** veya veriyi silmek sorun değilse:

```bash
pnpm db:reset
pnpm db:seed
```

## Demo Kullanıcı

Seed çalıştırıldığında `demo@socialflow.app` kullanıcısı oluşturulur. Şifre için:

- Önce `/register` ile yeni hesap oluşturun
- Veya seed'i güncelleyip `demo123` şifresi ile demo kullanıcısı ekleyin

Seed'de demo kullanıcıya şifre eklemek için `packages/db/prisma/seed.ts` dosyasına bcrypt hash eklenebilir.
