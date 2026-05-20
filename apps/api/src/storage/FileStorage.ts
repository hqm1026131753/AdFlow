export interface StoredFile {
  id: string;
  runId?: string;
  nodeId?: string;
  batchIndex?: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export function fileUrl(file: StoredFile): string {
  return `/api/files/${file.id}`;
}
