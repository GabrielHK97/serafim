import { OperationTypes } from "./constants/operation-types.constants";
import { VarTypes } from "./constants/var-types.constants";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";
/**
 * We define a union type for advanced nested logic:
 *  - A single "leaf" condition (Where)
 *  - An AND node: { $and: WhereExpression[] }
 *  - An OR node:  { $or: WhereExpression[] }
 */
export type WhereExpression = Where | {
    $and: WhereExpression[];
} | {
    $or: WhereExpression[];
};
/**
 * If your old code calls getWhere([...]) => interpret as AND of the array
 * each item can be WhereExpression or just Where
 */
export type WhereExpressionArray = WhereExpression[];
/**
 * AND(...) => { $and: [ ... ] }
 */
export declare function AND(...conditions: WhereExpression[]): WhereExpression;
/**
 * OR(...) => { $or: [ ... ] }
 */
export declare function OR(...conditions: WhereExpression[]): WhereExpression;
/**
 * The main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old style).
 */
export declare function getWhere(expression: WhereExpression | WhereExpressionArray): object | object[];
/**
 * Provide your VarTypes and OperationTypes if needed
 */
export { VarTypes, OperationTypes };
/**
 * Return a minimal set of relationships from a where object.
 * If you rely on nested logic, you might need to adapt or remove.
 */
export declare function getRelations(where: object): object;
/**
 * Example "getOrder" for sorting
 */
export declare function getOrder(order: Order): object;
/**
 * Export other classes if needed
 */
export { Order, Search, Where, FindParams };
