import { NodeExecutor } from "../NodeExecutor";

export class RefSearchExecutor extends NodeExecutor {
  readonly type = "reference-search";

  async execute(
    _inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: unknown
  ): Promise<Record<string, unknown>> {
    const maxResults = (config.maxResults as number) ?? 5;
    const duration = 2000 + Math.random() * 2000;
    await sleep(duration);

    const refs = Array.from({ length: maxResults }, (_, i) => ({
      url: `https://picsum.photos/seed/ref-${Date.now()}-${i}/800/600`,
      source: "mock-agent-search",
      score: 1 - i * 0.1,
    }));

    return { references: refs };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
