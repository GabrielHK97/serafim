import { describe, it, expect } from "vitest";
import { getWhere, AND, OR, OperationTypesEnum as Op, Where } from "../index";
import { opType, opValue, opChild, rawSql } from "./helpers";

describe("getWhere — empty / falsy input", () => {
  it("returns {} for undefined", () => {
    expect(getWhere(undefined as any)).toEqual({});
  });
  it("returns {} for null", () => {
    expect(getWhere(null as any)).toEqual({});
  });
  it("returns {} for an empty AND", () => {
    expect(getWhere(AND())).toEqual({});
  });
  it("returns {} for an empty OR", () => {
    expect(getWhere(OR())).toEqual({});
  });
});

describe("getWhere — default operator (EQUAL)", () => {
  it("defaults to Equal when no operation is given (number)", () => {
    const where: any = getWhere({ field: "quantity", searchTerm: 10 });
    expect(opType(where.quantity)).toBe("equal");
    expect(opValue(where.quantity)).toBe(10);
  });

  it("EQUAL and omitted operation are equivalent", () => {
    const a: any = getWhere({ field: "quantity", searchTerm: 10 });
    const b: any = getWhere({ field: "quantity", operation: Op.EQUAL, searchTerm: 10 });
    expect(opType(a.quantity)).toBe(opType(b.quantity));
    expect(opValue(a.quantity)).toBe(opValue(b.quantity));
  });

  it("binds string equality as a value (not inlined SQL)", () => {
    const where: any = getWhere({ field: "name", searchTerm: "bob" });
    expect(opType(where.name)).toBe("equal");
    expect(opValue(where.name)).toBe("bob");
  });
});

describe("getWhere — comparison operators", () => {
  it("EQUAL => equal", () => {
    const w: any = getWhere({ field: "q", operation: Op.EQUAL, searchTerm: 5 });
    expect(opType(w.q)).toBe("equal");
    expect(opValue(w.q)).toBe(5);
  });
  it("NOT_EQUAL => Not(Equal)", () => {
    const w: any = getWhere({ field: "q", operation: Op.NOT_EQUAL, searchTerm: 5 });
    expect(opType(w.q)).toBe("not");
    expect(opType(opChild(w.q))).toBe("equal");
    expect(opValue(w.q)).toBe(5);
  });
  it("GREATER => moreThan", () => {
    const w: any = getWhere({ field: "q", operation: Op.GREATER, searchTerm: 5 });
    expect(opType(w.q)).toBe("moreThan");
    expect(opValue(w.q)).toBe(5);
  });
  it("GREATER_EQUAL => moreThanOrEqual", () => {
    const w: any = getWhere({ field: "q", operation: Op.GREATER_EQUAL, searchTerm: 5 });
    expect(opType(w.q)).toBe("moreThanOrEqual");
  });
  it("LESS => lessThan", () => {
    const w: any = getWhere({ field: "q", operation: Op.LESS, searchTerm: 5 });
    expect(opType(w.q)).toBe("lessThan");
  });
  it("LESS_EQUAL => lessThanOrEqual", () => {
    const w: any = getWhere({ field: "q", operation: Op.LESS_EQUAL, searchTerm: 5 });
    expect(opType(w.q)).toBe("lessThanOrEqual");
  });
});

describe("getWhere — value type handling", () => {
  it("binds numbers", () => {
    const w: any = getWhere({ field: "n", searchTerm: 42 });
    expect(opValue(w.n)).toBe(42);
  });
  it("binds bigint", () => {
    const big = BigInt("9007199254740993");
    const w: any = getWhere({ field: "n", searchTerm: big });
    expect(opValue(w.n)).toBe(big);
  });
  it("binds booleans (true) via Equal", () => {
    const w: any = getWhere({ field: "active", searchTerm: true });
    expect(opType(w.active)).toBe("equal");
    expect(opValue(w.active)).toBe(true);
  });
  it("binds booleans (false) via Equal", () => {
    const w: any = getWhere({ field: "active", searchTerm: false });
    expect(opValue(w.active)).toBe(false);
  });
  it("binds Date objects directly", () => {
    const date = new Date("2020-01-01T00:00:00.000Z");
    const w: any = getWhere({ field: "createdAt", operation: Op.GREATER, searchTerm: date });
    expect(opType(w.createdAt)).toBe("moreThan");
    expect(opValue(w.createdAt)).toBe(date);
  });
});

