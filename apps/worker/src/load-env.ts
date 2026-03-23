/**
 * Dotenv - diger modullerden ONCE calismali.
 * Turbo cwd degistirebilir; repo kokundeki .env yuklenir.
 */
import path from "node:path";
import { config } from "dotenv";

const repoRoot = path.resolve(__dirname, "../../.."); // apps/worker/src -> proje root
config({ path: path.join(repoRoot, ".env") });
config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.join(__dirname, "../.env"), override: true }); // apps/worker/.env - 127.0.0.1 override
