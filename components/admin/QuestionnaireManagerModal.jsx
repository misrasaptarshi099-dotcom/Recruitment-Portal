"use client";

import React, { useState, useEffect } from "react";
import { PixelCard, PixelButton } from "@/components/design-system";
import {
  HelpCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  X,
  Loader2,
  Building2,
  Sparkles,
  Layers,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { departmentsData } from "@/constants/departments-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionnaireManagerModal({
  isOpen,
  onClose,
  onUpdated,
  allowedDepartments = [],
  isSuperAdmin = false,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionnairesMap, setQuestionnairesMap] = useState({});
  const [availableDepts, setAvailableDepts] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");

  // Working questions list for currently selected department
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [defaultQuestionsForDept, setDefaultQuestionsForDept] = useState([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [metaInfo, setMetaInfo] = useState({ updatedAt: null, updatedBy: null });

  const allowedDeptsKey = Array.isArray(allowedDepartments) ? allowedDepartments.join(",") : "";

  useEffect(() => {
    if (!isOpen) return;

    async function fetchQuestionnaires() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/questions");
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.questionnaires || [];

          // Map list by department name
          const map = {};
          list.forEach((item) => {
            map[item.department] = item;
          });
          setQuestionnairesMap(map);

          const allDepts = departmentsData.map((d) => d.name);
          const depts = isSuperAdmin
            ? allDepts
            : allowedDepartments && allowedDepartments.length > 0
            ? allowedDepartments
            : json.allowedDepartments || allDepts;

          setAvailableDepts(depts);

          const initialDept = depts[0] || "Management";
          setSelectedDept(initialDept);

          const initialData = map[initialDept];
          if (initialData) {
            setCurrentQuestions(
              (initialData.questions || []).map((q, i) => ({
                id: q.id || `q_${i + 1}`,
                name: q.name || "",
                type: q.type || "generic",
                placeholder: q.placeholder || "",
              }))
            );
            setDefaultQuestionsForDept(initialData.defaultQuestions || []);
            setIsCustomized(Boolean(initialData.isCustomized));
            setMetaInfo({
              updatedAt: initialData.updatedAt,
              updatedBy: initialData.updatedBy,
            });
          }
        }
      } catch (err) {
        console.error("Error loading questionnaires:", err);
        toast.error("Failed to load questionnaires");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestionnaires();
  }, [isOpen, isSuperAdmin, allowedDeptsKey, allowedDepartments]);

  const handleDepartmentChange = (deptName) => {
    setSelectedDept(deptName);
    const data = questionnairesMap[deptName];
    if (data) {
      setCurrentQuestions(
        (data.questions || []).map((q, i) => ({
          id: q.id || `q_${i + 1}`,
          name: q.name || "",
          type: q.type || "generic",
          placeholder: q.placeholder || "",
        }))
      );
      setDefaultQuestionsForDept(data.defaultQuestions || []);
      setIsCustomized(Boolean(data.isCustomized));
      setMetaInfo({
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      });
    }
  };

  const handleQuestionChange = (index, field, value) => {
    setCurrentQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddQuestion = () => {
    setCurrentQuestions((prev) => [
      ...prev,
      {
        id: `q_${prev.length + 1}_${Date.now()}`,
        name: "",
        type: "generic",
        placeholder: "Candidate answer...",
      },
    ]);
  };

  const handleDeleteQuestion = (index) => {
    if (currentQuestions.length <= 1) {
      toast.error("A department must have at least one question.");
      return;
    }
    setCurrentQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentQuestions.length) return;
    setCurrentQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleResetToDefault = () => {
    if (!defaultQuestionsForDept || defaultQuestionsForDept.length === 0) {
      toast.error("No default questions found for this department.");
      return;
    }
    setCurrentQuestions(
      defaultQuestionsForDept.map((q, i) => ({
        id: `def_${i + 1}`,
        name: q.name || "",
        type: q.type || "generic",
        placeholder: q.placeholder || "",
      }))
    );
    toast.info("Reset to department defaults. Click 'Save Questionnaire' to commit.");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDept) {
      toast.error("Please select a department first.");
      return;
    }

    // Validate that no question has blank text or duplicate names
    const seenNames = new Set();
    for (let i = 0; i < currentQuestions.length; i++) {
      const trimmed = (currentQuestions[i].name || "").trim();
      if (!trimmed) {
        toast.error(`Question #${i + 1} cannot have empty text.`);
        return;
      }
      const lower = trimmed.toLowerCase();
      if (seenNames.has(lower)) {
        toast.error(`Question #${i + 1} has duplicate text: "${trimmed}". All questions must be unique.`);
        return;
      }
      seenNames.add(lower);
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: selectedDept,
          questions: currentQuestions,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update questions");
      }

      toast.success(`Questionnaire for "${selectedDept}" saved successfully!`);

      // Update local state map
      setQuestionnairesMap((prev) => ({
        ...prev,
        [selectedDept]: {
          ...prev[selectedDept],
          questions: json.data?.questions || currentQuestions,
          isCustomized: true,
          updatedAt: json.data?.updatedAt,
          updatedBy: json.data?.updatedBy,
        },
      }));
      setIsCustomized(true);
      setMetaInfo({
        updatedAt: json.data?.updatedAt,
        updatedBy: json.data?.updatedBy,
      });

      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error saving questions:", err);
      toast.error(err.message || "Failed to save questionnaire");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <div className="relative w-full max-w-2xl h-[85vh] max-h-[85vh] flex flex-col rounded-2xl border-2 border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-border/80 px-6 py-4 bg-card/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                <span>ROUND 01 // FORM QUESTIONNAIRE</span>
                {isCustomized ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Customized
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-muted/60 text-muted-foreground border border-border/60">
                    Default
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Add, edit, or remove application form questions per department
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 min-h-0 flex flex-col p-6 space-y-4 overflow-hidden">
            {/* Department Picker Skeleton */}
            <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>

            {/* Questions Header Skeleton */}
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-24" />
            </div>

            {/* Question Cards Skeletons */}
            <div className="flex-1 space-y-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-8 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons Skeleton */}
            <div className="pt-2 flex justify-end gap-3 border-t border-border/40">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Scrollable Content Body with Visible Custom Scrollbar */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain custom-scrollbar custom-scrollbar-blue">
              {/* Department Picker */}
              <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>Select Department</span>
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {isSuperAdmin ? "Super Admin Access · All Departments" : "Your Assigned Department(s)"}
                  </span>
                </div>
                <select
                  value={selectedDept}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground cursor-pointer"
                >
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {metaInfo.updatedAt && (
                  <p className="text-[10px] font-mono text-muted-foreground pt-1.5">
                    Last modified: {new Date(metaInfo.updatedAt).toLocaleString()}{" "}
                    {metaInfo.updatedBy ? `by ${metaInfo.updatedBy}` : ""}
                  </p>
                )}
              </div>

              {/* Questions List Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedDept} Questions ({currentQuestions.length})
                </span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Restore default questions for this department"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset to Default</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-3.5">
                {currentQuestions.map((q, index) => (
                  <div
                    key={q.id || index}
                    className="p-3.5 bg-card/60 border border-border/70 rounded-xl space-y-2.5 transition-colors hover:border-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center h-5 w-5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold border border-blue-500/30">
                          {index + 1}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-foreground/90">
                          Question #{index + 1}
                        </span>
                      </div>

                      {/* Question Type Selector & Actions */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={q.type || "generic"}
                          onChange={(e) => handleQuestionChange(index, "type", e.target.value)}
                          className="bg-muted/40 border border-border/60 text-[11px] font-mono rounded px-2 py-0.5 text-foreground focus:outline-none"
                        >
                          <option value="generic">Paragraph (Textarea)</option>
                          <option value="short-text">Short Text (Single Line)</option>
                          <option value="long-text">Long Essay</option>
                        </select>

                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveQuestion(index, -1)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                          title="Move question up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={index === currentQuestions.length - 1}
                          onClick={() => handleMoveQuestion(index, 1)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                          title="Move question down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(index)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div>
                      <textarea
                        rows={2}
                        value={q.name}
                        onChange={(e) => handleQuestionChange(index, "name", e.target.value)}
                        placeholder="Type question prompt here..."
                        className="w-full bg-background border border-border/80 px-3 py-1.5 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground resize-none"
                        required
                      />
                    </div>

                    {/* Placeholder Hint */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        Placeholder:
                      </span>
                      <input
                        type="text"
                        value={q.placeholder || ""}
                        onChange={(e) => handleQuestionChange(index, "placeholder", e.target.value)}
                        placeholder="e.g. 2-3 sentences or project links..."
                        className="w-full bg-background border border-border/80 px-2.5 py-1 text-[11px] font-mono rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 border-2 border-dashed border-border/80 hover:border-blue-500/60 rounded-xl text-xs font-mono font-semibold text-muted-foreground hover:text-blue-400 flex items-center justify-center gap-2 transition-all cursor-pointer bg-muted/10 hover:bg-blue-500/5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Question to {selectedDept}</span>
              </button>
            </div>

            {/* Pinned Action Bar at Bottom */}
            <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-3.5 border-t border-border/80 bg-card/95 backdrop-blur-sm z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono rounded-lg border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <PixelButton
                type="submit"
                variant="blue"
                size="sm"
                disabled={saving}
                className="font-mono text-xs gap-1.5 cursor-pointer shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Questionnaire...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Questionnaire</span>
                  </>
                )}
              </PixelButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