describe("getWhere — LIKE / ILIKE", () => {
  it("LIKE binds a wildcard-wrapped value", () => {
    const w: any = getWhere({ field: "name", operation: Op.LIKE, searchTerm: "bo" });
    expect(opType(w.name)).toBe("like");
    expect(opValue(w.name)).toBe("%bo%");
  });
  it("ILIKE binds a wildcard-wrapped value", () => {
    const w: any = getWhere({ field: "name", operation: Op.ILIKE, searchTerm: "bo" });
    expect(opType(w.name)).toBe("ilike");
    expect(opValue(w.name)).toBe("%bo%");
  });
  it("escapes % and _ in the bound value", () => {
    const w: any = getWhere({ field: "n", operation: Op.LIKE, searchTerm: "a%b_c" });
    expect(opValue(w.n)).toBe("%a\\%b\\_c%");
  });
  it("throws when LIKE receives a non-string", () => {
    expect(() => getWhere({ field: "n", operation: Op.LIKE, searchTerm: 5 } as any)).toThrow(/string/);
  });
});

describe("getWhere — IN", () => {
  it("binds a numeric IN array", () => {
    const w: any = getWhere({ field: "q", operation: Op.IN, searchTerm: [10, 20, 30] });
    expect(opType(w.q)).toBe("in");
    expect(opValue(w.q)).toEqual([10, 20, 30]);
  });
  it("binds a string IN array", () => {
    const w: any = getWhere({ field: "n", operation: Op.IN, searchTerm: ["a", "b"] });
    expect(opValue(w.n)).toEqual(["a", "b"]);
  });
  it("throws when IN receives a non-array", () => {
    expect(() => getWhere({ field: "n", operation: Op.IN, searchTerm: 5 } as any)).toThrow(/IN requires/);
  });
  it("throws when IN receives an empty array", () => {
    expect(() => getWhere({ field: "n", operation: Op.IN, searchTerm: [] })).toThrow(/IN requires/);
  });
});

describe("getWhere — BETWEEN", () => {
  it("binds a numeric BETWEEN", () => {
    const w: any = getWhere({ field: "q", operation: Op.BETWEEN, searchTerm: [10, 20] });
    expect(opType(w.q)).toBe("between");
    expect(opValue(w.q)).toEqual([10, 20]);
  });
  it("binds a string BETWEEN", () => {
    const w: any = getWhere({ field: "d", operation: Op.BETWEEN, searchTerm: ["a", "b"] });
    expect(opValue(w.d)).toEqual(["a", "b"]);
  });
  it("binds a date BETWEEN", () => {
    const from = new Date("2020-01-01T00:00:00.000Z");
    const to = new Date("2020-12-31T00:00:00.000Z");
    const w: any = getWhere({ field: "d", operation: Op.BETWEEN, searchTerm: [from, to] });
    expect(opValue(w.d)).toEqual([from, to]);
  });
  it("throws when BETWEEN has the wrong arity", () => {
    expect(() => getWhere({ field: "d", operation: Op.BETWEEN, searchTerm: [1] })).toThrow(/BETWEEN requires/);
    expect(() => getWhere({ field: "d", operation: Op.BETWEEN, searchTerm: [1, 2, 3] })).toThrow(/BETWEEN requires/);
    expect(() => getWhere({ field: "d", operation: Op.BETWEEN, searchTerm: 1 } as any)).toThrow(/BETWEEN requires/);
  });
});

