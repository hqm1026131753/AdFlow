import { NodeExecutor } from "../NodeExecutor";
import type { ExecutionContext } from "../../engine/ExecutionContext";

// ── Types ──

interface ScoredImage {
  url: string;
  source: string;
  sourceUrl?: string;
  scores: {
    isAd: number;
    quality: number;
    style: number;
    usefulness: number;
  };
  overall: number;
  reason: string;
}

// ── Configuration ──

const VLM_SCORE_THRESHOLD = 7;
const WEIGHTS = { isAd: 0.35, quality: 0.2, style: 0.15, usefulness: 0.3 };

// ── Keyword translation map for stock photo quality ──

const AD_KEYWORD_SUFFIXES: Record<string, string> = {
  beauty: "beauty product commercial photography campaign",
  skincare: "skincare product commercial photography campaign",
  sunscreen: "sunscreen product commercial photography beach",
  fashion: "fashion editorial commercial campaign photography",
  sneaker: "sneaker product commercial campaign photography",
  shoe: "shoe product commercial campaign photography",
  food: "food product commercial advertising photography",
  drink: "beverage commercial advertising photography",
  tech: "tech product commercial advertising photography",
  phone: "smartphone product commercial photography",
  car: "automotive commercial campaign photography",
  jewelry: "jewelry product commercial photography",
  perfume: "perfume product commercial photography luxury",
  watch: "watch product commercial photography luxury",
  fitness: "fitness product commercial campaign photography",
  home: "home decor commercial photography",
  travel: "travel commercial campaign photography",
  makeup: "makeup product commercial photography",
  haircare: "haircare product commercial photography",
  bag: "handbag product commercial photography luxury",
  furniture: "furniture commercial photography interior",
};

function translateKeywords(keywords: string): string {
  const lower = keywords.toLowerCase();
  for (const [key, suffix] of Object.entries(AD_KEYWORD_SUFFIXES)) {
    if (lower.includes(key)) return suffix;
  }
  // Generic fallback — append "commercial photography"
  return `${keywords} commercial advertising photography`;
}

// ── Executor ──

export class AdScoutExecutor extends NodeExecutor {
  readonly type = "ad-reference-search";

  /**
   * Parse quantity from user input.
   * Supports: "5张", "3个", "10张图", "5 photos", "10 images", "2 pics", "找5张..."
   * Returns [cleanedKeywords, count].
   */
  private parseIntent(input: string): [string, number] {
    // Chinese patterns
    let m = input.match(/(\d+)\s*[张个幅]/);
    if (m) return [input.replace(m[0], "").trim(), parseInt(m[1], 10)];

    // English patterns
    m = input.match(/(\d+)\s*(photos?|images?|pics?|pictures?)/i);
    if (m) return [input.replace(m[0], "").trim(), parseInt(m[1], 10)];

    // "a photo" / "an image" = 1
    if (/\ba\s+(photo|image|pic|picture)\b/i.test(input)) {
      return [input.replace(/\ba\s+(photo|image|pic|picture)\b/i, "").trim(), 1];
    }

    return [input.trim(), 1];
  }

  async execute(
    _inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: ExecutionContext
  ): Promise<{ references: ScoredImage[] }> {
    const rawInput = (config.keywords as string) ?? "";
    const source = (config.source as string) ?? "stock";
    const platform = (config.platform as string) ?? "pinterest";

    if (!rawInput.trim()) {
      return { references: [] };
    }

    // Parse intent: extract count from natural language, clean keywords
    const [keywords, count] = this.parseIntent(rawInput);
    console.log(`[AdScout] Intent: "${keywords}" → ${count} images (source: ${source})`);

    if (!keywords) {
      return { references: [] };
    }

    // ── Step 1: Search ──
    let rawImages: Omit<ScoredImage, "scores" | "overall" | "reason">[];

    if (source === "manual") {
      console.log(`[AdScout] Manual mode — waiting for user links`);
      return { references: [] };
    } else if (source === "social") {
      rawImages = await this.searchPlatform(keywords, platform, Math.ceil(count * 3));
    } else {
      rawImages = await this.searchStock(keywords, Math.max(Math.ceil(count * 3), 8));
    }

    console.log(`[AdScout] Step 1 — ${rawImages.length} raw results`);

    // ── Step 2: Pre-filter + deduplicate ──
    const seen = new Set<string>();
    const filtered = rawImages.filter((img) => {
      if (!this.preFilter(img)) return false;
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });
    console.log(`[AdScout] Step 2 — ${filtered.length} passed pre-filter`);

    // ── Step 3: VLM scoring ──
    const provider = this.getVLMProvider();
    const scored = await this.scoreBatch(filtered.slice(0, 20));
    console.log(`[AdScout] Step 3 — Scored ${scored.length} images`);

    // ── Step 4: Curate ──
    const threshold = provider ? VLM_SCORE_THRESHOLD : 5;
    const curated = scored
      .filter((s) => s.overall >= threshold)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, count);

