import path from "node:path";
import { config } from "dotenv";
// Cwd turbo ile degisebilir; __dirname ile proje kokune gore yukle
const rootEnv = path.resolve(__dirname, "../../../.env");
config({ path: rootEnv });
config({ path: path.resolve(process.cwd(), ".env") });

import { Queue, Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { uploadVideoToYouTube } from "./youtube-upload";
import { uploadVideoToInstagram } from "./instagram-upload";
import { uploadVideoToTikTok } from "./tiktok-upload";
import { uploadVideoToFacebook } from "./facebook-upload";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379)
};

const prisma = new PrismaClient();
const queueName = "publish-post";
const publishQueue = new Queue(queueName, { connection });

type PublishJobData = {
  postId: string;
  postTargetId: string;
  platform: string;
  accountId: string;
  videoUrl: string;
};

function getYouTubeErrorMessage(err: unknown): string {
  const gErr = err as { errors?: { reason?: string; message?: string }[]; message?: string };
  if (Array.isArray(gErr?.errors)) {
    const signup = gErr.errors.find((e) => e.reason === "youtubeSignupRequired");
    if (signup) {
      return "YouTube kanali gerekli. youtube.com'da kanal olusturun, sonra 'YouTube Bagla' ile tekrar baglanin.";
    }
    const invalidCreds = gErr.errors.find(
      (e) => e.reason === "authError" || (e.message && e.message.includes("Invalid"))
    );
    if (invalidCreds) {
      return "Token suresi dolmus. 'YouTube Bagla' ile tekrar baglanin.";
    }
    const msg = gErr.errors[0]?.message;
    if (msg) return msg;
  }
  if (err instanceof Error) return err.message;
  return "Bilinmeyen yukleme hatasi";
}

async function runScheduler() {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { not: null, lte: now }
    },
    include: { targets: true }
  });
  for (const post of posts) {
    for (const t of post.targets) {
      if (t.enabled && t.status === "pending") {
        await publishQueue.add("publish", {
          postId: post.id,
          postTargetId: t.id,
          platform: t.platform,
          accountId: t.accountId,
          videoUrl: post.videoUrl
        } as PublishJobData);
      }
    }
    await prisma.post.update({
      where: { id: post.id },
      data: { scheduledAt: null }
    });
  }
  if (posts.length > 0) {
    console.log(`[scheduler] Enqueued ${posts.length} scheduled post(s)`);
  }
}

