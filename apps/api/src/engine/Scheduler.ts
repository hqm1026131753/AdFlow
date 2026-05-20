import type { DAG } from "./DAGBuilder";

export class Scheduler {
  /**
   * Partition DAG nodes into execution waves.
   * Wave 0 = source nodes (no in-edges).
   * Wave N = nodes whose all upstream deps are in waves 0..N-1.
   */
  computeWaves(dag: DAG): string[][] {
    const remaining = new Set(dag.sorted);
    const done = new Set<string>();
    const waves: string[][] = [];

    while (remaining.size > 0) {
      const wave: string[] = [];
      for (const nodeId of remaining) {
        const dagNode = dag.nodes.get(nodeId)!;
        const allDepsMet = [...dagNode.inputs.values()].every(
          (conn) => !conn || done.has(conn.sourceNodeId)
        );
        if (allDepsMet) {
          wave.push(nodeId);
        }
      }

      if (wave.length === 0) {
        throw new Error("Cannot schedule: possible cycle or missing dependency");
      }

      for (const nid of wave) {
        remaining.delete(nid);
        done.add(nid);
      }
      waves.push(wave);
    }

    return waves;
  }
}
