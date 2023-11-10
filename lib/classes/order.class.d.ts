export declare enum SortConstants {
    UNSORTED = "unsorted",
    ASC = "asc",
    DESC = "desc"
}
export declare class Order {
    field: string;
    sortOrder: string;
    constructor(field?: string, sortOrder?: string);
}
