import { X, Palette, Type, Image, Layout, Circle, Quote, AlertTriangle, Grid3X3, Shapes, Sparkles } from "lucide-react";

interface Props {
  onClose: () => void;
}

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#9E95F8]">{icon}</span>
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
    </div>
    {children}
  </div>
);

const ColorSwatch = ({ color, label, hex }: { color: string; label: string; hex: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 rounded-lg shrink-0 border border-white/10" style={{ background: color }} />
    <div className="min-w-0">
      <div className="text-xs text-zinc-300">{label}</div>
      <div className="text-[10px] text-zinc-500 font-mono">{hex}</div>
    </div>
  </div>
);

const PURPLE_SCALE = [
  { label: "深紫", hex: "#574FB5", desc: "深色背景强调" },
  { label: "中深紫", hex: "#6F69C1", desc: "次级强调" },
  { label: "品牌紫", hex: "#9E95F8", desc: "主品牌色 · 点缀强调" },
  { label: "中浅紫", hex: "#B0A8F2", desc: "渐变过渡" },
  { label: "浅紫", hex: "#CBC1FF", desc: "背景渐变/轻柔" },
];

const NEUTRAL_COLORS = [
  { label: "中性灰1", hex: "#EBEBE6", desc: "大面积背景" },
  { label: "中性灰2", hex: "#666666", desc: "辅助文字" },
  { label: "深灰", hex: "#5A5A5A", desc: "联合标志连接符" },
  { label: "黑", hex: "#000000", desc: "标志/正文" },
  { label: "白", hex: "#FFFFFF", desc: "大面积背景" },
];

const UI_COLORS = [
  { label: "APP 紫", hex: "#7E57C5", desc: "产品 UI 主色" },
  { label: "APP 紫深", hex: "#6B4AA8", desc: "pressed 状态" },
  { label: "背景灰蓝", hex: "#F6F7FC", desc: "APP 默认表面" },
  { label: "背景淡紫", hex: "#EFEEF9", desc: "轻微紫色调" },
  { label: "营销奶油", hex: "#EBEBE6", desc: "营销端表面" },
];

const FONT_WEIGHTS = [
  { weight: "Heavy", use: "海报级大字" },
  { weight: "Bold", use: "超大展示型标题" },
  { weight: "Semibold", use: "主标题、重要信息" },
  { weight: "Demibold", use: "主标题（主推）" },
  { weight: "Medium", use: "特殊强调、导航、标签" },
  { weight: "Normal", use: "主正文" },
  { weight: "Regular", use: "正文、注释" },
  { weight: "Light", use: "次级正文" },
  { weight: "ExtraLight", use: "辅助说明文字" },
  { weight: "Thin", use: "极细装饰性文字" },
];

const GRAPHIC_SHAPES = [
  { name: "圆形 Circle", meaning: "i (AI/爱)，用户核心" },
  { name: "倒三角形 Triangle", meaning: "方向感" },
  { name: "正方形 Square", meaning: "稳定与结构" },
  { name: "四叶星 Star", meaning: "Magic 时刻（圆+圆交集）" },
  { name: "拱形 Arch", meaning: "聚焦/框架（圆+方交集）" },
  { name: "弓形 Bow", meaning: "流动感（圆+三角交集）" },
];

export function DesignSystemPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-y-0 left-0 z-50 w-[440px] bg-[#0f0f0f] border-r border-[#1f1f1f] shadow-2xl shadow-black/60 flex flex-col animate-in slide-in-from-left">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-[#1f1f1f]">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">艾柠美 inewme</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">SOFT POWER TRUE BEAUTY</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 品牌核心 */}
        <Section icon={<Sparkles className="w-4 h-4" />} title="品牌核心">
          <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
            <p><span className="text-zinc-300 font-medium">英文名</span>：inewme（全小写，定制字形）</p>
            <p><span className="text-zinc-300 font-medium">中文名</span>：艾柠美（仅配合英文使用，不可单独）</p>
            <p><span className="text-zinc-300 font-medium">标语</span>：SOFT POWER TRUE BEAUTY</p>
            <p><span className="text-zinc-300 font-medium">定位</span>：源自台湾的创新科技美妆品牌</p>
            <p><span className="text-zinc-300 font-medium">关键词</span>：科技、时尚、前卫、追求自我、简约现代、高质感</p>
            <p><span className="text-zinc-300 font-medium">文案语气</span>：像"平静知心的朋友"，品牌不说"我们"，用"你"</p>
          </div>
        </Section>

        {/* 品牌色 */}
        <Section icon={<Palette className="w-4 h-4" />} title="品牌紫色阶">
          <div className="space-y-3">
            {PURPLE_SCALE.map((c) => (
              <ColorSwatch key={c.hex} color={c.hex} label={`${c.label} — ${c.desc}`} hex={c.hex} />
            ))}
          </div>
        </Section>

        {/* 产品 UI 色 */}
        <Section icon={<Palette className="w-4 h-4" />} title="产品 UI 色">
          <div className="space-y-3">
            {UI_COLORS.map((c) => (
              <ColorSwatch key={c.hex} color={c.hex} label={`${c.label} — ${c.desc}`} hex={c.hex} />
            ))}
          </div>
        </Section>

        {/* 中性色 */}
        <Section icon={<Palette className="w-4 h-4" />} title="中性色 & 基础色">
          <div className="space-y-3">
            {NEUTRAL_COLORS.map((c) => (
              <ColorSwatch key={c.hex} color={c.hex} label={`${c.label} — ${c.desc}`} hex={c.hex} />
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            比例：白色/浅灰 ~60% · 中性灰 ~20% · 品牌紫 ~10% · 黑色 ~10%
          </p>
        </Section>

        {/* 警示色 */}
        <Section icon={<AlertTriangle className="w-4 h-4" />} title="警示色">
          <div className="flex gap-3">
            {["#CD7272", "#FFA400", "#33C300", "#D2EA8E"].map((c) => (
              <div key={c} className="w-8 h-8 rounded-lg shrink-0 border border-white/10" style={{ background: c }} title={c} />
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">红 · 橙 · 绿 · 柔和绿</p>
        </Section>

        {/* 字体 */}
        <Section icon={<Type className="w-4 h-4" />} title="字体系统 · MiSans">
          <div className="space-y-1.5">
            {FONT_WEIGHTS.map((fw) => (
              <div key={fw.weight} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-20 shrink-0">{fw.weight}</span>
                <span className="text-zinc-400">{fw.use}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-xs text-zinc-400">
            <p><span className="text-zinc-300">H1 主标题</span>：Demibold/Semibold，黑色</p>
            <p><span className="text-zinc-300">H2 副标题</span>：Regular/Medium，黑或 #666</p>
            <p><span className="text-zinc-300">Body 正文</span>：Normal，黑或 #666，行高 1.6–1.8</p>
            <p><span className="text-zinc-300">强调</span>：Medium，品牌紫或黑色</p>
            <p><span className="text-zinc-300">标注</span>：Light/ExtraLight，#666</p>
          </div>
        </Section>

        {/* 辅助图形 */}
        <Section icon={<Shapes className="w-4 h-4" />} title="辅助图形系统">
          <div className="space-y-1.5">
            {GRAPHIC_SHAPES.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <Circle className="w-3 h-3 text-[#9E95F8] shrink-0" />
                <span className="text-zinc-300">{s.name}</span>
                <span className="text-zinc-500">— {s.meaning}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            实心图形 · 线框图形 · 裁切图像 · 承载信息 · 底纹图案
          </p>
        </Section>

        {/* 圆角体系 */}
        <Section icon={<Grid3X3 className="w-4 h-4" />} title="UI 圆角 & 组件">
          <div className="space-y-1 text-xs text-zinc-400">
            <p><span className="text-zinc-300">Pill</span>（h÷2）：主按钮、图标 chip</p>
            <p><span className="text-zinc-300">20–24px</span>：卡片 / sheet / 气泡</p>
            <p><span className="text-zinc-300">12–16px</span>：输入框、小型表面</p>
            <p><span className="text-zinc-300">8px</span>：行内标签</p>
          </div>
        </Section>

        {/* 影像风格 */}
        <Section icon={<Image className="w-4 h-4" />} title="影像风格">
          <div className="space-y-1 text-xs text-zinc-400 leading-relaxed">
            <p>· 自然采光、银灰/中性色背景（#EBEBE6）</p>
            <p>· 人物自然享受，肢体舒展</p>
            <p>· 旗舰版：时尚前卫、高质感</p>
            <p>· 青春版：活力、纯色背景</p>
            <p>· 禁用：复杂、失真、荧光、血腥、模糊</p>
          </div>
        </Section>

        {/* 版式 */}
        <Section icon={<Layout className="w-4 h-4" />} title="版式系统">
          <div className="space-y-1 text-xs text-zinc-400">
            <p>· <span className="text-zinc-300">12 列网格</span>，图文分区</p>
            <p>· S（文字主导）/ M（均衡）/ L（图片主导）/ XL（全图）</p>
            <p>· 横版：Banner、展览 / 竖版：海报、社交</p>
          </div>
        </Section>

        {/* 文案规范 */}
        <Section icon={<Quote className="w-4 h-4" />} title="文案规范">
          <div className="space-y-1 text-xs text-zinc-400 leading-relaxed">
            <p>· 产品 UI 繁体中文，简体常见于应用字符串，英文用于标语</p>
            <p>· 第二人称"你"，品牌不说"我们"</p>
            <p>· 英文 sentence case，标志 inewme 始终小写，标语全大写</p>
            <p>· 语气克制/高級，不喧闹</p>
            <p>· ❌ 禁止 emoji，吉祥物承担情感表达</p>
            <p>· 避免营销话术、大量形容词、多个感叹号</p>
          </div>
        </Section>

        {/* AI 提示词 */}
        <Section icon={<Sparkles className="w-4 h-4" />} title="AI 生成提示词">
          <div className="bg-[#141414] rounded-lg p-3 border border-[#1f1f1f]">
            <p className="text-[11px] text-zinc-500 mb-2 font-medium">英文</p>
            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
              Visual style: minimalist, tech-beauty, modern, clean{"\n"}
              Primary color: soft purple (#9E95F8) as accent{"\n"}
              Background: white or light neutral gray (#EBEBE6){"\n"}
              Typography: rounded sans-serif (MiSans), thin to semibold{"\n"}
              Graphic elements: arch shapes, circle intersections, geometric soft forms{"\n"}
              Image tone: natural lighting, silver-gray background, fashion editorial{"\n"}
              Layout: 12-column grid, image + text split, generous whitespace{"\n"}
              Brand mood: SOFT POWER TRUE BEAUTY — technology meets elegance
            </pre>
          </div>
          <div className="bg-[#141414] rounded-lg p-3 border border-[#1f1f1f] mt-2">
            <p className="text-[11px] text-zinc-500 mb-2 font-medium">中文</p>
            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
              风格：极简科技美妆感，留白充分，高质感{"\n"}
              主色：品牌紫 #9E95F8 作为强调点缀{"\n"}
              背景：白色或浅中性灰（#EBEBE6）{"\n"}
              字体：圆润无衬线，细体至半粗体{"\n"}
              图形：半圆拱形、圆形交集、几何软边线条{"\n"}
              影像：自然采光、银灰背景、时尚人物{"\n"}
              版式：12列网格，图文分区，大量留白
            </pre>
          </div>
        </Section>
      </div>
    </div>
  );
}
