"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Code,
  Smartphone,
  Database,
  Cloud,
  Coins,
  Gamepad2,
  Terminal,
  Palette,
  Layout,
  Briefcase,
  Megaphone,
  Share2,
  CheckCircle2,
  Circle,
  Layers,
  ArrowRight,
  GitBranch,
  Cpu,
} from "lucide-react";
import { PixelBadge, PixelButton } from "@/components/design-system";

/* ─────────────────────────────────────────────
   Static Data
   ───────────────────────────────────────────── */
const departmentIcons = {
  "Web Dev": Code, "App Dev": Smartphone, "Data Science": Database,
  "Cloud & DevOps": Cloud, Blockchain: Coins, "Game Dev": Gamepad2,
  "Competitive Programming": Terminal, Design: Palette, "UI/UX": Layout,
  Management: Briefcase, Publicity: Megaphone, Outreach: Share2,
};

const technicalDepts = [
  { name: "Web Dev", code: "T-01", cat: "Technical", tone: "#4285F4", tagline: "High-Performance Modern Web & Distributed Systems", skills: ["Next.js","React","TypeScript","Node.js","Tailwind"] },
  { name: "App Dev", code: "T-02", cat: "Technical", tone: "#EA4335", tagline: "Cross-Platform Mobile Experiences & Native Android", skills: ["Flutter","Kotlin","React Native","Swift","State Sync"] },
  { name: "Data Science", code: "T-03", cat: "Technical", tone: "#FBBC04", tagline: "AI/ML Engineering, Neural Models & Predictive Analytics", skills: ["PyTorch","TensorFlow","Computer Vision","NLP","Pandas"] },
  { name: "Cloud & DevOps", code: "T-04", cat: "Technical", tone: "#0F9D58", tagline: "Scalable Infrastructure, Containerization & CI/CD", skills: ["Docker","Kubernetes","AWS","GCP","GitHub Actions"] },
  { name: "Blockchain", code: "T-05", cat: "Technical", tone: "#4285F4", tagline: "Smart Contracts, Web3 Protocols & Decentralized Apps", skills: ["Solidity","Hardhat","Ethers.js","DeFi","Foundry"] },
  { name: "Game Dev", code: "T-06", cat: "Technical", tone: "#EA4335", tagline: "Interactive 2D/3D Mechanics, Physics & Game Production", skills: ["Unity (C#)","Godot","Blender","Unreal Engine","GLSL"] },
  { name: "Competitive Programming", code: "T-07", cat: "Technical", tone: "#0F9D58", tagline: "Advanced Problem-Solving, Data Structures & Algorithm Design", skills: ["C++","Dynamic Programming","Graph Theory","Codeforces"] },
];

const nonTechDepts = [
  { name: "Design", code: "C-01", cat: "Creative", tone: "#0F9D58", tagline: "Brand Identity, Visual Art, Event Graphics & Merchandise", skills: ["Adobe Illustrator","Photoshop","Typography","Visual Systems"] },
  { name: "UI/UX", code: "C-02", cat: "Creative", tone: "#4285F4", tagline: "User-Centered Interaction Design, Wireframing & Design Tokens", skills: ["Figma","Design Systems","Prototyping","User Research"] },
  { name: "Management", code: "C-03", cat: "Operations", tone: "#FBBC04", tagline: "Flagship Hackathon Execution, Operations & Team Leadership", skills: ["Event Operations","Crisis Handling","Budgeting","Timelines"] },
  { name: "Publicity", code: "C-04", cat: "Media", tone: "#EA4335", tagline: "Motion Graphics, Video Production & Virality Campaigns", skills: ["Premiere Pro","After Effects","Reels & Storytelling","Social"] },
  { name: "Outreach", code: "C-05", cat: "Corporate", tone: "#4285F4", tagline: "Corporate Sponsorships, Industry Speakers & Community Ties", skills: ["Pitch Decks","Negotiation","PR & Outreach","Networking"] },
];

/* ─────────────────────────────────────────────
   Single Branch + Card component
   Each branch has its own scroll-trigger ref.
   As it enters the viewport the branch line
   grows from 0 → full width, then the card
   pixelates into view at the tip.
   ───────────────────────────────────────────── */
