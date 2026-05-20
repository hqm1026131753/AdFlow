import { Router, type Request, type Response } from "express";
import { TextGenExecutor } from "../nodes/executors/TextGenExecutor";
import { ImageGenExecutor } from "../nodes/executors/ImageGenExecutor";
import { ExecutionContext } from "../engine/ExecutionContext";
import { log } from "../lib/logger";

export const generateRouter = Router();

const textExecutor = new TextGenExecutor();
const imageExecutor = new ImageGenExecutor();

// POST /api/generate — run a single generator node (standalone, not full workflow)
generateRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { nodeType, config, inputs } = req.body as {
      nodeType: string;
      config: Record<string, unknown>;
      inputs: Record<string, unknown>;
    };

    log("generate", `Running ${nodeType}`);

    const ctx = new ExecutionContext("generate-standalone", 0);

    switch (nodeType) {
      case "text-generator": {
        const result = await textExecutor.execute(inputs ?? {}, config ?? {}, ctx);
        res.json(result);
        return;
      }

      case "image-generator": {
        const result = await imageExecutor.execute(inputs ?? {}, config ?? {}, ctx);
        res.json(result);
        return;
      }

      default:
        res.status(400).json({ error: `Unknown nodeType: ${nodeType}` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("generate", `Error: ${msg}`);
    res.status(500).json({ error: "Generation failed" });
  }
});
