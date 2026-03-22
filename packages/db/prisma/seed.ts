import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), "../../../.env") });
config({ path: path.resolve(process.cwd(), "../../.env") });
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demoPasswordHash = await bcrypt.hash("demo123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@socialflow.app" },
    create: {
      email: "demo@socialflow.app",
      name: "Demo Kullanıcı",
      passwordHash: demoPasswordHash
    },
    update: { passwordHash: demoPasswordHash }
  });

  const org = await prisma.organization.upsert({
    where: { id: "demo-org-1" },
    create: {
      id: "demo-org-1",
      ownerId: user.id,
      name: "Demo Organizasyon",
      plan: "free"
    },
    update: { ownerId: user.id }
  });

  console.log("Seed OK:", user.email, "->", org.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
