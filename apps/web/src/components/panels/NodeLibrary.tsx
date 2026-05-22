import { NODE_TYPE_LIST, CATEGORY_LABELS } from "@ad-flow/shared";
import { Type, Image, Search } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  type: Type,
  image: Image,
  search: Search,
};

const grouped = NODE_TYPE_LIST.reduce(
  (acc, def) => {
    const cat = def.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(def);
    return acc;
  },
  {} as Record<string, typeof NODE_TYPE_LIST>
);

export function NodeLibrary() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/adflow-node-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-48 shrink-0 bg-[#141414] border-r border-[#2a2a2a] p-3 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
        Components
      </h2>

      {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
        const defs = grouped[catKey];
        if (!defs?.length) return null;
        return (
          <div key={catKey}>
            <h3 className="text-xs text-zinc-600 mb-2 px-1">{catLabel}</h3>
            <div className="flex flex-col gap-1">
              {defs.map((def) => {
                const Icon = ICON_MAP[def.icon] ?? Image;
                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, def.type)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors border border-transparent hover:border-zinc-700/50"
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${def.color}25` }}
                    >
                      <Icon className="w-3.5 h-3.5" color={def.color} />
                    </div>
                    <span className="text-xs text-zinc-400 truncate">{def.displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
