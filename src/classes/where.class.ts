import { OperationTypesEnum } from "../enums/operation-types.enum";

export type OperationType = typeof OperationTypesEnum[keyof typeof OperationTypesEnum];

export class Where {
  field?: string;
  operation?: OperationType;
  value?: any;

  constructor(field?: string, operation?: OperationType, value?: any) {
    this.field = field ?? "";
    this.operation = operation ?? OperationTypesEnum.EQUAL;
    this.value = value ?? "";
  }
}
