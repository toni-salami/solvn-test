import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings · solvn seller" },
      { name: "description", content: "Manage your account and preferences." },
      { property: "og:title", content: "Settings · solvn seller" },
      { property: "og:description", content: "Manage your account and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsComingSoon,
});

function SettingsComingSoon() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-dashed p-10 text-center">
        <Settings className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Settings — coming soon</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account preferences, notifications, and payout settings will appear here.
        </p>
      </div>
    </div>
  );
}
