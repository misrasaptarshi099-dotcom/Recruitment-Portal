"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { reviews } from "@/constants";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { ArrowRight } from "lucide-react";
import DepartmentTrees from "@/components/DepartmentTrees";
import { PixelBadge, PixelButton } from "@/components/design-system";

export default function DepartmentsListPage() {
  const router = useRouter();
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [closedDepartments, setClosedDepartments] = useState([]);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(true);
  const { submittedDepartments } = useSubmissions();

  // Load public recruitment deadlines and closed department statuses
  useEffect(() => {
    let isMounted = true;
    async function fetchDeadlines() {
      try {
        const res = await fetch("/api/deadlines");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.success && Array.isArray(data.closedDepartments)) {
            setClosedDepartments(data.closedDepartments);
          }
        }
      } catch (err) {
        console.error("Failed to load recruitment deadlines:", err);
      } finally {
        if (isMounted) setIsLoadingDeadlines(false);
      }
    }
    fetchDeadlines();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prune any closed departments if they were previously selected
  useEffect(() => {
    if (closedDepartments.length > 0) {
      setSelectedDepartments((current) =>
        current.filter((name) => !closedDepartments.includes(name))
      );
    }
  }, [closedDepartments]);

  const remainingSlots = Math.max(0, 2 - submittedDepartments.length);

  const selectedIds = useMemo(() => {
    return reviews
      .filter((dept) => selectedDepartments.includes(dept.name))
      .map((dept) => dept.id);
  }, [selectedDepartments]);

  const toggleDepartment = (departmentName) => {
    if (closedDepartments.includes(departmentName)) {
      toast.error(`Applications for ${departmentName} have closed.`);
      return;
    }

    if (submittedDepartments.includes(departmentName)) {
      toast.error(`You have already submitted an application for ${departmentName}.`);
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("You have already submitted the maximum allowed (2) applications.");
      return;
    }

    setSelectedDepartments((current) => {
      const isSelected = current.includes(departmentName);

      if (isSelected) {
        return current.filter((name) => name !== departmentName);
      }

      if (current.length >= remainingSlots) {
        toast.error(`You can select at most ${remainingSlots} department(s).`);
        return current;
      }

      return [...current, departmentName];
    });
  };

  const hasClosedSelected = selectedDepartments.some((d) => closedDepartments.includes(d));
  const canProceed = selectedDepartments.length > 0 && !hasClosedSelected;

  const goToApplication = () => {
    if (!selectedIds.length) return;
    const closedSelected = selectedDepartments.filter((d) => closedDepartments.includes(d));
    if (closedSelected.length > 0) {
      toast.error(`Applications for ${closedSelected.join(", ")} have closed.`);
      setSelectedDepartments((current) => current.filter((d) => !closedDepartments.includes(d)));
      return;
    }
    router.push(`/join/${selectedIds.join("/")}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border/50 pb-8">
            <div>
              <div className="mb-3">
                <PixelBadge variant="technical">
                  STEP 01 // DUAL-TREE EXPLORER
                </PixelBadge>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Choose Your Tracks
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                Select up to <strong className="text-foreground">two</strong> specialized departments from our technical and creative trees to launch your application.
              </p>
            </div>

            {/* Selection Progress Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 border-2 border-border shadow-pixel-sm">
              <div className="flex flex-col text-center sm:text-left">
                <span className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  TRACKS SELECTED
                </span>
                <span className="font-display text-base font-bold text-foreground">
                  {selectedDepartments.length} / {remainingSlots} SLOTS
                </span>
              </div>

              <PixelButton
                variant="technical"
                onClick={goToApplication}
                disabled={!canProceed}
                size="md"
                trailingIcon={ArrowRight}
              >
                PROCEED TO FORM
              </PixelButton>
            </div>
          </div>

          {/* Dual Department Trees */}
          <DepartmentTrees
            departmentsData={reviews}
            selectedDepartments={selectedDepartments}
            submittedDepartments={submittedDepartments}
            closedDepartments={closedDepartments}
            onToggleDepartment={toggleDepartment}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
