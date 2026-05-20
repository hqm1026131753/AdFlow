import { NodeExecutor } from "../NodeExecutor";

export class LayoutExportExecutor extends NodeExecutor {
  readonly type = "layout-export";

  async execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: unknown
  ): Promise<Record<string, unknown>> {
    const images = (inputs["images"] as { url: string }[]) ?? [];
    const sizes = (config.sizes as string[]) ?? ["1080x1080"];
    const duration = 1500 + Math.random() * 1500;
    await sleep(duration);

    const exported = sizes.flatMap((size, si) =>
      images.map((img, i) => ({
        url: `https://picsum.photos/seed/export-${Date.now()}-${si}-${i}/${size.replace("x", "/")}`,
        size,
        source: img?.url ?? "unknown",
        copyText: (config.copyText as string) ?? "",
        ctaText: (config.ctaText as string) ?? "",
      }))
    );

    return { exported };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
