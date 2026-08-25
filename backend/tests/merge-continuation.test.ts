import { describe, expect, it } from "bun:test";
import { mergeContinuation } from "../src/llm";

const BASE = `## High-Level Summary
- mitochondria make ATP.

## High-Yield Points
- a
- b

## Flashcards
Front: x | Back: y

## Practice Quiz
Q1`;

describe("mergeContinuation", () => {
  it("folds padded sections into a single document with no 'More X' markers", () => {
    const addition = [
      "More High-Yield Points",
      "- c",
      "",
      "More Flashcards",
      "Front: z | Back: w",
      "",
      "More Quiz",
      "Q2",
    ].join("\n");
    const merged = mergeContinuation(BASE, addition);

    expect(/More (High-Yield|Flashcards|Quiz)/.test(merged)).toBe(false);
    expect(merged).toContain("- c");
    // items land under their own section heading
    const yieldIdx = merged.indexOf("## High-Yield Points");
    const flashIdx = merged.indexOf("## Flashcards");
    expect(yieldIdx).toBeGreaterThan(-1);
    expect(merged.indexOf("- c")).toBeGreaterThan(yieldIdx);
    expect(merged.indexOf("- c")).toBeLessThan(flashIdx);
    // Quiz merges into "Practice Quiz" via containment match
    expect(merged.indexOf("Q2")).toBeGreaterThan(merged.indexOf("## Practice Quiz"));
  });

  it("keeps a single-chunk document unchanged (no addition)", () => {
    expect(mergeContinuation(BASE, "")).toBe(BASE.replace(/\n{3,}/g, "\n\n"));
  });
});