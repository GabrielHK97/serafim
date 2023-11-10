import { OperationTypes } from "../constants/operation-types.constants";
export declare class Where {
    field: string;
    operation: OperationTypes;
    value: any;
    constructor(field?: string, operation?: OperationTypes, value?: any);
}
