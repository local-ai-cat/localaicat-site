"use client";

import Link from "next/link";
import { PersonalPlans } from "../_components/personal-plans";
import { useSiteMode } from "../_components/site-mode";

export function PricingExperience({ checkoutUnavailable = false }: { checkoutUnavailable?: boolean }) {
  const [mode] = useSiteMode();
  return (
    <section className="contentPage purchasePage">
      <div className="contentHero">
        <h1 className="contentTitle">Free core. Fair upgrades.</h1>
        <p className="contentIntro">Start with free chat, transcription and local models. Add Pro or Developer Mode whenever you need them.</p>
      </div>
      {checkoutUnavailable && <p className="checkoutUnavailable" role="status">Checkout is temporarily unavailable. Your card has not been charged. Please try again later.</p>}
      <PersonalPlans />
      <div className="pricingHelp">
        <h2>One app. Two ways to get it.</h2>
        <p>Buying here gives you a license key to enter in the app. If you prefer Apple billing, you can buy upgrades inside the App Store app.</p>
        <Link href={`/pricing/app-store?mode=${mode}`}>About App Store purchases</Link>
      </div>
    </section>
  );
}
