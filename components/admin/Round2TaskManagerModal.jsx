"use client";

import React, { useState, useEffect } from "react";
import { PixelCard, PixelButton } from "@/components/design-system";
import {
  FileCode2,
  ExternalLink,
  Save,
  X,
  Loader2,
  Building2,
  RotateCcw,
  Clock,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { departmentsData } from "@/constants/departments-data";

const COMMON_DELIVERABLES = [
  "GitHub Repository",
  "Live Deployment (Vercel/Netlify)",
  "Figma File Link",
  "Google Drive Folder",
  "Google Docs / Notion / PDF Deck",
  "Demo APK / Video Recording",
  "Jupyter / Colab Notebook",
  "PDF / Markdown Report",
];

export default function Round2TaskManagerModal({
  isOpen,
  onClose,
  onUpdated,
  allowedDepartments = [],
  isSuperAdmin = false,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasksMap, setTasksMap] = useState({});
  const [availableDepts, setAvailableDepts] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");

  // Working task fields for currently selected department
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskDocumentUrl, setTaskDocumentUrl] = useState("");
  const [taskDocumentTitle, setTaskDocumentTitle] = useState("");
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [customDeliverable, setCustomDeliverable] = useState("");
  const [deadline, setDeadline] = useState("48 Hours from Assignment");
  const [defaultTaskForDept, setDefaultTaskForDept] = useState(null);
  const [isCustomized, setIsCustomized] = useState(false);
  const [metaInfo, setMetaInfo] = useState({ updatedAt: null, updatedBy: null });

  const allowedDeptsKey = Array.isArray(allowedDepartments) ? allowedDepartments.join(",") : "";

  useEffect(() => {
    if (!isOpen) return;

    async function fetchTasksConfig() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/round2-config");
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.tasks || [];

          const map = {};
          list.forEach((item) => {
            map[item.department] = item;
          });
          setTasksMap(map);

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
            setTitle(initialData.title || "");
            setDescription(initialData.description || "");
            setTaskDocumentUrl(initialData.taskDocumentUrl || "");
            setTaskDocumentTitle(initialData.taskDocumentTitle || "");
            setDeliverableTypes(initialData.deliverableTypes || []);
            setDeadline(initialData.deadline || "48 Hours from Assignment");
            setDefaultTaskForDept(initialData.defaultTask || null);
            setIsCustomized(Boolean(initialData.isCustomized));
            setMetaInfo({
              updatedAt: initialData.updatedAt,
              updatedBy: initialData.updatedBy,
            });
          }
        }
      } catch (err) {
        console.error("Error loading Round 2 task config:", err);
        toast.error("Failed to load Round 2 configurations");
      } finally {
        setLoading(false);
      }
    }

    fetchTasksConfig();
  }, [isOpen, isSuperAdmin, allowedDeptsKey, allowedDepartments]);

  const handleDepartmentChange = (deptName) => {
    setSelectedDept(deptName);
    const data = tasksMap[deptName];
    if (data) {
      setTitle(data.title || "");
      setDescription(data.description || "");
      setTaskDocumentUrl(data.taskDocumentUrl || "");
      setTaskDocumentTitle(data.taskDocumentTitle || "");
      setDeliverableTypes(data.deliverableTypes || []);
      setDeadline(data.deadline || "48 Hours from Assignment");
      setDefaultTaskForDept(data.defaultTask || null);
      setIsCustomized(Boolean(data.isCustomized));
      setMetaInfo({
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      });
    }
  };

  const handleToggleDeliverable = (item) => {
    setDeliverableTypes((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  const handleAddCustomDeliverable = (e) => {
    e.preventDefault();
    const val = customDeliverable.trim();
    if (!val) return;
    if (!deliverableTypes.includes(val)) {
      setDeliverableTypes((prev) => [...prev, val]);
    }
    setCustomDeliverable("");
  };

  const handleRemoveDeliverable = (item) => {
    setDeliverableTypes((prev) => prev.filter((d) => d !== item));
  };

  const handleResetToDefault = () => {
    if (!defaultTaskForDept) {
      toast.error("No default task available for this department.");
      return;
    }
    setTitle(defaultTaskForDept.title || "");
    setDescription(defaultTaskForDept.description || "");
    setTaskDocumentUrl("");
    setTaskDocumentTitle("");
    setDeliverableTypes(defaultTaskForDept.deliverableTypes || []);
    setDeadline(defaultTaskForDept.deadline || "48 Hours from Assignment");
    toast.info("Restored default task prompt. Click 'Save Task Configuration' to commit.");
  };

  const handleTestLink = () => {
    const url = taskDocumentUrl.trim();
    if (!url) {
      toast.error("Please enter a link first");
      return;
    }
    try {
      new URL(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Invalid URL format. Please start with https://");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDept) {
      toast.error("Please select a department first.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Task title cannot be empty.");
      return;
    }

    const trimmedUrl = taskDocumentUrl.trim();
    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        toast.error("Please enter a valid HTTP/HTTPS link.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        department: selectedDept,
        title: trimmedTitle,
        description: description.trim(),
        taskDocumentUrl: trimmedUrl || null,
        taskDocumentTitle: taskDocumentTitle.trim() || null,
        deliverableTypes: deliverableTypes.length > 0 ? deliverableTypes : ["Project Link / GitHub / Google Drive"],
        deadline: deadline.trim() || "48 Hours from Assignment",
      };

      const res = await fetch("/api/admin/round2-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update Round 2 task");
      }

      toast.success(`Round 2 Task for "${selectedDept}" saved successfully!`);

      setTasksMap((prev) => ({
        ...prev,
        [selectedDept]: {
          ...prev[selectedDept],
          ...payload,
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
      console.error("Error saving Round 2 task:", err);
      toast.error(err.message || "Failed to save Round 2 task configuration");
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
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                <span>ROUND 02 // TASK & MATERIALS</span>
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
                Configure department practical task prompt, Drive link, and deliverables
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono text-muted-foreground">Loading task configurations...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain custom-scrollbar custom-scrollbar-emerald">
                {/* Department Picker */}
                <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Select Department</span>
                    </label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {isSuperAdmin ? "Super Admin Access · All Departments" : "Your Assigned Department(s)"}
                    </span>
                  </div>
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground cursor-pointer"
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

                {/* Reset to Default Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset to Department Default</span>
                  </button>
                </div>

                {/* Task Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Full-Stack Micro-Feature Trial"
                    className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                  />
                </div>

                {/* Task Description / Instructions */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    Task Instructions / Requirements Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what candidates are expected to build, architecture choices, or instructions..."
                    className="w-full bg-background border border-border/80 p-3 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground resize-none"
                  />
                </div>

                {/* Task Document / Google Drive Link Section */}
                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>Google Drive / Task Materials Link</span>
                    </div>
                    {taskDocumentUrl && (
                      <button
                        type="button"
                        onClick={handleTestLink}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                    Upload your task PDF, document, or starter repo to Google Drive (or OneDrive/Notion/Dropbox) and paste the share link below.
                  </p>

                  <div className="space-y-2">
                    <div>
                      <input
                        type="url"
                        value={taskDocumentUrl}
                        onChange={(e) => setTaskDocumentUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/... or https://..."
                        className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        Link Label:
                      </span>
                      <input
                        type="text"
                        value={taskDocumentTitle}
                        onChange={(e) => setTaskDocumentTitle(e.target.value)}
                        placeholder="e.g. Round 2 Task Brief (Google Drive)"
                        className="w-full bg-background border border-border/80 px-2.5 py-1 text-[11px] font-mono rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                      />
                    </div>
                  </div>

                  {/* Share Permission Reminder */}
                  <div className="flex items-start gap-2 bg-background/60 border border-emerald-500/20 p-2.5 rounded-lg text-[10px] font-mono text-muted-foreground">
                    <HelpCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sharing Setting Reminder:</strong> In Google Drive, ensure General Access is set to{" "}
                      <span className="text-emerald-400 font-semibold">&quot;Anyone with the link can view&quot;</span> so candidates can download materials immediately.
                    </span>
                  </div>
                </div>

                {/* Deliverable Types */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    Expected Deliverables
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_DELIVERABLES.map((item) => {
                      const isSelected = deliverableTypes.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleDeliverable(item)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-400 font-medium"
                              : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Deliverable Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customDeliverable}
                      onChange={(e) => setCustomDeliverable(e.target.value)}
                      placeholder="Add other deliverable type..."
                      className="flex-1 bg-background border border-border/80 px-2.5 py-1 text-xs font-mono rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDeliverable}
                      className="px-3 py-1 text-xs font-mono rounded border border-border hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Active Deliverables Chips */}
                  {deliverableTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {deliverableTypes.map((type) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-card border border-border rounded text-foreground"
                        >
                          <span>{type}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDeliverable(type)}
                            className="text-muted-foreground hover:text-rose-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deadline Duration String */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Task Duration / Submission Window</span>
                  </label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    placeholder="e.g. 48 Hours from Assignment"
                    className="w-full bg-background border border-border/80 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                  />
                </div>
              </div>

              {/* Pinned Action Bar */}
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
                  variant="emerald"
                  size="sm"
                  disabled={saving}
                  className="font-mono text-xs gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Task Config...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Task Configuration</span>
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
