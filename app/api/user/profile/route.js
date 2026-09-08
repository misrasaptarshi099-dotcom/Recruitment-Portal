import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connect } from "@/lib/db";
import { departmentsData } from "@/constants/departments-data";
import { isAdminEmail, isActiveAssignment } from "@/lib/security";
import { loadRoleConfig, purgeRevokedNonInstitutionalUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const TECHNICAL_DEPTS = new Set([
  "web dev",
  "app dev",
  "machine learning",
  "cyber security",
  "blockchain",
  "cloud & devops",
  "iot & robotics",
]);

const DEFAULT_ROUND2_PROMPTS = {
  "web dev": {
    title: "Full-Stack Micro-Feature Trial",
    description: "Build a responsive Next.js/React web app with state management, clean responsive UI, and persistent storage. Include a README with architecture decisions.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Live Deployment (Vercel/Netlify)"],
  },
  "app dev": {
    title: "Offline-First Mobile Interface",
    description: "Create a Flutter, React Native, or native Android/iOS application with local state persistence, responsive layouts, and smooth animations.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Demo APK / Video Recording"],
  },
  "machine learning": {
    title: "Model Pipeline & Inference Notebook",
    description: "Train or fine-tune a model on a provided problem dataset. Package code with an exploratory Jupyter Notebook and metric evaluation graphs.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Google Colab / Kaggle Notebook"],
  },
  "cyber security": {
    title: "CTF Vulnerability Assessment & Writeup",
    description: "Analyze the provided security scenario, identify misconfigurations/vulnerabilities, and craft a detailed remediation writeup with mitigation patches.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "PDF / Markdown Report"],
  },
  "ui/ux": {
    title: "High-Fidelity Prototype & Design System",
    description: "Design a complete interactive mobile or web onboarding flow adhering to accessibility standards. Deliver a Figma prototype with auto-layout and components.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Figma File Link (View/Comment Permissions)"],
  },
  "design": {
    title: "Brand Identity & Visual Campaign Suite",
    description: "Design an event banner, social media poster, and sticker pack for an upcoming GDG Tech Summit. Export production-ready high-res PNG/vector assets.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Figma / Behance Link", "Google Drive Folder"],
  },
  "management": {
    title: "Event Operations & Logistics Blueprint",
    description: "Formulate an end-to-end execution roadmap for a 500-attendee flagship hackathon, including timeline, budget allocation, and risk management strategies.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Google Docs / Notion / PDF Deck"],
  },
  default: {
    title: "Domain Proficiency Challenge",
    description: "Complete the practical task prompt and upload your project repository, portfolio deck, or design prototype with documentation.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Project Link / GitHub / Google Drive"],
  },
};

