import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type { InvoiceVerificationRunnerOptions } from "@fuse/runner";

export function createEventBridgePublisher(
  client: EventBridgeClient,
  eventBusName: string,
): NonNullable<InvoiceVerificationRunnerOptions["publishBreakerTripped"]> {
  return async (notice) => {
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: eventBusName,
            Source: notice.source,
            DetailType: notice.detailType,
            Detail: JSON.stringify({
              runId: notice.runId,
              reason: notice.reason,
              reasonCode: notice.reasonCode,
              at: notice.at,
              liveBedrock: false,
              nextInvocation: "BLOCKED",
            }),
          },
        ],
      }),
    );
  };
}
