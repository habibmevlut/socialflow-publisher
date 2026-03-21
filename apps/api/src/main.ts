import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env") }); // apps/api icinde .env varsa
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { enqueuePublish } from "./lib/queue";
import { authYouTubeRoutes } from "./routes/auth-youtube";
import { authInstagramRoutes } from "./routes/auth-instagram";
import { authTikTokRoutes } from "./routes/auth-tiktok";
import { authFacebookRoutes } from "./routes/auth-facebook";
import {
  minioClient,
  MINIO_BUCKET,
  getMinioPublicUrl,
  isAllowedVideoType,
  getMaxSizeBytes,
  ensureBucket
} from "./lib/minio";

const createPostSchema = z.object({
  organizationId: z.string().min(1),
  title: z.string().min(2).max(120),
  videoUrl: z.string().url(),
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

async function bootstrap() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
  await app.register(multipart, { limits: { fileSize: getMaxSizeBytes() } });
  await app.register(authYouTubeRoutes);
  await app.register(authInstagramRoutes);
  await app.register(authTikTokRoutes);
  await app.register(authFacebookRoutes);

  await ensureBucket();

  app.post("/v1/media/upload", async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: "Dosya gerekli" });
    }
    const buf = await data.toBuffer();
    const mimetype = data.mimetype ?? "application/octet-stream";
    if (!isAllowedVideoType(mimetype)) {
      return reply.status(400).send({
        message: "Gecersiz video formati. Desteklenen: mp4, mov, webm, avi"
      });
    }
    const ext = mimetype.split("/")[1] ?? "mp4";
    const objectName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await minioClient.putObject(MINIO_BUCKET, objectName, buf, buf.length, { "Content-Type": mimetype });
    const url = getMinioPublicUrl(objectName);
    return reply.send({ url });
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
    const parsed = createPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Gecersiz payload",
        issues: parsed.error.flatten()
      });
    }

    const { organizationId, title, videoUrl, publishNow, scheduledAt, targets } = parsed.data;

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
        videoUrl,
        status,
        scheduledAt: scheduledDate,
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
      include: { targets: true }
    });

    if (isPublishNow) {
      for (const t of post.targets) {
        if (t.enabled) {
          await enqueuePublish({
            postId: post.id,
            postTargetId: t.id,
            platform: t.platform,
            accountId: t.accountId,
            videoUrl: post.videoUrl
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
      videoUrl: post.videoUrl,
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
    const { id } = request.params as { id: string };
    const post = await prisma.post.findUnique({
      where: { id },
      include: { targets: true }
    });
    if (!post) return reply.status(404).send({ message: "Post bulunamadi" });
    if (post.status === "published") return reply.status(400).send({ message: "Post zaten yayinlandi" });

    for (const t of post.targets) {
      if (t.enabled && t.status === "pending") {
        await enqueuePublish({
          postId: post.id,
          postTargetId: t.id,
          platform: t.platform,
          accountId: t.accountId,
          videoUrl: post.videoUrl
        });
      }
    }

    await prisma.post.update({ where: { id }, data: { status: "scheduled" } });

    return reply.send({ message: "Yayin kuyruga eklendi", postId: id });
  });

  app.get("/v1/posts", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;

    const posts = await prisma.post.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: { targets: true },
      orderBy: { createdAt: "desc" }
    });

    return reply.send(
      posts.map((p) => ({
        id: p.id,
        organizationId: p.organizationId,
        title: p.title,
        videoUrl: p.videoUrl,
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
      }))
    );
  });

  app.get("/v1/social-accounts", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) return reply.status(400).send({ message: "organizationId gerekli" });

    const accounts = await prisma.socialAccount.findMany({
      where: { organizationId: orgId },
      select: { id: true, platform: true, displayName: true, externalAccountId: true, status: true }
    });
    return reply.send(accounts);
  });

  app.delete("/v1/social-accounts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) return reply.status(400).send({ message: "organizationId gerekli" });

    const account = await prisma.socialAccount.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!account) return reply.status(404).send({ message: "Hesap bulunamadi" });

    await prisma.socialAccount.delete({ where: { id } });
    return reply.status(204).send();
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
