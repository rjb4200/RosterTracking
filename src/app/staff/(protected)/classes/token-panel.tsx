"use client";

import Image from "next/image";

export function TokenPanel({
  signInUrl,
  qrDataUrl,
  accessPin,
}: {
  signInUrl: string;
  qrDataUrl: string;
  accessPin: string | null;
}) {
  return (
    <div className="token-panel">
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
    </div>
  );
}
