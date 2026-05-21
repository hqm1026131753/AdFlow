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
      { key: "model", label: "Model", type: "select", defaultValue: "kimi-k2.6", options: [
        { label: "kimi-k2.6", value: "kimi-k2.6" },
        { label: "kimi-k2.5", value: "kimi-k2.5" },
        { label: "gpt-5.4", value: "gpt-5.4" },
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
        { label: "GPT Image 2", value: "gpt-image-2" },
      ]},
      { key: "aspectRatio", label: "比例", type: "select", defaultValue: "1:1", options: [
        { label: "1:1 (Square)", value: "1:1" },
        { label: "3:4 (Portrait)", value: "3:4" },
        { label: "4:3 (Landscape)", value: "4:3" },
        { label: "9:16 (Story)", value: "9:16" },
        { label: "16:9 (Banner)", value: "16:9" },
      ]},
      { key: "quality", label: "清晰度", type: "select", defaultValue: "hd", options: [
        { label: "HD 高清", value: "hd" },
        { label: "Standard 标准", value: "standard" },
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
    inputs: [
      { id: "ref-images", label: "Ref Images", dataType: "image[]", direction: "input" },
    ],
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
    inputs: [
      { id: "ref-text", label: "Ref Text", dataType: "text[]", direction: "input" },
    ],
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
    inputs: [
      { id: "keywords", label: "Keywords", dataType: "text[]", direction: "input" },
    ],
    outputs: [{ id: "references", label: "References", dataType: "image[]", direction: "output" }],
    defaultConfig: {
      keywords: "",
      platform: "pinterest",
      source: "stock",
    },
    configMeta: [
      { key: "keywords", label: "搜索关键词", type: "text", defaultValue: "", description: "用自然语言描述你想搜索的参考图，可指定数量，如：\n找5张防晒霜广告参考图\n3 photos of sneaker ads" },
      { key: "source", label: "数据来源", type: "select", defaultValue: "stock", options: [
        { label: "免费图库 (全自动)", value: "stock" },
        { label: "社交平台 API", value: "social" },
        { label: "手动采集", value: "manual" },
      ]},
      { key: "platform", label: "搜索平台", type: "select", defaultValue: "pinterest", options: [
        { label: "Pinterest", value: "pinterest" },
        { label: "Instagram", value: "instagram" },
        { label: "Facebook Ads", value: "facebook" },
        { label: "TikTok", value: "tiktok" },
        { label: "LinkedIn", value: "linkedin" },
      ]},
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
