'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import loginPhoto from '@/app/assets/login.png';

export function AuthLayout({
  heading,
  subtitle,
  children,
}: {
  heading: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-y-auto bg-white font-sans lg:h-screen lg:overflow-hidden">
      {/* Left panel */}
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:min-h-0 lg:w-1/2 lg:px-14 lg:py-12">
        <div className="w-full max-w-[380px]">
          {/* Heading */}
          <h1 className="mb-1.5 text-center text-[26px] leading-[1.2] font-extrabold tracking-[-0.04em] text-slate-900">
            {heading}
          </h1>
          <p className="mb-7 text-center text-[13.5px] leading-none font-normal text-zinc-500">
            {subtitle}
          </p>

          {children}
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden overflow-hidden lg:block lg:w-1/2">
        {/* Shimmer skeleton */}
        <div
          className={`absolute inset-0 z-10 bg-[linear-gradient(110deg,#d4d4d8_25%,#e4e4e7_50%,#d4d4d8_75%)] bg-[length:200%_100%] transition-opacity duration-700 ${
            imgLoaded
              ? 'pointer-events-none opacity-0'
              : 'animate-[shimmer_1.4s_infinite] opacity-100'
          }`}
        />
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        {/* Photo */}
        <Image
          src={loginPhoto}
          alt="Car spa workshop"
          fill
          priority
          sizes="50vw"
          quality={80}
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          className={`object-cover object-center transition-opacity duration-700 ease-in-out ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImgLoaded(true)}
        />

        {/* Gradient scrim */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/82 via-black/18 to-black/5" />

        {/* Bottom overlay */}
        <div className="absolute right-0 bottom-0 left-0 z-30 p-8 pb-9">
          <h2 className="mb-2.5 text-[27px] leading-[1.2] font-extrabold tracking-[-0.04em] text-white">
            One Platform
            <br />
            Every Operation.
          </h2>

          <p className="mb-5 max-w-[290px] text-[13px] leading-[1.65] text-white/70">
            Admins, Employees, and Customers on one platform — manage vehicles, inventory, and
            workshop operations in real time.
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/45 bg-black/30 px-3.5 py-2.5 backdrop-blur-md">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 opacity-90"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              <span className="text-[12px] leading-[1.4] font-semibold text-white">
                Real-time vehicle
                <br />
                task tracking
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/45 bg-black/30 px-3.5 py-2.5 backdrop-blur-md">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 opacity-90"
              >
                <rect x="3" y="7" width="18" height="12" rx="2" />
                <path d="M3 11h18" />
                <path d="M8 15h8" />
              </svg>
              <span className="text-[12px] leading-[1.4] font-semibold text-white">
                Inventory &amp; POS
                <br />
                management
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
