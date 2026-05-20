import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  nodes: text("nodes").notNull(), // JSON: NodeInstance[]
  edges: text("edges").notNull(), // JSON: Edge[]
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const executionRuns = sqliteTable("execution_runs", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  status: text("status").notNull().default("pending"),
  batchMeta: text("batch_meta").notNull(), // JSON
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const executionResults = sqliteTable(
  "execution_results",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => executionRuns.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    batchIndex: integer("batch_index").notNull(),
    nodeType: text("node_type").notNull(),
    status: text("status").notNull().default("pending"),
    inputData: text("input_data"),
    outputData: text("output_data"),
    error: text("error"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => ({
    runIdx: index("run_idx").on(table.runId),
  })
);

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  runId: text("run_id").references(() => executionRuns.id, { onDelete: "set null" }),
  nodeId: text("node_id"),
  batchIndex: integer("batch_index"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: text("created_at").notNull(),
});
