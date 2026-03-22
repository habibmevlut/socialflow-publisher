/**
 * Dotenv config - diger modullerden ONCE calismali.
 * auth.ts AUTH_SECRET okumadan once .env yuklenir.
 */
import path from "node:path";
import { config } from "dotenv";

const repoRoot = path.resolve(__dirname, "../../..");
config({ path: path.join(repoRoot, ".env") });
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.join(repoRoot, "apps/web/.env.local") });
