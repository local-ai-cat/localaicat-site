export const directPlans = [
  {
    name: "Pro Monthly",
    price: "£4",
    cadence: "/month",
    note: "Outdoor Cat monthly plan for the full Mac feature set.",
    bullets: ["Full Pro access", "Web billing", "Best for trying Outdoor Cat"],
    ctaHref: "/buy/pro-monthly",
    ctaLabel: "Buy monthly"
  },
  {
    name: "Pro Annual",
    price: "£40",
    cadence: "/year",
    note: "The main Outdoor Cat direct-download plan.",
    bullets: ["Same Pro access", "Lower yearly cost", "Best for regular Mac use"],
    ctaHref: "/buy/pro-annual",
    ctaLabel: "Buy annual"
  },
  {
    name: "Developer Mode",
    price: "£10",
    cadence: "one-time",
    note: "Optional and stackable.",
    bullets: ["Custom model loading", "Works with or without Pro", "Power-user features"],
    ctaHref: "/buy/developer-mode",
    ctaLabel: "Unlock Developer Mode"
  }
] as const;

export const businessPlans = [
  {
    name: "Team",
    price: "from £40",
    cadence: "/seat/year",
    note: "Seat-based access for small teams.",
    bullets: ["Minimum 2 seats", "Seat billing", "Built on Outdoor Cat"],
    ctaHref: "/team",
    ctaLabel: "Get started"
  },
  {
    name: "Enterprise",
    price: "custom",
    cadence: "",
    note: "Deployment, invoicing, and support.",
    bullets: [".pkg and managed rollout", "Procurement and invoicing", "Support for serious cat business"],
    ctaHref: "/contact",
    ctaLabel: "Contact sales"
  }
] as const;

export const appStorePlans = [
  {
    name: "Pro Monthly",
    price: "£4",
    cadence: "/month",
    note: "Indoor Cat monthly plan handled through Apple.",
    bullets: ["Simple install", "Apple billing", "Best for iPhone, iPad, or Mac App Store"]
  },
  {
    name: "Pro Annual",
    price: "£40",
    cadence: "/year",
    note: "Indoor Cat annual plan handled through Apple.",
    bullets: ["Same Pro access", "Lower yearly cost", "Full iPhone and iPad path"]
  },
  {
    name: "Developer Mode",
    price: "£10",
    cadence: "one-time",
    note: "Indoor Cat one-time add-on handled through Apple.",
    bullets: ["Optional add-on", "Stacks with Pro", "For advanced features"]
  }
] as const;
