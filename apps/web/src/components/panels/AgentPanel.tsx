import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkflowStore } from "../../store/workflowStore";
import { api } from "../../api/client";
import {
  Send,
  Sparkles,
  Wand2,
  Loader2,
  Plus,
  BookOpen,
  Lightbulb,
  Box,
  Mic,
  ChevronDown,
  Image,
  Type,
  Search,
  Layout,
  Clapperboard,
  ShoppingBag,
  Palette,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

// ── Types ──

interface Message {
  role: "user" | "agent";
  text: string;
  action?: {
    type: string;
    nodeType?: string;
    label?: string;
    payload?: unknown;
  };
}

interface SkillItem {
  label: string;
  text: string;
  icon: React.ReactNode;
  color: string;
}

// ── Skills ──

const SKILLS: SkillItem[] = [
  { label: "AI 生图", text: "帮我生成一组电商广告创意图", icon: <Image className="w-3.5 h-3.5" />, color: "#8B5CF6" },
  { label: "文案生成", text: "写一段防晒霜促销广告文案", icon: <Type className="w-3.5 h-3.5" />, color: "#F59E0B" },
  { label: "找广告参考", text: "帮我找一些美妆类的广告参考图", icon: <Search className="w-3.5 h-3.5" />, color: "#F97316" },
  { label: "搭建工作流", text: "帮我搭建一个从参考到出图的工作流", icon: <Layout className="w-3.5 h-3.5" />, color: "#10B981" },
  { label: "视频创意", text: "帮我写一个 15 秒短视频广告脚本", icon: <Clapperboard className="w-3.5 h-3.5" />, color: "#3B82F6" },
  { label: "产品替换", text: "把产品图背景换成海边场景", icon: <ShoppingBag className="w-3.5 h-3.5" />, color: "#EC4899" },
  { label: "风格迁移", text: "把这张参考图的风格应用到产品图上", icon: <Palette className="w-3.5 h-3.5" />, color: "#14B8A6" },
  { label: "所有技能", text: "你能帮我做什么？", icon: <Sparkles className="w-3.5 h-3.5" />, color: "#6366F1" },
];

// ── Component ──

export function AgentPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nodes = useWorkflowStore((s) => s.nodes);
  const addNode = useWorkflowStore((s) => s.addNode);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Hide skills once conversation starts
  useEffect(() => {
    if (messages.length > 0) {
      setShowSkills(false);
    }
  }, [messages.length]);

  // Build canvas context for the agent
  const getContext = useCallback(() => {
    if (nodes.length === 0) return undefined;
    const types = [...new Set(nodes.map((n) => n.data.nodeType))];
    return { nodeCount: nodes.length, nodeTypes: types };
  }, [nodes]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));

      const healthOk = await fetch("/api/health")
        .then((r) => r.ok)
        .catch(() => false);

      if (!healthOk) {
        throw new Error("无法连接到 API 服务器，请确认后端服务已启动。");
      }

      const resp = await api.agent.chat({
        messages: history,
        context: getContext(),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: resp.text,
          action: resp.action
            ? {
                type: resp.action.type,
                nodeType: resp.action.nodeType,
                label: resp.action.label,
                payload: resp.action.payload,
              }
            : undefined,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? (err as Record<string, unknown>).message
            : String(err);
      console.warn("[Agent] Chat failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `抱歉，出了点问题：${msg || "未知错误"}。请检查 API 服务是否正常运行。`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: Message["action"]) => {
    if (!action) return;
    switch (action.type) {
      case "add_node": {
        const nodeType = action.nodeType ?? "text-generator";
        addNode(nodeType, { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 });
        break;
      }
      case "scout_search": {
        addNode("ad-reference-search", { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 });
        const latestNodes = useWorkflowStore.getState().nodes;
        const newNode = latestNodes[latestNodes.length - 1];
        if (newNode && action.payload) {
          useWorkflowStore.getState().updateNodeConfig(newNode.id, {
            keywords: (action.payload as Record<string, unknown>).query ?? "",
          });
        }
        break;
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowSkills(true);
    setInput("");
  };

  return (
    <div className="w-[420px] shrink-0 bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-zinc-300">新对话</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
            title="新建对话"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col">
        {showSkills && messages.length === 0 ? (
          /* Skills view - Lovart style */
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
            <div className="text-center mb-6">
              <h2 className="text-base font-medium text-zinc-300 mb-1">试试这些 AdFlow Skills</h2>
              <p className="text-xs text-zinc-600">点击任意技能快速开始</p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
              {SKILLS.map((skill) => (
                <button
                  key={skill.label}
                  onClick={() => handleSend(skill.text)}
                  disabled={loading}
                  className="group flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-[#2a2a2a] bg-[#141414] text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-[#1a1a1a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span
                    style={{ color: skill.color }}
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                  >
                    {skill.icon}
                  </span>
                  <span className="text-[12px] font-medium">{skill.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 text-xs text-zinc-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              按需求描述，或点击下方输入框开始自由对话
            </div>
          </div>
        ) : (
          /* Chat view */
          <div className="flex flex-col gap-4 px-4 py-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  {msg.role === "agent" ? (
                    <>
                      <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium">AdFlow Agent</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-zinc-500 font-medium">你</span>
                      <div className="w-4 h-4 rounded bg-zinc-700 flex items-center justify-center">
                        <span className="text-[8px] text-zinc-400">U</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`text-[13px] leading-relaxed rounded-2xl px-3.5 py-2.5 max-w-[90%] whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-violet-600/90 text-white rounded-br-md"
                      : "bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-300 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Action button */}
                {msg.action && (
                  <button
                    onClick={() => handleAction(msg.action)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 border border-violet-500/30 text-xs text-violet-400 hover:bg-violet-600/20 transition-colors mt-0.5"
                  >
                    <Wand2 className="w-3 h-3" />
                    {msg.action.label ?? "执行"}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">思考中</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick re-show skills when in chat mode */}
      {!showSkills && messages.length > 0 && (
        <div className="px-4 pt-2 pb-1 shrink-0">
          <button
            onClick={() => setShowSkills(true)}
            className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            显示技能快捷入口
          </button>
        </div>
      )}

      {/* Skills pills row (when in chat mode and showSkills toggled) */}
      {!showSkills && messages.length > 0 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {SKILLS.slice(0, 6).map((skill) => (
              <button
                key={skill.label}
                onClick={() => handleSend(skill.text)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#2a2a2a] bg-[#141414] text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors disabled:opacity-40"
              >
                <span style={{ color: skill.color }}>{skill.icon}</span>
                {skill.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom input area - Lovart style */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600/50 transition-all">
          {/* Input */}
          <div className="px-3.5 py-2.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="描述你的需求，或输入 @ 提及节点..."
              disabled={loading}
              className="w-full bg-transparent text-[13px] text-zinc-300 placeholder-zinc-600 focus:outline-none disabled:opacity-40"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* Left tools */}
            <div className="flex items-center gap-0.5">
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-[#252525] transition-colors"
                title="添加附件"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-[#252525] transition-colors"
                title="技能库"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-[#252525] transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px]">Agent</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Right tools */}
            <div className="flex items-center gap-0.5">
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-[#252525] transition-colors"
                title="提示词建议"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-[#252525] transition-colors"
                title="3D 资产"
              >
                <Box className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors ml-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
