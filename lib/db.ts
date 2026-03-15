import { Pool, type PoolClient } from "pg";

export type EntitlementRecord = {
  customerId: string;
  plan: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  proAccess: boolean;
  developerAccess: boolean;
  teamAccess: boolean;
  teamSeats: number;
  billingInterval: string | null;
  currentPeriodEndsAt: string | null;
  nextBilledAt: string | null;
  productIds: string[];
  priceIds: string[];
  lastEventId: string;
  lastEventType: string;
  lastTransactionId?: string | null;
  rawSubscription?: unknown;
  rawTransaction?: unknown;
};

export type ExistingEntitlementRecord = {
  customerId: string;
  plan: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  proAccess: boolean;
  developerAccess: boolean;
  teamAccess: boolean;
  teamSeats: number;
  billingInterval: string | null;
  currentPeriodEndsAt: string | null;
  nextBilledAt: string | null;
  productIds: string[];
  priceIds: string[];
  lastTransactionId: string | null;
};

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  return databaseUrl;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl()
    });
  }

  return pool;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureSchema() {
  if (!schemaPromise) {
    const attempt = (async () => {
      const client = await getPool().connect();

      try {
        await client.query(`
          create table if not exists paddle_customers (
            customer_id text primary key,
            email text,
            full_name text,
            updated_at timestamptz not null default now()
          );
        `);

        await client.query(`
          create table if not exists entitlement_snapshots (
            customer_id text primary key references paddle_customers(customer_id) on delete cascade,
            plan text,
            subscription_id text,
            subscription_status text,
            pro_access boolean not null default false,
            developer_access boolean not null default false,
            team_access boolean not null default false,
            team_seats integer not null default 0,
            billing_interval text,
            current_period_ends_at timestamptz,
            next_billed_at timestamptz,
            product_ids text[] not null default '{}',
            price_ids text[] not null default '{}',
            last_event_id text not null,
            last_event_type text not null,
            last_transaction_id text,
            raw_subscription jsonb,
            raw_transaction jsonb,
            updated_at timestamptz not null default now()
          );
        `);

        await client.query(`
          create table if not exists processed_webhooks (
            event_id text primary key,
            event_type text not null,
            occurred_at timestamptz not null,
            processed_at timestamptz not null default now()
          );
        `);

        await client.query(`
          create index if not exists entitlement_snapshots_subscription_id_idx
          on entitlement_snapshots (subscription_id);
        `);
      } finally {
        client.release();
      }
    })();

    schemaPromise = attempt;

    attempt.catch(() => {
      schemaPromise = null;
    });
  }

  return schemaPromise;
}

export async function withDatabase<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function hasProcessedWebhookEvent(
  client: PoolClient,
  eventId: string
) {
  const result = await client.query<{ event_id: string }>(
    "select event_id from processed_webhooks where event_id = $1 limit 1",
    [eventId]
  );

  return (result.rowCount || 0) > 0;
}

export async function markWebhookEventProcessed(
  client: PoolClient,
  eventId: string,
  eventType: string,
  occurredAt: string
) {
  await client.query(
    `
      insert into processed_webhooks (event_id, event_type, occurred_at)
      values ($1, $2, $3)
      on conflict (event_id) do nothing
    `,
    [eventId, eventType, occurredAt]
  );
}

export async function upsertCustomer(
  client: PoolClient,
  customerId: string,
  email?: string | null,
  fullName?: string | null
) {
  await client.query(
    `
      insert into paddle_customers (customer_id, email, full_name)
      values ($1, $2, $3)
      on conflict (customer_id) do update
      set email = coalesce(excluded.email, paddle_customers.email),
          full_name = coalesce(excluded.full_name, paddle_customers.full_name),
          updated_at = now()
    `,
    [customerId, email || null, fullName || null]
  );
}

export async function upsertEntitlementRecord(
  client: PoolClient,
  record: EntitlementRecord
) {
  await client.query(
    `
      insert into entitlement_snapshots (
        customer_id,
        plan,
        subscription_id,
        subscription_status,
        pro_access,
        developer_access,
        team_access,
        team_seats,
        billing_interval,
        current_period_ends_at,
        next_billed_at,
        product_ids,
        price_ids,
        last_event_id,
        last_event_type,
        last_transaction_id,
        raw_subscription,
        raw_transaction,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12::text[], $13::text[], $14, $15, $16, $17::jsonb, $18::jsonb, now()
      )
      on conflict (customer_id) do update
      set plan = excluded.plan,
          subscription_id = excluded.subscription_id,
          subscription_status = excluded.subscription_status,
          pro_access = excluded.pro_access,
          developer_access = excluded.developer_access,
          team_access = excluded.team_access,
          team_seats = excluded.team_seats,
          billing_interval = excluded.billing_interval,
          current_period_ends_at = excluded.current_period_ends_at,
          next_billed_at = excluded.next_billed_at,
          product_ids = excluded.product_ids,
          price_ids = excluded.price_ids,
          last_event_id = excluded.last_event_id,
          last_event_type = excluded.last_event_type,
          last_transaction_id = excluded.last_transaction_id,
          raw_subscription = coalesce(excluded.raw_subscription, entitlement_snapshots.raw_subscription),
          raw_transaction = coalesce(excluded.raw_transaction, entitlement_snapshots.raw_transaction),
          updated_at = now()
    `,
    [
      record.customerId,
      record.plan,
      record.subscriptionId,
      record.subscriptionStatus,
      record.proAccess,
      record.developerAccess,
      record.teamAccess,
      record.teamSeats,
      record.billingInterval,
      record.currentPeriodEndsAt,
      record.nextBilledAt,
      record.productIds,
      record.priceIds,
      record.lastEventId,
      record.lastEventType,
      record.lastTransactionId || null,
      record.rawSubscription ? JSON.stringify(record.rawSubscription) : null,
      record.rawTransaction ? JSON.stringify(record.rawTransaction) : null
    ]
  );
}

export async function getExistingEntitlementRecord(
  client: PoolClient,
  customerId: string
) {
  const result = await client.query<ExistingEntitlementRecord>(
    `
      select
        customer_id as "customerId",
        plan,
        subscription_id as "subscriptionId",
        subscription_status as "subscriptionStatus",
        pro_access as "proAccess",
        developer_access as "developerAccess",
        team_access as "teamAccess",
        team_seats as "teamSeats",
        billing_interval as "billingInterval",
        current_period_ends_at::text as "currentPeriodEndsAt",
        next_billed_at::text as "nextBilledAt",
        product_ids as "productIds",
        price_ids as "priceIds",
        last_transaction_id as "lastTransactionId"
      from entitlement_snapshots
      where customer_id = $1
      limit 1
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

export async function getEntitlementSummary(client: PoolClient) {
  const counts = await client.query<{
    customer_count: string;
    active_pro_count: string;
    developer_count: string;
    team_count: string;
  }>(`
    select
      count(*)::text as customer_count,
      count(*) filter (where pro_access = true)::text as active_pro_count,
      count(*) filter (where developer_access = true)::text as developer_count,
      count(*) filter (where team_access = true)::text as team_count
    from entitlement_snapshots
  `);

  return counts.rows[0];
}
