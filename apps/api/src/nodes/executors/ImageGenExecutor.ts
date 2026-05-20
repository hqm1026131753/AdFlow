import { NodeExecutor } from "../NodeExecutor";
import type { ExecutionContext } from "../../engine/ExecutionContext";

export class ImageGenExecutor extends NodeExecutor {
  readonly type = "image-generator";

  async execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: ExecutionContext
  ): Promise<{ images: string[] }> {
    const prompt = (config.prompt as string) ?? "";
    const count = Math.min(config.count as number ?? 4, 4);
    const aspectRatio = (config.aspectRatio as string) ?? "1:1";
    const quality = (config.quality as string) ?? "hd";
    const model = (config.model as string) ?? "gemini-3.1-flash-image-preview";

    const API_KEY = process.env.IMAGE_GEN_API_KEY;
    const BASE_URL = process.env.IMAGE_GEN_BASE_URL ?? "https://newapi.bananapro.top/v1";

    if (!prompt.trim()) {
      return { images: [] };
    }

    // Gather reference image URLs from inputs
    const refImages = (inputs["reference-images"] as string[]) ?? [];
    const refNote = refImages.length > 0
      ? `\nReference style from ${refImages.length} image(s). Match the visual style, composition, and mood.`
      : "";

    // Map aspect ratio to size hint for the prompt
    const aspectRatioHints: Record<string, string> = {
      "1:1": "square 1:1 aspect ratio",
      "3:4": "portrait 3:4 aspect ratio",
      "4:3": "landscape 4:3 aspect ratio",
      "9:16": "vertical 9:16 story format",
      "16:9": "widescreen 16:9 banner format",
    };
    const ratioHint = aspectRatioHints[aspectRatio] ?? "square 1:1 aspect ratio";

    // Build enhanced prompt with quality hints
    const qualityHints: Record<string, string> = {
      hd: "high quality, sharp details, professional lighting",
      "4k": "ultra high quality, 4K resolution, hyper-detailed, cinematic lighting",
      standard: "clean composition, good lighting",
    };
    const fullPrompt = `Generate an image: ${prompt}. ${qualityHints[quality] ?? qualityHints.hd}. ${ratioHint}.${refNote}`;

    if (API_KEY) {
      try {
        const images: string[] = [];

        for (let i = 0; i < count; i++) {
          const res = await fetch(`${BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: fullPrompt,
                },
              ],
              max_tokens: 4096,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`[ImageGen] API error (${res.status}):`, errText);
            continue;
          }

          const data = (await res.json()) as {
            choices?: Array<{
              message?: { content?: string };
            }>;
          };

          const content = data.choices?.[0]?.message?.content;
          if (content) {
            // BananaPro returns markdown: ![image](data:image/png;base64,...)
            const base64Match = content.match(/!\[image\]\((data:image\/[^;]+;base64,[^)]+)\)/);
            if (base64Match) {
              images.push(base64Match[1]);
            } else {
              // Try raw base64 data URI pattern
              const rawMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
              if (rawMatch) {
                images.push(rawMatch[0]);
              } else {
                console.warn("[ImageGen] Could not parse base64 from response:", content.slice(0, 200));
              }
            }
          }
        }

        if (images.length > 0) {
          console.log(`[ImageGen] Generated ${images.length} images via ${model}`);
          return { images };
        }
      } catch (err) {
        console.warn("[ImageGen] API call failed:", err);
      }
    }

    // Fallback: mock images
    console.log(`[ImageGen] No IMAGE_GEN_API_KEY or API failed — using mock images`);
    return { images: this.mockImages(prompt, count, aspectRatio) };
  }

  private mockImages(prompt: string, count: number, aspectRatio: string): string[] {
    const [w, h] = aspectRatio.split(":").map(Number);
    const seed = Date.now();
    return Array.from({ length: count }, (_, i) =>
      `https://picsum.photos/seed/img-gen-${seed}-${i}/${(w ?? 1) * 256}/${(h ?? 1) * 256}`
    );
  }
}
