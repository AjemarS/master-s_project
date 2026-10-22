import { test, expect } from "@playwright/test";
import { toggleId } from "../app/lib/hooks/use-compare";

// Pure function: no page needed
test.describe("toggleId", () => {
  test("adds, removes and refuses a fifth product", () => {
    expect(toggleId([], 1)).toEqual({ ids: [1], result: "added" });
    expect(toggleId([1, 2], 1)).toEqual({ ids: [2], result: "removed" });
    expect(toggleId([1, 2, 3, 4], 5)).toEqual({ ids: [1, 2, 3, 4], result: "full" });
    expect(toggleId([1, 2, 3, 4], 4)).toEqual({ ids: [1, 2, 3], result: "removed" });
  });
});
