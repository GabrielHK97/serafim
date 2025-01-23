import { Raw, IsNull } from "typeorm";
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
export function AND(...conditions: any[]) {
  return { $and: conditions };
}
export function OR(...conditions: any[]) {
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
 * Convert a value + operation into a TypeORM Raw expression or IsNull, etc.
 * Re-uses your existing logic for BETWEEN, IN, etc.
 */
function generateRawSQL(value: any, operation: string): any {
  let rawSQL;
  switch (typeof value) {
    case VarTypes.STRING:
      rawSQL = Raw((alias) => {
        return [
          OperationTypes.NULL,
          OperationTypes.TRUE,
          OperationTypes.FALSE,
        ].includes(value)
          ? `${alias} ${operation} ${value}`
          : `${alias} ${operation} '${value}'`;
      });
      break;
    case VarTypes.NUMBER:
    case VarTypes.BIGINT:
      rawSQL = Raw((alias) => `${alias} ${operation} ${value}`);
      break;
    case VarTypes.OBJECT:
      if (value instanceof Date) {
        // Convert the date to ISO (or your desired string format)
        rawSQL = Raw((alias) => `${alias} ${operation} '${value.toISOString()}'`);
      } else if (Array.isArray(value)) {
        // Handle special operations: BETWEEN, IN
        if (operation === OperationTypes.BETWEEN) {
          rawSQL = Raw((alias) => {
            const left =
              typeof value[0] === VarTypes.NUMBER || typeof value[0] === VarTypes.BIGINT
                ? value[0]
                : `'${value[0]}'`;
            const right =
              typeof value[1] === VarTypes.NUMBER || typeof value[1] === VarTypes.BIGINT
                ? value[1]
                : `'${value[1]}'`;
            return `${alias} ${OperationTypes.BETWEEN} ${left} AND ${right}`;
          });
        } else if (operation === OperationTypes.IN) {
          // For IN, we quote each element if it's not numeric
          const v = value
            .map((val) => (typeof val === VarTypes.NUMBER ? val : `'${val}'`))
            .join(",");
          rawSQL = Raw((alias) => `${alias} ${OperationTypes.IN} (${v})`);
        }
      }
      break;
    default:
      // If it's boolean, undefined, or any other type, fallback
      rawSQL = value;
      break;
  }
  return rawSQL;
}

/** 
 * Detect if an object is { $and: [ ... ] } 
 */
function isAndNode(obj: any): boolean {
  return obj && typeof obj === "object" && "$and" in obj && Array.isArray(obj.$and);
}

/** 
 * Detect if an object is { $or: [ ... ] } 
 */
function isOrNode(obj: any): boolean {
  return obj && typeof obj === "object" && "$or" in obj && Array.isArray(obj.$or);
}

/**
 * Instead of returning { [field]: ... }, we create a nested object.
 * If field = "user.person.address.name", we build:
 * {
 *   user: {
 *     person: {
 *       address: {
 *         name: generatedValue
 *       }
 *     }
 *   }
 * }
 */
function convertLeafToTypeOrmObject(leaf: any): Record<string, any> {
  const field = leaf.field;
  const operation = leaf.operation || "=";
  const value = leaf.value;

  // If null, use IsNull() so TypeORM does "IS NULL"
  const generatedValue = value === null ? IsNull() : generateRawSQL(value, operation);

  // Build nested object from the "field" path
  const obj: Record<string, any> = {};
  setPropertyOfObject(field, obj, generatedValue);
  return obj;
}

/**
 * Parse a nested AND/OR expression into an array of objects that TypeORM understands.
 * - AND => cartesian product merge of children
 * - OR  => flat union of children
 * - Leaf => single array entry
 */
function parseWhereExpression(expr: any): Array<Record<string, any>> {
  // 1) AND node => cartesian product/merge
  if (isAndNode(expr)) {
    const childArrays = expr.$and.map((child: any) => parseWhereExpression(child));
    return cartesianAndMerge(childArrays);
  }
  // 2) OR node => flatten union
  if (isOrNode(expr)) {
    const childArrays = expr.$or.map((child: any) => parseWhereExpression(child));
    return childArrays.flat();
  }
  // 3) Leaf => single condition => single array item
  return [convertLeafToTypeOrmObject(expr)];
}

/**
 * "Cartesian product" for AND:
 * If we have e.g. [ [o1, o2], [o3, o4] ],
 * we return [ {..o1.., ..o3..}, {..o1.., ..o4..}, {..o2.., ..o3..}, {..o2.., ..o4..} ]
 *
 * Because these merged objects might also have nested paths, 
 * merging means something like:
 * {
 *   user: { person: { name: 'x' } }
 * }
 * AND
 * {
 *   user: { person: { age: 10 } }
 * }
 * => 
 * {
 *   user: { person: { name: 'x', age: 10 } }
 * }
 */
function cartesianAndMerge(childArrays: Array<Array<Record<string, any>>>) {
  let result: Array<Record<string, any>> = [{}]; // start with one empty object
  for (const arr of childArrays) {
    const newResult: Array<Record<string, any>> = [];
    for (const existingObj of result) {
      for (const currentObj of arr) {
        // Merge existingObj + currentObj => combined
        newResult.push(deepMerge(existingObj, currentObj));
      }
    }
    result = newResult;
  }
  return result;
}

/**
 * Deeply merges two objects that may contain nested fields. 
 * If both have { user: { person: {} } }, merges them recursively.
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      !(source[key] instanceof Date) &&
      !(source[key].constructor?.name === "FindOperator")
    ) {
      // if target[key] is also an object, merge recursively
      if (target[key] && typeof target[key] === "object") {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = { ...source[key] };
      }
    } else {
      // overwrite
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * This is the main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old plugin style).
 */
export function getWhere(expression: any): object | object[] {
  if (!expression) return {};

  // If the user passes an array of "leaf" conditions => interpret as AND of them
  if (Array.isArray(expression)) {
    if (expression.length === 0) return {};
    const exprObject = { $and: expression };
    const arr = parseWhereExpression(exprObject);
    if (arr.length === 0) return {};
    if (arr.length === 1) return arr[0];
    return arr;
  }

  // Otherwise parse the single expression (leaf, $and, or $or)
  const arr = parseWhereExpression(expression);

  if (arr.length === 0) return {};
  if (arr.length === 1) return arr[0];
  return arr;
}

/* ==========================
 *  YOUR EXISTING UTILITIES
 * ========================== */

/**
 * Return a minimal set of relationships from a where object.
 * This was your existing approach but might need adjusting
 * if you rely on the old (flat) structure. 
 */
function getAllKeysFromObject<T extends object>(
  object: T,
  lastPath: string = ""
): any {
  return Object.entries(object).reduce((result: string[], [key, value]) => {
    const currentObject: Property = {
      path: lastPath
        ? Array.isArray(object) && lastPath.split("").includes(".")
          ? lastPath
          : `${lastPath}.${key}`
        : key,
      isObject: typeof value === VarTypes.OBJECT && value !== null,
    };
    return result
      .concat([
        currentObject,
        ...(currentObject.isObject
          ? getAllKeysFromObject(value, currentObject.path)
          : []),
      ])
      .filter((element: any) => !element.isObject);
  }, []);
}

function getUniqueKeysFromObject(object: object) {
  return [
    ...new Set(
      getAllKeysFromObject(object).map((element: Property) => {
        return element.path;
      })
    ),
  ] as any;
}

function getPropertyFromObject(path: string, object: object): any {
  if (!path) return null;
  let property = object;
  const keys = path.split(".");
  for (const key of keys) {
    if (property && typeof property === "object" && key in property) {
      property = property[key];
    } else {
      return "";
    }
  }
  return property;
}

function setPropertyOfObject(path: string, object: object, value: any): void {
  const keys = path.split(".");
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      // last key => set the value
      current[key] = value;
    } else {
      // ensure the path exists
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}

function reduceWhereObject(object: object): Array<object> {
  return Object.entries(object).map(([key, value]) => ({ [key]: value }));
}

/**
 * Because you originally had a "getRelations" function that infers relationships
 * from the where object, you can keep it, but nested logic might require rethinking.
 */
export function getRelations(where: object): object {
  if (!where) return {};
  const object: any = {};
  const keys = getUniqueKeysFromObject(where);
  for (
    let index = 0;
    index < keys.length;
    index += WhereOffset.NUMBER_OF_PROPERTIES
  ) {
    const key = getPropertyFromObject(
      keys[index + WhereOffset.KEY],
      where
    ).split(".");
    key.pop();
    if (key.length > 0) setPropertyOfObject(key.join("."), object, true);
  }
  return object;
}

/**
 * Reuse your "getOrder" for sorting:
 */
export function getOrder(order: Order): object {
  if (!order) return {};
  let object: any = {};
  setPropertyOfObject(order.field, object, order.sortOrder);
  return object;
}

// Export your classes, enums, etc.
export { VarTypes, OperationTypes, Where, Order, Search, FindParams };
