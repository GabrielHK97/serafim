declare module "serafim" {
  export function getWhere(where: any): Array<any>;
  export function getRelations(where: any): any;
  export function getOrder(orders: Order[]): any;

  export class Order {
    field: string;
    sortOrder: string;
  }

  export class Where {
    field: string;
    operation: OperationTypes;
    value: any;
  }

  export class Search {
    where: Where[];
    order: Order;
  }

  export enum VarTypes {
    STRING = "string",
    DATE = "date",
    NUMBER = "number",
    BIGINT = "bigint",
    OBJECT = "object",
  }

  export class OperationTypes {
    static readonly ILIKE = "ILIKE";
    static readonly LIKE = "LIKE";
    static readonly IN = "IN";
    static readonly BETWEEN = "BETWEEN";
    static readonly IS = "IS";
    static readonly NOT = "NOT";
    static readonly NULL = "NULL";
    static readonly TRUE = "TRUE";
    static readonly FALSE = "FALSE";
    static readonly EQUAL = "=";
    static readonly NOT_EQUAL = "!=";
    static readonly GREATER = ">";
    static readonly GREATER_EQUAL = ">=";
    static readonly LESS = "<";
    static readonly LESS_EQUAL = "<=";
  }
}