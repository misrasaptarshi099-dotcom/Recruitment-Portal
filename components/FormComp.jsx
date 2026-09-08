"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as z from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { QuestionnaireData } from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { Send, Loader2, ArrowLeft, CheckCircle2, User, HelpCircle, Wifi, WifiOff } from "lucide-react";
import { saveDraftAsync, loadDraftAsync, removeDraftAsync, createDraftQueue } from "@/lib/draft-store";
import { Skeleton } from "./ui/skeleton";

const normaliseQuestion = (question) => (
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question
);

export default function FormComp({ dept1, dept2, isLoading, setIsLoading }) {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();

  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } = useSubmissions();
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored. Auto-saving draft.", {
        icon: <Wifi className="h-4 w-4 text-emerald-500" />,
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Internet disconnected. Offline mode active — draft is saved on this device.", {
        icon: <WifiOff className="h-4 w-4 text-amber-500" />,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const departmentNames = useMemo(
    () =>
      [dept1, dept2]
        .filter(Boolean)
        .map((department) => (typeof department === "string" ? department : department.name)),
    [dept1, dept2]
  );

  const draftKey = user?.email && departmentNames.length
    ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
    : null;

  const [dynamicQuestionnaires, setDynamicQuestionnaires] = useState(QuestionnaireData);

  useEffect(() => {
    let isMounted = true;
    async function fetchLatestQuestions() {
      try {
        const res = await fetch("/api/questions");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && Array.isArray(json?.questions) && json.questions.length > 0) {
            setDynamicQuestionnaires(json.questions);
          }
        }
      } catch (err) {
        console.warn("Notice: Using default questionnaire data:", err?.message || err);
      }
    }
    fetchLatestQuestions();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizeDeptName = (str) =>
    str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

  const questionData = useMemo(
    () => [
      ...new Set(
        departmentNames.flatMap((department) =>
          (
            dynamicQuestionnaires.find(
              (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
            )?.questions ?? []
          )
            .map(normaliseQuestion)
            .map((question) => question.name)
        )
      ),
    ],
    [departmentNames, dynamicQuestionnaires]
  );

  // Memoize Zod validation schema to avoid reconstructing it on every render
  const formSchema = useMemo(() => {
    const schemaObj = {
      Name: z.string().min(1, "Name is required"),
      RegistrationNumber: z
        .string()
        .min(1, "Registration number is required")
        .regex(
          /^\d{2}[A-Z]{3}\d{4}$/,
          "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)"
        ),
      Gender: z.string().optional(),
      Email: z.string(),
      Phone: z
        .string()
        .optional()
        .refine((val) => !val || /^\d{10}$/.test(val), {
          message: "Phone number must be exactly 10 digits",
        }),
      "Year of Study": z.string().optional(),
      "Why do you want to join Organization Name?": z.string().optional(),
    };

    questionData.forEach((qd) => {
      schemaObj[qd] = z.string().optional();
    });

    return z.object(schemaObj);
  }, [questionData]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: user?.name || "",
      RegistrationNumber: "",
      Gender: "",
      Email: user?.email || "",
      Phone: "",
      "Year of Study": "",
      "Why do you want to join Organization Name?": "",
    },
  });

  // Restore saved draft asynchronously via IndexedDB (with localStorage fallback)
  useEffect(() => {
    if (isPending || !user || !draftKey) return;

    const email = user.email;
    let isActive = true;

    async function initDraftAndCheck() {
      try {
        const savedDraft = await loadDraftAsync(draftKey);
        if (isActive && savedDraft?.values) {
          if (!form.formState.isDirty) {
            form.reset({
              ...form.getValues(),
              ...savedDraft.values,
              Email: email,
              Name: savedDraft.values?.Name || user.name || "",
            });
          }
        } else if (isActive && !form.formState.isDirty) {
          form.setValue("Email", email);
        }
      } catch {
        if (isActive && !form.formState.isDirty) form.setValue("Email", email);
      }

      let remoteSubmitted = contextSubmitted || [];

      if (!remoteSubmitted.length) {
        try {
          const res = await fetch(`/api/check-applications?email=${encodeURIComponent(email)}`);
          const result = await res.json();
          if (result?.submittedDepartments) {
            remoteSubmitted = result.submittedDepartments;
          }
        } catch (err) {
          console.error("Failed to check applications:", err);
        }
      }

      if (!isActive) return;
      setSubmittedDepartments(remoteSubmitted);
      if (departmentNames.length > 0 && departmentNames.every((d) => remoteSubmitted.includes(d))) {
        setErrorMessage(`You have already submitted an application for ${departmentNames.join(" and ")}.`);
      }
      setIsDraftReady(true);
    }

    initDraftAndCheck();

    return () => {
      isActive = false;
    };
  }, [contextSubmitted, departmentNames, draftKey, form, isPending, user]);

  // Debounced auto-save draft asynchronously via IndexedDB (prevents main thread stutter)
  const watchedValues = useWatch({ control: form.control });
  const saveTimeoutRef = useRef(null);
  const draftQueueRef = useRef(null);
  const isSubmittedRef = useRef(false);

  if (!draftQueueRef.current) {
    draftQueueRef.current = createDraftQueue();
  }

  useEffect(() => {
    if (!isDraftReady || !draftKey || isSubmittedRef.current || isSubmitting) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (isSubmittedRef.current) return;
      draftQueueRef.current
        .enqueue(draftKey, {
          values: watchedValues,
          submittedDepartments,
        })
        .catch((err) => {
          console.error("Failed to auto-save draft:", err);
        });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draftKey, isDraftReady, isSubmitting, submittedDepartments, watchedValues]);

  const handleSubmit = async (values) => {
    if (!isOnline) {
      toast.error("Network connection offline. Please reconnect before submitting your application.", {
        icon: <WifiOff className="h-4 w-4 text-amber-500" />,
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const pendingDepartments = departmentNames.filter(
      (department) => !submittedDepartments.includes(department)
    );

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    const cleanStr = (s) => (typeof s === "string" ? s.replace(/<[^>]+>/g, "").trim() : s);

    const basicDetails = {
      Name: cleanStr(values.Name),
      RegistrationNumber: cleanStr(values.RegistrationNumber).toUpperCase(),
      Gender: cleanStr(values.Gender || ""),
      Email: cleanStr(values.Email),
      Phone: cleanStr(values.Phone || ""),
      "Year of Study": cleanStr(values["Year of Study"] || ""),
      "Why do you want to join Organization Name?":
        cleanStr(values["Why do you want to join Organization Name?"] || ""),
    };

    const getFieldValue = (name) => {
      // 1. Try reading directly from form state
      try {
        const val = form.getValues(name);
        if (typeof val === "string" && val.trim()) return val;
      } catch {}

      if (!values || !name) return "";

      // 2. Direct top-level lookup
      if (values[name] !== undefined && typeof values[name] === "string") {
        return values[name];
      }

      // 3. Dot-delimited path lookup for React Hook Form's automatic dot-nesting
      const parts = name.split(".");
      let cur = values;
      for (const part of parts) {
        if (cur == null) break;
        cur = cur[part];
      }
      if (typeof cur === "string") return cur;

      return "";
    };

    const submitDepartment = async (department) => {
      const questions = (
        dynamicQuestionnaires.find(
          (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
        )?.questions ?? []
      ).map(normaliseQuestion);

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: department,
          Questions: questions.reduce(
            (answers, question) => ({
              ...answers,
              [question.name]: cleanStr(getFieldValue(question.name)),
            }),
            {}
          ),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${department}.`);
      }
      return { department, success: true };
    };

    try {
      // Submit sequentially to prevent client-side network race conditions
      const successful = [];
      const failed = [];

      for (const department of pendingDepartments) {
        try {
          const result = await submitDepartment(department);
          if (result.success) {
            successful.push(department);
          }
        } catch (err) {
          failed.push({ department, message: err.message });
        }
      }

      const completed = [...new Set([...submittedDepartments, ...successful])];
      setSubmittedDepartments(completed);
      markDepartmentsSubmitted(completed);

      successful.forEach((dept) => toast.success(`Application submitted for ${dept}!`));

      if (failed.length) {
        isSubmittedRef.current = false;
        const failedDepts = failed.map((f) => f.department).join(", ");
        const firstError = failed[0]?.message || `Could not submit ${failedDepts}.`;
        setErrorMessage(
          successful.length
            ? `Submitted for ${successful.join(", ")}. Failed for ${failedDepts}: ${firstError}`
            : firstError
        );
      } else {
        isSubmittedRef.current = true;
        draftQueueRef.current?.cancel();
        try {
          await draftQueueRef.current?.wait();
        } catch {}
        await removeDraftAsync(draftKey);
        router.push("/departments");
      }
    } catch {
      isSubmittedRef.current = false;
      setErrorMessage(
        "Your applications could not be submitted right now. Your saved answers are preserved for retrying."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isDraftReady) {
    return <FormSkeleton departmentNames={departmentNames} isOnline={isOnline} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/departments")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Department Selection</span>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Recruitment Application Form
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Applying for:</span>
            {departmentNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500 border border-blue-500/20"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Live Network & Draft Status Chip */}
        <div
          className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2.5 self-start sm:self-auto border transition-all ${
            isOnline
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-xs"
              : "text-amber-400 bg-amber-500/10 border-amber-500/40 shadow-xs"
          }`}
        >
          {isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-[11px]">ONLINE · Draft secured locally</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono text-[11px] font-semibold">OFFLINE · Saved on device</span>
            </>
          )}
        </div>
      </div>

      {/* Sticky Offline Mode Banner */}
      {!isOnline && (
        <div className="sticky top-20 z-30 rounded-2xl border border-amber-500/50 bg-zinc-950/95 p-4 backdrop-blur-md shadow-[4px_4px_0px_#F59E0B] text-xs font-mono text-amber-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <WifiOff className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-200 uppercase tracking-wider">
                    OFFLINE MODE ACTIVE
                  </span>
                  <span className="inline-block px-1.5 py-0.5 text-[9px] bg-amber-500/20 rounded border border-amber-500/40 text-amber-300 font-pixel">
                    LOCAL CACHE SECURED
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-amber-300/90 leading-relaxed">
                  Internet connection lost. Your essays and responses are continuously secured in your browser storage. Submission is paused until network returns.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between">
          <p>{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/departments")}
            className="rounded-full"
          >
            Go Back
          </Button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Section 1: Personal Details */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-4 text-foreground">
              <User className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold">Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="Name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jane Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="RegistrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 25BCE5612" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly type="email" className="opacity-80" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone Number (WhatsApp) <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="10-digit number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value || ""}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section 2: Department-specific Questions */}
          {departmentNames.map((deptName) => (
            <DepartmentQuestionsCard
              key={deptName}
              department={deptName}
              QuestionnaireData={dynamicQuestionnaires}
              form={form}
            />
          ))}

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/departments")}
              className="rounded-full w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isOnline}
              size="lg"
              className={`rounded-full gap-2 px-8 w-full sm:w-auto shadow-md transition-all ${
                !isOnline
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 cursor-not-allowed hover:bg-amber-500/20"
                  : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline (Reconnect to Submit)</span>
                </>
              ) : (
                <>
                  <span>Submit Application</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function DepartmentQuestionsCard({ department, QuestionnaireData, form }) {
  const normalizeDeptName = (str) =>
    str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

  const questions = (
    QuestionnaireData.find(
      (qd) => normalizeDeptName(qd.department) === normalizeDeptName(department)
    )?.questions ?? []
  ).map(normaliseQuestion);

  if (!questions.length) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
      <div className="flex items-center gap-2 border-b border-border/40 pb-4 text-foreground">
        <HelpCircle className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-bold">{department} Specific Questions</h2>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const isCompact = question.type === "short-text";

          return (
            <FormField
              key={question.name}
              control={form.control}
              name={question.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium leading-normal text-foreground">
                    {question.name}
                  </FormLabel>
                  <FormControl>
                    {isCompact ? (
                      <Input {...field} placeholder={question.placeholder || "Answer..."} />
                    ) : (
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={question.placeholder || "Your answer..."}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function FormSkeleton({ departmentNames = [], isOnline = true }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-72 sm:w-96" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-4 w-20" />
            {departmentNames.length > 0 ? (
              departmentNames.map((name) => (
                <Skeleton key={name} className="h-5 w-24 rounded-full" />
              ))
            ) : (
              <>
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </>
            )}
          </div>
        </div>
        <Skeleton className="h-9 w-56 rounded-xl" />
      </div>

      {/* Section 1: Personal Details Skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: General Questions Skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Department Specific Questions Skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Submit Bar Skeleton */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
    </div>
  );
}

