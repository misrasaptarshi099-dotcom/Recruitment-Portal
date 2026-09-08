"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  Crown,
  Shield,
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCog,
  Building2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRoleManagerModal({
  isOpen,
  onClose,
  allowedDepartments = [],
  isSuperAdmin: isSuperAdminProp = false,
}) {
  const [assignments, setAssignments] = useState({});
  const [validDepartments, setValidDepartments] = useState(allowedDepartments);
  const [isSuper, setIsSuper] = useState(isSuperAdminProp);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New assignment form state
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("dept_manager");
  const [newDepartments, setNewDepartments] = useState([]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const json = await res.json();
        setAssignments(json.data || {});
        setValidDepartments(json.validDepartments || allowedDepartments || []);
        setIsSuper(Boolean(json.isSuperAdmin ?? isSuperAdminProp));
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Failed to load role assignments");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("Failed to load role assignments");
    } finally {
      setLoading(false);
    }
  }, [allowedDepartments, isSuperAdminProp]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      setNewEmail("");
      setNewRole("dept_manager");
      // If department manager only manages 1 department, auto-select it!
      if (!isSuperAdminProp && allowedDepartments.length === 1) {
        setNewDepartments([allowedDepartments[0]]);
      } else {
        setNewDepartments([]);
      }
    }
  }, [isOpen, fetchRoles, isSuperAdminProp, allowedDepartments]);

  const handleDepartmentToggle = (dept) => {
    setNewDepartments((prev) =>
      prev.includes(dept)
        ? prev.filter((d) => d !== dept)
        : [...prev, dept]
    );
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    const roleToAssign = isSuper ? newRole : "dept_manager";

    if (roleToAssign === "dept_manager" && newDepartments.length === 0) {
      toast.error("Select at least one department for the manager");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: roleToAssign,
          departments: roleToAssign === "dept_manager" ? newDepartments : [],
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Role assigned successfully");
        setNewEmail("");
        setNewDepartments(!isSuper && allowedDepartments.length === 1 ? [allowedDepartments[0]] : []);
        fetchRoles();
      } else {
        toast.error(json.error || "Failed to assign role");
      }
    } catch (err) {
      console.error("Error assigning role:", err);
      toast.error("Failed to assign role");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (email) => {
    const promptMsg = isSuper
      ? `Revoke all administrator privileges for ${email}?`
      : `Revoke admin privileges for [${allowedDepartments.join(", ")}] from ${email}?`;

    if (!confirm(promptMsg)) return;

    try {
      const res = await fetch(`/api/admin/roles?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Role revoked");
        fetchRoles();
      } else {
        toast.error(json.error || "Failed to revoke role");
      }
    } catch (err) {
      console.error("Error revoking role:", err);
      toast.error("Failed to revoke role");
    }
  };

  if (!isOpen) return null;

  const assignmentEntries = Object.entries(assignments);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl z-50 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Manage Roles & Permissions
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isSuper
                    ? "Assign department managers and configure access scopes"
                    : `Grant or revoke admin privileges for ${allowedDepartments.join(", ")}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Add New Assignment Form */}
          <form onSubmit={handleAssign} className="mt-4 bg-muted/20 border border-border/60 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-amber-500" />
                <span>Add / Update Manager</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {isSuper ? "Global Authority" : `Scoped to: ${allowedDepartments.join(", ")}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="manager@vitstudent.ac.in"
                  className="rounded-lg text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                {isSuper ? (
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-background border border-input px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                  >
                    <option value="dept_manager">Department Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5 h-[38px] px-3 bg-muted/40 border border-input rounded-lg text-xs font-mono text-cyan-400">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Department Manager</span>
                  </div>
                )}
              </div>
            </div>

            {/* Department Selector (for dept_manager) */}
            {(isSuper ? newRole === "dept_manager" : true) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-amber-400" />
                    <span>Assigned Departments ({newDepartments.length} selected)</span>
                  </label>
                  {!isSuper && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Only your departments can be assigned
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {validDepartments.map((dept) => {
                    const isSelected = newDepartments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => handleDepartmentToggle(dept)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 text-amber-500 border-amber-500/40 shadow-sm"
                            : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="rounded-xl gap-2 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              <span>{saving ? "Saving Assignment..." : "Save Assignment"}</span>
            </Button>
          </form>

          {/* Current Assignments Table */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                {isSuper ? "Active Role Assignments" : `Department Managers (${allowedDepartments.join(", ")})`}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRoles}
                disabled={loading}
                className="rounded-lg gap-1.5 text-xs cursor-pointer"
              >
                <Loader2 className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {loading && assignmentEntries.length === 0 ? (
              <div role="status" aria-busy="true" className="border border-border/60 rounded-xl overflow-hidden">
                <span className="sr-only">Loading role assignments...</span>
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Departments</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {[...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-40" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-5 w-24 rounded-full" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : assignmentEntries.length === 0 ? (
              <div className="text-center py-8 bg-muted/10 border border-dashed border-border/60 rounded-xl space-y-1">
                <p className="text-xs font-mono text-muted-foreground">
                  {isSuper
                    ? "No dynamic role assignments configured."
                    : "No other managers assigned for your department(s)."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isSuper
                    ? "Use the form above to grant department manager or super admin privileges."
                    : "Use the form above to grant manager privileges for your department."}
                </p>
              </div>
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Departments</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {assignmentEntries.map(([email, entry]) => (
                      <tr key={email} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground max-w-[180px] truncate">
                          {email}
                        </td>
                        <td className="py-2.5 px-3">
                          {entry.role === "super_admin" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Crown className="h-3 w-3" />
                              <span>Super Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                              <Shield className="h-3 w-3" />
                              <span>Dept Manager</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          {entry.role === "super_admin" ? (
                            <span className="text-[11px] text-muted-foreground italic">All Departments</span>
                          ) : Array.isArray(entry.departments) && entry.departments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.departments.map((d) => (
                                <span
                                  key={d}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground border border-border/40"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleRevoke(email)}
                            className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors cursor-pointer text-xs"
                            title={
                              isSuper
                                ? "Revoke admin access"
                                : `Revoke ${allowedDepartments.join(", ")} admin access`
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
