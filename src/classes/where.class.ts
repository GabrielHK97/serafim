import { OperationTypes } from "../constants/operation-types.constants";

export class Where {
  field: string;
  operation: OperationTypes;
  value: any;

  constructor(
      field?: string,
      operation?: OperationTypes,
      value?: any,
  ) {
      this.field = field ?? '';
      this.operation = operation ?? OperationTypes.EQUAL;
      this.value = value ?? '';
  }
}
