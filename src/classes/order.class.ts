export declare enum SortConstants {
  UNSORTED = "unsorted",
  ASC = "asc",
  DESC = "desc",
}

export class Order {
  field?: string;
  sortOrder?: string;

  constructor(field?: string, sortOrder?: string) {
    this.field = field ?? "";
    this.sortOrder = sortOrder ?? SortConstants.UNSORTED;
  }
}
