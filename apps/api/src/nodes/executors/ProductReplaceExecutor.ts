import { NodeExecutor } from "../NodeExecutor";

export class ProductReplaceExecutor extends NodeExecutor {
  readonly type = "product-replace";

  async execute(
    inputs: Record<string, unknown>,
    _config: Record<string, unknown>,
    _ctx: unknown
  ): Promise<Record<string, unknown>> {
    const styled = (inputs["styled-images"] as { url: string }[]) ?? [];
    const swapped = (inputs["swapped-images"] as { url: string }[]) ?? [];
    const allSources = [...styled, ...swapped];
    const duration = 3000 + Math.random() * 2000;
    await sleep(duration);

    const renders = allSources.map((src, i) => ({
      url: `https://picsum.photos/seed/product-${Date.now()}-${i}/800/600`,
      source: src?.url ?? "unknown",
      productPlaced: true,
    }));

    return { "final-renders": renders };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
