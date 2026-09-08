"use client";

import React from "react";
import DinoRunningLoader from "@/components/DinoRunningLoader";

export default function AdminLoading() {
  return (
    <DinoRunningLoader
      badgeText="ADMIN_CONSOLE // LOADING_CANDIDATES"
      statusMessage="Accessing applicant dossiers and recruitment telemetry..."
    />
  );
}
