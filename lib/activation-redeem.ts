import type { ActivationTokenStore } from "./activation-token-store.ts";
import { MANUAL_ACTIVATION_MESSAGE } from "./license-activation.ts";

type RedeemActivationTokenDeps = { store?: ActivationTokenStore | null };
export type ActivationRedeemResponse = { status: number; body: { error: string; code: string } };

/** Retire even previously issued bearers until the app supports a verified handoff. */
export async function redeemActivationToken(
  _token: string,
  _deps: RedeemActivationTokenDeps = {}
): Promise<ActivationRedeemResponse> {
  return { status: 410, body: { error: MANUAL_ACTIVATION_MESSAGE, code: "manual_activation_required" } };
}
