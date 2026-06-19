import { FindOperator } from "typeorm";
import { Where } from "../classes/where.class";
import { OperationTypesEnum } from "../enums/operation-types.enum";
import { buildOperator } from "./operators";
import { setNested } from "./object-path";

export type WhereExpression =
  | Where
  | { $and: WhereExpression[] }
  | { $or: WhereExpression[] };

export type WhereInput = WhereExpression;

const BARE_ARRAY_ERROR =
  "Serafim: a bare array is not a valid where expression. Combine conditions " +
  "explicitly with AND(...) or OR(...).";

/** Rejects bare arrays so condition combination is always explicit. */
function rejectBareArray(expr: unknown): void {
  if (Array.isArray(expr)) throw new Error(BARE_ARRAY_ERROR);
}

export function isAndNode(node: any): node is { $and: WhereExpression[] } {
  return !!node && typeof node === "object" && Array.isArray(node.$and);
}

export function isOrNode(node: any): node is { $or: WhereExpression[] } {
  return !!node && typeof node === "object" && Array.isArray(node.$or);
}

/** True when `value` is a terminal value that must not be merged into. */
function isLeafValue(value: any): boolean {
  return (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof FindOperator
  );
}

/** Recursively merges nested condition objects, treating FindOperators as leaves. */
function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (!isLeafValue(value) && !isLeafValue(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else if (!isLeafValue(value)) {
      output[key] = { ...value };
    } else {
      output[key] = value;
    }
  }
  return output;
}

/** Cartesian product of AND branches: every combination is merged into one object. */
function cartesianAndMerge(
  branches: Array<Array<Record<string, any>>>
): Array<Record<string, any>> {
  return branches.reduce(
    (acc, branch) =>
      acc.flatMap((existing) =>
        branch.map((current) => deepMerge(existing, current))
      ),
    [{}] as Array<Record<string, any>>
  );
}

/** Converts a single Where leaf into a `{ path: FindOperator }` condition object. */
function convertLeaf(leaf: Where): Record<string, any> {
  if (!leaf.field) {
    throw new Error("Serafim: every Where leaf must define a `field`.");
  }
  const operation = leaf.operation ?? OperationTypesEnum.EQUAL;
  const condition: Record<string, any> = {};
  setNested(leaf.field, condition, buildOperator(operation, leaf.searchTerm));
  return condition;
}

/**
 * Walks a where expression into an array of TypeORM condition objects. A result
 * with more than one entry represents an OR set (TypeORM treats `where: [...]` as
 * OR) and is only produced by the `OR(...)` combinator.
 *
 * There is no implicit combination: conditions must be combined explicitly with
 * `AND(...)` or `OR(...)`. A bare array throws.
 */
export function toConditions(expr: WhereInput): Array<Record<string, any>> {
  if (!expr) return [];
  rejectBareArray(expr);
  if (isAndNode(expr)) return cartesianAndMerge(expr.$and.map(toConditions));
  if (isOrNode(expr)) return expr.$or.flatMap(toConditions);
  return [convertLeaf(expr as Where)];
}

/** Collects every leaf `field` path referenced in a where expression. */
export function collectFields(expr: WhereInput): string[] {
  if (!expr) return [];
  rejectBareArray(expr);
  if (isAndNode(expr)) return expr.$and.flatMap(collectFields);
  if (isOrNode(expr)) return expr.$or.flatMap(collectFields);
  const field = (expr as Where).field;
  return field ? [field] : [];
}
