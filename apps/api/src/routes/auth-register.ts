import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  password: z.string().min(8).max(72)
});

export async function authRegisterRoutes(app: FastifyInstance) {
  app.post("/v1/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Gecersiz veri",
        issues: parsed.error.flatten()
      });
    }

    const { email, name, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ message: "Bu e-posta adresi zaten kayitli" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash
      }
    });

    const org = await prisma.organization.create({
      data: {
        ownerId: user.id,
        name: `${user.name ?? user.email}'in Workspace`
      }
    });

    return reply.status(201).send({
      message: "Kayit basarili",
      userId: user.id,
      organizationId: org.id
    });
  });
}
