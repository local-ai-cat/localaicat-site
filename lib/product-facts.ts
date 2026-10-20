// The plain facts about the app, in one place: the FAQ, the structured data and llms.txt all quote these,
// so search and answer engines never see two different minimum versions or prices.

export const productName = "Local AI Cat";
/** The App Store lists the app under this name. */
export const appStoreName = "Local AI Chat";

export const minimumSystems = { iOS: "18.2", iPadOS: "18.2", macOS: "15.2" } as const;

export const operatingSystems =
  `iOS ${minimumSystems.iOS}+, iPadOS ${minimumSystems.iPadOS}+, macOS ${minimumSystems.macOS}+ (Apple silicon)`;

export const productSummary =
  "Local AI Cat is a private AI app for Mac, iPhone and iPad. Chat, transcription and translation run on your own device " +
  "with open models: no account, no cloud and no tracking. The core app is free; Pro adds curated models.";

export const supportedDevicesAnswer =
  `iPhone with iOS ${minimumSystems.iOS}+, iPad with iPadOS ${minimumSystems.iPadOS}+, and Mac with macOS ${minimumSystems.macOS}+ ` +
  `on Apple Silicon (M1 or newer). Intel Macs are not supported. On the App Store the app is listed as ${appStoreName}.`;
