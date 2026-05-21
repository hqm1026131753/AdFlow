import { NodeExecutor } from "../NodeExecutor";
import type { ExecutionContext } from "../../engine/ExecutionContext";

const DALL_E_SIZE_MAP: Record<string, string> = {
  "1:1": "1024x1024",
  "3:4": "1024x1792",
  "4:3": "1792x1024",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
};

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

    if (!prompt.trim()) return { images: [] };

    // Route to DALL-E or Banana/Gemini based on model
    if (model.startsWith("dall-e") || model.startsWith("gpt-image")) {
      return this.generateWithDalle(prompt, count, aspectRatio, quality, model);
    }
    return this.generateWithBanana(prompt, count, aspectRatio, quality, model);

  }

  // ── OpenAI DALL-E ──

  private async generateWithDalle(
    prompt: string,
    count: number,
    aspectRatio: string,
    quality: string,
    model: string
  ): Promise<{ images: string[] }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[ImageGen] No OPENAI_API_KEY for DALL-E — using mock");
      return { images: this.mockImages(prompt, count, aspectRatio) };
    }

    const size = DALL_E_SIZE_MAP[aspectRatio] ?? "1024x1024";
    // Only pass quality for models that accept it (GPT Image 2, DALL-E 3)
    const supportsQuality = model === "gpt-image-2" || model === "dall-e-3";
    const apiQuality = supportsQuality ? (quality === "standard" ? "standard" : "hd") : undefined;

    try {
      const images: string[] = [];

      for (let i = 0; i < count; i++) {
        const body: Record<string, unknown> = {
          model,
          prompt,
          n: 1,
          size,
          response_format: "url",
        };
        if (apiQuality) body.quality = apiQuality;

        const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
        const res = await fetch(`${baseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[ImageGen] DALL-E error (${res.status}):`, errText);
          continue;
        }

        const data = (await res.json()) as {
          data?: Array<{ url?: string; b64_json?: string }>;
        };
        const url = data.data?.[0]?.url;
        if (url) {
          // Convert URL to base64 for consistent storage
          const base64 = await this.urlToBase64(url);
          images.push(base64);
        }
      }

      if (images.length > 0) {
        console.log(`[ImageGen] Generated ${images.length} images via ${model}`);
        return { images };
      }
    } catch (err) {
      console.warn("[ImageGen] DALL-E call failed:", err);
    }

    return { images: this.mockImages(prompt, count, aspectRatio) };
  }

  // ── Banana / Gemini ──

  private async generateWithBanana(
    prompt: string,
    count: number,
    aspectRatio: string,
    quality: string,
    model: string
  ): Promise<{ images: string[] }> {
    const apiKey = process.env.IMAGE_GEN_API_KEY;
    const baseUrl = process.env.IMAGE_GEN_BASE_URL ?? "https://newapi.bananapro.top/v1";

    const aspectRatioHints: Record<string, string> = {
      "1:1": "square 1:1 aspect ratio",
      "3:4": "portrait 3:4 aspect ratio",
      "4:3": "landscape 4:3 aspect ratio",
      "9:16": "vertical 9:16 story format",
      "16:9": "widescreen 16:9 banner format",
    };
    const ratioHint = aspectRatioHints[aspectRatio] ?? "square 1:1 aspect ratio";

    const qualityHints: Record<string, string> = {
      hd: "high quality, sharp details, professional lighting",
      standard: "clean composition, good lighting",
    };
    const fullPrompt = `Generate an image: ${prompt}. ${qualityHints[quality] ?? qualityHints.hd}. ${ratioHint}.`;

    if (!apiKey) {
      console.warn("[ImageGen] No IMAGE_GEN_API_KEY — using mock");
      return { images: this.mockImages(prompt, count, aspectRatio) };
    }

    try {
      const images: string[] = [];

      for (let i = 0; i < count; i++) {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: fullPrompt }],
            max_tokens: 4096,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[ImageGen] Banana error (${res.status}):`, errText);
          continue;
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const base64Match = content.match(/!\[image\]\((data:image\/[^;]+;base64,[^)]+)\)/);
          if (base64Match) {
            images.push(base64Match[1]);
          } else {
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
      console.warn("[ImageGen] Banana call failed:", err);
    }

    return { images: this.mockImages(prompt, count, aspectRatio) };
  }

  // ── URL → base64 ──

  private async urlToBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  private mockImages(prompt: string, count: number, aspectRatio: string): string[] {
    const [w, h] = aspectRatio.split(":").map(Number);
    const seed = Date.now();
    return Array.from({ length: count }, (_, i) =>
      `https://picsum.photos/seed/img-gen-${seed}-${i}/${(w ?? 1) * 256}/${(h ?? 1) * 256}`
    );
  }
}
