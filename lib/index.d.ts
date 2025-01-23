import { OperationTypes } from "./constants/operation-types.constants";
import { VarTypes } from "./constants/var-types.constants";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";
/**
 * These helpers allow you to write:
 *   AND(condition1, condition2, OR(...))
 *   OR(condition1, condition2, AND(...))
 */
export declare function AND(...conditions: any[]): {
    $and: any[];
};
export declare function OR(...conditions: any[]): {
    $or: any[];
};
/**
 * This is the main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old plugin style).
 */
export declare function getWhere(expression: any): object | object[];
/**
 * Because you originally had a "getRelations" function that infers relationships
 * from the where object, you can keep it, but nested logic might require rethinking.
 */
export declare function getRelations(where: object): object;
/**
 * Reuse your "getOrder" for sorting:
 */
export declare function getOrder(order: Order): object;
export { VarTypes, OperationTypes, Where, Order, Search, FindParams };
