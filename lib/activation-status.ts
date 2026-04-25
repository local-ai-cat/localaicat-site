import {
  getActivationTokenStore,
  type ActivationTokenStore
} from "./activation-token-store.ts";
import {
  hashActivationToken,
  parseActivationToken
} from "./activation-tokens.ts";

type ActivationStatusDeps = {
  store?: ActivationTokenStore | null;
  now?: Date;
};

export type ActivationStatusResponse = {
  status: number;
  body:
    | {
        status: "pending";
        expires_at: string;
      }
    | {
        status: "claimed" | "expired" | "invalid";
      }
    | {
        error: string;
        code: string;
      };
};

function errorResponse(status: number, code: string, message: string): ActivationStatusResponse {
  return {
    status,
    body: {
      error: message,
      code
    }
  };
}

export async function getActivationTokenStatus(
  token: string,
  deps: ActivationStatusDeps = {}
): Promise<ActivationStatusResponse> {
  const payload = parseActivationToken(token);
  if (!payload) {
    return {
      status: 400,
      body: { status: "invalid" }
    };
  }

  const store = deps.store ?? getActivationTokenStore();
  if (!store) {
    return errorResponse(503, "activation_unavailable", "Activation handoff is unavailable.");
  }

  const now = deps.now ?? new Date();
  const statusResult = await store.status(hashActivationToken(token), now);

  switch (statusResult.status) {
  case "used":
    return {
      status: 200,
      body: { status: "claimed" }
    };
  case "missing":
    return {
      status: 404,
      body: { status: payload.exp * 1000 <= now.getTime() ? "expired" : "invalid" }
    };
  case "expired":
    return {
      status: 410,
      body: { status: "expired" }
    };
  case "pending":
    return {
      status: 200,
      body: {
        status: "pending",
        expires_at: statusResult.record.expiresAt.toISOString()
      }
    };
  }
}
