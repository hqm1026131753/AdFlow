import { useCallback, useRef, useState } from "react";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";

interface BatchItem {
  index: number;
  label: string;
  productImage?: string; // base64 data URL
  file?: File;
}

export function BatchInputUpload() {
  const batchItems = useWorkflowStore((s) => s.batchItems);
  const setBatchItems = useWorkflowStore((s) => s.setBatchItems);
  const showBatchUpload = useWorkflowStore((s) => s.showBatchUpload);
  const setShowBatchUpload = useWorkflowStore((s) => s.setShowBatchUpload);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const newItems: BatchItem[] = fileArray.map((file, i) => {
        // Read file as data URL for preview
        const reader = new FileReader();
        const item: BatchItem = {
          index: batchItems.length + i,
          label: file.name.replace(/\.[^/.]+$/, ""),
          file,
        };
        reader.onload = () => {
          setBatchItems(
            [...batchItems, { ...item, productImage: reader.result as string }]
          );
        };
        reader.readAsDataURL(file);
        return item;
      });
    },
    [batchItems, setBatchItems]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeItem = useCallback(
    (index: number) => {
      const filtered = batchItems.filter((item) => item.index !== index);
      setBatchItems(filtered);
    },
    [batchItems, setBatchItems]
  );

  const uploadToServer = useCallback(async () => {
    const items = batchItems.filter((item) => item.file);
    if (items.length === 0) return;

    const formData = new FormData();
    items.forEach((item) => {
      if (item.file) formData.append("files", item.file);
    });

    try {
      const res = await fetch("http://localhost:3000/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const uploaded = await res.json();
      // Update batch items with server file IDs
      const updated = batchItems.map((item) => {
        const match = uploaded.find(
          (u: { batchIndex?: number }) => u.batchIndex === item.index
        );
        return match ? { ...item, uploadedId: (match as { id: string }).id } : item;
      });
      setBatchItems(updated);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  }, [batchItems, setBatchItems]);

  if (!showBatchUpload) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setShowBatchUpload(false)}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-[600px] max-h-[600px] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-zinc-200">Batch Input ({batchItems.length} items)</h2>
          <button onClick={() => setShowBatchUpload(false)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
              isDragging ? "border-violet-400 bg-violet-400/5" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <Upload className="w-8 h-8 text-zinc-500" />
            <span className="text-sm text-zinc-400">Drop product images here or click to browse</span>
            <span className="text-xs text-zinc-600">Supports JPG, PNG, WebP — up to 20 files</span>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>

          {/* Preview grid */}
          {batchItems.length > 0 && (
            <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-1">
              {batchItems.map((item) => (
                <div key={item.index} className="relative group">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.label} className="w-full aspect-square object-cover rounded-md border border-[#2a2a2a]" />
                  ) : (
                    <div className="w-full aspect-square bg-zinc-800 rounded-md border border-[#2a2a2a] flex items-center justify-center">
                      <Image className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <button
                    onClick={() => removeItem(item.index)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                  <span className="text-xs text-zinc-500 text-center block truncate mt-1">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#2a2a2a] mt-auto">
          <button
            onClick={() => setShowBatchUpload(false)}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { uploadToServer(); setShowBatchUpload(false); }}
            disabled={batchItems.length === 0}
            className="px-4 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs text-white transition-colors"
          >
            Done ({batchItems.length} items)
          </button>
        </div>
      </div>
    </div>
  );
}
