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
      "Yes. Once models are downloaded, chat and local transcription continue to work without an internet connection."
  },
  {
    question: "What devices are supported?",
    answer:
      "iPhone with iOS 17+, iPad with iPadOS 17+, and Mac with macOS 14+ on Apple Silicon."
  },
  {
    question: "What is the difference between App Store and direct download?",
    answer:
      "The App Store route is the easiest install. The direct-download route is where Paddle billing, Team plans, Enterprise rollout, and the fuller Mac capability set belong."
  },
  {
    question: "What is Developer Mode?",
    answer:
      "Developer Mode is a separate one-time add-on that can be bought alone or stacked on top of Pro."
  },
  {
    question: "How should teams and enterprises buy?",
    answer:
      "Small groups should use Team when available. Organizations needing invoicing, procurement, deployment help, or rollout support should contact Enterprise."
  },
  {
    question: "Need human help?",
    answer:
      "Email support@localaicat.com and include your platform, app version, and whether you are using the App Store or direct-download build."
  }
] as const;

export default function SupportPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Answers to the most common questions about offline use, supported devices, billing paths, and the difference between App Store and direct-download builds."
        kicker="Support"
        title="Help for Local AI Cat"
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
