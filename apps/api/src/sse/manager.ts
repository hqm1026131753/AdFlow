import type { Response } from "express";

class SSEManager {
  private clients: Map<string, Response> = new Map();

  addClient(runId: string, res: Response): void {
    this.clients.set(runId, res);

    res.on("close", () => {
      this.clients.delete(runId);
    });
  }

  send(runId: string, event: { type: string; [key: string]: unknown }): void {
    const client = this.clients.get(runId);
    if (!client) return;

    const data = JSON.stringify(event);
    client.write(`data: ${data}\n\n`);
  }

  sendToAll(event: { type: string; [key: string]: unknown }): void {
    for (const [, client] of this.clients) {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  }
}

export const sseManager = new SSEManager();
