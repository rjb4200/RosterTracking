"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function TokenPanel({
  signInUrl,
  qrDataUrl,
  accessPin,
}: {
  signInUrl: string;
  qrDataUrl: string;
  accessPin: string | null;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div id="student-access" className="token-panel" ref={panel}>
      <p>Display this stable link or QR code for student sign-in.</p>
      <a href={signInUrl}>{signInUrl}</a>
      {accessPin ? <p>Student PIN: {accessPin}</p> : null}
      <Image
        src={qrDataUrl}
        alt="Class sign-in QR code"
        width={240}
        height={240}
        unoptimized
      />
      <div className="admin-actions">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(signInUrl);
            setCopied(true);
          }}
        >
          {copied ? "Link copied" : "Copy sign-in link"}
        </Button>
        <Button
          type="button"
          onClick={() => panel.current?.requestFullscreen()}
        >
          Full-screen QR
        </Button>
      </div>
    </div>
  );
}