    console.log(`[AdScout] Step 4 — ${curated.length} curated results (wanted ${count})`);
    return { references: curated };
  }

  // ── Stock Photo API Search (Unsplash + Pexels + Pixabay) ──

  private async searchStock(
    keywords: string,
    count: number
  ): Promise<Omit<ScoredImage, "scores" | "overall" | "reason">[]> {
    const query = translateKeywords(keywords);
    console.log(`[AdScout] Stock search query: "${query}"`);

    const results: Omit<ScoredImage, "scores" | "overall" | "reason">[] = [];
    const perSource = Math.ceil(count / 3);

    // Fire all 3 APIs in parallel
    const [unsplash, pexels, pixabay] = await Promise.allSettled([
      this.searchUnsplash(query, perSource),
      this.searchPexels(query, perSource),
      this.searchPixabay(query, perSource),
    ]);

    if (unsplash.status === "fulfilled") results.push(...unsplash.value);
    if (pexels.status === "fulfilled") results.push(...pexels.value);
    if (pixabay.status === "fulfilled") results.push(...pixabay.value);

    // Fallback to mock if all APIs failed
    if (results.length === 0) {
      console.warn("[AdScout] All stock APIs failed — using mock fallback");
      return this.mockSearch(query, count);
    }

    return results;
  }

  private async searchUnsplash(
    query: string,
    perPage: number
  ): Promise<Omit<ScoredImage, "scores" | "overall" | "reason">[]> {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return [];
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${key}` },
      });
      const data = (await res.json()) as {
        results?: Array<{
          id: string;
          urls: { regular: string };
          links: { html: string };
          user: { name: string };
        }>;
      };
      return (data.results ?? []).map((img) => ({
        url: img.urls.regular,
        source: `Unsplash — ${img.user.name}`,
        sourceUrl: img.links.html,
      }));
    } catch (err) {
      console.warn("[AdScout] Unsplash failed:", err);
      return [];
    }
  }

  private async searchPexels(
    query: string,
    perPage: number
  ): Promise<Omit<ScoredImage, "scores" | "overall" | "reason">[]> {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return [];
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: key },
      });
      const data = (await res.json()) as {
        photos?: Array<{
          id: number;
          src: { large: string };
          url: string;
          photographer: string;
        }>;
      };
      return (data.photos ?? []).map((img) => ({
        url: img.src.large,
        source: `Pexels — ${img.photographer}`,
        sourceUrl: img.url,
      }));
    } catch (err) {
      console.warn("[AdScout] Pexels failed:", err);
      return [];
    }
  }

  private async searchPixabay(
    query: string,
    perPage: number
  ): Promise<Omit<ScoredImage, "scores" | "overall" | "reason">[]> {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return [];
    try {
      const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=${perPage}&orientation=horizontal&safesearch=true`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        hits?: Array<{
          id: number;
          largeImageURL: string;
          pageURL: string;
          user: string;
        }>;
      };
      return (data.hits ?? []).map((img) => ({
        url: img.largeImageURL,
        source: `Pixabay — ${img.user}`,
        sourceUrl: img.pageURL,
      }));
    } catch (err) {
      console.warn("[AdScout] Pixabay failed:", err);
      return [];
    }
  }

  // ── Social Platform Search (legacy) ──

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
        case "facebook":
        case "instagram": {
          if (!FB_ACCESS_TOKEN) break;
          const searchTerms = encodeURIComponent(keywords);
          const url = `https://graph.facebook.com/v19.0/ads_archive?search_terms=${searchTerms}&ad_type=ALL&limit=${count}&fields=ad_snapshot_url,page_name,ad_creative_bodies&access_token=${FB_ACCESS_TOKEN}`;
          const res = await fetch(url);
          const data = (await res.json()) as {
            data?: Array<{ ad_snapshot_url: string; page_name: string }>;
          };
          return (data.data ?? []).map((ad) => ({
            url: ad.ad_snapshot_url,
            source: `Meta Ads — ${ad.page_name ?? "Unknown"}`,
            sourceUrl: ad.ad_snapshot_url,
          }));
        }

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

    return this.mockSearch(keywords, count);
  }

  // ── Pre-filter ──

  private preFilter(img: { url: string }): boolean {
    if (!img.url || !img.url.startsWith("http")) return false;
    const lower = img.url.toLowerCase();
    if (lower.includes("icon") || lower.includes("favicon") || lower.includes("avatar")) return false;
    return true;
  }

  // ── VLM Scoring ──

  private getVLMProvider(): { apiKey: string; baseUrl: string; model: string; needsBase64: boolean } | null {
    const KIMI_API_KEY = process.env.KIMI_API_KEY;
    if (KIMI_API_KEY) {
      return {
        apiKey: KIMI_API_KEY,
        baseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
        model: "kimi-k2.6",
        needsBase64: true,
      };
    }
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      return {
        apiKey: OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        model: "gpt-5.4",
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
      console.warn(`[AdScout] VLM scoring failed:`, err);
      return this.heuristicScore(img);
    }
  }

  // ── Heuristic fallback ──

  private heuristicScore(
    img: Omit<ScoredImage, "scores" | "overall" | "reason">
  ): ScoredImage {
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

  // ── URL → base64 ──

  private async urlToBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  // ── Helpers ──

  private weightedScore(s: {
    isAd: number;
    quality: number;
    style: number;
    usefulness: number;
  }): number {
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
