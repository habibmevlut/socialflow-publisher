import { Queue, Worker } from "bullmq";
import { randomUUID } from "node:crypto";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379)
};
const queueName = "publish-post";

const queue = new Queue(queueName, { connection });

type PublishJob = {
  postId: string;
  platform: "instagram" | "youtube" | "tiktok";
  accountId: string;
};

const worker = new Worker<PublishJob>(
  queueName,
  async (job) => {
    console.log(`[worker] Publishing ${job.data.postId} -> ${job.data.platform}/${job.data.accountId}`);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { success: true, processedAt: new Date().toISOString() };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.id}: ${error.message}`);
});

async function enqueueDemoJob() {
  if (process.env.SEED_DEMO_JOB !== "true") {
    return;
  }

  await queue.add("publish", {
    postId: randomUUID(),
    platform: "youtube",
    accountId: "demo-account"
  });
}

enqueueDemoJob().catch((error) => {
  console.error(error);
  process.exit(1);
});
