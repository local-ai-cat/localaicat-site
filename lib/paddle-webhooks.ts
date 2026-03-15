import { EventName, type Paddle } from "@paddle/paddle-node-sdk";
import type { PoolClient } from "pg";
import {
  markWebhookEventProcessed,
  upsertCustomer,
  upsertEntitlementRecord,
  hasProcessedWebhookEvent,
  getExistingEntitlementRecord
} from "./db";
import { getConfiguredProductIds } from "./env";

type PaddleWebhookEvent = Awaited<ReturnType<Paddle["webhooks"]["unmarshal"]>>;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function getPlanFromProductIds(productIds: string[]) {
  const products = getConfiguredProductIds();

  if (products.teamAnnual && productIds.includes(products.teamAnnual)) {
    return "team-annual";
  }

  if (products.proAnnual && productIds.includes(products.proAnnual)) {
    return "pro-annual";
  }

  if (products.proMonthly && productIds.includes(products.proMonthly)) {
    return "pro-monthly";
  }

  return null;
}

function getDeveloperProductId() {
  return getConfiguredProductIds().developerMode;
}

export async function processPaddleWebhookEvent(
  client: PoolClient,
  event: PaddleWebhookEvent
) {
  if (await hasProcessedWebhookEvent(client, event.eventId)) {
    return { ignored: true as const, reason: "duplicate" };
  }

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionCanceled: {
      const existing = await getExistingEntitlementRecord(
        client,
        event.data.customerId
      );
      const productIds = compact(
        event.data.items.map((item) => item.product?.id || item.price?.productId)
      );
      const priceIds = compact(event.data.items.map((item) => item.price?.id));
      const plan = getPlanFromProductIds(productIds);
      const teamSeats =
        plan === "team-annual"
          ? event.data.items.reduce((total, item) => total + (item.quantity ?? 0), 0)
          : 0;
      const proAccess =
        plan !== null &&
        ACTIVE_SUBSCRIPTION_STATUSES.has(event.data.status) &&
        plan !== "team-annual";
      const teamAccess =
        plan === "team-annual" &&
        ACTIVE_SUBSCRIPTION_STATUSES.has(event.data.status);

      await upsertCustomer(client, event.data.customerId);
      await upsertEntitlementRecord(client, {
        customerId: event.data.customerId,
        plan,
        subscriptionId: event.data.id,
        subscriptionStatus: event.data.status,
        proAccess: proAccess || teamAccess,
        developerAccess: existing?.developerAccess || false,
        teamAccess,
        teamSeats,
        billingInterval: event.data.billingCycle.interval,
        currentPeriodEndsAt: event.data.currentBillingPeriod?.endsAt || null,
        nextBilledAt: event.data.nextBilledAt,
        productIds,
        priceIds,
        lastEventId: event.eventId,
        lastEventType: event.eventType,
        rawSubscription: event.data
      });
      break;
    }

    case EventName.TransactionCompleted:
    case EventName.TransactionPaid: {
      const customerId = event.data.customerId;
      const developerProductId = getDeveloperProductId();
      const productIds = compact(
        event.data.items.map((item) => item.price?.productId || null)
      );
      const priceIds = compact(event.data.items.map((item) => item.price?.id || null));
      const plan = getPlanFromProductIds(productIds);
      const hasDeveloperMode =
        developerProductId !== null && productIds.includes(developerProductId);

      if (!customerId) {
        await markWebhookEventProcessed(
          client,
          event.eventId,
          event.eventType,
          event.occurredAt
        );
        return { ignored: true as const, reason: "missing_customer" };
      }

      const existing = await getExistingEntitlementRecord(client, customerId);

      await upsertCustomer(client, customerId);
      await upsertEntitlementRecord(client, {
        customerId,
        plan: existing?.plan || plan,
        subscriptionId: existing?.subscriptionId || event.data.subscriptionId,
        subscriptionStatus: existing?.subscriptionStatus || event.data.status,
        proAccess:
          existing?.proAccess || plan === "pro-monthly" || plan === "pro-annual",
        developerAccess: existing?.developerAccess || hasDeveloperMode,
        teamAccess: existing?.teamAccess || plan === "team-annual",
        teamSeats:
          existing?.teamSeats ||
          (plan === "team-annual"
            ? event.data.items.reduce((total, item) => total + (item.quantity ?? 0), 0)
            : 0),
        billingInterval:
          existing?.billingInterval ||
          event.data.items[0]?.price?.billingCycle?.interval ||
          null,
        currentPeriodEndsAt:
          existing?.currentPeriodEndsAt || event.data.billingPeriod?.endsAt || null,
        nextBilledAt:
          existing?.nextBilledAt || event.data.billingPeriod?.endsAt || null,
        productIds: existing?.productIds.length
          ? Array.from(new Set([...existing.productIds, ...productIds]))
          : productIds,
        priceIds: existing?.priceIds.length
          ? Array.from(new Set([...existing.priceIds, ...priceIds]))
          : priceIds,
        lastEventId: event.eventId,
        lastEventType: event.eventType,
        lastTransactionId: event.data.id,
        rawTransaction: event.data
      });
      break;
    }

    default:
      break;
  }

  await markWebhookEventProcessed(
    client,
    event.eventId,
    event.eventType,
    event.occurredAt
  );

  return { ignored: false as const };
}
