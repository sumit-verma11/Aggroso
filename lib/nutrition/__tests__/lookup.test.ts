import { describe, expect, it } from "vitest";
import { resolveFood, normalizeFoodName, type LookupItem } from "../lookup";

const items: LookupItem[] = [
  { id: "1", canonicalName: "Banana", aliases: ["bananas"] },
  { id: "2", canonicalName: "White rice, cooked", aliases: ["rice", "cooked rice", "white rice"] },
  { id: "3", canonicalName: "Tomato", aliases: [] },
];

describe("resolveFood", () => {
  it("resolves an exact canonical-name match", () => {
    const result = resolveFood("Banana", items);
    expect(result?.id).toBe("1");
  });

  it("resolves an alias match", () => {
    const result = resolveFood("rice", items);
    expect(result?.id).toBe("2");
  });

  it("resolves case and plural variation via normalization", () => {
    expect(resolveFood("TOMATOES", items)?.id).toBe("3");
    expect(resolveFood("  tomato  ", items)?.id).toBe("3");
    expect(resolveFood("Bananas", items)?.id).toBe("1");
  });

  it("returns null (unresolved) on a genuine miss", () => {
    expect(resolveFood("dragonfruit", items)).toBeNull();
  });

  it("returns null on an empty string", () => {
    expect(resolveFood("   ", items)).toBeNull();
  });
});

describe("normalizeFoodName", () => {
  it("lowercases and trims", () => {
    expect(normalizeFoodName("  Banana  ")).toBe("banana");
  });

  it("strips a simple trailing plural", () => {
    expect(normalizeFoodName("tomatoes")).toBe("tomato");
    expect(normalizeFoodName("bananas")).toBe("banana");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeFoodName("white   rice")).toBe("white rice");
  });
});
