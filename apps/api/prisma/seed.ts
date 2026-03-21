import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env") });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-1" },
    create: {
      id: "demo-org-1",
      name: "Demo Organizasyon",
      plan: "free"
    },
    update: {}
  });
  console.log("Seed OK:", org.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
