import {
  getActivationTokenStore,
  type ActivationTokenStore
} from "./activation-token-store.ts";
import {
  hashActivationToken,
  inspectActivationToken
} from "./activation-tokens.ts";

type RedeemActivationTokenDeps = {
  store?: ActivationTokenStore | null;
};

export type ActivationRedeemResponse = {
  status: number;
  body:
    | {
        checkout_id: string;
        customer_id: string;
        license_key: string;
      }
    | {
        error: string;
        code: string;
      };
};

function errorResponse(status: number, code: string, message: string): ActivationRedeemResponse {
  return {
    status,
    body: {
      error: message,
      code
    }
  };
}

export async function redeemActivationToken(
  token: string,
  deps: RedeemActivationTokenDeps = {}
): Promise<ActivationRedeemResponse> {
  const inspection = inspectActivationToken(token);
  if (!inspection.ok) {
    switch (inspection.reason) {
    case "expired":
      return errorResponse(410, "activation_token_expired", "Activation token expired.");
    case "invalid":
    default:
      return errorResponse(400, "activation_token_invalid", "Activation token is invalid.");
    }
  }

  const store = deps.store ?? getActivationTokenStore();
  if (!store) {
    return errorResponse(503, "activation_unavailable", "Activation handoff is unavailable.");
  }

  const consumeResult = await store.consume(hashActivationToken(token));
  switch (consumeResult.status) {
  case "missing":
    return errorResponse(400, "activation_token_invalid", "Activation token is invalid.");
  case "expired":
    return errorResponse(410, "activation_token_expired", "Activation token expired.");
  case "used":
    return errorResponse(409, "activation_token_used", "Activation token has already been used.");
  case "consumed": {
    const record = consumeResult.record;

    if (
      record.jti !== inspection.payload.jti ||
      record.checkoutId !== inspection.payload.checkoutId ||
      record.customerId !== inspection.payload.customerId
    ) {
      return errorResponse(403, "activation_customer_mismatch", "Checkout customer does not match activation token.");
    }

    return {
      status: 200,
      body: {
        checkout_id: record.checkoutId,
        customer_id: record.customerId,
        license_key: record.licenseKey
      }
    };
  }
  }
}
