import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const createPostSchema = z.object({
  organizationId: z.string().min(1),
  title: z.string().min(2).max(120),
  videoUrl: z.string().url(),
  targets: z
    .array(
      z.object({
        platform: z.enum(["instagram", "youtube", "tiktok"]),
        accountId: z.string().min(1),
        caption: z.string().max(2200).optional(),
        enabled: z.boolean().default(true)
      })
    )
    .min(1)
});

type Post = z.infer<typeof createPostSchema> & {
  id: string;
  status: "draft" | "pending_approval";
  createdAt: string;
};

const posts: Post[] = [];

async function bootstrap() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

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

    const newPost: Post = {
      id: randomUUID(),
      ...parsed.data,
      status: "draft",
      createdAt: new Date().toISOString()
    };
    posts.push(newPost);

    return reply.status(201).send(newPost);
  });

  app.get("/v1/posts", async () => posts);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
