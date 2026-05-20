import type { ExecutionContext } from "../engine/ExecutionContext";

export abstract class NodeExecutor {
  abstract readonly type: string;
  abstract execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    ctx: ExecutionContext
  ): Promise<Record<string, unknown>>;
}
