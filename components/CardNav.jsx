"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import "./CardNav.css";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function CardNav({
  logo,
  logoAlt = "Logo",
  brandTitle = "GDG on Campus",
  items = [],
  ctaButton,
  className = "",
  ease = "power3.out",
  baseColor,
  menuColor,
}) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 60;

    const contentEl = navEl.querySelector(".card-nav-content");
    if (contentEl) {
      const wasVisible = contentEl.style.visibility;
      const wasPointerEvents = contentEl.style.pointerEvents;
      const wasPosition = contentEl.style.position;
      const wasHeight = contentEl.style.height;

      contentEl.style.visibility = "visible";
      contentEl.style.pointerEvents = "auto";
      contentEl.style.position = "static";
      contentEl.style.height = "auto";

      const contentHeight = contentEl.scrollHeight;

      contentEl.style.visibility = wasVisible;
      contentEl.style.pointerEvents = wasPointerEvents;
      contentEl.style.position = wasPosition;
      contentEl.style.height = wasHeight;

      const topBar = 60;
      const padding = 16;
      return topBar + contentHeight + padding;
    }
    return 320;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: "hidden" });
    const cards = cardsRef.current.filter(Boolean);
    gsap.set(cards, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.35,
      ease,
    });

    if (cards.length > 0) {
      tl.to(
        cards,
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          ease,
          stagger: 0.06,
        },
        "-=0.15"
      );
    }

    return tl;
  };

  useIsomorphicLayoutEffect(() => {
    const tl = createTimeline();
    if (isExpanded && tl) {
      const newHeight = calculateHeight();
      gsap.set(navRef.current, { height: newHeight });
      tl.progress(1);
    }
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [ease, items]);

  useIsomorphicLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const closeMenu = () => {
    const tl = tlRef.current;
    if (isExpanded && tl) {
      setIsHamburgerOpen(false);
      tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const setCardRef = (i) => (el) => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav
        ref={navRef}
        className={`card-nav ${isExpanded ? "open" : ""}`}
        style={baseColor ? { backgroundColor: baseColor } : undefined}
      >
        <div className="card-nav-top">
          <div className="logo-container">
            {logo}
            {brandTitle && (
              <span className="font-display font-bold text-sm tracking-tight text-foreground">
                {brandTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ctaButton}

            <button
              type="button"
              className={`hamburger-menu ${isHamburgerOpen ? "open" : ""}`}
              onClick={toggleMenu}
              aria-label={isExpanded ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isExpanded}
              style={menuColor ? { color: menuColor } : undefined}
            >
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 4).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{
                backgroundColor: item.bgColor || "hsl(var(--card))",
                color: item.textColor || "hsl(var(--card-foreground))",
              }}
            >
              <div className="nav-card-label">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <Link
                    key={`${lnk.label}-${i}`}
                    className="nav-card-link"
                    href={lnk.href}
                    onClick={closeMenu}
                    aria-label={lnk.ariaLabel || lnk.label}
                  >
                    <span>{lnk.label}</span>
                    <ArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
