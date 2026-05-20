import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import type { StoredFile } from "./FileStorage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../data/uploads");

function ensureDir(dir: string) {
  return fs.mkdir(dir, { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  batchIndex?: number,
  prefix = "upload"
): Promise<StoredFile> {
  await ensureDir(ROOT);

  const id = uuid();
  const ext = path.extname(originalName) || ".bin";
  const filename = `${prefix}-${id}${ext}`;
  const storagePath = path.join(ROOT, filename);

  await fs.writeFile(storagePath, buffer);

  const stat = await fs.stat(storagePath);

  return {
    id,
    filename,
    originalName,
    mimeType,
    sizeBytes: stat.size,
    storagePath,
    batchIndex,
    createdAt: stat.birthtime.toISOString(),
  };
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const files = await fs.readdir(ROOT);
  const match = files.find((f) => f.includes(id));
  if (!match) return null;

  const storagePath = path.join(ROOT, match);
  const stat = await fs.stat(storagePath);

  return {
    id,
    filename: match,
    originalName: match,
    mimeType: "application/octet-stream",
    sizeBytes: stat.size,
    storagePath,
    createdAt: stat.birthtime.toISOString(),
  };
}

export async function deleteFile(id: string): Promise<void> {
  const files = await fs.readdir(ROOT);
  const match = files.find((f) => f.includes(id));
  if (match) {
    await fs.unlink(path.join(ROOT, match));
  }
}
