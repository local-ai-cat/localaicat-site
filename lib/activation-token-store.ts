import { Redis } from "@upstash/redis";
import {
  hashActivationToken,
  inspectActivationToken,
  issueActivationToken,
  type ActivationTokenPayload
} from "./activation-tokens.ts";
import { getActivationTokenRedisConfig } from "./env.ts";

const KEY_PREFIX = "activation-token:";
const USED_KEY_PREFIX = "activation-token-used:";
const USED_TOMBSTONE_SECONDS = 15 * 60;

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

export type ActivationTokenStatusResult =
  | {
      status: "pending";
      record: PersistedActivationTokenRecord;
    }
  | {
      status: "used" | "expired" | "missing";
    };

export interface ActivationTokenStore {
  save(record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">): Promise<void>;
  consume(tokenHash: string, now?: Date): Promise<ActivationTokenConsumeResult>;
  status(tokenHash: string, now?: Date): Promise<ActivationTokenStatusResult>;
}

type ActivationTokenIssueResult = {
  token: string;
  payload: ActivationTokenPayload;
  expiresAt: Date;
};

type SerializedActivationTokenRecord = {
  tokenHash: string;
  jti: string;
  checkoutId: string;
  customerId: string;
  licenseKey: string;
  expiresAt: string;
  createdAt: string;
};

function keyFor(tokenHash: string) {
  return `${KEY_PREFIX}${tokenHash}`;
}

function usedKeyFor(tokenHash: string) {
  return `${USED_KEY_PREFIX}${tokenHash}`;
}

function serializeRecord(
  record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">,
  createdAt = new Date()
): SerializedActivationTokenRecord {
  return {
    tokenHash: record.tokenHash,
    jti: record.jti,
    checkoutId: record.checkoutId,
    customerId: record.customerId,
    licenseKey: record.licenseKey,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: createdAt.toISOString()
  };
}

function deserializeRecord(row: SerializedActivationTokenRecord): PersistedActivationTokenRecord {
  return {
    tokenHash: row.tokenHash,
    jti: row.jti,
    checkoutId: row.checkoutId,
    customerId: row.customerId,
    licenseKey: row.licenseKey,
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    usedAt: null
  };
}

class UpstashActivationTokenStore implements ActivationTokenStore {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async save(record: Omit<PersistedActivationTokenRecord, "createdAt" | "usedAt">) {
    const now = Date.now();
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - now) / 1000));
    await this.redis.set(keyFor(record.tokenHash), serializeRecord(record), {
      ex: ttlSeconds,
      nx: true
    });
  }

  async consume(tokenHash: string): Promise<ActivationTokenConsumeResult> {
    const record = await this.redis.getdel<SerializedActivationTokenRecord>(keyFor(tokenHash));
    if (!record) {
      const usedMarker = await this.redis.exists(usedKeyFor(tokenHash));
      return usedMarker ? { status: "used" } : { status: "missing" };
    }

    await this.redis.set(usedKeyFor(tokenHash), "1", {
      ex: USED_TOMBSTONE_SECONDS
    });

    return {
      status: "consumed",
      record: deserializeRecord(record)
    };
  }

  async status(tokenHash: string, now = new Date()): Promise<ActivationTokenStatusResult> {
    const usedMarker = await this.redis.exists(usedKeyFor(tokenHash));
    if (usedMarker) {
      return { status: "used" };
    }

    const record = await this.redis.get<SerializedActivationTokenRecord>(keyFor(tokenHash));
    if (!record) {
      return { status: "missing" };
    }

    const deserialized = deserializeRecord(record);
    if (deserialized.expiresAt <= now) {
      return { status: "expired" };
    }

    return {
      status: "pending",
      record: deserialized
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

  async status(tokenHash: string, now = new Date()): Promise<ActivationTokenStatusResult> {
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

    return {
      status: "pending",
      record: existing
    };
  }
}

export function createInMemoryActivationTokenStore(): ActivationTokenStore {
  return new MemoryActivationTokenStore();
}

export function getActivationTokenStore(): ActivationTokenStore | null {
  const config = getActivationTokenRedisConfig();
  if (!config) {
    return null;
  }

  return new UpstashActivationTokenStore(new Redis(config));
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
