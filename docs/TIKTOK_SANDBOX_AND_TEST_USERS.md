# TikTok Sandbox ve Test Users Kullanım Rehberi

Bu rehber, TikTok Developer Portal'da Sandbox ortamını kurup Test users (hedef kullanıcılar) ile uygulamanızı nasıl test edeceğinizi adım adım açıklar.

---

## 1. Sandbox Ortamı Nedir?

Sandbox, uygulamanızı Production incelemesi tamamlanmadan **kısıtlı bir ortamda** denemenize olanak tanır. Ancak:

- **Login Kit (OAuth):** Sandbox'ta çalışır ✅
- **Content Posting API:** Sandbox'ta **sadece private videolar** için desteklenir. Public video yayını için Production onayı gerekir ⚠️

Bu nedenle Sandbox'ta:
- TikTok hesabı **bağlayabilirsiniz** (OAuth)
- Sınırlı içerik yayını test edebilirsiniz (varsa private mod)
- Tam public video yayını için Production incelemesi tamamlanmalıdır

---

## 2. Sandbox Oluşturma

1. [TikTok Developer Portal](https://developers.tiktok.com/) → **Manage apps**
2. Uygulamanızı seçin veya **Connect an app** ile yeni uygulama oluşturun
3. Uygulama sayfasında, uygulama adının yanındaki **toggle**'ı **Sandbox** konumuna getirin
4. **Create Sandbox** düğmesine tıklayın
5. Sandbox adı girin (örn: "Test Ortamı")
6. İsterseniz mevcut Production veya başka bir Sandbox konfigürasyonunu klonlayın
7. **Confirm** ile onaylayın
8. **App details** ve **Products** bölümünü düzenleyin
9. **Apply changes** ile değişiklikleri kaydedin

---

## 3. Test Users (Hedef Kullanıcılar) Ekleme

Sandbox'ta OAuth test edebilmek için **target users** eklemeniz zorunludur. Sadece bu hesaplar OAuth ile giriş yapabilir.

1. Uygulama sayfasında **Sandbox settings**'e gidin
2. **Target users** bölümünde **Add account** tıklayın
3. Test etmek istediğiniz **TikTok hesabıyla giriş yapın** (hesabın sizin kontrolünüzde olması gerekir)
4. **TikTok Developer Terms of Service**'i kabul edin
5. En fazla **10 hesap** ekleyebilirsiniz
6. Ekledikten sonra liste yenilenmesi **1 saate kadar** sürebilir; sayfayı yenileyin

---

## 4. Socialflow Publisher ile Nasıl Test Edilir?

### 4.1. Developer Portal Ayarları

- **Sandbox toggle:** Açık (Sandbox modunda)
- **Redirect URI:** `https://transcript-often-external-cia.trycloudflare.com/auth/tiktok/callback` (Cloudflare Tunnel URL'iniz)
- **Login Kit:** Etkin
- **Content Posting API (video.publish):** Sandbox'ta sınırlı; yine de scope ekleyebilirsiniz

### 4.2. .env Yapılandırması

`.env` dosyanızda:

```
TIKTOK_CLIENT_KEY=awxe6otxxfv83djh
TIKTOK_CLIENT_SECRET=...
TIKTOK_REDIRECT_BASE=https://transcript-often-external-cia.trycloudflare.com
```

**Önemli:** Sandbox modunda Portal'da kullandığınız `client_key` ile `.env`'deki `TIKTOK_CLIENT_KEY` aynı olmalı. Portal'da Sandbox seçiliyken bu değerler otomatik olarak Sandbox için geçerlidir.

### 4.3. Test Akışı

1. **API, Web ve Tunnel** servislerini çalıştırın
2. Web uygulamasına gidin (örn: http://localhost:3001)
3. **TikTok Bağla** butonuna tıklayın
4. OAuth sayfasına yönlendirildiğinizde, **Portal'a eklediğiniz target users hesabıyla giriş yapın**
5. İzin verildikten sonra geri dönüşte hesap bağlanmış olacaktır

### 4.4. Sık Karşılaşılan Hatalar

| Hata | Neden |
|------|-------|
| `unauthorized_client` / `client_key` | Bu hesap Target users listesinde değil; Portal'da hesabı ekleyin |
| `invalid_redirect_uri` | Redirect URI Portal'daki ayarla birebir aynı olmalı |
| `invalid_client` | `client_key` veya `client_secret` yanlış |

---

## 5. Production'dan Sandbox'a Geçiş

- Portal'da uygulama adının yanındaki **toggle** ile Production ↔ Sandbox arasında geçiş yapılır
- Sandbox seçildiğinde OAuth ve API çağrıları Sandbox ortamına gider
- `.env` değiştirmenize gerek yok; Portal'daki mod belirleyicidir

---

## 6. Production İncelemesi Sonrası

Production onaylandıktan sonra:

1. Toggle'ı **Production** konumuna alın
2. Aynı `client_key` ve `client_secret` kullanılabilir (tek uygulama)
3. Artık tüm kullanıcılar OAuth ile bağlanabilir (target users sınırı yok)
4. Content Posting API ile public video yayını tam çalışır

---

## Özet

- **Sandbox:** OAuth ve sınırlı video testi için kullanılır
- **Target users:** Sadece bu hesaplar Sandbox OAuth'ta giriş yapabilir
- **Production:** Tam işlevsellik için inceleme gerekir
