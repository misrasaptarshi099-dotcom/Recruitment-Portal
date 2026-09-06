"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Send, Loader2, ArrowLeft, CheckCircle2, User, HelpCircle } from "lucide-react";

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

  const normalizeDeptName = (str) =>
    str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

  const questionData = useMemo(
    () => [
      ...new Set(
        departmentNames.flatMap((department) =>
          (
            QuestionnaireData.find(
              (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
            )?.questions ?? []
          )
            .map(normaliseQuestion)
            .map((question) => question.name)
        )
      ),
    ],
    [departmentNames]
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
        .min(1, "Phone is required")
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
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

  // Restore saved draft
  useEffect(() => {
    if (isPending || !user || !draftKey) return;

    const email = user.email;
    let isActive = true;

    try {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      form.reset({
        ...form.getValues(),
        ...savedDraft.values,
        Email: email,
        Name: savedDraft.values?.Name || user.name || "",
      });
    } catch {
      form.setValue("Email", email);
    }

    async function checkSubmissions() {
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

    checkSubmissions();

    return () => {
      isActive = false;
    };
  }, [contextSubmitted, departmentNames, draftKey, form, isPending, user]);

  // Debounced auto-save draft
  const watchedValues = useWatch({ control: form.control });
  useEffect(() => {
    if (!isDraftReady || !draftKey) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ values: watchedValues, submittedDepartments })
        );
      } catch {}
    }, 500);

    return () => clearTimeout(timeout);
  }, [draftKey, isDraftReady, submittedDepartments, watchedValues]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = departmentNames.filter(
      (department) => !submittedDepartments.includes(department)
    );

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    const basicDetails = {
      Name: values.Name,
      RegistrationNumber: values.RegistrationNumber,
      Gender: values.Gender || "",
      Email: values.Email,
      Phone: values.Phone,
      "Year of Study": values["Year of Study"] || "",
      "Why do you want to join Organization Name?":
        values["Why do you want to join Organization Name?"] || "",
    };

    const submitDepartment = async (department) => {
      const questions = (
        QuestionnaireData.find(
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
              [question.name]: values[question.name] || "",
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
        const failedDepts = failed.map((f) => f.department).join(", ");
        const firstError = failed[0]?.message || `Could not submit ${failedDepts}.`;
        setErrorMessage(
          successful.length
            ? `Submitted for ${successful.join(", ")}. Failed for ${failedDepts}: ${firstError}`
            : firstError
        );
      } else {
        router.push("/departments");
      }
    } catch {
      setErrorMessage(
        "Your applications could not be submitted right now. Your saved answers are preserved for retrying."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="text-xs text-muted-foreground bg-card/60 border border-border/40 p-2.5 rounded-xl self-start sm:self-auto">
          <span>Auto-saving draft locally</span>
        </div>
      </div>

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
                    <FormLabel>Phone Number (WhatsApp) *</FormLabel>
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
              QuestionnaireData={QuestionnaireData}
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
              disabled={isSubmitting}
              size="lg"
              className="rounded-full gap-2 px-8 w-full sm:w-auto shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
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
