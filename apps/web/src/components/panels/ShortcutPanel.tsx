import { X } from "lucide-react";
import { useEffect, useState } from "react";

const SHORTCUTS = [
  { keys: ["Delete", "Backspace"], desc: "删除选中节点" },
  { keys: ["Escape"], desc: "取消选中" },
  { keys: ["Ctrl", "Z"], desc: "撤销" },
  { keys: ["Ctrl", "Shift", "Z"], desc: "重做" },
  { keys: ["Ctrl", "S"], desc: "保存工作流" },
  { keys: ["?"], desc: "显示/隐藏快捷键" },
];

export function ShortcutPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-zinc-200">键盘快捷键</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-zinc-400">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">
                      {k}
                    </kbd>
                    {i < s.keys.length - 1 && <span className="text-zinc-600 mx-0.5">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
