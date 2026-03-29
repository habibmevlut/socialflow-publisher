import "./load-env"; // AUTH_SECRET vb. - auth.ts yuklenmeden once .env yuklenir
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { enqueuePublish } from "./lib/queue";
import { authYouTubeRoutes } from "./routes/auth-youtube";
import { authInstagramRoutes } from "./routes/auth-instagram";
import { authTikTokRoutes } from "./routes/auth-tiktok";
import { authFacebookRoutes } from "./routes/auth-facebook";
import { authRegisterRoutes } from "./routes/auth-register";
import { requireAuth } from "./lib/auth";
import {
  minioClient,
  MINIO_BUCKET,
  getMinioPublicUrl,
  isAllowedVideoType,
  isAllowedImageType,
  getMaxSizeBytes,
  getMaxImageSizeBytes,
  ensureBucket
} from "./lib/minio";

const IMAGE_PLATFORMS = ["instagram", "facebook"];
const VIDEO_PLATFORMS = ["youtube", "instagram", "tiktok", "facebook"];

const createPostSchema = z.object({
  title: z.string().min(2).max(120),
  mediaType: z.enum(["video", "image"]).default("video"),
  mediaUrls: z.array(z.string().url()).min(1).max(10),
  publishNow: z.boolean().optional().default(false),
  scheduledAt: z.string().datetime().optional(),
  targets: z
    .array(
      z.object({
        platform: z.enum(["instagram", "youtube", "tiktok", "facebook"]),
        accountId: z.string().min(1),
        caption: z.string().max(2200).optional(),
        enabled: z.boolean().default(true)
      })
    )
    .min(1)
});

function getMediaUrls(post: { media: { mediaUrl: string; sortOrder: number }[]; videoUrl: string | null }): string[] {
  if (post.media.length > 0) {
    return post.media
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => m.mediaUrl);
  }
  return post.videoUrl ? [post.videoUrl] : [];
}

