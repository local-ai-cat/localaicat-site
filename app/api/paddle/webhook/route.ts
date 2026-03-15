import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "../../../../lib/db";
import { getPaddleClient, getPaddleWebhookSecret } from "../../../../lib/paddle";
import { processPaddleWebhookEvent } from "../../../../lib/paddle-webhooks";

export const runtime = "nodejs";

const webhookBodySchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  occurred_at: z.string(),
  data: z.record(z.string(), z.unknown())
});

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing paddle-signature header" },
      { status: 400 }
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const bodyCheck = webhookBodySchema.safeParse(parsed);

  if (!bodyCheck.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook payload shape" },
      { status: 400 }
    );
  }

  try {
    const event = await getPaddleClient().webhooks.unmarshal(
      rawBody,
      getPaddleWebhookSecret(),
      signature
    );

    const result = await withTransaction(async (client) =>
      processPaddleWebhookEvent(client, event)
    );

    return NextResponse.json({
      ok: true,
      eventId: event.eventId,
      eventType: event.eventType,
      ...result
    });
  } catch (error) {
    console.error("Paddle webhook processing failed", error);

    return NextResponse.json(
      { ok: false, error: "Invalid or unprocessable webhook" },
      { status: 400 }
    );
  }
}

