import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connect } from "@/lib/db";
import { departmentsData } from "@/constants/departments-data";

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

function safeToIsoString(val) {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.toDate === "function") {
    try {
      return val.toDate().toISOString();
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
  return new Date().toISOString();
}

function calculateDinoRank(highScore = 0) {
  if (highScore >= 1200) {
    return {
      title: "CHROME T-REX",
      tier: "APEX",
      level: 4,
      badgeColor: "text-emerald-400 border-emerald-500 bg-emerald-500/10 shadow-[2px_2px_0px_#10B981]",
      icon: "🦖",
      description: "Apex predator of the pixel desert. Elite reaction times.",
    };
  }
  if (highScore >= 600) {
    return {
      title: "VELOCIRAPTOR",
      tier: "VETERAN",
      level: 3,
      badgeColor: "text-cyan-400 border-cyan-500 bg-cyan-500/10 shadow-[2px_2px_0px_#06B6D4]",
      icon: "⚡",
      description: "Agile speedrunner. Navigates cacti clusters with ease.",
    };
  }
  if (highScore >= 250) {
    return {
      title: "DESERT RUNNER",
      tier: "SCOUT",
      level: 2,
      badgeColor: "text-amber-400 border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_#F59E0B]",
      icon: "🌵",
      description: "Solid endurance. Regular visitor to night mode.",
    };
  }
  return {
    title: "PIXEL CADET",
    tier: "ROOKIE",
    level: 1,
    badgeColor: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#3B82F6]",
    icon: "🥚",
    description: "Beginner runner. Warming up on the desert runway.",
  };
}

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
          submittedAt: safeToIsoString(data.createdAt),
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
          submittedAt: safeToIsoString(data.submittedAt || data.createdAt || existing.submittedAt),
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

    // Normalize applications into 3-Round Progression Model
    const applications = Array.from(appMap.values()).map((app) => {
      const deptLower = (app.department || "").toLowerCase();
      const isTech = TECHNICAL_DEPTS.has(deptLower);
      const deptTone = departmentsData.find((d) => d.name.toLowerCase() === deptLower)?.tone || (isTech ? "#4285F4" : "#0F9D58");
      const defaultTask = DEFAULT_ROUND2_PROMPTS[deptLower] || DEFAULT_ROUND2_PROMPTS.default;

      // --- Round 1: Screening & Portfolio Review ---
      let r1Status = "in_review";
      if (app.shortlisted || app.status === "shortlisted") {
        r1Status = "cleared";
      } else if (app.status === "rejected") {
        r1Status = "rejected";
      }

      // --- Round 2: Practical Domain Task ---
      let r2Status = "locked";
      if (r1Status === "cleared") {
        if (app.round2Task?.submissionUrl) {
          r2Status = "submitted";
        } else if (app.status === "accepted" || app.round2Cleared) {
          r2Status = "cleared";
        } else {
          r2Status = "pending_submission";
        }
      }

      // --- Round 3: Interview & Final Selection ---
      let r3Status = "locked";
      if (r2Status === "cleared" || (r1Status === "cleared" && app.round3Interview?.slotTime)) {
        if (app.status === "accepted") {
          r3Status = "accepted";
        } else if (app.status === "rejected") {
          r3Status = "rejected";
        } else if (app.round3Interview?.slotTime) {
          r3Status = "scheduled";
        } else {
          r3Status = "in_review";
        }
      }

      const currentRound = r3Status !== "locked" ? 3 : r2Status !== "locked" ? 2 : 1;

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
          },
          round2: {
            name: "ROUND 02",
            title: "Domain Proficiency Task",
            status: r2Status,
            description: defaultTask.description,
            taskPrompt: app.round2Task?.taskPrompt || defaultTask.title,
            deadline: app.round2Task?.deadline || defaultTask.deadline,
            deliverableTypes: defaultTask.deliverableTypes,
            submissionUrl: app.round2Task?.submissionUrl || null,
            submittedAt: safeToIsoString(app.round2Task?.submittedAt),
            notes: app.round2Task?.notes || null,
          },
          round3: {
            name: "ROUND 03",
            title: "Technical & Cultural Interview",
            status: r3Status,
            description: "Live conversation with department leads and core committee.",
            slotTime: app.round3Interview?.slotTime || null,
            venue: app.round3Interview?.venue || null,
            meetLink: app.round3Interview?.meetLink || null,
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
