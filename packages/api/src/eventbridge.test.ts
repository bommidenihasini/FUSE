import { PutEventsCommand, type EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { describe, expect, test, vi } from "vitest";
import { createEventBridgePublisher } from "./eventbridge.js";

describe("createEventBridgePublisher", () => {
  test("publishes BreakerTripped to the named bus", async () => {
    const send = vi.fn(async () => ({}));
    const client = { send } as unknown as EventBridgeClient;
    const publish = createEventBridgePublisher(client, "fuse-breaker");
    await publish({
      source: "fuse.breaker",
      detailType: "BreakerTripped",
      runId: "run-1",
      reason: "Next invocation blocked.",
      reasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
      at: "2026-09-18T18:00:00.000Z",
    });
    expect(send).toHaveBeenCalledTimes(1);
    const firstCall = send.mock.calls[0] as unknown as [PutEventsCommand];
    const command = firstCall[0];
    expect(command).toBeInstanceOf(PutEventsCommand);
    const entry = command.input.Entries?.[0];
    expect(entry?.EventBusName).toBe("fuse-breaker");
    expect(entry?.Source).toBe("fuse.breaker");
    expect(entry?.DetailType).toBe("BreakerTripped");
    expect(entry?.Detail).toContain("run-1");
    expect(entry?.Detail).toContain("liveBedrock");
  });
});
