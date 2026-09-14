import { FeaturesSection } from "@/components/marketing/features-section";
import { GamesSection } from "@/components/marketing/games-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { LocationSection } from "@/components/marketing/location-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ScreensSection } from "@/components/marketing/screens-section";
import {
  getCafeSettingsPublic,
  getPublicGames,
  getPublicPricing,
} from "@/lib/actions/bookings";
import type { Game } from "@/lib/types/database";

async function safeGames(): Promise<Game[]> {
  try {
    return (await getPublicGames()) as Game[];
  } catch {
    return [];
  }
}

async function safePricing() {
  try {
    return await getPublicPricing("PS5");
  } catch {
    return [];
  }
}

async function safeSettings() {
  try {
    return await getCafeSettingsPublic();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [games, pricing, settings] = await Promise.all([
    safeGames(),
    safePricing(),
    safeSettings(),
  ]);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ScreensSection />
      <GamesSection games={games} />
      <PricingSection pricing={pricing} />
      <LocationSection settings={settings} />
    </>
  );
}
