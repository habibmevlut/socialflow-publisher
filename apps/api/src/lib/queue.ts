import { Queue } from "bullmq";
import { getBullmqConnection } from "@socialflow/redis-connection";

const connection = getBullmqConnection();

export const publishQueue = new Queue("publish-post", { connection });

export type PublishJobData = {
  postId: string;
  postTargetId: string;
  platform: string;
  accountId: string;
  mediaType: "video" | "image";
  mediaUrls: string[]; // video: 1, image: 1 veya 2-10 (carousel)
};

export async function enqueuePublish(data: PublishJobData) {
  await publishQueue.add("publish", data);
}
