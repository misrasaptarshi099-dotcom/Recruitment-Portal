"use client";

import React from "react";

/**
 * Department and Feature Showcase Card
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.bgColor
 * @param {React.ComponentType} props.Icon
 */
export default function Card({ title, description, bgColor = "#3B82F6", Icon }) {
  return (
    <div className="group relative h-80 w-64 cursor-pointer">
      <div className="absolute inset-0 rounded-2xl bg-card border border-border/60 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl" />

      <div
        className="relative z-10 flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-white transition-transform duration-300 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        <div className="absolute -right-3 -top-3 text-white/10 transition-transform duration-300 group-hover:scale-110">
          {Icon && <Icon size={120} />}
        </div>

        <div className="relative z-10">
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-white/90 leading-relaxed line-clamp-4">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
