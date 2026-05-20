import type { NodeTypeDef, WorkflowTemplate } from "./types";

export const NODE_TYPE_REGISTRY: Record<string, NodeTypeDef> = {
  "text-generator": {
    type: "text-generator",
    displayName: "Text Generator",
    category: "text",
    color: "#8B5CF6",
    icon: "type",
    inputs: [
      { id: "context", label: "Context", dataType: "text[]", direction: "input" },
    ],
    outputs: [{ id: "text", label: "Text", dataType: "text[]", direction: "output" }],
    defaultConfig: {
      model: "gpt-4o",
      prompt: "",
      count: 3,
    },
    configMeta: [
      { key: "prompt", label: "输入提示词", type: "text", defaultValue: "", description: "描述你想生成的文案内容和风格" },
      { key: "model", label: "Model", type: "select", defaultValue: "moonshot-v1-8k", options: [
        { label: "Kimi (8k)", value: "moonshot-v1-8k" },
        { label: "Kimi (32k)", value: "moonshot-v1-32k" },
        { label: "Kimi (128k)", value: "moonshot-v1-128k" },
        { label: "GPT-4o", value: "gpt-4o" },
        { label: "Claude Opus 4", value: "claude-opus-4" },
        { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
        { label: "DeepSeek V4", value: "deepseek-v4" },
      ]},
      { key: "count", label: "生成数量", type: "slider", defaultValue: 3, min: 1, max: 20, step: 1 },
    ],
  },
  "image-generator": {
    type: "image-generator",
    displayName: "Image Generator",
    category: "image",
    color: "#3B82F6",
    icon: "image",
    inputs: [
      { id: "reference-images", label: "Ref Images", dataType: "image[]", direction: "input" },
      { id: "prompt", label: "Prompt", dataType: "text[]", direction: "input" },
    ],
    outputs: [{ id: "images", label: "Images", dataType: "image[]", direction: "output" }],
    defaultConfig: {
      model: "gemini-3.1-flash-image-preview",
      prompt: "",
      aspectRatio: "1:1",
      quality: "hd",
      count: 4,
    },
    configMeta: [
      { key: "prompt", label: "输入提示词", type: "text", defaultValue: "", description: "描述你想生成的图片内容和风格" },
      { key: "model", label: "Model", type: "select", defaultValue: "gemini-3.1-flash-image-preview", options: [
        { label: "Banana 2 (Gemini Flash)", value: "gemini-3.1-flash-image-preview" },
        { label: "Banana Pro (Gemini Pro)", value: "gemini-3-pro-image-preview" },
        { label: "Gemini Imagen", value: "gemini-2.0-flash-exp-image-generation" },
        { label: "Flux Pro", value: "flux" },
      ]},
      { key: "aspectRatio", label: "比例", type: "select", defaultValue: "1:1", options: [
        { label: "1:1 (Square)", value: "1:1" },
        { label: "3:4 (Portrait)", value: "3:4" },
        { label: "4:3 (Landscape)", value: "4:3" },
        { label: "9:16 (Story)", value: "9:16" },
        { label: "16:9 (Banner)", value: "16:9" },
      ]},
      { key: "quality", label: "画质", type: "select", defaultValue: "hd", options: [
        { label: "HD (高清)", value: "hd" },
        { label: "4K (超清)", value: "4k" },
        { label: "Standard (标准)", value: "standard" },
      ]},
      { key: "count", label: "生成数量", type: "slider", defaultValue: 4, min: 1, max: 20, step: 1 },
    ],
  },
  "image-source": {
    type: "image-source",
    displayName: "Image",
    category: "source",
    color: "#10B981",
    icon: "image",
    inputs: [],
    outputs: [{ id: "images", label: "Images", dataType: "image[]", direction: "output" }],
    defaultConfig: { images: [] as string[] },
    configMeta: [],
  },
  "text-source": {
    type: "text-source",
    displayName: "Text",
    category: "source",
    color: "#F59E0B",
    icon: "type",
    inputs: [],
    outputs: [{ id: "text", label: "Text", dataType: "text[]", direction: "output" }],
    defaultConfig: { text: "" },
    configMeta: [
      { key: "text", label: "文本内容", type: "text", defaultValue: "", description: "输入文本内容" },
    ],
  },
  "ad-reference-search": {
    type: "ad-reference-search",
    displayName: "Ad Scout",
    category: "source",
    color: "#F97316",
    icon: "search",
    inputs: [],
    outputs: [{ id: "references", label: "References", dataType: "image[]", direction: "output" }],
    defaultConfig: {
      keywords: "",
      platform: "pinterest",
      count: 10,
    },
    configMeta: [
      { key: "keywords", label: "搜索关键词", type: "text", defaultValue: "", description: "输入产品名或行业关键词，如 summer dress, sneaker ad" },
      { key: "platform", label: "搜索平台", type: "select", defaultValue: "pinterest", options: [
        { label: "Pinterest", value: "pinterest" },
        { label: "Instagram", value: "instagram" },
        { label: "Facebook Ads", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "LinkedIn", value: "linkedin" },
      ]},
      { key: "count", label: "返回数量", type: "slider", defaultValue: 10, min: 4, max: 50, step: 2 },
    ],
  },
};

export const NODE_TYPE_LIST = Object.values(NODE_TYPE_REGISTRY);

export const CATEGORY_LABELS: Record<string, string> = {
  source: "Source",
  text: "Text",
  image: "Image",
};

// ── Workflow Templates ──

export const PRESET_TEMPLATES: WorkflowTemplate[] = [];