function TreeBranch({
  dept, index, side, description,
  isSelected, isSubmitted, onToggle,
}) {
  const branchRef = useRef(null);
  const Icon = departmentIcons[dept.name] || Layers;

  // Scroll-driven progress for THIS branch
  const { scrollYProgress } = useScroll({
    target: branchRef,
    offset: ["start 0.92", "start 0.55"],
  });

  const smoothProg = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  // Branch line grows from 0% → 100% width
  const branchWidth = useTransform(smoothProg, [0, 0.5], ["0%", "100%"]);
  // Card fades + scales in after branch reaches ~40%
  const cardOpacity = useTransform(smoothProg, [0.35, 0.7], [0, 1]);
  const cardScale = useTransform(smoothProg, [0.35, 0.7], [0.85, 1]);
  const cardY = useTransform(smoothProg, [0.35, 0.7], [30, 0]);
  // Joint node appears with the branch
  const nodeScale = useTransform(smoothProg, [0.4, 0.6], [0, 1]);

  const isLeft = side === "left";

  return (
    <div
      ref={branchRef}
      className={cn(
        "relative flex items-start gap-0",
        isLeft ? "flex-row" : "flex-row-reverse",
        "min-h-[220px]"
      )}
    >
      {/* ── Branch line + joint node ── */}
      <div className={cn(
        "hidden lg:flex items-center shrink-0 relative",
        isLeft ? "justify-end" : "justify-start",
        "w-16 xl:w-24"
      )}>
        {/* Growing branch line */}
        <motion.div
          className="absolute top-[38px] h-[3px]"
          style={{
            width: branchWidth,
            backgroundColor: dept.tone,
            ...(isLeft
              ? { right: 0, transformOrigin: "right center" }
              : { left: 0, transformOrigin: "left center" }
            ),
            boxShadow: `0 0 8px ${dept.tone}55`,
          }}
        />
        {/* Glowing circuit joint */}
        <motion.div
          className="absolute top-[32px] z-10"
          style={{
            scale: nodeScale,
            ...(isLeft ? { right: -6 } : { left: -6 }),
          }}
        >
          <div className="relative">
            <div
              className="h-3.5 w-3.5 border-2"
              style={{ borderColor: dept.tone, backgroundColor: isSelected ? dept.tone : "var(--background)" }}
            />
            <div
              className="absolute inset-0 animate-ping opacity-30"
              style={{ backgroundColor: dept.tone }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Department card (pixelates in) ── */}
      <motion.button
        type="button"
        aria-pressed={isSelected}
        disabled={isSubmitted}
        style={{
          opacity: cardOpacity,
          scale: cardScale,
          y: cardY,
        }}
        onClick={() => !isSubmitted && onToggle(dept.name)}
        className={cn(
          "relative flex-1 p-5 sm:p-6 border-2 transition-colors duration-200 select-none cursor-pointer group/card w-full text-left",
          isSubmitted
            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
            : isSelected
            ? "border-foreground bg-foreground/5 shadow-pixel ring-2 ring-primary/20"
            : "border-border/80 bg-card hover:border-foreground/70 shadow-pixel-sm hover:shadow-pixel"
        )}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: dept.tone }} />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3 pt-1">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center border text-white"
              style={{ backgroundColor: dept.tone, borderColor: dept.tone }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  BRANCH {dept.code}
                </span>
                <span className="text-muted-foreground/40 text-[10px]">•</span>
                <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {dept.cat}
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover/card:text-primary transition-colors">
                {dept.name}
              </h3>
            </div>
          </div>

          {/* Selection state */}
          <div className="shrink-0">
            {isSubmitted ? (
              <span className="inline-flex items-center gap-1.5 bg-muted px-2 py-1 font-display text-[10px] font-semibold text-muted-foreground border border-border">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> SUBMITTED
              </span>
            ) : isSelected ? (
              <span className="inline-flex items-center gap-1.5 bg-foreground text-background px-2.5 py-1 font-display text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> SELECTED
              </span>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center border-2 border-border text-transparent group-hover/card:border-foreground transition-colors">
                <Circle className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Tagline */}
        <p className="font-display text-xs sm:text-sm font-semibold text-foreground/90 mb-1.5">{dept.tagline}</p>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">{description}</p>

        {/* Skill chips */}
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/40">
          {dept.skills.map((s) => (
            <span key={s} className="px-2 py-0.5 bg-muted/60 text-[11px] font-mono text-muted-foreground border border-border/50">{s}</span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-display font-semibold text-muted-foreground">
          <span>{isSubmitted ? "COMPLETED" : isSelected ? "SLOT FILLED — READY" : "CLICK TO SELECT"}</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover/card:translate-x-1 transition-transform" />
        </div>
      </motion.button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Central Trunk SVG
   Draws a vertical line that grows as you
   scroll through the tree container.
   ───────────────────────────────────────────── */
function CentralTrunk({ scrollProgress, color = "#535353" }) {
  const pathLength = useSpring(scrollProgress, { stiffness: 60, damping: 30 });

  return (
    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[3px] pointer-events-none z-0">
      <svg className="w-full h-full" preserveAspectRatio="none">
        {/* Ghost track */}
        <line x1="1.5" y1="0" x2="1.5" y2="100%" stroke="rgba(140,140,140,0.15)" strokeWidth="3" strokeDasharray="6 6" />
        {/* Growing trunk */}
        <motion.line
          x1="1.5" y1="0" x2="1.5" y2="100%"
          stroke={color}
          strokeWidth="3"
          style={{ pathLength }}
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export default function DepartmentTrees({
  departmentsData = [],
  selectedDepartments = [],
  submittedDepartments = [],
  onToggleDepartment,
}) {
  const treeRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const { scrollYProgress } = useScroll({
    target: treeRef,
    offset: ["start 0.85", "end 0.7"],
  });

  const getDeptDesc = (name) => {
    const found = departmentsData.find(
      (d) => d.name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return found?.description || "Build impactful projects with the community.";
  };

  // Interleave left/right: tech on left, non-tech on right, matched by index
  const maxLen = Math.max(technicalDepts.length, nonTechDepts.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push({ left: technicalDepts[i] || null, right: nonTechDepts[i] || null });
  }

  return (
    <div className="relative w-full py-8">
      {/* ─── Header / Root Node ─── */}
      <div className="text-center mb-6 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-border bg-card shadow-pixel-sm mb-4">
            <Cpu className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="font-display text-[10px] sm:text-xs font-bold tracking-widest text-foreground uppercase">
              ROOT NODE // GDG ON CAMPUS
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            The Department Trees
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Scroll down to grow the branches. Each branch reveals a department track at its tip.
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <PixelButton size="sm" variant={activeFilter === "all" ? "primary" : "outline"} onClick={() => setActiveFilter("all")} icon={GitBranch}>
            ALL BRANCHES (12)
          </PixelButton>
          <PixelButton size="sm" variant={activeFilter === "technical" ? "technical" : "outline"} onClick={() => setActiveFilter("technical")} icon={Code}>
            TECHNICAL (7)
          </PixelButton>
          <PixelButton size="sm" variant={activeFilter === "non-technical" ? "creative" : "outline"} onClick={() => setActiveFilter("non-technical")} icon={Palette}>
            NON-TECHNICAL (5)
          </PixelButton>
        </div>
      </div>

      {/* ─── Bough headers ─── */}
      {activeFilter === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-16 mb-8 px-0 lg:px-4">
          <div className="p-4 border-2 border-blue-500/40 bg-blue-500/5 shadow-pixel-blue">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center bg-blue-500 text-white"><Code className="h-4 w-4" /></div>
                <h3 className="font-display text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">Technical Tree</h3>
              </div>
              <PixelBadge variant="technical">7 TRACKS</PixelBadge>
            </div>
          </div>
          <div className="p-4 border-2 border-emerald-500/40 bg-emerald-500/5 shadow-pixel-green">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center bg-emerald-500 text-white"><Palette className="h-4 w-4" /></div>
                <h3 className="font-display text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">Non-Technical Tree</h3>
              </div>
              <PixelBadge variant="creative">5 TRACKS</PixelBadge>
            </div>
          </div>
        </div>
      )}

      {/* ─── The Tree (with growing trunk + branches) ─── */}
      <div ref={treeRef} className="relative">
        {/* Central trunk (only in "all" view) */}
        {activeFilter === "all" && (
          <CentralTrunk scrollProgress={scrollYProgress} color="#535353" />
        )}

        {/* ── "all" view: interleaved rows ── */}
        {activeFilter === "all" && (
          <div className="space-y-8 lg:space-y-10">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-16 px-0 lg:px-4">
                {/* Left (technical) */}
                <div>
                  {row.left && (
                    <TreeBranch
                      dept={row.left}
                      index={i}
                      side="left"
                      description={getDeptDesc(row.left.name)}
                      isSelected={selectedDepartments.includes(row.left.name)}
                      isSubmitted={submittedDepartments.includes(row.left.name)}
                      onToggle={onToggleDepartment}
                    />
                  )}
                </div>
                {/* Right (non-technical) */}
                <div>
                  {row.right && (
                    <TreeBranch
                      dept={row.right}
                      index={i}
                      side="right"
                      description={getDeptDesc(row.right.name)}
                      isSelected={selectedDepartments.includes(row.right.name)}
                      isSubmitted={submittedDepartments.includes(row.right.name)}
                      onToggle={onToggleDepartment}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtered: single column ── */}
        {activeFilter === "technical" && (
          <div className="max-w-3xl mx-auto space-y-8">
            {technicalDepts.map((dept, i) => (
              <TreeBranch
                key={dept.name}
                dept={dept}
                index={i}
                side="left"
                description={getDeptDesc(dept.name)}
                isSelected={selectedDepartments.includes(dept.name)}
                isSubmitted={submittedDepartments.includes(dept.name)}
                onToggle={onToggleDepartment}
              />
            ))}
          </div>
        )}

        {activeFilter === "non-technical" && (
          <div className="max-w-3xl mx-auto space-y-8">
            {nonTechDepts.map((dept, i) => (
              <TreeBranch
                key={dept.name}
                dept={dept}
                index={i}
                side="right"
                description={getDeptDesc(dept.name)}
                isSelected={selectedDepartments.includes(dept.name)}
                isSubmitted={submittedDepartments.includes(dept.name)}
                onToggle={onToggleDepartment}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Ground root terminal ─── */}
      <div className="mt-14 pt-6 border-t-2 border-dashed border-border/60 text-center relative z-10">
        <div className="inline-flex items-center gap-2 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          <Cpu className="h-3 w-3 text-amber-500" />
          <span>TREE GROUNDED // SELECT YOUR TRACKS</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedDepartments.length === 0
            ? "Click any department card above to reserve a slot."
            : `Selected (${selectedDepartments.length}/2): ${selectedDepartments.join(", ")}`}
        </p>
      </div>
    </div>
  );
}