export function safeToIsoString(val, fallback = null) {
  if (!val) return fallback;
  if (val instanceof Date) return isNaN(val.getTime()) ? fallback : val.toISOString();
  if (typeof val?.toDate === "function") {
    try {
      const d = val.toDate();
      return d && !isNaN(d.getTime()) ? d.toISOString() : fallback;
    } catch {}
  }
  if (typeof val === "object") {
    if (typeof val._seconds === "number") {
      return new Date(val._seconds * 1000).toISOString();
    }
    if (typeof val.seconds === "number") {
      return new Date(val.seconds * 1000).toISOString();
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return fallback;
}

import { calculateDinoRank } from "@/lib/security";

export { calculateDinoRank };

export async function GET() {
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    console.warn("Session verification warning in profile route:", err);
  }

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const emailKey = email.replace(/[^a-z0-9]/g, "_");
  const candidateId = `cand_${emailKey}`;

  try {
    const db = await connect();

    // Enforce Institutional Domain: Only @vitstudent.ac.in permitted for candidate profiles
    if (!email.endsWith("@vitstudent.ac.in") && !isAdminEmail(email)) {
      const roleConfig = await loadRoleConfig(db);
      const isDynamicAdmin = Boolean(roleConfig?.assignments && isActiveAssignment(roleConfig.assignments[email]));
      if (!isDynamicAdmin) {
        await purgeRevokedNonInstitutionalUser(db, email);
        return NextResponse.json(
          { error: "Forbidden: Candidate accounts must use @vitstudent.ac.in. Non-institutional account without active admin privileges has been deleted." },
          { status: 403 }
        );
      }
    }

    // 1. Fetch Candidate Record
    let candidateData = null;
    try {
      const candidateDoc = await db.collection("candidates").doc(candidateId).get();
      candidateData = candidateDoc && candidateDoc.exists ? candidateDoc.data() : null;
    } catch (err) {
      console.warn("Failed to fetch candidate record, falling back:", err?.message || err);
    }

    // 2. Fetch Dino Score
    let scoreData = {};
    try {
      const scoreDoc = await db.collection("dinoScores").doc(emailKey).get();
      scoreData = (scoreDoc && scoreDoc.exists ? scoreDoc.data() : null) || {};
    } catch (err) {
      console.warn("Failed to fetch dino score, falling back:", err?.message || err);
    }
    const highScore = typeof scoreData.highScore === "number" ? scoreData.highScore : 0;
    const gamesPlayed = typeof scoreData.gamesPlayed === "number" ? scoreData.gamesPlayed : 0;
    const dinoRank = calculateDinoRank(highScore);

    // 3. Fetch Applications (query both BCNF applications and legacy formData)
    let bcnfDocs = [];
    let legacyDocs = [];
    try {
      const snap = await db.collection("applications").where("candidateEmail", "==", email).get();
      bcnfDocs = snap?.docs || [];
    } catch (err) {
      console.warn("Query applications by candidateEmail notice:", err?.message || err);
    }

    try {
      const snap = await db.collection("formData").where("Email", "==", email).get();
      legacyDocs = snap?.docs || [];
    } catch (err) {
      console.warn("Query formData by Email notice:", err?.message || err);
    }

    // If case difference might exist, also attempt case-preserved query if empty
    if (legacyDocs.length === 0 && session.user.email !== email) {
      try {
        const snap = await db.collection("formData").where("Email", "==", session.user.email).get();
        legacyDocs = snap?.docs || [];
      } catch {}
    }

    // Consolidate applications mapped by departmentSlug
    const appMap = new Map();

    // Ingest legacy records first
    legacyDocs.forEach((doc) => {
      const data = typeof doc.data === "function" ? doc.data() || {} : doc || {};
      const deptName = (data.Department || "").trim();
      const slug = deptName.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
      if (slug) {
        let answers = [];
        if (Array.isArray(data.QuestionDetails) && data.QuestionDetails.length > 0) {
          answers = data.QuestionDetails.map((q) => ({
            key: q.key || q.question || "q",
            question: q.question || q.key || "Question",
            answer: String(q.answer ?? ""),
          }));
        } else if (data.Questions && typeof data.Questions === "object") {
          if (Array.isArray(data.Questions)) {
            answers = data.Questions.map((q, idx) => {
              if (Array.isArray(q)) {
                return { key: `q_${idx}`, question: q[0] || `Question ${idx + 1}`, answer: String(q[1] ?? "") };
              }
              if (q && typeof q === "object") {
                return {
                  key: q.key || `q_${idx}`,
                  question: q.question || q.questionText || `Question ${idx + 1}`,
                  answer: String(q.answer ?? q.value ?? q.text ?? ""),
                };
              }
              return { key: `q_${idx}`, question: `Question ${idx + 1}`, answer: String(q ?? "") };
            });
          } else {
            answers = Object.entries(data.Questions).map(([k, v]) => ({
              key: k,
              question: k.replace(/_/g, " "),
              answer: String(v ?? ""),
            }));
          }
        }

        appMap.set(slug, {
          id: doc.id || doc._id || slug,
          applicationId: doc.id || doc._id || slug,
          department: deptName,
          departmentSlug: slug,
          shortlisted: Boolean(data.shortlisted || data.Shortlisted),
          status: data.status || (data.shortlisted || data.Shortlisted ? "shortlisted" : "pending"),
          submittedAt: safeToIsoString(data.createdAt, new Date().toISOString()),
          round2Cleared: Boolean(data.round2Cleared),
          round2Task: data.round2Task || null,
          round3Interview: data.round3Interview || null,
          answers,
        });
      }
    });

    // Ingest/overlay normalized BCNF records
    bcnfDocs.forEach((doc) => {
      const data = typeof doc.data === "function" ? doc.data() || {} : doc || {};
      const slug = data.departmentSlug || (data.department || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (slug) {
        const existing = appMap.get(slug) || {};
        appMap.set(slug, {
          ...existing,
          id: doc.id || data.applicationId || existing.id || slug,
          applicationId: data.applicationId || doc.id || existing.applicationId || slug,
          department: data.department || existing.department || slug,
          departmentSlug: slug,
          shortlisted: Boolean(data.shortlisted ?? existing.shortlisted),
          status: data.status || existing.status || "pending",
          submittedAt: safeToIsoString(data.submittedAt || data.createdAt || existing.submittedAt, new Date().toISOString()),
          round2Cleared: Boolean(data.round2Cleared ?? existing.round2Cleared),
          round2Task: data.round2Task || existing.round2Task || null,
          round3Interview: data.round3Interview || existing.round3Interview || null,
          answers: existing.answers || [],
        });
      }
    });

    // Ensure answers are populated: fallback to responses collection if missing from formData
    for (const app of appMap.values()) {
      if (!app.answers || app.answers.length === 0) {
        try {
          const respSnap = await db.collection("responses").where("applicationId", "==", app.applicationId).get();
          const respDocs = respSnap?.docs || [];
          if (respDocs.length > 0) {
            app.answers = respDocs.map((rDoc) => {
              const rData = typeof rDoc.data === "function" ? rDoc.data() : rDoc;
              return {
                key: rData.questionKey || rDoc.id,
                question: rData.questionText || rData.questionKey || "Question",
                answer: String(rData.answer ?? ""),
              };
            });
          }
        } catch (err) {
          console.warn("Responses lookup notice for application:", app.applicationId, err?.message || err);
        }
      }
    }

    // Fetch global/department recruitment deadlines from config
    let recruitmentDeadlines = {
      round1Deadline: null,
      round2Deadline: null,
      round2Deadlines: {},
    };
    try {
      const dSnap = await db.collection("recruitment_config").doc("deadlines").get();
      if (dSnap.exists) {
        recruitmentDeadlines = { ...recruitmentDeadlines, ...dSnap.data() };
      }
    } catch (err) {
      console.warn("Notice reading recruitment deadlines:", err?.message || err);
    }

    // Normalize applications into 3-Round Progression Model
    const applications = Array.from(appMap.values()).map((app) => {
      const deptLower = (app.department || "").toLowerCase();
      const isTech = TECHNICAL_DEPTS.has(deptLower);
      const deptTone = departmentsData.find((d) => d.name.toLowerCase() === deptLower)?.tone || (isTech ? "#4285F4" : "#0F9D58");
      const defaultTask = DEFAULT_ROUND2_PROMPTS[deptLower] || DEFAULT_ROUND2_PROMPTS.default;

      const isR2Cleared = Boolean(
        app.round2Cleared ||
        app.status === "round2_cleared" ||
        app.status === "accepted" ||
        app.round3Interview?.slotTime
      );

      // --- Round 1: Screening & Portfolio Review ---
      let r1Status = "in_review";
      if (app.shortlisted || app.status === "shortlisted" || isR2Cleared) {
        r1Status = "cleared";
      } else if (app.status === "rejected") {
        r1Status = "rejected";
      }

      // --- Round 2: Practical Domain Task ---
      let r2Status = "locked";
      if (r1Status === "cleared") {
        if (isR2Cleared) {
          r2Status = "cleared";
        } else if (app.round2Task?.submissionUrl) {
          r2Status = "submitted";
        } else {
          r2Status = "pending_submission";
        }
      }

      // --- Round 3: Interview & Final Selection ---
      let r3Status = "locked";
      if (isR2Cleared || (r1Status === "cleared" && app.round3Interview?.slotTime)) {
        if (app.status === "accepted") {
          r3Status = "accepted";
        } else if (app.status === "rejected") {
          r3Status = "rejected";
        } else if (app.round3Interview?.slotTime) {
          r3Status = "scheduled";
        } else {
          r3Status = "awaiting_schedule";
        }
      }

      const currentRound = r3Status !== "locked" ? 3 : r2Status !== "locked" ? 2 : 1;

      // Resolve per-department deadlines for this candidate's specific department
      const deptKey = app.department || "";
      const deptDeadlineConfig =
        recruitmentDeadlines.departments?.[deptKey] ||
        recruitmentDeadlines.departments?.[app.departmentSlug] ||
        {};

      const effectiveR1Deadline =
        deptDeadlineConfig.round1Deadline ||
        recruitmentDeadlines.round1Deadline ||
        null;

      const effectiveR2Deadline =
        app.round2Task?.deadline ||
        deptDeadlineConfig.round2Deadline ||
        recruitmentDeadlines.round2Deadlines?.[app.departmentSlug] ||
        recruitmentDeadlines.round2Deadline ||
        defaultTask.deadline;

      return {
        applicationId: app.applicationId,
        department: app.department,
        departmentSlug: app.departmentSlug,
        isTechnical: isTech,
        tone: deptTone,
        submittedAt: app.submittedAt,
        status: app.status,
        currentRound,
        answers: app.answers || [],
        rounds: {
          round1: {
            name: "ROUND 01",
            title: "Application & Portfolio Screening",
            status: r1Status,
            description: "Initial evaluation of essay answers, previous projects, and candidate profile.",
            deadline: effectiveR1Deadline,
          },
          round2: {
            name: "ROUND 02",
            title: "Domain Proficiency Task",
            status: r2Status,
            description: defaultTask.description,
            taskPrompt: app.round2Task?.taskPrompt || defaultTask.title,
            deadline: effectiveR2Deadline,
            deliverableTypes: defaultTask.deliverableTypes,
            submissionUrl: app.round2Task?.submissionUrl || null,
            submittedAt: app.round2Task?.submittedAt ? safeToIsoString(app.round2Task.submittedAt) : null,
            notes: app.round2Task?.notes || null,
          },
          round3: {
            name: "ROUND 03",
            title: "Technical & Cultural Interview",
            status: r3Status,
            description: "Live 15-minute conversation with department leads and core committee.",
            slotTime: app.round3Interview?.slotTime || null,
            date: app.round3Interview?.date || null,
            startTime: app.round3Interview?.startTime || null,
            endTime: app.round3Interview?.endTime || null,
            venue: app.round3Interview?.venue || null,
            meetLink: app.round3Interview?.meetLink || app.round3Interview?.meetingLink || null,
            meetingLink: app.round3Interview?.meetingLink || app.round3Interview?.meetLink || null,
            slotId: app.round3Interview?.slotId || null,
            bookedAt: app.round3Interview?.bookedAt ? safeToIsoString(app.round3Interview.bookedAt) : null,
          },
        },
      };
    });

    // Resolve candidate personal details with fallbacks from formData
    const firstLegacyData = legacyDocs[0]
      ? (typeof legacyDocs[0].data === "function" ? legacyDocs[0].data() : legacyDocs[0])
      : {};

    const resolvedName = candidateData?.name || firstLegacyData.Name || session.user.name || "Candidate";
    const resolvedRegNo = candidateData?.registrationNumber || firstLegacyData.RegistrationNumber || "";
    const resolvedGender = candidateData?.gender || firstLegacyData.Gender || "";
    const resolvedYear = candidateData?.yearOfStudy || firstLegacyData["Year of Study"] || firstLegacyData.YearOfStudy || "";

    return NextResponse.json({
      user: {
        name: resolvedName,
        email: email,
        registrationNumber: resolvedRegNo,
        gender: resolvedGender,
        yearOfStudy: resolvedYear,
        avatar: session.user.image || null,
      },
      stats: {
        highScore,
        gamesPlayed,
        lastPlayed: safeToIsoString(scoreData.updatedAt),
        rank: dinoRank,
        totalApplications: applications.length,
        maxApplications: 2,
      },
      applications,
    });
  } catch (error) {
    console.error("Critical error in candidate profile route:", error);
    // Safe graceful fallback payload so UI never breaks even under unexpected DB anomalies
    return NextResponse.json({
      user: {
        name: session.user.name || "Candidate",
        email: email,
        registrationNumber: "",
        gender: "",
        yearOfStudy: "",
        avatar: session.user.image || null,
      },
      stats: {
        highScore: 0,
        gamesPlayed: 0,
        lastPlayed: null,
        rank: calculateDinoRank(0),
        totalApplications: 0,
        maxApplications: 2,
      },
      applications: [],
      warning: "Database synchronization delay. Profile telemetry loaded in resilient mode.",
    });
  }
}
