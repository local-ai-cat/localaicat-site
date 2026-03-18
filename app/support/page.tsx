import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Frequently asked questions about Local AI Cat, including offline use, supported devices, billing paths, and how to get help."
};

const supportItems = [
  {
    question: "Does it really work offline?",
    answer:
      "Yes. Once models are downloaded, chat and local transcription work without an internet connection."
  },
  {
    question: "What devices are supported?",
    answer:
      "iPhone with iOS 17+, iPad with iPadOS 17+, and Mac with macOS 14+ on Apple Silicon."
  },
  {
    question: "App Store or direct download?",
    answer:
      "App Store is the easiest install with Apple billing. Direct download gets you full macOS features (like window management), web billing, and is the foundation for Team and Enterprise. The base app is free on both."
  },
  {
    question: "What is Developer Mode?",
    answer:
      "A one-time add-on for power users. It can be bought alone or stacked on Pro. Available on both App Store and direct paths."
  },
  {
    question: "How do teams buy?",
    answer:
      "Use the Team checkout page for self-serve seat-based billing (min 2 seats, volume discounts at 11+). For Enterprise with invoicing, MDM, or custom rollout, contact serious@localaicat.com."
  },
  {
    question: "Need human help?",
    answer:
      "Email support@localaicat.com with your platform, app version, and whether you're on the App Store or direct build."
  }
] as const;

export default function SupportPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="Common questions about offline use, devices, billing, and the difference between install paths."
        kicker="Support"
        title="FAQ"
      >
        <section className="supportGrid">
          {supportItems.map((item) => (
            <article className="faqCard" key={item.question}>
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </article>
          ))}
        </section>
      </ContentPage>
    </SiteShell>
  );
}
