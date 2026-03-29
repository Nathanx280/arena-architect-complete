import { Share2, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

interface ShareConfigProps {
  config: Record<string, unknown>;
}

export function encodeConfig(config: Record<string, unknown>): string {
  try {
    return btoa(JSON.stringify(config));
  } catch {
    return "";
  }
}

export function decodeConfig(hash: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(hash));
  } catch {
    return null;
  }
}

export default function ShareConfig({ config }: ShareConfigProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const encoded = encodeConfig(config);
    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ark_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Config exported as JSON");
  };

  return (
    <div className="flex gap-1.5">
      <Button variant="outline" size="sm" onClick={handleShare} className="text-[10px] font-display gap-1 flex-1">
        {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
        {copied ? "Copied!" : "Share Link"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportJSON} className="text-[10px] font-display gap-1 flex-1">
        <Link className="w-3 h-3" /> Export JSON
      </Button>
    </div>
  );
}