const worker = new Worker<PublishJobData>(
  queueName,
  async (job) => {
    const { postId, postTargetId, platform, accountId, videoUrl } = job.data;

    if (platform === "youtube") {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { targets: true }
      });
      const target = post?.targets.find((t: { id: string }) => t.id === postTargetId);
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        include: { token: true }
      });

      if (!post || !target || !account?.token) {
        throw new Error(`YouTube hesabi veya token bulunamadi: accountId=${accountId}`);
      }

      console.log(`[worker] YouTube upload basliyor: ${post.title} -> ${accountId}`);

      try {
        const youtubeUrl = await uploadVideoToYouTube({
          accessToken: account.token.accessToken,
          refreshToken: account.token.refreshToken,
          title: post.title,
          description: target.caption,
          videoUrl,
          privacyStatus: "private"
        });

        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "published", publishedAt: new Date() }
        });

        console.log(`[worker] YouTube upload tamamlandi: ${youtubeUrl}`);

        const remaining = await prisma.postTarget.count({
          where: { postId, status: "pending" }
        });
        if (remaining === 0) {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "published" }
          });
        }

        return { success: true, youtubeUrl, processedAt: new Date().toISOString() };
      } catch (err: unknown) {
        const errorMsg = getYouTubeErrorMessage(err);
        if (errorMsg.includes("kanal")) {
          console.error(`[worker] YouTube kanali gerekli:`, errorMsg);
        } else {
          console.error(`[worker] YouTube upload hatasi:`, err);
        }
        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "failed", errorMessage: errorMsg }
        });
        throw err;
      }
    }

    if (platform === "instagram") {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { targets: true }
      });
      const target = post?.targets.find((t: { id: string }) => t.id === postTargetId);
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        include: { token: true }
      });

      if (!post || !target || !account?.token) {
        throw new Error(`Instagram hesabi veya token bulunamadi: accountId=${accountId}`);
      }
      const igUserId = account.externalAccountId;
      if (!igUserId) {
        throw new Error("Instagram kullanici ID bulunamadi. Hesabi tekrar baglayin.");
      }

      console.log(`[worker] Instagram upload basliyor: ${post.title} -> ${accountId}`);

      try {
        const instagramUrl = await uploadVideoToInstagram({
          accessToken: account.token.accessToken,
          igUserId,
          videoUrl,
          caption: target.caption,
          mediaType: "REELS"
        });

        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "published", publishedAt: new Date() }
        });

        console.log(`[worker] Instagram upload tamamlandi: ${instagramUrl}`);

        const remaining = await prisma.postTarget.count({
          where: { postId, status: "pending" }
        });
        if (remaining === 0) {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "published" }
          });
        }

        return { success: true, instagramUrl, processedAt: new Date().toISOString() };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Bilinmeyen Instagram hatasi";
        console.error(`[worker] Instagram upload hatasi:`, err);
        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "failed", errorMessage: errorMsg }
        });
        throw err;
      }
    }

    if (platform === "tiktok") {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { targets: true }
      });
      const target = post?.targets.find((t: { id: string }) => t.id === postTargetId);
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        include: { token: true }
      });

      if (!post || !target || !account?.token) {
        throw new Error(`TikTok hesabi veya token bulunamadi: accountId=${accountId}`);
      }
      const openId = account.externalAccountId;
      if (!openId) {
        throw new Error("TikTok kullanici ID bulunamadi. Hesabi tekrar baglayin.");
      }

      console.log(`[worker] TikTok upload basliyor: ${post.title} -> ${accountId}`);

      try {
        const tiktokUrl = await uploadVideoToTikTok({
          accessToken: account.token.accessToken,
          openId,
          videoUrl,
          caption: target.caption ?? post.title
        });

        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "published", publishedAt: new Date() }
        });

        console.log(`[worker] TikTok upload tamamlandi: ${tiktokUrl}`);

        const remaining = await prisma.postTarget.count({
          where: { postId, status: "pending" }
        });
        if (remaining === 0) {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "published" }
          });
        }

        return { success: true, tiktokUrl, processedAt: new Date().toISOString() };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Bilinmeyen TikTok hatasi";
        console.error(`[worker] TikTok upload hatasi:`, err);
        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "failed", errorMessage: errorMsg }
        });
        throw err;
      }
    }

    if (platform === "facebook") {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { targets: true }
      });
      const target = post?.targets.find((t: { id: string }) => t.id === postTargetId);
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        include: { token: true }
      });

      if (!post || !target || !account?.token) {
        throw new Error(`Facebook hesabi veya token bulunamadi: accountId=${accountId}`);
      }
      const pageId = account.externalAccountId;
      if (!pageId) {
        throw new Error("Facebook sayfa ID bulunamadi. Hesabi tekrar baglayin.");
      }

      console.log(`[worker] Facebook upload basliyor: ${post.title} -> ${accountId}`);

      try {
        const facebookUrl = await uploadVideoToFacebook({
          accessToken: account.token.accessToken,
          pageId,
          videoUrl,
          caption: target.caption ?? post.title
        });

        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "published", publishedAt: new Date() }
        });

        console.log(`[worker] Facebook upload tamamlandi: ${facebookUrl}`);

        const remaining = await prisma.postTarget.count({
          where: { postId, status: "pending" }
        });
        if (remaining === 0) {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "published" }
          });
        }

        return { success: true, facebookUrl, processedAt: new Date().toISOString() };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Bilinmeyen Facebook hatasi";
        console.error(`[worker] Facebook upload hatasi:`, err);
        await prisma.postTarget.update({
          where: { id: postTargetId },
          data: { status: "failed", errorMessage: errorMsg }
        });
        throw err;
      }
    }

    console.log(`[worker] Simulasyon: ${platform} (gercek upload henuz yok)`);
    await new Promise((r) => setTimeout(r, 400));

    await prisma.postTarget.update({
      where: { id: postTargetId },
      data: { status: "published", publishedAt: new Date() }
    });

    const remaining = await prisma.postTarget.count({
      where: { postId, status: "pending" }
    });
    if (remaining === 0) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "published" }
      });
    }

    return { success: true, processedAt: new Date().toISOString() };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.id}`);
});

worker.on("failed", async (job, error) => {
  console.error(`[worker] failed ${job?.id}: ${error.message}`);
  if (job?.data?.postTargetId) {
    const target = await prisma.postTarget.findUnique({
      where: { id: job.data.postTargetId },
      select: { status: true }
    });
    if (target?.status === "pending") {
      const errMsg = error instanceof Error ? error.message : "Bilinmeyen hata";
      await prisma.postTarget.update({
        where: { id: job.data.postTargetId },
        data: { status: "failed", errorMessage: errMsg }
      });
    }
  }
});

runScheduler();
setInterval(runScheduler, 60_000);
