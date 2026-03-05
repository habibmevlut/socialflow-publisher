# Socialflow Publisher

Sifirdan kurulan, kurumsal sosyal medya paylasim yonetimi MVP monoreposu.

## Uygulamalar

- `apps/web`: Next.js panel
- `apps/api`: Fastify API
- `apps/worker`: BullMQ worker

## Kurulum

```bash
pnpm install
pnpm dev
```

## Uygulama adresleri

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

## API ornek

```bash
curl -X POST http://localhost:4000/v1/posts \
  -H "content-type: application/json" \
  -d '{
    "organizationId":"org_1",
    "title":"Kampanya videosu",
    "videoUrl":"https://example.com/video.mp4",
    "targets":[
      {"platform":"youtube","accountId":"acc_yt_1","caption":"Yeni video","enabled":true}
    ]
  }'
```
