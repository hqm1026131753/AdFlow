import { NodeExecutor } from "../NodeExecutor";
import type { ExecutionContext } from "../../engine/ExecutionContext";

// ── Types ──

interface ScoredImage {
  url: string;
  source: string;
  sourceUrl?: string;
  scores: {
    isAd: number;       // Is this an advertisement? (1-10)
    quality: number;     // Visual quality (1-10)
    style: number;       // Style professionalism (1-10)
    usefulness: number;  // Reference usefulness (1-10)
  };
  overall: number;       // Weighted average
  reason: string;
}

// ── Configuration ──

const VLM_SCORE_THRESHOLD = 7; // Minimum overall score to keep

// Weighted scoring formula (from ads_creativity benchmark approach)
const WEIGHTS = { isAd: 0.35, quality: 0.2, style: 0.15, usefulness: 0.3 };

// ── Executor ──

export class AdScoutExecutor extends NodeExecutor {
  readonly type = "ad-reference-search";

  async execute(
    _inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: ExecutionContext
  ): Promise<{ references: ScoredImage[] }> {
    const keywords = (config.keywords as string) ?? "";
    const platform = (config.platform as string) ?? "pinterest";
    const count = (config.count as number) ?? 10;

    if (!keywords.trim()) {
      return { references: [] };
    }

    // ── Step 1: Search platform for raw results ──
    const rawImages = await this.searchPlatform(keywords, platform, Math.ceil(count * 3));
    console.log(`[AdScout] Step 1 — Found ${rawImages.length} raw results for "${keywords}" on ${platform}`);

    // ── Step 2: Pre-filter by heuristics ──
    const filtered = rawImages.filter((img) => this.preFilter(img));
    console.log(`[AdScout] Step 2 — ${filtered.length} passed pre-filter`);

    // ── Step 3: VLM scoring ──
    const provider = this.getVLMProvider();
    const scored = await this.scoreBatch(filtered.slice(0, 20));
    console.log(`[AdScout] Step 3 — Scored ${scored.length} images`);

    // ── Step 4: Curate — threshold filter + sort by overall score ──
    // Use stricter threshold with VLM, looser with heuristic fallback
    const threshold = provider ? VLM_SCORE_THRESHOLD : 5;
    const curated = scored
      .filter((s) => s.overall >= threshold)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, count);

