import { OperationTypes } from "../constants/operation-types.constants";
export type OperationType = typeof OperationTypes[keyof typeof OperationTypes];
export declare class Where {
    field?: string;
    operation?: OperationType;
    value?: any;
    constructor(field?: string, operation?: OperationType, value?: any);
}
