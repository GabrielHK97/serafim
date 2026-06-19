/**
 * Adds one relation path (e.g. "person.address") into the relations tree.
 * Deeper paths win: an existing nested object is never downgraded to `true`.
 */
function addRelation(path: string, relations: Record<string, any>): void {
  const segments = path.split(".");
  let current = relations;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    if (isLast) {
      if (typeof current[segment] !== "object") current[segment] = true;
    } else {
      if (typeof current[segment] !== "object" || current[segment] === null) {
        current[segment] = {};
      }
      current = current[segment];
    }
  }
}

/**
 * Builds a TypeORM `relations` object from leaf field paths. A field like
 * "person.address.state" implies loading the "person.address" relation chain.
 * Plain fields (no dot) contribute nothing.
 */
export function buildRelations(fields: string[]): Record<string, any> {
  const relations: Record<string, any> = {};
  for (const field of fields) {
    const dot = field.lastIndexOf(".");
    if (dot === -1) continue;
    addRelation(field.slice(0, dot), relations);
  }
  return relations;
}
