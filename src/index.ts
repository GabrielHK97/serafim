import { Raw, IsNull } from "typeorm";
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
export type WhereExpression =
  | Where
  | { $and: WhereExpression[] }
  | { $or: WhereExpression[] };

/** 
 * If your old code calls getWhere([...]) => interpret as AND of the array
 * each item can be WhereExpression or just Where 
 */
export type WhereExpressionArray = WhereExpression[];

/** 
 * AND(...) => { $and: [ ... ] }
 */
export function AND(...conditions: WhereExpression[]): WhereExpression {
  return { $and: conditions };
}

/** 
 * OR(...) => { $or: [ ... ] }
 */
export function OR(...conditions: WhereExpression[]): WhereExpression {
  return { $or: conditions };
}

enum WhereOffset {
  KEY = 0,
  OPERATION = 1,
  VALUE = 2,
  NUMBER_OF_PROPERTIES = 3,
}

interface Property {
  path: string;
  isObject: boolean;
}

/**
 * The main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old style).
 */
export function getWhere(expression: WhereExpression | WhereExpressionArray): object | object[] {
  if (!expression) return {};

  // If the user passes an array => treat as AND
  if (Array.isArray(expression)) {
    if (expression.length === 0) return {};
    const exprObject = { $and: expression };
    const arr = parseWhereExpression(exprObject);
    if (arr.length === 0) return {};
    if (arr.length === 1) return arr[0];
    return arr;
  }

  // Else parse a single expression
  const arr = parseWhereExpression(expression);
  if (arr.length === 0) return {};
  if (arr.length === 1) return arr[0];
  return arr;
}

/** 
 * Check if object is { $and: ... }
 */
function isAndNode(obj: any): obj is { $and: WhereExpression[] } {
  return obj && typeof obj === "object" && "$and" in obj && Array.isArray(obj.$and);
}

/** 
 * Check if object is { $or: ... }
 */
function isOrNode(obj: any): obj is { $or: WhereExpression[] } {
  return obj && typeof obj === "object" && "$or" in obj && Array.isArray(obj.$or);
}

/**
 * parseWhereExpression:
 *  - AND => cartesianAndMerge
 *  - OR  => flatten (via reduce+concat)
 *  - leaf => single array
 */
function parseWhereExpression(expr: WhereExpression): Array<Record<string, any>> {
  if (isAndNode(expr)) {
    const childArrays = expr.$and.map((child) => parseWhereExpression(child));
    return cartesianAndMerge(childArrays);
  } else if (isOrNode(expr)) {
    const childArrays = expr.$or.map((child) => parseWhereExpression(child));
    // Replace `.flat()` with a reduce+concat approach for older ES targets
    return childArrays.reduce((acc, arr) => acc.concat(arr), [] as Record<string, any>[]);
  } else {
    // Leaf => single
    return [convertLeafToTypeOrmObject(expr)];
  }
}

/**
 * "Cartesian product" for AND => merge objects pairwise
 */
function cartesianAndMerge(childArrays: Array<Array<Record<string, any>>>) {
  let result: Array<Record<string, any>> = [{}];
  for (const arr of childArrays) {
    const newResult: Array<Record<string, any>> = [];
    for (const existingObj of result) {
      for (const currentObj of arr) {
        newResult.push(deepMerge(existingObj, currentObj));
      }
    }
    result = newResult;
  }
  return result;
}

/**
 * If it's a leaf, that means it's your Where class, e.g.
 *   { field, operation, value }
 * We build a nested object => { user: { name: ... } }
 */
function convertLeafToTypeOrmObject(leaf: Where): Record<string, any> {
  const field = leaf.field;
  const operation = leaf.operation || "=";
  const value = leaf.value;

  const generatedValue = (value === null) ? IsNull() : generateRawSQL(value, operation);

  // Build nested path
  const obj: Record<string, any> = {};
  setPropertyOfObject(field, obj, generatedValue);
  return obj;
}

/**
 * Deeply merges two objects that have nested paths
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      !(val.constructor?.name === "FindOperator")
    ) {
      if (output[key] && typeof output[key] === "object") {
        output[key] = deepMerge(output[key], val);
      } else {
        output[key] = { ...val };
      }
    } else {
      output[key] = val;
    }
  }
  return output;
}

/**
 * Convert value + operation => TypeORM Raw or IsNull
 */
