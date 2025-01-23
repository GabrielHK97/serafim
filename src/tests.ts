import { AND, getWhere, OperationTypes } from ".";

console.log(
  getWhere(
    AND({
      field: "storeId",
      operation: OperationTypes.EQUAL,
      value: 123,
    })
  )
);
