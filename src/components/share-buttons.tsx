"use client";

import { useState } from "react";
import { Button, ButtonLink, PixelIcon } from "./pixel";

export function ShareButtons({ url, title, imageUrl }: { url: string; title: string; imageUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title, text: title, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button tone="gold" onClick={share}>
        <PixelIcon name="star" size={18} /> {copied ? "Link copied!" : "Share my path"}
      </Button>
      {imageUrl && (
        <ButtonLink href={imageUrl} tone="ghost" external download>
          <PixelIcon name="camera" size={18} /> Save card image
        </ButtonLink>
      )}
    </div>
  );
}
