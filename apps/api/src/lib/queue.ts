import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379)
};

export const publishQueue = new Queue("publish-post", { connection });

export type PublishJobData = {
  postId: string;
  postTargetId: string;
  platform: string;
  accountId: string;
  videoUrl: string;
};

export async function enqueuePublish(data: PublishJobData) {
  await publishQueue.add("publish", data);
}
