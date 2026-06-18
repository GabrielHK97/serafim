import { OperationTypesEnum } from "./enums/operation-types.enum";
import { VarTypesEnum } from "./enums/var-types.enum";
import { Order, SortConstants } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";
import { setNested } from "./lib/object-path";
import { buildRelations } from "./lib/relations";
import {
  WhereExpression,
  WhereInput,
  toConditions,
  collectFields,
} from "./lib/where";

/** Combines conditions with logical AND. */
function AND(...conditions: WhereExpression[]): WhereExpression {
  return { $and: conditions };
}

/** Combines conditions with logical OR. */
function OR(...conditions: WhereExpression[]): WhereExpression {
  return { $or: conditions };
}

/**
 * Translates a Serafim where expression into TypeORM `find` `where` params.
 * Returns `{}` for empty input, a single object for one condition, or an array
 * of objects (an OR set) when `OR(...)` yields multiple conditions. Conditions
 * must be combined explicitly with `AND(...)` / `OR(...)`; a bare array throws.
 */
function getWhere(expression: WhereInput): object | object[] {
  const conditions = toConditions(expression);
  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return conditions;
}

/**
 * Derives the TypeORM `relations` object from the fields referenced in a where
 * expression. A field path "person.address.state" loads "person.address".
 */
function getRelations(expression: WhereInput): object {
  return buildRelations(collectFields(expression));
}

/** Translates an Order into a TypeORM `find` `order` param. */
function getOrder(order?: Order): object {
  if (!order || !order.field) return {};
  const result: Record<string, any> = {};
  setNested(order.field, result, order.sortOrder);
  return result;
}

export {
  Order,
  SortConstants,
  Search,
  Where,
  FindParams,
  VarTypesEnum,
  OperationTypesEnum,
  getRelations,
  getWhere,
  getOrder,
  OR,
  AND,
};
export type { WhereExpression, WhereInput };
