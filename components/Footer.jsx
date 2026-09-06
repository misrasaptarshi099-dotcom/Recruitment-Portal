"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LINKS } from "@/constants";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerNav = [
    { name: "Home", href: "/" },
    { name: "All Departments", href: "/departments" },
    { name: "Development Track", href: "/development" },
    { name: "Admin Portal", href: "/admin" },
  ];

  return (
    <footer className="border-t-2 border-border/80 bg-card/60">
      <div className="w-full max-w-[1536px] mx-auto px-4 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border border-border">
              <Image
                src="/assets/gdg.svg"
                alt="GDG Logo"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Google Developer Groups on Campus
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {footerNav.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} GDG on Campus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
