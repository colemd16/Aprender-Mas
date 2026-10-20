import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],
  // Supabase's built-in roles (authenticated, anon…) already exist; don't manage them.
  entities: { roles: { provider: "supabase" } },
});
