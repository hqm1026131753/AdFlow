import { NodeExecutor } from "../NodeExecutor";
import type { ExecutionContext } from "../../engine/ExecutionContext";

export class TextGenExecutor extends NodeExecutor {
  readonly type = "text-generator";

  async execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    _ctx: ExecutionContext
  ): Promise<{ texts: string[] }> {
    const prompt = (config.prompt as string) ?? "";
    const model = (config.model as string) ?? "kimi-k2.6";
    const count = Math.min(config.count as number ?? 3, 20);

    if (!prompt.trim()) return { texts: [] };

    // Gather context from input ports
    const contextTexts = (inputs.context as string[]) ?? [];
    const contextBlock = contextTexts.length > 0
      ? `\n\n参考素材:\n${contextTexts.map((t, i) => `[${i + 1}] ${t}`).join("\n")}`
      : "";

    const systemPrompt = `你是一个专业的广告文案撰写人。根据用户提供的要求${contextTexts.length > 0 ? "和参考素材" : ""}，生成 ${count} 条广告文案变体。每条文案应包含一个吸引人的标题和简洁的正文描述。

返回格式：用 JSON 数组返回，每个元素是一个对象 {"title": "标题", "body": "正文"}。只返回 JSON，不要其他内容。`;

    // Route to OpenAI or Kimi based on model
    if (model.startsWith("gpt-")) {
      return this.callOpenAI(model, systemPrompt, prompt, contextBlock, count);
    }
    return this.callKimi(model, systemPrompt, prompt, contextBlock, count);
  }

  private async callKimi(
    model: string,
    systemPrompt: string,
    prompt: string,
    contextBlock: string,
    count: number
  ): Promise<{ texts: string[] }> {
    const apiKey = process.env.KIMI_API_KEY;
    const baseUrl = process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1";

    if (!apiKey) {
      console.warn("[TextGen] No KIMI_API_KEY — using fallback");
      return { texts: this.fallbackTexts(prompt, count) };
    }

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${prompt}${contextBlock}` },
          ],
          max_tokens: 2000,
          temperature: 0.8,
        }),
      });

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const items: Array<{ title: string; body: string }> = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      const texts = items.slice(0, count).map((item) => `${item.title}\n\n${item.body}`);

      console.log(`[TextGen] Generated ${texts.length} text variants via ${model}`);
      return { texts };
    } catch (err) {
      console.warn("[TextGen] Kimi call failed:", err);
      return { texts: this.fallbackTexts(prompt, count) };
    }
  }

  private async callOpenAI(
    model: string,
    systemPrompt: string,
    prompt: string,
    contextBlock: string,
    count: number
  ): Promise<{ texts: string[] }> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("[TextGen] No OPENAI_API_KEY — using fallback");
      return { texts: this.fallbackTexts(prompt, count) };
    }

    try {
      const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${prompt}${contextBlock}` },
          ],
          max_tokens: 2000,
          temperature: 0.8,
        }),
      });

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const items: Array<{ title: string; body: string }> = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      const texts = items.slice(0, count).map((item) => `${item.title}\n\n${item.body}`);

      console.log(`[TextGen] Generated ${texts.length} text variants via ${model}`);
      return { texts };
    } catch (err) {
      console.warn("[TextGen] OpenAI call failed:", err);
      return { texts: this.fallbackTexts(prompt, count) };
    }
  }

  private fallbackTexts(prompt: string, count: number): string[] {
    return Array.from({ length: count }, (_, i) =>
      `[Mock 文案 ${i + 1}]\n\n基于 "${prompt}" 生成的广告文案占位文本。设置 KIMI_API_KEY 环境变量以启用真实 AI 生成。`
    );
  }
}
