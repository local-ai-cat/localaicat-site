import { getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import {
  issuePersistentActivationToken,
  type ActivationTokenStore
} from "./activation-token-store.ts";

type CheckoutLookupOptions = {
  includeCustomerPortalUrl?: boolean;
  activationTokenStore?: ActivationTokenStore | null;
};

type PolarCheckout = {
  status?: string;
  customer_id?: string;
};

type PolarCustomerSession = {
  token?: string;
  customer_portal_url?: string;
};

type PolarLicenseKey = {
  key?: string;
  status?: string;
  created_at?: string;
};

export type CheckoutSuccessState = {
  checkoutStatus: string | null;
  customerId: string | null;
  customerPortalUrl: string | null;
  licenseKey: string | null;
  activationToken: string | null;
  activationTokenExpiresAt: string | null;
};

function isConfirmedCheckout(status: string | undefined) {
  return status === "confirmed" || status === "succeeded";
}

async function fetchCheckout(
  checkoutId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarCheckout | null> {
  const response = await fetch(`${apiBase}/v1/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PolarCheckout;
}

async function lookupGrantedLicenseKey(
  customerSessionToken: string,
  apiBase: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBase}/v1/customer-portal/license-keys?limit=20`,
    {
      headers: { Authorization: `Bearer ${customerSessionToken}` },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    items?: PolarLicenseKey[];
    result?: PolarLicenseKey[];
  };
  const items = payload.items ?? payload.result ?? [];
  const activeKey = items
    .filter((item) => item.status === "granted" && item.key)
    .sort((left, right) => {
      const leftCreatedAt = Date.parse(left.created_at ?? "");
      const rightCreatedAt = Date.parse(right.created_at ?? "");
      return (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0)
        - (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0);
    })[0];
  return activeKey?.key ?? null;
}

async function createCustomerSession(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<PolarCustomerSession | null> {
  const response = await fetch(`${apiBase}/v1/customer-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ customer_id: customerId }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as PolarCustomerSession;
  return payload;
}

export async function resolveCheckoutSuccessState(
  checkoutId: string,
  options: CheckoutLookupOptions = {}
): Promise<CheckoutSuccessState | null> {
  try {
    const adminKey = getPolarAdminKey();
    if (!adminKey) {
      return null;
    }

    const apiBase = getPolarApiBaseUrl();
    const checkout = await fetchCheckout(checkoutId, adminKey, apiBase);
    if (!checkout) {
      return null;
    }

    const checkoutStatus = checkout.status ?? null;
    const customerId = checkout.customer_id ?? null;
    if (!isConfirmedCheckout(checkout.status) || !customerId) {
      return {
        checkoutStatus,
        customerId,
        customerPortalUrl: null,
        licenseKey: null,
        activationToken: null,
        activationTokenExpiresAt: null
      };
    }

    const customerSession = await createCustomerSession(customerId, adminKey, apiBase);
    const licenseKey = customerSession?.token
      ? await lookupGrantedLicenseKey(customerSession.token, apiBase)
      : null;
    const activationTokenRecord = licenseKey
      ? await issuePersistentActivationToken({
          checkoutId,
          customerId,
          licenseKey
        }, options.activationTokenStore)
      : null;
    const customerPortalUrl = options.includeCustomerPortalUrl === false
      ? null
      : customerSession?.customer_portal_url ?? null;

    return {
      checkoutStatus,
      customerId,
      customerPortalUrl,
      licenseKey,
      activationToken: activationTokenRecord?.token ?? null,
      activationTokenExpiresAt: activationTokenRecord?.expiresAt.toISOString() ?? null
    };
  } catch {
    return null;
  }
}
