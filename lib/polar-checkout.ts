import { getPolarAdminKey, getPolarApiBaseUrl } from "./env.ts";
import { issuePersistentActivationToken } from "./activation-token-store.ts";

type CheckoutLookupOptions = {
  includeCustomerPortalUrl?: boolean;
};

type PolarCheckout = {
  status?: string;
  customer_id?: string;
};

type PolarCustomerSession = {
  customer_portal_url?: string;
};

type PolarLicenseKey = {
  key?: string;
  status?: string;
};

export type CheckoutSuccessState = {
  checkoutStatus: string | null;
  customerId: string | null;
  customerPortalUrl: string | null;
  licenseKey: string | null;
  activationToken: string | null;
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
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBase}/v1/license-keys?customer_id=${customerId}&limit=10`,
    {
      headers: { Authorization: `Bearer ${adminKey}` },
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
  const activeKey = items.find((item) => item.status === "granted" && item.key);
  return activeKey?.key ?? null;
}

async function createCustomerPortalUrl(
  customerId: string,
  adminKey: string,
  apiBase: string
): Promise<string | null> {
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
  return payload.customer_portal_url ?? null;
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
        activationToken: null
      };
    }

    const licenseKey = await lookupGrantedLicenseKey(customerId, adminKey, apiBase);
    const activationTokenRecord = licenseKey
      ? await issuePersistentActivationToken({
          checkoutId,
          customerId,
          licenseKey
        })
      : null;
    const customerPortalUrl = options.includeCustomerPortalUrl === false
      ? null
      : await createCustomerPortalUrl(customerId, adminKey, apiBase);

    return {
      checkoutStatus,
      customerId,
      customerPortalUrl,
      licenseKey,
      activationToken: activationTokenRecord?.token ?? null
    };
  } catch {
    return null;
  }
}