function generateRawSQL(value: any, operation: string): any {
  let rawSQL;
  switch (typeof value) {
    case VarTypes.STRING:
      rawSQL = Raw((alias) => {
        if ([OperationTypes.NULL, OperationTypes.TRUE, OperationTypes.FALSE].includes(value)) {
          return `${alias} ${operation} ${value}`;
        }
        return `${alias} ${operation} '${value}'`;
      });
      break;
    case VarTypes.NUMBER:
    case VarTypes.BIGINT:
      rawSQL = Raw((alias) => `${alias} ${operation} ${value}`);
      break;
    case VarTypes.OBJECT:
      if (value instanceof Date) {
        rawSQL = Raw((alias) => `${alias} ${operation} '${value.toISOString()}'`);
      } else if (Array.isArray(value)) {
        if (operation === OperationTypes.BETWEEN) {
          rawSQL = Raw((alias) => {
            const left =
              typeof value[0] === "number" ? value[0] : `'${value[0]}'`;
            const right =
              typeof value[1] === "number" ? value[1] : `'${value[1]}'`;
            return `${alias} BETWEEN ${left} AND ${right}`;
          });
        } else if (operation === OperationTypes.IN) {
          const v = value
            .map((val) => (typeof val === "number" ? val : `'${val}'`))
            .join(",");
          rawSQL = Raw((alias) => `${alias} IN (${v})`);
        }
      }
      break;
    default:
      // boolean, undefined, etc.
      rawSQL = value;
      break;
  }
  return rawSQL;
}

/**
 * If field="user.person.name", 
 * setPropertyOfObject(field, {}, X)
 * => { user: { person: { name: X } } }
 */
function setPropertyOfObject(path: string, object: Record<string, any>, value: any): void {
  const keys = path.split(".");
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}

/* ==========================
 *  YOUR EXISTING UTILITIES
 * ========================== */

/**
 * Provide your VarTypes and OperationTypes if needed
 */
export { VarTypes, OperationTypes };

/**
 * If your "Where" is a class from "./classes/where.class"
 * it might look like this:
 *
 * export class Where {
 *   constructor(
 *     public field: string,
 *     public operation?: string,
 *     public value?: any
 *   ) {}
 * }
 */
// We assume you import it above

enum MyLocalWhereOffset {
  KEY = 0,
  OPERATION = 1,
  VALUE = 2,
  NUMBER_OF_PROPERTIES = 3,
}

/** Minimal property interface for getAllKeysFromObject usage */
interface MyLocalProperty {
  path: string;
  isObject: boolean;
}

/** 
 * Return a minimal set of relationships from a where object. 
 * If you rely on nested logic, you might need to adapt or remove.
 */
export function getRelations(where: object): object {
  if (!where) return {};
  const object: any = {};
  const keys = getUniqueKeysFromObject(where); // => string[]

  for (let index = 0; index < keys.length; index += MyLocalWhereOffset.NUMBER_OF_PROPERTIES) {
    const strKey = String(keys[index]); // cast to string
    const pathVal = getPropertyFromObject(strKey, where);
    if (typeof pathVal === "string" && pathVal.includes(".")) {
      const parts = pathVal.split(".");
      parts.pop();
      if (parts.length > 0) setPropertyOfObject(parts.join("."), object, true);
    }
  }
  return object;
}

/**
 * A naive approach for turning an object into an array of { key: value }.
 */
function reduceWhereObject(object: object): Array<object> {
  return Object.entries(object).map(([k, v]) => ({ [k]: v }));
}

/**
 * Example "getOrder" for sorting
 */
export function getOrder(order: Order): object {
  if (!order) return {};
  const obj: any = {};
  setPropertyOfObject(order.field, obj, order.sortOrder);
  return obj;
}

/**
 * For scanning object keys
 */
function getAllKeysFromObject<T extends object>(obj: T, lastPath: string = ""): any {
  return Object.entries(obj).reduce((result: string[], [key, value]) => {
    const path = lastPath ? `${lastPath}.${key}` : key;
    const isObj = (value && typeof value === "object");
    return result
      .concat([
        { path, isObject: isObj },
        ...(isObj ? getAllKeysFromObject(value, path) : []),
      ])
      .filter((element: any) => !element.isObject);
  }, []);
}

/**
 * Return a unique list of string paths
 */
function getUniqueKeysFromObject(object: object): string[] {
  const arr = getAllKeysFromObject(object);
  const paths = arr.map((el: any) => el.path as string);
  return Array.from(new Set(paths));
}

/**
 * Return the property from an object at a dot path, e.g. "user.person.name"
 */
function getPropertyFromObject(path: string, obj: object): any {
  if (!path) return null;
  const segments = path.split(".");
  let current: any = obj;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in current) {
      current = current[seg];
    } else {
      return "";
    }
  }
  return current;
}

/** 
 * Export other classes if needed
 */
export { Order, Search, Where, FindParams };
