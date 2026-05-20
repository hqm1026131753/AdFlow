import { NodeExecutor } from "../NodeExecutor";

export class FaceSwapExecutor extends NodeExecutor {
  readonly type = "face-swap";

  async execute(
    inputs: Record<string, unknown>,
    _config: Record<string, unknown>,
    _ctx: unknown
  ): Promise<Record<string, unknown>> {
    const refs = (inputs["reference-images"] as { url: string }[]) ?? [];
    const duration = 2000 + Math.random() * 2000;
    await sleep(duration);

    const swapped = refs.map((ref, i) => ({
      url: `https://picsum.photos/seed/swap-${Date.now()}-${i}/800/600`,
      source: ref.url,
      model: "nano-banana-pro-mock",
    }));

    return { "face-swapped": swapped };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
