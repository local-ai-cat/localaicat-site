import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Frequently asked questions about Local AI Cat, including offline use, supported devices, billing paths, and how to get help."
};

interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

interface FAQSection {
  readonly title: string;
  readonly items: readonly FAQItem[];
}

const faqSections: readonly FAQSection[] = [
  {
    title: "Getting Started",
    items: [
      {
        question: "What devices are supported?",
        answer:
          "iPhone with iOS 18.2+, iPad with iPadOS 18.2+, and Mac with macOS 15.2+ on Apple Silicon (M1 or newer). Intel Macs are not supported."
      },
      {
        question: "Does it really work offline?",
        answer:
          "Yes. Once models are downloaded, chat and local transcription work entirely offline without an internet connection. Models are downloaded once and stored on your device. No account is required for the free tier."
      },
      {
        question: "How much disk space do models need?",
        answer:
          "It varies by model. Most language models range from 1–17 GB each. You choose which models to download based on your needs and available storage."
      },
      {
        question: "Is my data sent anywhere?",
        answer:
          "No. Everything runs on-device. Your conversations, transcriptions, and model downloads stay on your Mac, iPhone, or iPad. There is no cloud processing."
      }
    ]
  },
  {
    title: "Indoor Cat vs Outdoor Cat",
    items: [
      {
        question: "Indoor Cat or Outdoor Cat?",
        answer:
          "Indoor Cat is the App Store build: easiest install, Apple billing, and support for iPhone, iPad, and Mac. Outdoor Cat is the direct-download Mac build: web billing and the full macOS feature set, including desktop features like window management that are limited in the sandboxed App Store build. The base app is free on both. We recommend Outdoor Cat on Mac for the full feature set."
      },
      {
        question: "Why is the direct download (Outdoor Cat) safe to install?",
        answer:
          "Outdoor Cat is notarized by Apple, cryptographically signed, and has a published SHA-256 hash you can verify. It meets the same security standards as App Store apps but is distributed directly to provide features unavailable in the sandboxed App Store build."
      },
      {
        question: "How do I install Outdoor Cat on Mac?",
        answer:
          "Three options: download the DMG from the localaicat.com homepage, install via Homebrew (brew tap local-ai-cat/tap && brew install --cask local-ai-cat), or use the curl install script (curl -fsSL localaicat.com/install | sh)."
      },
      {
        question: "How do updates work for Outdoor Cat?",
        answer:
          "Outdoor Cat uses Sparkle, an in-app updater. The app checks for updates automatically and notifies you when a new version is available. You can also check manually in Settings."
      }
    ]
  },
  {
    title: "Billing & Licenses",
    items: [
      {
        question: "What does Pro include?",
        answer:
          "Pro unlocks premium features across the app. It's available as £4/month or £40/year on both Indoor Cat (App Store) and Outdoor Cat (direct download). The free tier includes basic chat and transcription."
      },
      {
        question: "What is Developer Mode?",
        answer:
          "A one-time £10 add-on for power users. It unlocks custom model loading and advanced features. It can be bought alone or stacked on Pro. Available on both App Store and direct paths."
      },
      {
        question: "How do I activate a license key for Outdoor Cat?",
        answer:
          "Buy on the pricing page, receive your license key by email, then paste it into Settings → Billing to activate."
      },
      {
        question: "Can I use my license on more than one Mac?",
        answer:
          "License seat limits depend on the plan you purchased. Check your license details in the customer portal or contact support@localaicat.com for clarification."
      },
      {
        question: "How do teams buy?",
        answer:
          "Use the Team checkout page for self-serve seat-based billing (minimum 2 seats, volume discounts at 11+). For Enterprise with invoicing, MDM, or custom rollout, contact serious@localaicat.com."
      }
    ]
  },
  {
    title: "Troubleshooting & Support",
    items: [
      {
        question: "The app won't open on my Mac. What should I try?",
        answer:
          "Make sure you're running macOS 15.2+ on Apple Silicon. If you downloaded Outdoor Cat, right-click the app and choose Open the first time to bypass Gatekeeper. If the issue persists, email support@localaicat.com with your macOS version."
      },
      {
        question: "A model download failed or is stuck. How do I fix it?",
        answer:
          "Check your internet connection and available disk space. You can cancel and restart the download from the model management screen. If the problem persists, delete the partial download from Settings and try again."
      },
      {
        question: "Need human help?",
        answer:
          "Email support@localaicat.com with your platform (Mac, iPhone, or iPad), app version (found in Settings → About), and whether you're on Indoor Cat (App Store) or Outdoor Cat (direct download)."
      }
    ]
  }
] as const;

function buildFAQPageSchema(): object {
  const allItems: FAQItem[] = faqSections.flatMap((section) => [
    ...section.items
  ]);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export default function SupportPage() {
  const schema = buildFAQPageSchema();

  return (
    <SiteShell>
      <ContentPage
        intro="Common questions about offline use, devices, billing, and the difference between install paths."
        kicker="Support"
        title="FAQ"
      >
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          type="application/ld+json"
        />

        {faqSections.map((section) => (
          <section key={section.title}>
            <div className="sectionHeading">
              <h2>{section.title}</h2>
            </div>
            <div className="supportGrid">
              {section.items.map((item) => (
                <article className="faqCard" key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </ContentPage>
    </SiteShell>
  );
}
