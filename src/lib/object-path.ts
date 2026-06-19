/**
 * Sets `value` at a dot-delimited `path` inside `target`, creating intermediate
 * objects as needed. Example: setNested("a.b.c", {}, 1) => { a: { b: { c: 1 } } }.
 */
export function setNested(
  path: string,
  target: Record<string, any>,
  value: any
): void {
  const keys = path.split(".");
  let current = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}
