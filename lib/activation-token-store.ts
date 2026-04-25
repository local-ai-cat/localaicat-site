import { neon } from "@neondatabase/serverless";
import {
  hashActivationToken,
  inspectActivationToken,
  issueActivationToken,
  type ActivationTokenPayload
} from "./activation-tokens.ts";
import { getActivationTokenDatabaseUrl } from "./env.ts";

type NeonClient = ReturnType<typeof neon>;

export type PersistedActivationTokenRecord = {
  tokenHash: string;
  jti: string;
  checkoutId: string;
  customerId: string;
  licenseKey: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
};

export type ActivationTokenConsumeResult =
  | {
      status: "consumed";
      record: PersistedActivationTokenRecord;
    }
  | {
      status: "used" | "expired" | "missing";
    };

export interface ActivationTokenStore {
  save(record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">): Promise<void>;
  consume(tokenHash: string, now?: Date): Promise<ActivationTokenConsumeResult>;
}

type ActivationTokenIssueResult = {
  token: string;
  payload: ActivationTokenPayload;
  expiresAt: Date;
};

type ActivationTokenStoreRow = {
  status: "consumed" | "used" | "expired" | "missing";
  token_hash: string | null;
  jti: string | null;
  checkout_id: string | null;
  customer_id: string | null;
  license_key: string | null;
  expires_at: Date | string | null;
  created_at: Date | string | null;
  used_at: Date | string | null;
};

let schemaReady: Promise<void> | null = null;

function mapRow(row: {
  token_hash: string;
  jti: string;
  checkout_id: string;
  customer_id: string;
  license_key: string;
  expires_at: Date | string;
  created_at: Date | string;
  used_at: Date | string | null;
}): PersistedActivationTokenRecord {
  return {
    tokenHash: row.token_hash,
    jti: row.jti,
    checkoutId: row.checkout_id,
    customerId: row.customer_id,
    licenseKey: row.license_key,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    usedAt: row.used_at ? new Date(row.used_at) : null
  };
}

function makeNeonClient(): NeonClient | null {
  const databaseUrl = getActivationTokenDatabaseUrl();
  if (!databaseUrl) {
    return null;
  }

  return neon(databaseUrl);
}

async function ensureSchema(client: NeonClient) {
  schemaReady ??= (async () => {
    await client`
      CREATE TABLE IF NOT EXISTS activation_tokens (
        token_hash TEXT PRIMARY KEY,
        jti TEXT NOT NULL UNIQUE,
        checkout_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        license_key TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        used_at TIMESTAMPTZ
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS activation_tokens_expires_at_idx
      ON activation_tokens (expires_at)
    `;
  })();

  await schemaReady;
}

class NeonActivationTokenStore implements ActivationTokenStore {
  private readonly client: NeonClient;

  constructor(client: NeonClient) {
    this.client = client;
  }

  async save(record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">) {
    await ensureSchema(this.client);

    await this.client`
      INSERT INTO activation_tokens (
        token_hash,
        jti,
        checkout_id,
        customer_id,
        license_key,
        expires_at
      )
      VALUES (
        ${record.tokenHash},
        ${record.jti},
        ${record.checkoutId},
        ${record.customerId},
        ${record.licenseKey},
        ${record.expiresAt.toISOString()}
      )
      ON CONFLICT (token_hash) DO NOTHING
    `;
  }