describe("getWhere — NULL / IS / NOT / TRUE / FALSE (unary)", () => {
  it("NULL produces IsNull", () => {
    const w: any = getWhere({ field: "deletedAt", operation: Op.NULL });
    expect(opType(w.deletedAt)).toBe("isNull");
  });
  it("IS is an alias for IsNull", () => {
    const w: any = getWhere({ field: "deletedAt", operation: Op.IS });
    expect(opType(w.deletedAt)).toBe("isNull");
  });
  it("NOT produces IS NOT NULL (Not(IsNull))", () => {
    const w: any = getWhere({ field: "deletedAt", operation: Op.NOT });
    expect(opType(w.deletedAt)).toBe("not");
    expect(opType(opChild(w.deletedAt))).toBe("isNull");
  });
  it("TRUE produces a constant `IS TRUE` (no user value)", () => {
    const w: any = getWhere({ field: "active", operation: Op.TRUE });
    expect(rawSql(w.active)).toBe("col IS TRUE");
  });
  it("FALSE produces a constant `IS FALSE` (no user value)", () => {
    const w: any = getWhere({ field: "active", operation: Op.FALSE });
    expect(rawSql(w.active)).toBe("col IS FALSE");
  });
  it("unary operators ignore the searchTerm", () => {
    const w: any = getWhere({ field: "active", operation: Op.TRUE, searchTerm: "ignored" });
    expect(rawSql(w.active)).toBe("col IS TRUE");
  });
});

describe("getWhere — null / undefined searchTerm shorthand", () => {
  it("a null searchTerm becomes IsNull", () => {
    const w: any = getWhere({ field: "deletedAt", searchTerm: null });
    expect(opType(w.deletedAt)).toBe("isNull");
  });
  it("a null searchTerm becomes IsNull even with a comparison operator", () => {
    const w: any = getWhere({ field: "deletedAt", operation: Op.GREATER, searchTerm: null });
    expect(opType(w.deletedAt)).toBe("isNull");
  });
  it("an undefined searchTerm becomes IsNull", () => {
    const w: any = getWhere({ field: "deletedAt" });
    expect(opType(w.deletedAt)).toBe("isNull");
  });
});

describe("getWhere — nested field paths", () => {
  it("expands dotted fields into nested objects", () => {
    const w: any = getWhere({ field: "person.address.state", searchTerm: "NY" });
    expect(opValue(w.person.address.state)).toBe("NY");
  });
  it("merges sibling fields under the same parent (within AND)", () => {
    const w: any = getWhere(
      AND(
        { field: "person.name", searchTerm: "x" },
        { field: "person.age", operation: Op.GREATER, searchTerm: 1 }
      )
    );
    expect(opType(w.person.name)).toBe("equal");
    expect(opType(w.person.age)).toBe("moreThan");
  });
});

describe("getWhere — bare arrays are rejected (no implicit combination)", () => {
  it("throws on a multi-element bare array", () => {
    expect(() =>
      getWhere([
        { field: "a", searchTerm: 1 },
        { field: "b", searchTerm: 2 },
      ] as any)
    ).toThrow(/bare array/);
  });
  it("throws on a single-element bare array", () => {
    expect(() => getWhere([{ field: "a", searchTerm: 1 }] as any)).toThrow(/bare array/);
  });
  it("throws on an empty bare array", () => {
    expect(() => getWhere([] as any)).toThrow(/bare array/);
  });
  it("the error points users to AND(...) / OR(...)", () => {
    expect(() => getWhere([{ field: "a", searchTerm: 1 }] as any)).toThrow(/AND\(\.\.\.\) or OR\(\.\.\.\)/);
  });
});

