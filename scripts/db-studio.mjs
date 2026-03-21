#!/usr/bin/env node
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, "apps/api/.env") });

const { execSync } = await import("child_process");
execSync("pnpm --filter @socialflow/api db:studio", {
  stdio: "inherit",
  cwd: root,
  env: process.env
});
