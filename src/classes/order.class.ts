import { Operations } from "./operations.class";

export declare enum SortConstants {
  UNSORTED = "unsorted",
  ASC = "asc",
  DESC = "desc",
}

export class Order extends Operations {
  field?: string;
  sortOrder?: string;

  constructor(field?: string, sortOrder?: string) {
    super();
    this.field = field ?? "";
    this.sortOrder = sortOrder ?? SortConstants.UNSORTED;
  }
}
