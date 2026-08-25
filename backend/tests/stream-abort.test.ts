import { describe, expect, it } from "bun:test";
import { handleStudyStream } from "../src/routes/pipeline";

// A Response whose socket already closed: every write/end must be a no-op,
// not a throw. The `res.destroyed` guard is exactly what this test proves.
function deadResponse() {
  return {
    destroyed: true,
    writableEnded: false,
    writeHead: () => {},
    on: () => {},
    write: () => {
      throw new Error("write called on a destroyed socket");
    },
    end: () => {
      throw new Error("end called on a destroyed socket");
    },
  };
}

describe("study stream abort", () => {
  it("resolves without writing when the client socket is already closed", async () => {
    process.env.FAKE_LLM = "1";
    await expect(
      handleStudyStream("mitochondria make ATP", deadResponse() as any),
    ).resolves.toBeUndefined();
  });
});
