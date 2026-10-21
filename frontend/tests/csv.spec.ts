import { test, expect } from "@playwright/test";
import { toCsv } from "../app/lib/utils/csv";

// Pure function: no page needed
test.describe("toCsv", () => {
  test("quotes separators, quotes and newlines; leaves plain cells alone", () => {
    expect(toCsv(["a", "b"], [["x;y", 'say "hi"'], ["line\nbreak", 12.5], [null, undefined]])).toBe(
      'a;b\r\n"x;y";"say ""hi"""\r\n"line\nbreak";12.5\r\n;'
    );
  });

  test("neutralises spreadsheet formulas in text but not negative numbers", () => {
    expect(toCsv(["v"], [["=SUM(A1)"], ["@cmd"], [-5]])).toBe("v\r\n'=SUM(A1)\r\n'@cmd\r\n-5");
  });
});
