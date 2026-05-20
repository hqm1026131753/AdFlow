import { NodeExecutor } from "./NodeExecutor";
import { RefSearchExecutor } from "./executors/RefSearchExecutor";
import { StyleTransferExecutor } from "./executors/StyleTransferExecutor";
import { FaceSwapExecutor } from "./executors/FaceSwapExecutor";
import { ProductReplaceExecutor } from "./executors/ProductReplaceExecutor";
import { LayoutExportExecutor } from "./executors/LayoutExportExecutor";
import { AdScoutExecutor } from "./executors/AdScoutExecutor";
import { TextGenExecutor } from "./executors/TextGenExecutor";
import { ImageGenExecutor } from "./executors/ImageGenExecutor";

export const nodeRegistry = new Map<string, NodeExecutor>();

function register(executor: NodeExecutor) {
  nodeRegistry.set(executor.type, executor);
}

register(new RefSearchExecutor());
register(new StyleTransferExecutor());
register(new FaceSwapExecutor());
register(new ProductReplaceExecutor());
register(new LayoutExportExecutor());
register(new AdScoutExecutor());
register(new TextGenExecutor());
register(new ImageGenExecutor());
