import { OperationTypesEnum } from "../enums/operation-types.enum";

export class Where {
  field?: string;
  operation?: OperationTypesEnum;
  searchTerm?: any;

  constructor(field?: string, operation?: OperationTypesEnum, searchTerm?: any) {
    this.field = field ?? "";
    this.operation = operation ?? OperationTypesEnum.EQUAL;
    this.searchTerm = searchTerm ?? "";
  }
}
