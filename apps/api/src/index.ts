import "dotenv/config";
import express from "express";
import cors from "cors";
import { workflowsRouter } from "./routes/workflows";
import { executionsRouter } from "./routes/executions";
import { filesRouter } from "./routes/files";
import { scoutRouter } from "./routes/scout";
import { generateRouter } from "./routes/generate";
import { agentRouter } from "./routes/agent";
import { log } from "./lib/logger";

const app = express();
const PORT = 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/workflows", workflowsRouter);
app.use("/api/executions", executionsRouter);
app.use("/api/files", filesRouter);
app.use("/api/scout", scoutRouter);
app.use("/api/generate", generateRouter);
app.use("/api/agent", agentRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  log("server", `API running on http://localhost:${PORT}`);
});
