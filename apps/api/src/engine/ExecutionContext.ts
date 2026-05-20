export class ExecutionContext {
  readonly batchIndex: number;
  readonly runId: string;
  private nodeOutputs: Map<string, Record<string, unknown>>;

  constructor(runId: string, batchIndex: number) {
    this.runId = runId;
    this.batchIndex = batchIndex;
    this.nodeOutputs = new Map();
  }

  getNodeOutput(nodeId: string): Record<string, unknown> {
    return this.nodeOutputs.get(nodeId) ?? {};
  }

  getOutput(nodeId: string, portId: string): unknown {
    const outputs = this.nodeOutputs.get(nodeId);
    if (!outputs) return undefined;
    return outputs[portId];
  }

  storeOutputs(nodeId: string, outputs: Record<string, unknown>): void {
    this.nodeOutputs.set(nodeId, outputs);
  }
}
