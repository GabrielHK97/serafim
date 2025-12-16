import { Raw, IsNull } from "typeorm";
import { OperationTypesEnum } from "./enums/operation-types.enum";
import { VarTypesEnum } from "./enums/var-types.enum";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";

export type WhereExpression =
  | Where
  | { $and: WhereExpression[] }
  | { $or: WhereExpression[] };

export type WhereExpressionArray = WhereExpression[];

function AND(...conditions: WhereExpression[]): WhereExpression {
  return { $and: conditions };
}

function OR(...conditions: WhereExpression[]): WhereExpression {
  return { $or: conditions };
}

function getWhere(expression: WhereExpression | WhereExpressionArray): object | object[] {
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
  const value = leaf.searchTerm;
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
    case VarTypesEnum.STRING:
      rawSQL = Raw((alias) => {
        const nullishValues = [OperationTypesEnum.NULL, OperationTypesEnum.TRUE, OperationTypesEnum.FALSE];
        if (nullishValues.indexOf(value) !== -1) {
          return `${alias} ${operation} ${value}`;
        }
        // Add wildcard matching for LIKE and ILIKE operations
        if (operation === OperationTypesEnum.LIKE || operation === OperationTypesEnum.ILIKE) {
          // Escape special SQL pattern characters
          const escapedValue = value.replace(/[%_]/g, '\\$&');
          return `${alias} ${operation} '%${escapedValue}%'`;
        }
        return `${alias} ${operation} '${value}'`;
      });
      break;
    case VarTypesEnum.NUMBER:
    case VarTypesEnum.BIGINT:
      rawSQL = Raw((alias) => `${alias} ${operation} ${value}`);
      break;
    case VarTypesEnum.OBJECT:
      if (value instanceof Date) {
        rawSQL = Raw((alias) => `${alias} ${operation} '${value.toISOString()}'`);
      } else if (Array.isArray(value)) {
        if (operation === OperationTypesEnum.BETWEEN) {
          rawSQL = Raw((alias) => {
            const left =
              typeof value[0] === "number" ? value[0] : `'${value[0]}'`;
            const right =
              typeof value[1] === "number" ? value[1] : `'${value[1]}'`;
            return `${alias} BETWEEN ${left} AND ${right}`;
          });
        } else if (operation === OperationTypesEnum.IN) {
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

function getRelations(where: object): object {
  if (!where) return {};
  
  const relations: Record<string, boolean> = {};
  const keys = getUniqueKeysFromObject(where);
  
  for (const key of keys) {
    const pathValue = getPropertyFromObject(key, where);
    
    // Check if the path value is a string containing a dot (indicating a relation)
    if (typeof pathValue === "string" && pathValue.indexOf(".") !== -1) {
      const relationPath = pathValue.split(".").slice(0, -1).join(".");
      if (relationPath) {
        setPropertyOfObject(relationPath, relations, true);
      }
    }
  }
  
  return relations;
}

function getOrder(order: Order): object {
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

export { Order, Search, Where, FindParams, VarTypesEnum, OperationTypesEnum, getRelations, getWhere, getOrder, OR, AND };