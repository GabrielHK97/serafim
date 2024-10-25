import { OperationTypes } from "../constants/operation-types.constants";

export type OperationType = typeof OperationTypes[keyof typeof OperationTypes];

export class Where {
  field: string;
  operation: OperationType;
  value: any;

  constructor(field?: string, operation?: OperationType, value?: any) {
    this.field = field ?? "";
    this.operation = operation ?? OperationTypes.EQUAL;
    this.value = value ?? "";
  }
}
