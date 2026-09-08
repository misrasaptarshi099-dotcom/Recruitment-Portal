"use client";

import React from "react";
import DinoRunningLoader from "@/components/DinoRunningLoader";

export default function ProfileLoading() {
  return (
    <DinoRunningLoader
      badgeText="CANDIDATE_PORTAL // LOADING"
      statusMessage="Loading candidate profile and stage progress..."
    />
  );
}