async function bootstrap() {
  const app = Fastify({ logger: true });
  await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  exposedHeaders: ["X-Auth-Error"]
});
  await app.register(multipart, { limits: { fileSize: getMaxSizeBytes() } });
  await app.register(authYouTubeRoutes);
  await app.register(authInstagramRoutes);
  await app.register(authTikTokRoutes);
  await app.register(authFacebookRoutes);
  await app.register(authRegisterRoutes);

  await ensureBucket();

  app.post("/v1/media/upload", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "Dosya gerekli" });
      }
      const buf = await data.toBuffer();
      const mimetype = data.mimetype ?? "application/octet-stream";
      const isVideo = isAllowedVideoType(mimetype);
      const isImage = isAllowedImageType(mimetype);
      if (!isVideo && !isImage) {
        return reply.status(400).send({
          message: "Gecersiz format. Video: mp4, mov, webm, avi. Resim: jpeg, png, webp"
        });
      }
      const maxSize = isVideo ? getMaxSizeBytes() : getMaxImageSizeBytes();
      if (buf.length > maxSize) {
        return reply.status(400).send({
          message: isVideo ? "Video en fazla 500MB olabilir" : "Resim en fazla 20MB olabilir"
        });
      }

      let finalBuf = buf;
      let finalMimetype = mimetype;
      let finalExt = mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? (isVideo ? "mp4" : "jpg");

      // Instagram sadece JPEG kabul eder - PNG/WebP'yi otomatik donustur
      if (isImage && (mimetype === "image/png" || mimetype === "image/webp")) {
        finalBuf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
        finalMimetype = "image/jpeg";
        finalExt = "jpg";
      }

      const prefix = isVideo ? "videos" : "images";
      const objectName = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;
      await minioClient.putObject(MINIO_BUCKET, objectName, finalBuf, finalBuf.length, {
        "Content-Type": finalMimetype
      });
      const url = getMinioPublicUrl(objectName);
      return reply.send({
        url,
        mediaType: isVideo ? "video" : "image",
        mimetype: finalMimetype
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ message: "Yukleme hatasi" });
    }
  });

  app.get("/health", async () => ({
    service: "socialflow-api",
    status: "ok",
    timestamp: new Date().toISOString()
  }));

  app.post("/v1/posts", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const parsed = createPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Gecersiz payload",
        issues: parsed.error.flatten()
      });
    }

    const { title, mediaType, mediaUrls, publishNow, scheduledAt, targets } = parsed.data;
    const organizationId = auth.organizationId;

    if (mediaType === "video" && mediaUrls.length !== 1) {
      return reply.status(400).send({ message: "Video icin tek medya URL gerekli" });
    }
    if (mediaType === "image" && (mediaUrls.length < 1 || mediaUrls.length > 10)) {
      return reply.status(400).send({ message: "Resim icin 1-10 URL gerekli" });
    }
    if (mediaType === "image") {
      const invalidPlatforms = targets.filter((t) => !IMAGE_PLATFORMS.includes(t.platform));
      if (invalidPlatforms.length > 0) {
        return reply.status(400).send({
          message: "Resim/carousel sadece Instagram ve Facebook destekler. YouTube ve TikTok hedeflerini kaldirin."
        });
      }
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return reply.status(404).send({ message: "Organizasyon bulunamadi" });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const now = new Date();
    const isPublishNow = (publishNow && !scheduledDate) || (scheduledDate && scheduledDate <= now);
    const isScheduled = !!scheduledDate && scheduledDate > now;
    const status = isPublishNow ? "scheduled" : isScheduled ? "scheduled" : "draft";

    const post = await prisma.post.create({
      data: {
        organizationId,
        title,
        mediaType: mediaType as "video" | "image",
        status,
        scheduledAt: scheduledDate,
        media: {
          create: mediaUrls.map((url, i) => ({
            mediaUrl: url,
            sortOrder: i,
            mimetype: null
          }))
        },
        targets: {
          create: targets.map((t) => ({
            platform: t.platform,
            accountId: t.accountId,
            caption: t.caption ?? null,
            enabled: t.enabled,
            status: "pending"
          }))
        }
      },
      include: { targets: true, media: true }
    });

    const urls = getMediaUrls(post);

    if (isPublishNow) {
      for (const t of post.targets) {
        if (t.enabled) {
          await enqueuePublish({
            postId: post.id,
            postTargetId: t.id,
            platform: t.platform,
            accountId: t.accountId,
            mediaType: mediaType as "video" | "image",
            mediaUrls: urls
          });
        }
      }
      if (scheduledDate && scheduledDate <= now) {
        await prisma.post.update({
          where: { id: post.id },
          data: { scheduledAt: null }
        });
      }
    }

    return reply.status(201).send({
      id: post.id,
      organizationId: post.organizationId,
      title: post.title,
      mediaType: post.mediaType,
      mediaUrls: urls,
      videoUrl: urls[0] ?? null,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      targets: post.targets.map((t) => ({
        id: t.id,
        platform: t.platform,
        accountId: t.accountId,
        caption: t.caption,
        enabled: t.enabled,
        status: t.status,
        errorMessage: t.errorMessage
      })),
      createdAt: post.createdAt.toISOString()
    });
  });

  app.post("/v1/posts/:id/publish", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { id } = request.params as { id: string };
    const post = await prisma.post.findUnique({
      where: { id },
      include: { targets: true, media: true }
    });
    if (!post) return reply.status(404).send({ message: "Post bulunamadi" });
    if (post.organizationId !== auth.organizationId) return reply.status(403).send({ message: "Yetkisiz" });
    if (post.status === "published") return reply.status(400).send({ message: "Post zaten yayinlandi" });

    const mediaUrls = getMediaUrls(post);
    if (mediaUrls.length === 0) {
      return reply.status(400).send({ message: "Post medya icermiyor" });
    }

    for (const t of post.targets) {
      if (t.enabled && t.status === "pending") {
        await enqueuePublish({
          postId: post.id,
          postTargetId: t.id,
          platform: t.platform,
          accountId: t.accountId,
          mediaType: post.mediaType as "video" | "image",
          mediaUrls
        });
      }
    }

    await prisma.post.update({ where: { id }, data: { status: "scheduled" } });

    return reply.send({ message: "Yayin kuyruga eklendi", postId: id });
  });

  app.get("/v1/posts", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const posts = await prisma.post.findMany({
      where: { organizationId: auth.organizationId },
      include: { targets: true, media: true },
      orderBy: { createdAt: "desc" }
    });

    return reply.send(
      posts.map((p) => {
        const mediaUrls = getMediaUrls(p);
        return {
          id: p.id,
          organizationId: p.organizationId,
          title: p.title,
          mediaType: p.mediaType,
          mediaUrls,
          videoUrl: mediaUrls[0] ?? null,
          status: p.status,
          scheduledAt: p.scheduledAt?.toISOString() ?? null,
          targets: p.targets.map((t) => ({
            id: t.id,
            platform: t.platform,
            accountId: t.accountId,
            caption: t.caption,
            enabled: t.enabled,
            status: t.status,
            errorMessage: t.errorMessage
          })),
          createdAt: p.createdAt.toISOString()
        };
      })
    );
  });

  app.get("/v1/social-accounts", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const accounts = await prisma.socialAccount.findMany({
      where: { organizationId: auth.organizationId },
      select: { id: true, platform: true, displayName: true, externalAccountId: true, status: true }
    });
    return reply.send(accounts);
  });

  app.delete("/v1/social-accounts/:id", async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { id } = request.params as { id: string };
    const account = await prisma.socialAccount.findFirst({
      where: { id, organizationId: auth.organizationId }
    });
    if (!account) return reply.status(404).send({ message: "Hesap bulunamadi" });

    await prisma.socialAccount.delete({ where: { id } });
    return reply.status(204).send();
  });

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
