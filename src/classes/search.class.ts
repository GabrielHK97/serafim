import { Order } from "./order.class"
import { Where } from "./where.class"

export class Search {
    where: Where[];
    order: Order;

    constructor(where: Where[], order: Order) {
        this.where = where;
        this.order = order;
    }
}