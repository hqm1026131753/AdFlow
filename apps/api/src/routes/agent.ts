import { Router, type Request, type Response } from "express";
import { log } from "../lib/logger";

export const agentRouter = Router();

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1";

const SYSTEM_PROMPT = `你是 AdFlow Agent，一个广告创意工作流画布的 AI 助手。

## AdFlow 是什么
AdFlow 是一个可视化拖拽画布，用于搭建广告创意生产流水线：找参考 → 生成文案/图片 → 排版出图。

## 画布上可用的组件
1. **Text Generator** (text-generator) — AI 文案生成器，输入提示词，生成广告标题+正文。支持 Kimi/GPT-4o/Claude 等模型。
2. **Image Generator** (image-generator) — AI 图片生成器，输入提示词+参考图，生成广告素材图。支持 Flux/Midjourney/DALL·E 等。
3. **Ad Scout** (ad-reference-search) — 广告参考图搜索引擎，输入关键词从 Pinterest/Instagram/Facebook 等平台搜索广告参考，AI 评分筛选优质参考。
4. **Image Source** (image-source) — 图片素材节点，拖入本地图片或接收上游输出。
5. **Text Source** (text-source) — 文本素材节点，输入文案内容。

## 对话规则
- 用户说中文，你用中文回复。简洁直接，不要长篇大论。
- 理解用户需求后，如果适合添加组件，在回复末尾附上 JSON action。
- action 格式：{"action":{"type":"add_node","nodeType":"<组件类型>","label":"<按钮文案>"}}
- 如果用户要搜参考图，action type 用 "scout_search"，payload 里带 query。
- 如果用户只是聊天提问，不需要 action。
- 帮用户理解工作流概念：Image Source/Text Source 提供素材 → Generator 生成 → 连接形成流水线。`;

// POST /api/agent/chat
agentRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, context } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      context?: { nodeCount: number; nodeTypes: string[] };
    };

    if (!messages?.length) {
      res.status(400).json({ error: "messages required" });
      return;
    }

    if (!KIMI_API_KEY) {
      // Fallback: keyword matching when no API key
      const lastMsg = messages[messages.length - 1]?.content ?? "";
      res.json(fallbackResponse(lastMsg));
      return;
    }

    // Build context description if canvas is not empty
    let ctxNote = "";
    if (context && context.nodeCount > 0) {
      ctxNote = `\n当前画布状态：${context.nodeCount} 个节点，类型：${context.nodeTypes.join("、")}`;
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m, i) => ({
        role: m.role,
        content: i === messages.length - 1 && ctxNote ? m.content + ctxNote : m.content,
      })),
    ];

    const apiRes = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: apiMessages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = (await apiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "抱歉，我没能理解你的意思。";

    // Extract action JSON — handles both raw JSON and ```json fences, nested objects
    let text = content;
    let action: Record<string, unknown> | undefined;

    // Try ```json code block first, then raw JSON
    const fenceMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/);
    const jsonStr = fenceMatch?.[1] ?? content.match(/\{"action"\s*:\s*\{[\s\S]*?\}\}/)?.[0];

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        action = parsed.action;
        text = content.replace(jsonStr, "").replace(/```(?:json)?\s*|\s*```/g, "").trim();
      } catch {
        // Keep raw text if JSON parse fails
      }
    }

    log("agent", `Responded to "${messages[messages.length - 1]?.content?.slice(0, 40)}..."`);
    res.json({ text, action });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("agent", `Error: ${msg}`);
    res.status(500).json({ error: "Agent chat failed" });
  }
});

function fallbackResponse(input: string): { text: string; action?: Record<string, unknown> } {
  const lower = input.toLowerCase();
  if (lower.includes("图") || lower.includes("照片") || lower.includes("lookbook") || lower.includes("配图")) {
    return {
      text: "好的，我帮你添加一个 Image Generator。设置提示词、比例和画质后点击播放即可生成图片。",
      action: { type: "add_node", nodeType: "image-generator", label: "添加 Image Generator" },
    };
  }
  if (lower.includes("文案") || lower.includes("文字") || lower.includes("写") || lower.includes("标题") || lower.includes("促销")) {
    return {
      text: "没问题，我帮你添加一个 Text Generator。选择模型、设置数量后点击播放即可生成文案。",
      action: { type: "add_node", nodeType: "text-generator", label: "添加 Text Generator" },
    };
  }
  if (lower.includes("参考") || lower.includes("素材") || lower.includes("搜索") || lower.includes("找")) {
    return {
      text: "你可以使用 Ad Scout 组件搜索海外社媒上的广告参考图。输入关键词如「summer dress ad」，选择平台后点击 Scout 即可。",
      action: { type: "add_node", nodeType: "ad-reference-search", label: "添加 Ad Scout" },
    };
  }
  return {
    text: `收到。AdFlow 支持以下组件：\n• Text Generator — AI 文案生成\n• Image Generator — AI 图片生成\n• Ad Scout — 广告参考搜索\n• Image/Text Source — 素材输入\n\n从左侧拖拽组件到画布，或告诉我你想做什么。`,
  };
}