    console.log(`[AdScout] Step 4 — ${curated.length} curated results returned`);
    return { references: curated };
  }

  // ── Platform search dispatcher ──

  private async searchPlatform(
    keywords: string,
    platform: string,
    count: number
  ): Promise<Omit<ScoredImage, "scores" | "overall" | "reason">[]> {
    const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
    const PINTEREST_TOKEN = process.env.PINTEREST_TOKEN;
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_CX = process.env.GOOGLE_CX;

    try {
      switch (platform) {
        // ── Facebook / Instagram via Meta Ad Library API (free) ──
        case "facebook":
        case "instagram": {
          if (!FB_ACCESS_TOKEN) break;
          const searchTerms = encodeURIComponent(keywords);
          const url = `https://graph.facebook.com/v19.0/ads_archive?search_terms=${searchTerms}&ad_type=ALL&limit=${count}&fields=ad_snapshot_url,page_name,ad_creative_bodies&access_token=${FB_ACCESS_TOKEN}`;
          const res = await fetch(url);
          const data = (await res.json()) as {
            data?: Array<{
              ad_snapshot_url: string;
              page_name: string;
              ad_creative_bodies?: string[];
            }>;
          };
          return (data.data ?? []).map((ad) => ({
            url: ad.ad_snapshot_url,
            source: `Meta Ads — ${ad.page_name ?? "Unknown"}`,
            sourceUrl: ad.ad_snapshot_url,
          }));
        }

        // ── Pinterest API ──
        case "pinterest": {
          if (!PINTEREST_TOKEN) break;
          const url = `https://api.pinterest.com/v5/pins/search?query=${encodeURIComponent(keywords)}&page_size=${count}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${PINTEREST_TOKEN}` },
          });
          const data = (await res.json()) as {
            items?: Array<{
              link?: string;
              media?: { images?: { originals?: { url: string } } };
              title?: string;
            }>;
          };
          return (data.items ?? []).map((pin) => ({
            url: pin.media?.images?.originals?.url ?? "",
            source: `Pinterest — ${pin.title ?? "Untitled"}`,
            sourceUrl: pin.link,
          }));
        }

        // ── Google Custom Search (site-filtered) as fallback ──
        default: {
          if (!GOOGLE_API_KEY || !GOOGLE_CX) break;
          const siteFilter =
            platform === "pinterest" ? "site:pinterest.com" :
            platform === "instagram" ? "site:instagram.com" :
            platform === "tiktok" ? "site:tiktok.com" : "";
          const query = `${siteFilter}+${encodeURIComponent(keywords)}+ad`;
          const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${query}&searchType=image&num=${count}`;
          const res = await fetch(url);
          const data = (await res.json()) as {
            items?: Array<{ link: string; title: string }>;
          };
          return (data.items ?? []).map((item) => ({
            url: item.link,
            source: `Web — ${item.title ?? "Untitled"}`,
            sourceUrl: item.link,
          }));
        }
      }
    } catch (err) {
      console.warn(`[AdScout] Platform search failed for ${platform}:`, err);
    }

    // Ultimate fallback: mock data with realistic structure
    return this.mockSearch(keywords, count);
  }

  // ── Pre-filter heuristics ──

  private preFilter(img: { url: string }): boolean {
    // Skip obviously invalid URLs
    if (!img.url || !img.url.startsWith("http")) return false;
    // Skip tiny images (likely icons)
    // (We can't check actual dimensions without fetching, but URL patterns help)
    const lower = img.url.toLowerCase();
    if (lower.includes("icon") || lower.includes("favicon") || lower.includes("avatar")) return false;
    return true;
  }

  // ── VLM Scoring (Kimi / GPT-4V) ──

  private getVLMProvider(): { apiKey: string; baseUrl: string; model: string; needsBase64: boolean } | null {
    const KIMI_API_KEY = process.env.KIMI_API_KEY;
    if (KIMI_API_KEY) {
      return {
        apiKey: KIMI_API_KEY,
        baseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
        model: "moonshot-v1-8k-vision-preview",
        needsBase64: true,
      };
    }
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      return {
        apiKey: OPENAI_API_KEY,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
        needsBase64: false,
      };
    }
    return null;
  }

  private async scoreBatch(
    images: Omit<ScoredImage, "scores" | "overall" | "reason">[]
  ): Promise<ScoredImage[]> {
    const provider = this.getVLMProvider();
    if (!provider) {
      console.log("[AdScout] No KIMI_API_KEY or OPENAI_API_KEY — using heuristic scores");
      return images.map((img) => this.heuristicScore(img));
    }

    console.log(`[AdScout] VLM scoring via ${provider.model} (${images.length} images)`);

    const results: ScoredImage[] = [];
    const batchSize = 5;

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((img) => this.scoreWithVLM(img, provider))
      );
      results.push(...batchResults);

      if (i + batchSize < images.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return results;
  }

  private async scoreWithVLM(
    img: { url: string; source: string; sourceUrl?: string },
    provider: { apiKey: string; baseUrl: string; model: string; needsBase64: boolean }
  ): Promise<ScoredImage> {
    try {
      // Resolve image URL — Kimi needs base64 data URI, OpenAI supports raw URLs
      let imageUrl = img.url;
      if (provider.needsBase64 && img.url.startsWith("http")) {
        imageUrl = await this.urlToBase64(img.url);
      }

      const imagePayload: Record<string, unknown> = { url: imageUrl };
      if (!provider.needsBase64) {
        imagePayload.detail = "low";
      }

      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: "system",
              content: `You are an ad creative analyst. Rate this image on a 1-10 scale for each dimension:
1. isAd — Is this an advertisement? (layout, product focus, CTA, branding)
2. quality — Visual quality (lighting, composition, resolution)
3. style — Style professionalism (would a brand use this?)
4. usefulness — Reference usefulness (can it inspire new ad designs?)

Return ONLY valid JSON: {"isAd":8,"quality":7,"style":8,"usefulness":9,"reason":"brief reason in English"}`,
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: imagePayload },
                { type: "text", text: "Rate this image as an ad creative reference." },
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "{}";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const scores = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const isAd = this.clamp(scores.isAd, 1, 10);
      const quality = this.clamp(scores.quality, 1, 10);
      const style = this.clamp(scores.style, 1, 10);
      const usefulness = this.clamp(scores.usefulness, 1, 10);

      return {
        ...img,
        scores: { isAd, quality, style, usefulness },
        overall: this.weightedScore({ isAd, quality, style, usefulness }),
        reason: scores.reason ?? "VLM scored",
      };
    } catch (err) {
      console.warn(`[AdScout] VLM scoring failed for ${img.url}:`, err);
      return this.heuristicScore(img);
    }
  }

  // ── Heuristic fallback scoring (no API key) ──

  private heuristicScore(
    img: Omit<ScoredImage, "scores" | "overall" | "reason">
  ): ScoredImage {
    // Mock heuristic: vary scores deterministically from URL
    const seed = img.url.length % 10;
    const scores = {
      isAd: 5 + seed * 0.4,
      quality: 5 + (seed % 5),
      style: 5 + ((seed * 2) % 5),
      usefulness: 5 + ((seed * 3) % 5),
    };
    return {
      ...img,
      scores,
      overall: this.weightedScore(scores),
      reason: "Heuristic score (set KIMI_API_KEY or OPENAI_API_KEY for VLM scoring)",
    };
  }

  // ── Image URL → base64 for Kimi vision ──

  private async urlToBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const b64 = buffer.toString("base64");
    return `data:${contentType};base64,${b64}`;
  }

  // ── Helpers ──

  private weightedScore(s: { isAd: number; quality: number; style: number; usefulness: number }): number {
    return parseFloat(
      (
        s.isAd * WEIGHTS.isAd +
        s.quality * WEIGHTS.quality +
        s.style * WEIGHTS.style +
        s.usefulness * WEIGHTS.usefulness
      ).toFixed(1)
    );
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number(v) || 0));
  }

  private mockSearch(
    keywords: string,
    count: number
  ): Omit<ScoredImage, "scores" | "overall" | "reason">[] {
    return Array.from({ length: count }, (_, i) => ({
      url: `https://picsum.photos/seed/scout-${Date.now()}-${i}/600/${400 + (i % 3) * 200}`,
      source: `Mock — ${keywords}`,
      sourceUrl: undefined,
    }));
  }
}
