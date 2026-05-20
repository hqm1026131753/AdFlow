import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { fileURLToPath } from "url";
import path from "path";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../../data/adflow.db");

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });
