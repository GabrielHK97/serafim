import { Raw, IsNull } from "typeorm";
import { OperationTypes } from "./constants/operation-types.constants";
import { VarTypes } from "./constants/var-types.constants";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";

export type WhereExpression =
  | Where
  | { $and: WhereExpression[] }
  | { $or: WhereExpression[] };

export type WhereExpressionArray = WhereExpression[];

export function AND(...conditions: WhereExpression[]): WhereExpression {
  return { $and: conditions };
}

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

export function getWhere(expression: WhereExpression | WhereExpressionArray): object | object[] {
  if (!expression) return {};
  if (Array.isArray(expression)) {
    if (expression.length === 0) return {};
    const exprObject = { $and: expression };
    const arr = parseWhereExpression(exprObject);
    if (arr.length === 0) return {};
    if (arr.length === 1) return arr[0];
    return arr;
  }
  const arr = parseWhereExpression(expression);
  if (arr.length === 0) return {};
  if (arr.length === 1) return arr[0];
  return arr;
}

function isAndNode(obj: any): obj is { $and: WhereExpression[] } {
  return obj && typeof obj === "object" && "$and" in obj && Array.isArray(obj.$and);
}

function isOrNode(obj: any): obj is { $or: WhereExpression[] } {
  return obj && typeof obj === "object" && "$or" in obj && Array.isArray(obj.$or);
}

function parseWhereExpression(expr: WhereExpression): Array<Record<string, any>> {
  if (isAndNode(expr)) {
    const childArrays = expr.$and.map((child) => parseWhereExpression(child));
    return cartesianAndMerge(childArrays);
  } else if (isOrNode(expr)) {
    const childArrays = expr.$or.map((child) => parseWhereExpression(child));
    return childArrays.reduce((acc, arr) => acc.concat(arr), [] as Record<string, any>[]);
  } else {
    return [convertLeafToTypeOrmObject(expr)];
  }
}

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

function convertLeafToTypeOrmObject(leaf: Where): Record<string, any> {
  const field = leaf.field;
  const operation = leaf.operation || "=";
  const value = leaf.value;
  const generatedValue = (value === null) ? IsNull() : generateRawSQL(value, operation);
  const obj: Record<string, any> = {};
  setPropertyOfObject(field, obj, generatedValue);
  return obj;
}

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
      rawSQL = value;
      break;
  }
  return rawSQL;
}

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

enum MyLocalWhereOffset {
  KEY = 0,
  OPERATION = 1,
  VALUE = 2,
  NUMBER_OF_PROPERTIES = 3,
}

export function getRelations(where: object): object {
  if (!where) return {};
  const object: any = {};
  const keys = getUniqueKeysFromObject(where);
  for (let index = 0; index < keys.length; index += MyLocalWhereOffset.NUMBER_OF_PROPERTIES) {
    const strKey = String(keys[index]);
    const pathVal = getPropertyFromObject(strKey, where);
    if (typeof pathVal === "string" && pathVal.includes(".")) {
      const parts = pathVal.split(".");
      parts.pop();
      if (parts.length > 0) setPropertyOfObject(parts.join("."), object, true);
    }
  }
  return object;
}

export function getOrder(order: Order): object {
  if (!order) return {};
  const obj: any = {};
  setPropertyOfObject(order.field, obj, order.sortOrder);
  return obj;
}

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

function getUniqueKeysFromObject(object: object): string[] {
  const arr = getAllKeysFromObject(object);
  const paths = arr.map((el: any) => el.path as string);
  return Array.from(new Set(paths));
}

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

export { Order, Search, Where, FindParams, VarTypes, OperationTypes };