describe("getWhere — AND / OR combinators", () => {
  it("AND merges branches into one object", () => {
    const w: any = getWhere(AND({ field: "a", searchTerm: 1 }, { field: "b", searchTerm: 2 }));
    expect(Array.isArray(w)).toBe(false);
    expect(opValue(w.a)).toBe(1);
    expect(opValue(w.b)).toBe(2);
  });
  it("OR yields an array of objects", () => {
    const w: any = getWhere(OR({ field: "a", searchTerm: 1 }, { field: "b", searchTerm: 2 }));
    expect(Array.isArray(w)).toBe(true);
    expect(opValue(w[0].a)).toBe(1);
    expect(opValue(w[1].b)).toBe(2);
  });
  it("distributes AND over OR (cartesian product)", () => {
    const w: any = getWhere(
      AND(
        OR({ field: "a", searchTerm: 1 }, { field: "a", searchTerm: 2 }),
        { field: "b", searchTerm: 9 }
      )
    );
    expect(w).toHaveLength(2);
    expect(opValue(w[0].a)).toBe(1);
    expect(opValue(w[0].b)).toBe(9);
    expect(opValue(w[1].a)).toBe(2);
    expect(opValue(w[1].b)).toBe(9);
  });
  it("supports deep nesting OR(AND(...), AND(...))", () => {
    const w: any = getWhere(
      OR(
        AND({ field: "a", searchTerm: 1 }, { field: "b", searchTerm: 2 }),
        AND({ field: "c", searchTerm: 3 }, { field: "d", searchTerm: 4 })
      )
    );
    expect(w).toHaveLength(2);
    expect(opValue(w[0].a)).toBe(1);
    expect(opValue(w[0].b)).toBe(2);
    expect(opValue(w[1].c)).toBe(3);
    expect(opValue(w[1].d)).toBe(4);
  });
});

describe("getWhere — Where class instances", () => {
  it("accepts a Where instance with constructor defaults", () => {
    const w: any = getWhere(new Where("name", Op.EQUAL, "bob"));
    expect(opValue(w.name)).toBe("bob");
  });
});

describe("getWhere — SQL injection is prevented (values are bound, not inlined)", () => {
  const MALICIOUS = "x'; DROP TABLE users; --";

  it("equality binds a malicious string verbatim as a parameter value", () => {
    const w: any = getWhere({ field: "name", searchTerm: MALICIOUS });
    expect(opType(w.name)).toBe("equal");
    // The dangerous string is carried as a bound value, never concatenated into SQL.
    expect(opValue(w.name)).toBe(MALICIOUS);
    expect(opType(w.name)).not.toBe("raw");
  });

  it("LIKE binds a malicious string (with wildcard escaping) as a parameter", () => {
    const w: any = getWhere({ field: "name", operation: Op.LIKE, searchTerm: MALICIOUS });
    expect(opType(w.name)).toBe("like");
    expect(opValue(w.name)).toBe(`%${MALICIOUS}%`);
  });

  it("IN binds malicious array elements as parameters", () => {
    const w: any = getWhere({ field: "name", operation: Op.IN, searchTerm: [MALICIOUS, "ok"] });
    expect(opType(w.name)).toBe("in");
    expect(opValue(w.name)).toEqual([MALICIOUS, "ok"]);
  });

  it("BETWEEN binds malicious bounds as parameters", () => {
    const w: any = getWhere({ field: "n", operation: Op.BETWEEN, searchTerm: [MALICIOUS, "z"] });
    expect(opType(w.n)).toBe("between");
    expect(opValue(w.n)).toEqual([MALICIOUS, "z"]);
  });

  it("no value-bearing operator is ever a raw (string-interpolated) operator", () => {
    const valueBearing: Array<[Op, any]> = [
      [Op.EQUAL, MALICIOUS],
      [Op.NOT_EQUAL, MALICIOUS],
      [Op.GREATER, MALICIOUS],
      [Op.GREATER_EQUAL, MALICIOUS],
      [Op.LESS, MALICIOUS],
      [Op.LESS_EQUAL, MALICIOUS],
      [Op.LIKE, MALICIOUS],
      [Op.ILIKE, MALICIOUS],
      [Op.IN, [MALICIOUS]],
      [Op.BETWEEN, [MALICIOUS, MALICIOUS]],
    ];
    for (const [operation, searchTerm] of valueBearing) {
      const w: any = getWhere({ field: "f", operation, searchTerm });
      expect(opType(w.f)).not.toBe("raw");
    }
  });
});

describe("getWhere — invalid input", () => {
  it("throws when a leaf has no field", () => {
    expect(() => getWhere({ searchTerm: 1 } as any)).toThrow(/field/);
  });
  it("throws when a comparison receives an array value", () => {
    expect(() => getWhere({ field: "n", operation: Op.EQUAL, searchTerm: [1, 2] } as any)).toThrow();
  });
});
