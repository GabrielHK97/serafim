import { OperationTypes } from "../constants/operation-types.constants";
import { Operations } from "./operations.class";
export declare class Where extends Operations {
    field: string;
    operation: OperationTypes;
    value: any;
    constructor(field?: string, operation?: OperationTypes, value?: any);
}
