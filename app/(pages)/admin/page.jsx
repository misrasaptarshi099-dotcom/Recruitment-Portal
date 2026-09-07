import React from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { connect, serializeFirestoreData } from "@/lib/db";
import AdminContent from "@/components/AdminContent";
import { Shield, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, getUserAdminRole, isSuperAdmin, isAdminEmail } from "@/lib/security";
import { loadRoleConfig, purgeRevokedNonInstitutionalUser } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    console.error("Error getting session in AdminPage:", err);
  }

  // Broken Access Control (OWASP A01) Guard: Strictly Require Authentication
  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full text-center space-y-4 p-8 border border-border rounded-xl bg-card shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Authentication Required</h2>
            <p className="text-sm text-muted-foreground">
              You must be signed in with an authorized administrator account to access the Applicant Review Portal.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In with Google
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Load role configuration from Firestore for dynamic RBAC
  let roleConfig = { assignments: {} };
  try {
    const db = await connect();
    roleConfig = await loadRoleConfig(db);
  } catch (err) {
    console.error("Error loading role config:", err);
  }

  // Broken Access Control (OWASP A01) Guard: Strictly Require Administrator Role
  if (!isUserAdmin(session.user, roleConfig)) {
    // If a non-institutional email lacks admin privileges (e.g. revoked), purge account immediately
    if (session.user?.email && !session.user.email.toLowerCase().endsWith("@vitstudent.ac.in") && !isAdminEmail(session.user.email)) {
      try {
        const db = await connect();
        await purgeRevokedNonInstitutionalUser(db, session.user.email);
      } catch (err) {
        console.warn("Could not purge revoked user on admin access attempt:", err);
      }
    }

    const isRevokedNonInst =
      session.user?.email &&
      !session.user.email.toLowerCase().endsWith("@vitstudent.ac.in") &&
      !isAdminEmail(session.user.email);

    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full text-center space-y-4 p-8 border border-destructive/20 rounded-xl bg-card shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Access Denied (403 Forbidden)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Signed in as <span className="font-semibold text-foreground">{session.user.email}</span>.{" "}
              {isRevokedNonInst
                ? "This non-institutional account no longer has active administrator privileges. Because candidate accounts must be @vitstudent.ac.in, this personal account has been deleted from the recruitment portal."
                : "This account does not possess administrator privileges for the recruitment portal."}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In with VIT Account
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Resolve user role and department assignments
  const userRoleInfo = getUserAdminRole(session.user, roleConfig);
  const userIsSuperAdmin = isSuperAdmin(session.user, roleConfig);

  let applicants = [];
  try {
    const db = await connect();
    const [formSnap, appSnap] = await Promise.all([
      db.collection("formData").get(),
      db.collection("applications").get(),
    ]);

    const allIds = new Set();
    const formMap = new Map();
    (formSnap?.docs || []).forEach((doc) => {
      const data = typeof doc.data === "function" ? doc.data() : doc;
      formMap.set(doc.id, data);
      allIds.add(doc.id);
    });

    const appMap = new Map();
    (appSnap?.docs || []).forEach((doc) => {
      const data = typeof doc.data === "function" ? doc.data() : doc;
      appMap.set(doc.id, data);
      allIds.add(doc.id);
    });

    applicants = Array.from(allIds).map((id) => {
      const fData = formMap.get(id) || {};
      const bData = appMap.get(id) || {};
      const serialized = serializeFirestoreData(fData);
      return {
        ...serialized,
        id,
        _id: id,
        Name: fData.Name || bData.applicantName || "Candidate",
        RegistrationNumber: fData.RegistrationNumber || bData.registrationNumber || "",
        Email: fData.Email || bData.applicantEmail || "",
        Department: fData.Department || bData.departmentName || bData.departmentId || "",
        shortlisted: Boolean(bData.shortlisted ?? fData.shortlisted ?? fData.Shortlisted),
        Shortlisted: Boolean(bData.shortlisted ?? fData.shortlisted ?? fData.Shortlisted),
        status: bData.status || fData.status || (fData.shortlisted ? "shortlisted" : "pending"),
        round2Task: bData.round2Task || fData.round2Task || null,
        round2Cleared: Boolean(bData.round2Cleared ?? fData.round2Cleared),
        round3Interview: bData.round3Interview || fData.round3Interview || null,
        round1MailSent: Boolean(bData.round1MailSent ?? fData.round1MailSent),
        round2MailSent: Boolean(bData.round2MailSent ?? fData.round2MailSent),
        round3MailSent: Boolean(bData.round3MailSent ?? fData.round3MailSent),
      };
    });

    // Server-side department scoping: dept_managers only see their assigned departments
    const userDepts = Array.isArray(userRoleInfo?.departments) ? userRoleInfo.departments : [];
    if (userRoleInfo?.role === "dept_manager") {
      applicants = applicants.filter((a) =>
        userDepts.includes(a.Department)
      );
    }
  } catch (error) {
    console.error("Error loading applicants in admin portal:", error);
  }

  const userDepts = Array.isArray(userRoleInfo?.departments) ? userRoleInfo.departments : [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 border border-blue-500/20 mb-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Admin Dashboard</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Applicant Review Portal
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review submitted applications, manage candidate shortlists, and export application records.
              </p>
            </div>
          </div>

          <AdminContent
            applicants={applicants}
            userRole={userRoleInfo?.role || "super_admin"}
            assignedDepartments={userDepts}
            isSuperAdmin={userIsSuperAdmin}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
