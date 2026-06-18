import { describe, it, expect } from "vitest";
import { getOrder, Order, SortConstants } from "../index";

describe("getOrder", () => {
  it("returns {} for falsy input", () => {
    expect(getOrder(undefined as any)).toEqual({});
    expect(getOrder(null as any)).toEqual({});
  });

  it("returns {} when no field is provided", () => {
    expect(getOrder({ sortOrder: "ASC" } as any)).toEqual({});
    expect(getOrder(new Order())).toEqual({});
  });

  it("maps a top-level field to its sort order", () => {
    expect(getOrder({ field: "name", sortOrder: "ASC" } as any)).toEqual({
      name: "ASC",
    });
  });

  it("expands a dotted field into a nested order object", () => {
    expect(
      getOrder({ field: "person.address.state", sortOrder: "ASC" } as any)
    ).toEqual({ person: { address: { state: "ASC" } } });
  });

  it("works with an Order instance and SortConstants", () => {
    expect(getOrder(new Order("createdAt", SortConstants.DESC))).toEqual({
      createdAt: "desc",
    });
  });
});
