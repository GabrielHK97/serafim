import { OperationTypes } from "./constants/operation-types.constants";
import { VarTypes } from "./constants/var-types.constants";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
export declare function getRelations(where: any): any;
export declare function getWhere(where: any): Array<any>;
export declare function getOrder(orders: Order[]): any;
export { VarTypes, OperationTypes, Where, Order, Search };
