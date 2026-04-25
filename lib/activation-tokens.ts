import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { getActivationTokenSecret } from "./env.ts";

export const ACTIVATION_TOKEN_TTL_SECONDS = 5 * 60;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export type ActivationTokenPayload = {
  v: 1;
  jti: string;
  checkoutId: string;
  customerId: string;
  exp: number;
};

export type ActivationTokenFailureReason = "invalid" | "expired";

type ActivationTokenFailure = {
  ok: false;
  reason: ActivationTokenFailureReason;
};

type ActivationTokenSuccess = {
  ok: true;
  payload: ActivationTokenPayload;
};

function base64urlEncode(input: Buffer) {
  return input.toString("base64url");
}

function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url");
}

function encryptionKey() {
  const secret = getActivationTokenSecret();
  if (!secret) {
    return null;
  }

  return createHash("sha256").update(secret).digest();
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueActivationToken(
  checkoutId: string,
  customerId: string,
  ttlSeconds = ACTIVATION_TOKEN_TTL_SECONDS
) {
  const key = encryptionKey();
  if (!key) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: ActivationTokenPayload = {
    v: 1,
    jti: randomUUID(),
    checkoutId,
    customerId,
    exp: nowSeconds + ttlSeconds
  };

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return base64urlEncode(Buffer.concat([iv, tag, ciphertext]));
}

export function parseActivationToken(token: string): ActivationTokenPayload | null {
  const key = encryptionKey();
  if (!key || !token) {
    return null;
  }

  try {
    const buffer = base64urlDecode(token);
    if (buffer.length <= IV_LENGTH + TAG_LENGTH) {
      return null;
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    const payload = JSON.parse(plaintext.toString("utf8")) as ActivationTokenPayload;
    if (
      payload.v !== 1 ||
      !payload.jti ||
      !payload.checkoutId ||
      !payload.customerId ||
      !payload.exp
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function activationTokenExpiresAt(token: string) {
  const payload = parseActivationToken(token);
  if (!payload) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

export function inspectActivationToken(token: string): ActivationTokenSuccess | ActivationTokenFailure {
  const payload = parseActivationToken(token);
  if (!payload) {
    return { ok: false, reason: "invalid" };
  }

  const expiresAt = payload.exp * 1000;
  if (expiresAt <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    payload
  };
}
