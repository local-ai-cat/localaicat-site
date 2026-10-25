import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { getPolarAdminKey, getPolarApiBaseUrl } from "../../lib/env";
import { fetchPurrdainStock, purrdainSource, type PurrdainStock } from "../../lib/purrdain";
import { PurrdainSourceCount } from "./source-count";

export const metadata: Metadata = {
  title: "The cat awaits you",
  description: "We met. A year of Local AI Cat Pro, on us.",
  // A page for people holding a card, not for search.
  robots: { index: false, follow: false }
};

type PurrdainPageProps = {
  searchParams: Promise<{ src?: string | string[] }>;
};

/** "437 of 500 left", or nothing when the count can't be read. */
function StockLine({ stock }: { stock: PurrdainStock | null }) {
  if (!stock) {
    return null;
  }
  return (
    <p className="dualCardEyebrow">
      {stock.left} of {stock.total} years of pro left
    </p>
  );
}

export default async function PurrdainPage({ searchParams }: PurrdainPageProps) {
  const { src } = await searchParams;
  const source = purrdainSource(Array.isArray(src) ? src[0] : src);
  const stock = await fetchPurrdainStock({
    adminKey: getPolarAdminKey(),
    apiBaseUrl: getPolarApiBaseUrl()
  });
  const soldOut = stock?.left === 0;

  return (
    <SiteShell siteMode="personal">
      <PurrdainSourceCount source={source} />
      <ContentPage
        kicker="purrdain"
        title="the cat awaits you"
        intro="we met. a year of pro, on us. the cat runs on your device and never phones home; pro unlocks everything it can do."
      >
        <div className="dualCards" style={{ maxWidth: 560 }}>
          <article className="dualCard dualCardStrong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Purrdain, the local ai cat"
              height={150}
              src="/purrdain/purrdain.svg"
              style={{ display: "block", height: "auto", margin: "0 auto 1rem", maxWidth: 172 }}
              width={172}
            />
            <p className="dualCardEyebrow">your code</p>
            <h3>PURRDAIN</h3>
            <StockLine stock={stock} />
            {soldOut ? (
              <p className="dualCardBody">
                all of them found a home. the cat is still free to try, and pro is on the pricing page.
              </p>
            ) : (
              <p className="dualCardBody">
                a year of pro annual, free. the code is already filled in at checkout.
              </p>
            )}
            <div className="dualCardActions">
              {soldOut ? (
                <a className="primaryButton" href="/pricing">
                  see pricing
                </a>
              ) : (
                <a className="primaryButton" href={`/purrdain/checkout?src=${source}`}>
                  claim a year of pro
                </a>
              )}
            </div>
          </article>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
