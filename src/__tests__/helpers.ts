import { FindOperator } from "typeorm";

export function isFindOperator(value: any): value is FindOperator<any> {
  return value instanceof FindOperator;
}

function asOperator(value: any): FindOperator<any> {
  if (!isFindOperator(value)) {
    throw new Error(`Expected a FindOperator, got: ${JSON.stringify(value)}`);
  }
  return value;
}

/** The FindOperator type tag, e.g. "equal" | "moreThan" | "in" | "isNull" | "not" | "raw". */
export function opType(value: any): string {
  return (asOperator(value) as any).type;
}

/** The bound value carried by the operator (what TypeORM parameterizes). */
export function opValue(value: any): any {
  return asOperator(value).value;
}

/** The wrapped child operator (for Not(...)). */
export function opChild(value: any): FindOperator<any> | undefined {
  return asOperator(value).child;
}

/** Renders the SQL produced by a Raw FindOperator (only valid for type "raw"). */
export function rawSql(value: any, alias = "col"): string {
  const op = asOperator(value) as any;
  if (op.type !== "raw" || !op.getSql) {
    throw new Error(`Expected a Raw operator, got "${op.type}".`);
  }
  return op.getSql(alias);
}
