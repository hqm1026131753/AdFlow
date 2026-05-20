import { NODE_TYPE_REGISTRY, type NodeInstance, type Edge as WorkflowEdge } from "@ad-flow/shared";

export interface DAGNode {
  nodeId: string;
  nodeType: string;
  inputs: Map<string, { sourceNodeId: string; sourcePortId: string } | null>;
  // portId -> upstream connection, or null if source
}

export interface DAG {
  nodes: Map<string, DAGNode>;
  sorted: string[]; // topological order
}

export class DAGBuilder {
  build(nodes: NodeInstance[], edges: WorkflowEdge[]): DAG {
    const nodeMap = new Map<string, DAGNode>();

    // Initialize nodes
    for (const n of nodes) {
      const def = NODE_TYPE_REGISTRY[n.nodeType];
      if (!def) throw new Error(`Unknown node type: ${n.nodeType}`);

      const inputs = new Map<string, { sourceNodeId: string; sourcePortId: string } | null>();
      // All input ports start as null (unconnected)
      for (const port of def.inputs) {
        inputs.set(port.id, null);
      }

      nodeMap.set(n.id, {
        nodeId: n.id,
        nodeType: n.nodeType,
        inputs,
      });
    }

    // Wire edges
    for (const e of edges) {
      const targetNode = nodeMap.get(e.targetNodeId);
      if (!targetNode) throw new Error(`Edge target node not found: ${e.targetNodeId}`);
      if (!nodeMap.has(e.sourceNodeId)) throw new Error(`Edge source node not found: ${e.sourceNodeId}`);

      // Validate port exists
      const targetDef = NODE_TYPE_REGISTRY[targetNode.nodeType];
      const hasPort = targetDef?.inputs.some((p) => p.id === e.targetPortId);
      if (!hasPort) throw new Error(`Port "${e.targetPortId}" not found on node "${e.targetNodeId}"`);

      targetNode.inputs.set(e.targetPortId, {
        sourceNodeId: e.sourceNodeId,
        sourcePortId: e.sourcePortId,
      });
    }

    // Detect cycles + topological sort
    const sorted = this.topologicalSort(nodeMap, edges);

    return { nodes: nodeMap, sorted };
  }

  private topologicalSort(
    nodeMap: Map<string, DAGNode>,
    edges: WorkflowEdge[]
  ): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const nid of nodeMap.keys()) {
      inDegree.set(nid, 0);
      adjacency.set(nid, []);
    }

    for (const e of edges) {
      adjacency.get(e.sourceNodeId)?.push(e.targetNodeId);
      inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [nid, degree] of inDegree) {
      if (degree === 0) queue.push(nid);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== nodeMap.size) {
      throw new Error("Cycle detected in workflow graph");
    }

    return sorted;
  }
}
