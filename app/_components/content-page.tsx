import Link from "next/link";
import type { ReactNode } from "react";

type ContentPageProps = {
  kicker: string;
  title: string;
  intro: string;
  meta?: string;
  callout?: ReactNode;
  children: ReactNode;
};

export function ContentPage({
  kicker,
  title,
  intro,
  meta,
  callout,
  children
}: ContentPageProps) {
  return (
    <section className="contentPage">
      <div className="contentHero">
        <Link className="contentBack" href="/">
          Back to home
        </Link>
        <p className="contentKicker">{kicker}</p>
        <h1 className="contentTitle">{title}</h1>
        {meta ? <p className="contentMeta">{meta}</p> : null}
        <p className="contentIntro">{intro}</p>
        {callout ? <div className="contentCallout">{callout}</div> : null}
      </div>

      <div className="contentStack">{children}</div>
    </section>
  );
}
