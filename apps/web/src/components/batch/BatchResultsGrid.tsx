import { useState } from "react";
import { Download, X } from "lucide-react";
import { useExecutionStore } from "../../store/executionStore";

function GridImage({ url }: { url: string }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const ratio = dims ? `${dims.w} / ${dims.h}` : "1 / 1";

  return (
    <img
      src={url}
      alt="Result"
      onLoad={(e) => {
        const img = e.currentTarget;
        setDims({ w: img.naturalWidth, h: img.naturalHeight });
      }}
      className="w-full rounded-md border border-[#2a2a2a] object-contain bg-[#1e1e1e]"
      style={{ aspectRatio: ratio }}
      loading="lazy"
    />
  );
}

export function BatchResultsGrid() {
  const results = useExecutionStore((s) => s.batchResults);
  const showResults = useExecutionStore((s) => s.showResults);
  const setShowResults = useExecutionStore((s) => s.setShowResults);

  if (!showResults || results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setShowResults(false)}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-[800px] max-h-[600px] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-zinc-200">
            Batch Results ({results.length} outputs)
          </h2>
          <button onClick={() => setShowResults(false)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-4 gap-3 overflow-y-auto">
          {results.map((result, i) => (
            <div key={i} className="flex flex-col gap-1">
              <GridImage url={result.url} />
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs text-zinc-500 truncate">{result.size ?? "?"}</span>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
