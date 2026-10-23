"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { NexaLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/me", label: "My future", match: ["/me", "/start"] },
  { href: "/org", label: "Organisation", match: ["/org"] },
];

export function TopBar({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="nx-no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 md:px-8">
        <Link href="/" className="nx-focus" aria-label="Nexa home">
          <NexaLogo size={24} />
        </Link>
        <nav className="flex items-center gap-1" aria-label="App">
          {LINKS.map((link) => {
            const active = link.match.some((prefix) => pathname.startsWith(prefix));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "nx-focus inline-flex min-h-9 items-center rounded-lg px-3 text-[14px] transition-colors",
                  active ? "bg-ink text-paper" : "text-ink-2 hover:bg-stone/70 hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
