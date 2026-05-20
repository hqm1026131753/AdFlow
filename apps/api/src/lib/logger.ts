export function log(prefix: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${prefix}]`, ...args);
}
