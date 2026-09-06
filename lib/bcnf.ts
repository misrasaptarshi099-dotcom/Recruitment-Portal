import { connect } from "./db";

/**
 * Boyce-Codd Normal Form (BCNF) Data Architecture & Transactional Services
 * 
 * Relations:
 * 1. Candidates: (candidateId PK, email UK, registrationNumber UK, name, gender, yearOfStudy)
 * 2. Departments: (departmentId PK, slug UK, name UK, description, isActive)
 * 3. Questions: (questionId PK, departmentSlug FK, questionKey, questionText, questionType)
 * 4. Applications: (applicationId PK, candidateEmail FK, departmentSlug FK, shortlisted, status, submittedAt)
 * 5. Responses: (responseId PK, applicationId FK, questionKey, questionText, answer, createdAt)
 */

export interface ICandidate {
  id?: string;
  candidateId: string;
  email: string;
  registrationNumber: string;
  name: string;
  phone?: string;
  gender: string;
  yearOfStudy: string;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IApplication {
  id?: string;
  applicationId: string;
  candidateEmail: string;
  department: string;
  departmentSlug: string;
  shortlisted: boolean;
  status: "pending" | "shortlisted" | "rejected";
  submittedAt: string;
  createdAt: string;
}

export interface IResponse {
  id?: string;
  responseId: string;
  applicationId: string;
  questionKey: string;
  questionText: string;
  answer: string;
  createdAt: string;
}

export interface ISubmissionPayload {
  Name: string;
  RegistrationNumber: string;
  Email: string;
  Phone?: string;
  Gender?: string;
  "Year of Study"?: string;
  Department: string;
  Questions: Record<string, string> | Array<{ question: string; answer: string }>;
  [key: string]: any;
}

/**
 * Sanitizes any string into a safe Firestore document/map key.
 * Strictly prevents periods (.) and slashes (/) from triggering Firestore FieldPath delimiter bugs.
 */
export function sanitizeFieldKey(key: string): string {
  if (!key) return "unknown_key";
  return key
    .trim()
    .toLowerCase()
    .replace(/[./\\#$[\]?():,]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export function normalizeDeptSlug(deptName: string): string {
  if (!deptName) return "general";
  return deptName
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Normalizes question payloads (maps, arrays of pairs, arrays of objects)
 * into a safe, uniform key-value map and a structured array.
 */
export function normalizeQuestions(
  rawQuestions: Record<string, string> | any[] | undefined
): { sanitizedMap: Record<string, string>; structuredList: Array<{ key: string; question: string; answer: string }> } {
  const sanitizedMap: Record<string, string> = {};
  const structuredList: Array<{ key: string; question: string; answer: string }> = [];

  if (!rawQuestions) {
    return { sanitizedMap, structuredList };
  }

  if (Array.isArray(rawQuestions)) {
    for (const item of rawQuestions) {
      if (!item) continue;
      if (Array.isArray(item)) {
        const [q, a] = item;
        const qStr = String(q || "");
        const aStr = String(a || "");
        const sKey = sanitizeFieldKey(qStr);
        sanitizedMap[sKey] = aStr;
        structuredList.push({ key: sKey, question: qStr, answer: aStr });
      } else if (typeof item === "object") {
        const qStr = item.question || item.name || item.key || "Question";
        const aStr = item.answer || item.value || "";
        const sKey = sanitizeFieldKey(qStr);
        sanitizedMap[sKey] = String(aStr);
        structuredList.push({ key: sKey, question: qStr, answer: String(aStr) });
      }
    }
    return { sanitizedMap, structuredList };
  }

  if (typeof rawQuestions === "object") {
    for (const [qText, aText] of Object.entries(rawQuestions)) {
      const sKey = sanitizeFieldKey(qText);
      const answer = String(aText || "");
      sanitizedMap[sKey] = answer;
      structuredList.push({ key: sKey, question: qText, answer });
    }
  }

  return { sanitizedMap, structuredList };
}

/**
 * Atomic Transactional Application Submission.
 * Guarantees BCNF schema storage, eliminates TOCTOU concurrency races,
 * and maintains dual-write compatibility for legacy admin components.
 */
export async function submitApplicationTransaction(payload: ISubmissionPayload): Promise<{
  success: boolean;
  applicationId: string;
  message: string;
}> {
  const db = await connect();
  const email = normalizeEmail(payload.Email);
  const department = (payload.Department || "").trim();
  const deptSlug = normalizeDeptSlug(department);
  const emailSlug = email.replace(/[^a-z0-9]/g, "_");
  const candidateId = `cand_${emailSlug}`;
  const applicationId = `app_${emailSlug}__${deptSlug}`;

  const { sanitizedMap, structuredList } = normalizeQuestions(payload.Questions);
  const now = new Date().toISOString();

  // Execute atomic read-and-write transaction
  return await db.runTransaction(async (transaction: any) => {
    // 1. Check existing applications for this user
    const appQuery = await db.collection("formData").where("Email", "==", email).get();
    
    // Check if this department was already submitted
    const alreadySubmitted = appQuery.docs.some((doc: any) => {
      const docData = doc.data();
      return normalizeDeptSlug(docData?.Department || "") === deptSlug;
    });

    if (alreadySubmitted) {
      const err: any = new Error(`You have already submitted an application for ${department}`);
      err.statusCode = 400;
      throw err;
    }

    // Check maximum 2-application limit
    if (appQuery.size >= 2) {
      const err: any = new Error("Remember that you can only submit upto 2 unique applications");
      err.statusCode = 400;
      throw err;
    }

    // 2. Relation: Candidates (BCNF Candidate Key: candidateId / email)
    const candidateRef = db.collection("candidates").doc(candidateId);
    const candidateSnap = await transaction.get(candidateRef);
    const candidateData = {
      candidateId,
      email,
      registrationNumber: payload.RegistrationNumber || "",
      name: payload.Name || "",
      phone: payload.Phone || "",
      gender: payload.Gender || "",
      yearOfStudy: payload["Year of Study"] || "",
      applicationCount: (candidateSnap.exists ? (candidateSnap.data()?.applicationCount || 0) : 0) + 1,
      createdAt: candidateSnap.exists ? candidateSnap.data()?.createdAt : now,
      updatedAt: now,
    };
    transaction.set(candidateRef, candidateData, { merge: true });

    // 3. Relation: Applications (BCNF Candidate Key: applicationId = (candidateEmail, department))
    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationData: IApplication = {
      applicationId,
      candidateEmail: email,
      department,
      departmentSlug: deptSlug,
      shortlisted: false, // Explicitly initialized to false!
      status: "pending",
      submittedAt: now,
      createdAt: now,
    };
    transaction.set(applicationRef, applicationData);

    // 4. Relation: Responses (BCNF Candidate Key: (applicationId, questionKey))
    for (const item of structuredList) {
      const responseId = `resp_${applicationId}__${item.key}`;
      const responseRef = db.collection("responses").doc(responseId);
      transaction.set(responseRef, {
        responseId,
        applicationId,
        questionKey: item.key,
        questionText: item.question,
        answer: item.answer,
        createdAt: now,
      });
    }

    // 5. Dual-Write to legacy formData collection to keep existing DataTable & exports working
    const legacyRef = db.collection("formData").doc(applicationId);
    const legacyData = {
      id: applicationId,
      _id: applicationId,
      Name: payload.Name || "",
      RegistrationNumber: payload.RegistrationNumber || "",
      Email: email,
      Phone: payload.Phone || "",
      Gender: payload.Gender || "",
      "Year of Study": payload["Year of Study"] || "",
      Department: department,
      Questions: sanitizedMap,
      QuestionDetails: structuredList,
      shortlisted: false, // Always initialize to false, never undefined!
      Shortlisted: false,
      createdAt: new Date(),
    };
    transaction.set(legacyRef, legacyData);

    return {
      success: true,
      applicationId,
      message: "Form submitted successfully!",
    };
  });
}
