"use client";

import React from "react";
import DinoRunningLoader from "@/components/DinoRunningLoader";

export default function DepartmentsLoading() {
  return (
    <DinoRunningLoader
      badgeText="DEPARTMENTS // INITIALIZING"
      statusMessage="Loading department skill trees and recruitment tracks..."
    />
  );
}
