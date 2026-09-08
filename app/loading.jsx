"use client";

import React from "react";
import DinoRunningLoader from "@/components/DinoRunningLoader";

export default function Loading() {
  return (
    <DinoRunningLoader
      badgeText="MAINFRAME // LOADING_ROUTE"
      statusMessage="Synchronizing recruitment portal..."
    />
  );
}
