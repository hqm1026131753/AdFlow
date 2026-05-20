let counter = 0;
export function nanoid(): string {
  counter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const count = counter.toString(36);
  return `${ts}-${rand}-${count}`;
}
