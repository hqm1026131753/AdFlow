import { NodeExecutor } from "../NodeExecutor";

export class StyleTransferExecutor extends NodeExecutor {
  readonly type = "style-transfer";

  async execute(
    inputs: Record<string, unknown>,
    _config: Record<string, unknown>,
    _ctx: unknown
  ): Promise<Record<string, unknown>> {
    const refs = (inputs["reference-images"] as { url: string }[]) ?? [];
    const duration = 2500 + Math.random() * 2000;
    await sleep(duration);

    const styled = refs.map((ref, i) => ({
      url: `https://picsum.photos/seed/styled-${Date.now()}-${i}/800/600`,
      styleRef: ref.url,
      model: "midjourney-v6-mock",
    }));

    return { "styled-outputs": styled };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
