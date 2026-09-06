"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import DataTable from "./DataTable";
import { ShieldAlert, Lock, ArrowRight, Loader2 } from "lucide-react";

function UnauthorizedView({ onDevBypass }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 text-center shadow-lg backdrop-blur-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Authentication Required
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Please sign in with an administrator account to access the recruitment admin dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          onClick={() => {
            window.location.href = "/auth/signin";
          }}
          className="w-full rounded-full gap-2"
          size="lg"
        >
          <span>Sign In as Admin</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        {process.env.NODE_ENV !== "production" && (
          <Button
            variant="outline"
            onClick={onDevBypass}
            className="w-full rounded-full text-xs text-muted-foreground hover:text-foreground"
          >
            🛠️ Preview Dashboard (Dev Mode)
          </Button>
        )}
      </div>
    </div>
  );
}

function AccessDeniedView({ onDevBypass }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-lg">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Access Denied
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Your account does not have administrator privileges for this recruitment portal.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/";
          }}
          className="rounded-full"
        >
          Return to Home
        </Button>
        {process.env.NODE_ENV !== "production" && (
          <Button
            variant="secondary"
            onClick={onDevBypass}
            className="w-full rounded-full text-xs"
          >
            🛠️ Preview Dashboard (Dev Mode)
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminContent({ applicants }) {
  const { data: session, isPending } = authClient.useSession();
  const [devBypass, setDevBypass] = React.useState(false);
  const user = session?.user;

  if (devBypass) {
    return (
      <div className="w-full">
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
          <span>🛠️ <strong>Dev Preview Mode:</strong> Viewing applicant dashboard with local administrator privileges.</span>
          <Button size="sm" variant="ghost" onClick={() => setDevBypass(false)} className="h-7 text-xs">
            Exit Preview
          </Button>
        </div>
        <DataTable data={applicants} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Verifying admin permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <UnauthorizedView onDevBypass={() => setDevBypass(true)} />;
  }

  if (user.role !== "admin") {
    return <AccessDeniedView onDevBypass={() => setDevBypass(true)} />;
  }

  return (
    <div className="w-full">
      <DataTable data={applicants} />
    </div>
  );
}
