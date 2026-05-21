import { Router, type Request, type Response } from "express";
import { AdScoutExecutor } from "../nodes/executors/AdScoutExecutor";
import { ExecutionContext } from "../engine/ExecutionContext";
import { log } from "../lib/logger";

export const scoutRouter = Router();

const executor = new AdScoutExecutor();

// POST /api/scout — search ad references
scoutRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { keywords, source, platform } = req.body;

    if (!keywords?.trim()) {
      res.status(400).json({ error: "keywords required" });
      return;
    }

    const lines = keywords.split("\n").filter((l: string) => l.trim());
    log("scout", `Searching ${lines.length} keywords — source: ${source ?? "stock"}, platform: ${platform ?? "pinterest"}`);

    const ctx = new ExecutionContext("scout-standalone", 0);
    const result = await executor.execute(
      {},
      { keywords, source, platform },
      ctx
    );

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("scout", `Error: ${msg}`);
    res.status(500).json({ error: "Scout search failed" });
  }
});
