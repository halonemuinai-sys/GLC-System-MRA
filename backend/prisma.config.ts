import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Gunakan DIRECT_URL (Port 5432) untuk operasi CLI (db pull / migrate)
    url: process.env["DIRECT_URL"],
  },
});