  async consume(tokenHash: string, now = new Date()): Promise<ActivationTokenConsumeResult> {
    await ensureSchema(this.client);

    const rows = (await this.client`
      WITH updated AS (
        UPDATE activation_tokens
        SET used_at = ${now.toISOString()}
        WHERE token_hash = ${tokenHash}
          AND used_at IS NULL
          AND expires_at > ${now.toISOString()}
        RETURNING *
      ),
      existing AS (
        SELECT *
        FROM activation_tokens
        WHERE token_hash = ${tokenHash}
      )
      SELECT
        'consumed'::TEXT AS status,
        token_hash,
        jti,
        checkout_id,
        customer_id,
        license_key,
        expires_at,
        created_at,
        used_at
      FROM updated
      UNION ALL
      SELECT
        CASE
          WHEN existing.used_at IS NOT NULL THEN 'used'
          WHEN existing.expires_at <= ${now.toISOString()} THEN 'expired'
          ELSE 'missing'
        END AS status,
        existing.token_hash,
        existing.jti,
        existing.checkout_id,
        existing.customer_id,
        existing.license_key,
        existing.expires_at,
        existing.created_at,
        existing.used_at
      FROM existing
      WHERE NOT EXISTS (SELECT 1 FROM updated)
      UNION ALL
      SELECT
        'missing'::TEXT AS status,
        NULL::TEXT AS token_hash,
        NULL::TEXT AS jti,
        NULL::TEXT AS checkout_id,
        NULL::TEXT AS customer_id,
        NULL::TEXT AS license_key,
        NULL::TIMESTAMPTZ AS expires_at,
        NULL::TIMESTAMPTZ AS created_at,
        NULL::TIMESTAMPTZ AS used_at
      WHERE NOT EXISTS (SELECT 1 FROM updated)
        AND NOT EXISTS (SELECT 1 FROM existing)
      LIMIT 1
    `) as ActivationTokenStoreRow[];

    const row = rows[0];
    if (!row || row.status === "missing") {
      return { status: "missing" };
    }

    if (row.status === "used") {
      return { status: "used" };
    }

    if (row.status === "expired") {
      return { status: "expired" };
    }

    return {
      status: "consumed",
      record: mapRow({
        token_hash: row.token_hash!,
        jti: row.jti!,
        checkout_id: row.checkout_id!,
        customer_id: row.customer_id!,
        license_key: row.license_key!,
        expires_at: row.expires_at!,
        created_at: row.created_at!,
        used_at: row.used_at
      })
    };
  }
}

class MemoryActivationTokenStore implements ActivationTokenStore {
  private readonly records = new Map<string, PersistedActivationTokenRecord>();

  async save(record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">) {
    if (this.records.has(record.tokenHash)) {
      return;
    }

    this.records.set(record.tokenHash, {
      ...record,
      createdAt: new Date(),
      usedAt: null
    });
  }

  async consume(tokenHash: string, now = new Date()): Promise<ActivationTokenConsumeResult> {
    const existing = this.records.get(tokenHash);
    if (!existing) {
      return { status: "missing" };
    }

    if (existing.usedAt) {
      return { status: "used" };
    }

    if (existing.expiresAt <= now) {
      return { status: "expired" };
    }

    existing.usedAt = now;
    this.records.set(tokenHash, existing);
    return {
      status: "consumed",
      record: existing
    };
  }
}

export function createInMemoryActivationTokenStore(): ActivationTokenStore {
  return new MemoryActivationTokenStore();
}

export function getActivationTokenStore(): ActivationTokenStore | null {
  const client = makeNeonClient();
  if (!client) {
    return null;
  }

  return new NeonActivationTokenStore(client);
}

export function issueActivationTokenEnvelope(
  checkoutId: string,
  customerId: string,
  ttlSeconds?: number
): ActivationTokenIssueResult | null {
  const token = issueActivationToken(checkoutId, customerId, ttlSeconds);
  if (!token) {
    return null;
  }

  const inspection = inspectActivationToken(token);
  if (!inspection.ok) {
    return null;
  }

  return {
    token,
    payload: inspection.payload,
    expiresAt: new Date(inspection.payload.exp * 1000)
  };
}

export async function issuePersistentActivationToken(
  params: {
    checkoutId: string;
    customerId: string;
    licenseKey: string;
    ttlSeconds?: number;
  },
  store: ActivationTokenStore | null = getActivationTokenStore()
) {
  if (!store) {
    return null;
  }

  const issued = issueActivationTokenEnvelope(
    params.checkoutId,
    params.customerId,
    params.ttlSeconds
  );
  if (!issued) {
    return null;
  }

  await store.save({
    tokenHash: hashActivationToken(issued.token),
    jti: issued.payload.jti,
    checkoutId: issued.payload.checkoutId,
    customerId: issued.payload.customerId,
    licenseKey: params.licenseKey,
    expiresAt: issued.expiresAt
  });

  return {
    token: issued.token,
    expiresAt: issued.expiresAt
  };
}
