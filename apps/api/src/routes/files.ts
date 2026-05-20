import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs/promises";
import { saveFile, getFile, deleteFile } from "../storage/LocalFileStorage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const filesRouter = Router();

// POST /api/files/upload — upload batch images
filesRouter.post("/upload", upload.array("files", 20), async (req: Request, res: Response) => {
  try {
    const uploadedFiles = req.files as Express.Multer.File[];
    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const results = await Promise.all(
      uploadedFiles.map((file, i) =>
        saveFile(file.buffer, file.originalname, file.mimetype, i)
      )
    );

    res.json(results);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/files/:id — serve file
filesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = await getFile(id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.sizeBytes);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const content = await fs.readFile(file.storagePath);
    res.end(content);
  } catch (err) {
    console.error("File serve error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// DELETE /api/files/:id
filesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await deleteFile(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});
