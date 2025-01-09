import { Order } from "./order.class";
import { Where } from "./where.class";
export declare class Search {
    where?: Where[];
    order?: Order;
    constructor(where?: Where[], order?: Order);
}
