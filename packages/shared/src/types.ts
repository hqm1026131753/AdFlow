import { z } from "zod";

// ── Config Metadata ──

export type ConfigFieldType = "text" | "number" | "slider" | "boolean" | "select" | "text[]" | "imagesize[]";

export interface ConfigFieldMeta {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
  defaultValue: unknown;
  options?: Array<{ label: string; value: string }>; // for select
  min?: number; // for slider
  max?: number;
  step?: number;
}

// ── Port & Node Definitions ──

export const PortSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  dataType: z.enum(["image", "text", "image[]", "text[]", "any"]),
  direction: z.enum(["input", "output"]),
});

export type PortSpec = z.infer<typeof PortSpecSchema>;

export const NodeTypeDefSchema = z.object({
  type: z.string(),
  displayName: z.string(),
  category: z.enum(["source", "process", "output", "text", "image"]),
  color: z.string(),
  icon: z.string(),
  inputs: z.array(PortSpecSchema),
  outputs: z.array(PortSpecSchema),
  defaultConfig: z.record(z.any()),
});

export type NodeTypeDef = z.infer<typeof NodeTypeDefSchema> & {
  configMeta?: ConfigFieldMeta[];
};

// ── Workflow Definition ──

export const NodeInstanceSchema = z.object({
  id: z.string(),
  nodeType: z.string(),
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.any()),
});

export type NodeInstance = z.infer<typeof NodeInstanceSchema>;

export const EdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  sourcePortId: z.string(),
  targetNodeId: z.string(),
  targetPortId: z.string(),
});

export type Edge = z.infer<typeof EdgeSchema>;

export const WorkflowDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  nodes: z.array(NodeInstanceSchema),
  edges: z.array(EdgeSchema),
});

export type WorkflowDef = z.infer<typeof WorkflowDefSchema>;

// ── Execution ──

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export const BatchItemSchema = z.object({
  index: z.number(),
  label: z.string(),
  productImage: z.string().optional(),
  refImages: z.array(z.string()).optional(),
});

export type BatchItem = z.infer<typeof BatchItemSchema>;

export type NodeExecutionStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed";

// ── Workflow Templates ──

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes: Array<{
    nodeType: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    sourceIndex: number; // index into nodes array
    sourcePortId: string;
    targetIndex: number;
    targetPortId: string;
  }>;
}

// ── SSE Event Types ──

export type SSEEvent =
  | { type: "wave-start"; waveIndex: number; totalWaves: number }
  | { type: "node-start"; nodeId: string; batchIndex: number }
  | { type: "node-complete"; nodeId: string; batchIndex: number; outputs: Record<string, unknown> }
  | { type: "node-error"; nodeId: string; batchIndex: number; error: string }
  | { type: "batch-complete"; batchIndex: number }
  | { type: "run-complete" }
  | { type: "run-error"; error: string };
