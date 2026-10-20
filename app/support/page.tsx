import type { Metadata } from "next";
import { supportedDevicesAnswer } from "../../lib/product-facts";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "FAQ: offline use, devices, pricing and licenses",
  description:
    "Answers about Local AI Cat: offline use, supported devices, how it compares with ChatGPT and Ollama, pricing, licenses and getting help."
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
        answer: supportedDevicesAnswer
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
    title: "How it compares",
    items: [
      {
        question: "How is Local AI Cat different from ChatGPT?",
        answer:
          "ChatGPT runs in the cloud, so your messages go to OpenAI's servers. Local AI Cat runs open models on your own Mac, iPhone or iPad: chats and recordings never leave the device, it works offline, and there's no account. Cloud models are bigger; local ones are private and always there."
      },
      {
        question: "How is it different from Ollama or LM Studio?",
        answer:
          "Ollama and LM Studio are model runners for desktop computers, mostly used by developers and enthusiasts. Local AI Cat is an everyday app: chat, transcription, translation and Mac tools in one native app, on iPhone and iPad too. On the Mac, Outdoor Cat also offers a local OpenAI-compatible API, and Developer Mode loads compatible models from Hugging Face."
      },
      {
        question: "Is Local AI Cat free?",
        answer:
          "Yes. Chat, transcription and local models are free, with no account and no trial clock. Pro (£4/month or £40/year) adds curated Pro models and early access to new features; Developer Mode is a £10 one-time unlock."
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
          "Pro adds curated Pro models, Developer Mode while you're subscribed, and early access to new features. It's £4/month or £40/year on both Indoor Cat (App Store) and Outdoor Cat (direct download). The free app already includes chat, transcription and local models."
      },
      {
        question: "What is Developer Mode?",
        answer:
          "A one-time £10 add-on for power users. It unlocks custom model loading and advanced features. It can be bought alone or stacked on Pro. Available on both App Store and direct paths."
      },
      {
        question: "How do I activate a license key for Outdoor Cat?",
        answer:
          "Buy on the pricing page. The success page shows your license key: copy it, then paste it into Settings → Activate License in the app. The key also stays in the customer portal."
      },
      {
        question: "Can I use my license on more than one Mac?",
        answer:
          "Yes, up to 5 Macs per license key. Removing the license from a Mac frees its slot, and the customer portal lists every activation. On Team, every person has their own seat and key. Questions: support@localaicat.com."
      },
      {
        question: "I bought Team. Do I need Pro for myself too?",
        answer:
          "No. Assign yourself one of your seats in the customer portal: a seat is full Pro access with its own key. A second subscription on the same email isn't possible, because each email holds one. Developer Mode is a one-time purchase, so you can still add it on the same email."
      },
      {
        question: "How do teams buy?",
        answer:
          "The Team page sells seats from 2 upwards: £40 per seat per year, £35 from 11 seats and £30 from 26. After checkout you assign each seat by email in the customer portal, including one for yourself if you need it, and each person gets their own license key. For Enterprise with invoicing, MDM, or custom rollout, contact serious@localaicat.com."
      }
    ]
  },
  {
    title: "Troubleshooting & Support",
    items: [
      {
        question: "The app won't open on my Mac. What should I try?",
        answer:
          "Make sure you're running macOS 15.2+ on Apple Silicon. If you downloaded Outdoor Cat, move it from the disk image into Applications before opening it. If the issue persists, email support@localaicat.com with your macOS version."
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
