import React from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { connect, serializeFirestoreData } from "@/lib/db";
import AdminContent from "@/components/AdminContent";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let applicants = [];
  try {
    const db = await connect();
    const snapshot = await db.collection("formData").get();
    applicants = snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));
  } catch (error) {
    console.error("Error loading applicants in admin portal:", error);
  }

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

          <AdminContent applicants={applicants} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
