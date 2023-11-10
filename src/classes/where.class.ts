import { OperationTypes } from "../constants/operation-types.constants";
import { Operations } from "./operations.class";

export class Where extends Operations {
  field: string;
  operation: OperationTypes;
  value: any;

  constructor(field?: string, operation?: OperationTypes, value?: any) {
    super();
    this.field = field ?? "";
    this.operation = operation ?? OperationTypes.EQUAL;
    this.value = value ?? "";
  }
}
