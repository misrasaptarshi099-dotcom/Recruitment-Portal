import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isSuperAdmin, canAccessDepartment, getUserAdminRole } from "@/lib/security";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig } from "@/lib/admin-auth";
import { departmentsData } from "@/constants/departments-data";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

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
  "cloud & devops": {
    title: "Containerized Microservices & CI/CD Pipeline",
    description: "Containerize a sample multi-tier service with Docker Compose and implement GitHub Actions workflows for automated testing and deployment.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Architecture Diagram / Docs"],
  },
  "blockchain": {
    title: "Decentralized Smart Contract & Web3 DApp",
    description: "Develop, test, and deploy an ERC standard smart contract on a testnet with an integrated frontend wallet connector.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Contract Address / Live Demo"],
  },
  "data science": {
    title: "Exploratory Data Analysis & Predictive Modeling",
    description: "Perform data preprocessing, feature engineering, and predictive modeling on the provided challenge dataset with insightful visual dashboards.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository", "Jupyter / Colab Notebook"],
  },
  "competitive programming": {
    title: "Algorithmic Problem Solving & Edge-Case Benchmark",
    description: "Implement optimal solutions in C++/Java/Python for 3 algorithmic challenges, meeting strict time and space complexity constraints.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["GitHub Repository / Pastebin", "Submission Code & Complexity Analysis"],
  },
  "outreach": {
    title: "Sponsorship Deck & Community Outreach Strategy",
    description: "Draft a formal corporate sponsorship proposal and outreach timeline for prospective community and industry partners.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Google Docs / Notion / PDF Deck"],
  },
  "publicity": {
    title: "Campaign Narrative & Media Editorial Calendar",
    description: "Produce a high-impact promotional campaign video reel, copywriting copy, and a 2-week cross-platform social engagement plan.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Google Drive Folder", "Figma / Video Link"],
  },
  default: {
    title: "Domain Proficiency Challenge",
    description: "Complete the practical task prompt and upload your project repository, portfolio deck, or design prototype with documentation.",
    deadline: "48 Hours from Assignment",
    deliverableTypes: ["Project Link / GitHub / Google Drive"],
  },
};

const normalizeDeptSlug = (deptName) => {
  if (!deptName) return "general";
  return deptName
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
};

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!session?.user || !isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);
    const allDeptNames = departmentsData.map((d) => d.name);
    const allowedDepartments = isSuper ? allDeptNames : roleInfo.departments;

    // Fetch custom tasks configured in Firestore
    let customTasks = {};
    try {
      const docSnap = await db.collection("recruitment_config").doc("round2_tasks").get();
      if (docSnap.exists) {
        customTasks = docSnap.data()?.departments || {};
      }
    } catch (err) {
      console.warn("Notice reading recruitment_config/round2_tasks:", err?.message || err);
    }

    // Merge custom configs over default prompts
    const tasks = allDeptNames.map((deptName) => {
      const slug = normalizeDeptSlug(deptName);
      const custom = customTasks[slug] || customTasks[deptName];
      const deptLower = deptName.toLowerCase();
      const defaultTask = DEFAULT_ROUND2_PROMPTS[deptLower] || DEFAULT_ROUND2_PROMPTS.default;

      return {
        department: deptName,
        departmentSlug: slug,
        title: custom?.title || defaultTask.title,
        description: custom?.description || defaultTask.description,
        taskDocumentUrl: custom?.taskDocumentUrl || "",
        taskDocumentTitle: custom?.taskDocumentTitle || "",
        deliverableTypes: custom?.deliverableTypes?.length ? custom.deliverableTypes : defaultTask.deliverableTypes,
        deadline: custom?.deadline || defaultTask.deadline,
        isCustomized: Boolean(custom),
        updatedAt: custom?.updatedAt || null,
        updatedBy: custom?.updatedBy || null,
        defaultTask,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        tasks,
      },
      allowedDepartments,
      isSuperAdmin: isSuper,
    });
  } catch (error) {
    console.error("Error fetching admin Round 2 config:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch Round 2 config" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`admin_r2_config_${clientIp}`, {
      maxRequests: 40,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": limit.retryAfter.toString() } }
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!session?.user || !isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      department,
      title,
      description,
      taskDocumentUrl,
      taskDocumentTitle,
      deliverableTypes,
      deadline,
    } = body;

    const rawDept = typeof department === "string" ? department.trim() : "";
    if (!rawDept) {
      return NextResponse.json(
        { success: false, message: "Department name is required" },
        { status: 400 }
      );
    }

    const matchedDept = departmentsData.find(
      (d) =>
        d.name.toLowerCase() === rawDept.toLowerCase() ||
        d.id.toLowerCase() === rawDept.toLowerCase()
    );

    if (!matchedDept) {
      return NextResponse.json(
        { success: false, message: `Unknown department: "${rawDept}"` },
        { status: 400 }
      );
    }

    const canonicalDept = matchedDept.name;

    if (!canAccessDepartment(session.user, canonicalDept, roleConfig)) {
      return NextResponse.json(
        {
          success: false,
          message: `Forbidden: You do not have permission to configure Round 2 tasks for the "${canonicalDept}" department`,
        },
        { status: 403 }
      );
    }

    const trimmedTitle = String(title || "").trim();
    if (!trimmedTitle) {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      );
    }

    const trimmedUrl = String(taskDocumentUrl || "").trim();
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Invalid scheme");
        }
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid URL format. Please provide a valid HTTP/HTTPS link." },
          { status: 400 }
        );
      }
    }

    const slug = normalizeDeptSlug(canonicalDept);
    const nowIso = new Date().toISOString();

    const taskPayload = {
      department: canonicalDept,
      departmentSlug: slug,
      title: trimmedTitle,
      description: String(description || "").trim(),
      taskDocumentUrl: trimmedUrl || null,
      taskDocumentTitle: String(taskDocumentTitle || "").trim() || null,
      deliverableTypes: Array.isArray(deliverableTypes) && deliverableTypes.length > 0
        ? deliverableTypes.map((t) => String(t).trim()).filter(Boolean)
        : ["Project Link / GitHub / Google Drive"],
      deadline: String(deadline || "48 Hours from Assignment").trim(),
      updatedAt: nowIso,
      updatedBy: session.user.email,
    };

    // Store in recruitment_config/round2_tasks under departments[slug]
    await db
      .collection("recruitment_config")
      .doc("round2_tasks")
      .set(
        {
          departments: {
            [slug]: taskPayload,
          },
          updatedAt: nowIso,
          updatedBy: session.user.email,
        },
        { merge: true }
      );

    // Invalidate Redis cache
    await redis.del("recruitment_config:round2_tasks");

    return NextResponse.json({
      success: true,
      message: `Round 2 Task for "${canonicalDept}" updated successfully`,
      data: taskPayload,
    });
  } catch (error) {
    console.error("Error updating Round 2 task config:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update Round 2 task" },
      { status: 400 }
    );
  }
}
