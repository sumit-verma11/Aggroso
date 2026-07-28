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

  it("resolves a name with a leading preparation-method word stripped", () => {
    // Meal-plan generation folds prep method into the name itself
    // ("Cooked Lentils") rather than a separate field like meal extraction
    // does — the descriptor-strip tier exists for exactly this case.
    const lentilItems: LookupItem[] = [
      { id: "4", canonicalName: "Lentils", aliases: ["lentil"] },
    ];
    expect(resolveFood("Cooked Lentils", lentilItems)?.id).toBe("4");
    expect(resolveFood("Steamed Broccoli", [
      { id: "5", canonicalName: "Broccoli", aliases: [] },
    ])?.id).toBe("5");
  });

  it("does not strip a descriptor word that's part of the only match available", () => {
    // "White rice, cooked" legitimately contains "cooked" as part of its
    // canonical name — stripping descriptors from both sides still finds it.
    expect(resolveFood("Cooked White Rice", items)?.id).toBe("2");
  });

  it("still returns null when descriptor-stripping doesn't yield a match", () => {
    expect(resolveFood("Cooked Brown Rice", items)).toBeNull();
  });

  it("strips chopped/sliced/diced/minced/florets the same way", () => {
    expect(resolveFood("Chopped Tomato", [
      { id: "6", canonicalName: "Tomato", aliases: [] },
    ])?.id).toBe("6");
    expect(resolveFood("Broccoli Florets", [
      { id: "7", canonicalName: "Broccoli", aliases: [] },
    ])?.id).toBe("7");
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
