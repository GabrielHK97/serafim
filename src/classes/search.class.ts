import { Order } from "./order.class"

export class Search {
    where?: any;
    order?: Order;

    constructor(where?: any, order?: Order) {
        this.where = where;
        this.order = order;
    }
}