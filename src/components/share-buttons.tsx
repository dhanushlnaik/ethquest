"use client";

import { useState } from "react";
import { Button, ButtonLink, PixelIcon } from "./pixel";

/** Native share / copy link, plus direct X and Farcaster posts. The URL carries the share image (OG tags). */
export function ShareButtons({ url, title, imageUrl, label = "Share" }: { url: string; title: string; imageUrl?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title, text: title, url });
      await navigator.clipboard.writeText(`${title} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const x = `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const fc = `https://warpcast.com/~/compose?text=${encodeURIComponent(title)}&embeds[]=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button tone="gold" size="sm" onClick={share}>
        <PixelIcon name="star" size={16} /> {copied ? "Link copied!" : label}
      </Button>
      <ButtonLink href={x} tone="ghost" size="sm" external data-track="social"><PixelIcon name="x" size={16} /> Post on X</ButtonLink>
      <ButtonLink href={fc} tone="ghost" size="sm" external data-track="social"><PixelIcon name="discord" size={16} /> Farcaster</ButtonLink>
      {imageUrl && (
        <ButtonLink href={imageUrl} tone="ghost" size="sm" external download>
          <PixelIcon name="camera" size={16} /> Save image
        </ButtonLink>
      )}
    </div>
  );
}
