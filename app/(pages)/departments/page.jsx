"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { reviews } from "@/constants";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Circle, AlertCircle, Layers } from "lucide-react";

// Extracted outside to ensure stable React component identity across renders
function DepartmentSelectCard({
  dept,
  isSelected,
  isSubmitted,
  onToggle,
}) {
  const Icon = dept.icon;

  return (
    <div
      onClick={() => !isSubmitted && onToggle(dept.name)}
      className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
        isSubmitted
          ? "border-border/40 bg-muted/40 opacity-60 cursor-not-allowed"
          : isSelected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 cursor-pointer"
          : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card/90 hover:shadow-md cursor-pointer"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: dept.tone || "#3B82F6" }}
          >
            {Icon ? <Icon className="h-6 w-6 fill-current" /> : <Layers className="h-6 w-6" />}
          </div>

          <div>
            {isSubmitted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Submitted
              </span>
            ) : isSelected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Selected
              </span>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-transparent group-hover:border-primary/60">
                <Circle className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {dept.name}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {dept.description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Maximum 2 selections</span>
        <span className={isSelected ? "text-primary font-bold" : ""}>
          {isSubmitted ? "Completed" : isSelected ? "Ready to apply" : "Click to select"}
        </span>
      </div>
    </div>
  );
}

export default function DepartmentsListPage() {
  const router = useRouter();
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const { submittedDepartments } = useSubmissions();

  const remainingSlots = Math.max(0, 2 - submittedDepartments.length);

  const selectedIds = useMemo(() => {
    return reviews
      .filter((dept) => selectedDepartments.includes(dept.name))
      .map((dept) => dept.id);
  }, [selectedDepartments]);

  const toggleDepartment = (departmentName) => {
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

  const goToApplication = () => {
    if (!selectedIds.length) return;
    router.push(`/join/${selectedIds.join("/")}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border/50 pb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 border border-blue-500/20 mb-3">
                <span>Step 01</span>
                <span>·</span>
                <span>Department Selection</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Pick your departments
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                Select up to <strong className="text-foreground">two</strong> departments you would like to apply for. You will answer department-specific questions on the next screen.
              </p>
            </div>

            {/* Action Card */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/60 border border-border/60 p-4 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Selection Progress
                </span>
                <span className="text-lg font-bold text-foreground">
                  {selectedDepartments.length} / {remainingSlots} Selected
                </span>
              </div>

              <Button
                onClick={goToApplication}
                disabled={selectedDepartments.length === 0}
                size="lg"
                className="rounded-full gap-2 px-6 shadow-sm w-full sm:w-auto"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((dept) => (
              <DepartmentSelectCard
                key={dept.id}
                dept={dept}
                isSelected={selectedDepartments.includes(dept.name)}
                isSubmitted={submittedDepartments.includes(dept.name)}
                onToggle={toggleDepartment}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
