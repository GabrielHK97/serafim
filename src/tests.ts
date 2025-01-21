import { getWhere, OperationTypes } from ".";

console.log(
  getWhere([
    {
      field: 'removedAtDate',
      operation: OperationTypes.EQUAL,
      value: null,
    },
    {
      field: 'onlineStore',
      operation: OperationTypes.EQUAL,
      value: false,
    },
  ])
);
