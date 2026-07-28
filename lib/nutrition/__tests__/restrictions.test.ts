import { describe, expect, it } from "vitest";
import { findConflicts } from "../restrictions";

describe("findConflicts", () => {
  it("returns no conflicts when the restriction list is empty", () => {
    expect(findConflicts("peanut butter", null, [])).toEqual([]);
  });

  it("flags a conflict via the raw extracted name", () => {
    expect(findConflicts("peanut butter sandwich", null, ["peanuts"])).toEqual([
      "peanuts",
    ]);
  });

  it("flags a conflict via the matched knowledge-base name even when the raw name doesn't mention it", () => {
    // e.g. plan generation proposed "Cooked Lentils" but it resolved to a
    // KB row whose canonical name happens to overlap an avoid-food.
    expect(findConflicts("Cooked Lentils", "Lentils, avoid-flag", ["avoid-flag"])).toEqual([
      "avoid-flag",
    ]);
  });

  it("is case-insensitive and tolerates simple plurals", () => {
    expect(findConflicts("EGGS Benedict", null, ["egg"])).toEqual(["egg"]);
    expect(findConflicts("egg whites", null, ["Eggs"])).toEqual(["Eggs"]);
  });

  it("does not flag an unrelated food", () => {
    expect(findConflicts("grilled salmon", "Fish, salmon, cooked", ["peanuts", "cilantro"])).toEqual(
      []
    );
  });

  it("can flag more than one matching restriction", () => {
    const conflicts = findConflicts("peanut and cilantro salad", null, [
      "peanuts",
      "cilantro",
      "shellfish",
    ]);
    expect(conflicts.sort()).toEqual(["cilantro", "peanuts"]);
  });

  it("is substring-based and intentionally errs toward over-flagging, not under-flagging: 'almond milk' still trips a 'milk' restriction even though it contains no dairy", () => {
    // Documented trade-off, not a bug: for an allergy/avoid-list check, a
    // false positive (an extra warning to dismiss) is far less costly than
    // a false negative (a missed allergen), so the simple, deterministic
    // substring match is intentionally biased this direction. See
    // README.md's Known Limitations.
    expect(findConflicts("almond milk", null, ["milk"])).toEqual(["milk"]);
  });
});
