import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "../components/game/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dust Protocol — Browser Arena FPS" },
      {
        name: "description",
        content:
          "Dust Protocol is a fast browser FPS: five original weapons, headshots, armor, reloads and respawning sentinels in a sunbaked scrapyard arena.",
      },
      { property: "og:title", content: "Dust Protocol — Browser Arena FPS" },
      {
        property: "og:description",
        content:
          "Sprint, slide into cover and clear the sentinel line with five original weapons in this browser first-person shooter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameCanvas,
});
