import { Router, type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { workflows } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { log } from "../lib/logger";

export const workflowsRouter = Router();

// GET /api/workflows
workflowsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const rows = await db.query.workflows.findMany({
      orderBy: [desc(workflows.updatedAt)],
      columns: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });
    res.json(rows);
  } catch (err) {
    log("workflows:list", "Error:", err);
    res.status(500).json({ error: "Failed to list workflows" });
  }
});

// GET /api/workflows/:id
workflowsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const row = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });
    if (!row) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }
    // Parse JSON fields
    res.json({
      ...row,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges),
    });
  } catch (err) {
    log("workflows:get", "Error:", err);
    res.status(500).json({ error: "Failed to get workflow" });
  }
});

// POST /api/workflows
workflowsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, nodes, edges } = req.body;
    const now = new Date().toISOString();
    const id = uuid();

    await db.insert(workflows).values({
      id,
      name: name || "Untitled Workflow",
      description: description || "",
      nodes: JSON.stringify(nodes || []),
      edges: JSON.stringify(edges || []),
      createdAt: now,
      updatedAt: now,
    });

    log("workflows:create", `Created "${name}" (${id})`);
    res.status(201).json({ id, name, description, nodes, edges, createdAt: now, updatedAt: now });
  } catch (err) {
    log("workflows:create", "Error:", err);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// PUT /api/workflows/:id
workflowsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await db.query.workflows.findFirst({
      where: eq(workflows.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    const { name, description, nodes, edges } = req.body;
    const now = new Date().toISOString();

    await db
      .update(workflows)
      .set({
        name: name ?? existing.name,
        description: description ?? existing.description,
        nodes: nodes ? JSON.stringify(nodes) : existing.nodes,
        edges: edges ? JSON.stringify(edges) : existing.edges,
        updatedAt: now,
      })
      .where(eq(workflows.id, id));

    log("workflows:update", `Updated "${name ?? existing.name}"`);
    res.json({ id, updatedAt: now });
  } catch (err) {
    log("workflows:update", "Error:", err);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// DELETE /api/workflows/:id
workflowsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(workflows).where(eq(workflows.id, id));
    log("workflows:delete", `Deleted ${id}`);
    res.status(204).send();
  } catch (err) {
    log("workflows:delete", "Error:", err);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});
