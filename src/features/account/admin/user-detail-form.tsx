"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { useAdminFormState } from "@/hooks/use-admin-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sendCustomerPasswordResetAction,
  setCustomerPasswordAction,
  updateCustomerUserAction,
} from "@/features/account/admin/customer-user-actions";

export type CustomerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
};

function formatDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function buildInitialForm(user: CustomerDetail) {
  return {
    name: user.name,
    phone: user.phone ?? "",
    dateOfBirth: formatDateInput(user.dateOfBirth),
    addressLine1: user.addressLine1 ?? "",
    addressLine2: user.addressLine2 ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    postalCode: user.postalCode ?? "",
    country: user.country ?? "",
    marketingOptIn: user.marketingOptIn,
  };
}

type Props = {
  user: CustomerDetail;
};

export function UserDetailForm({ user }: Props) {
  const [form, setForm] = useState(() => buildInitialForm(user));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { markUnsaved, markSaved, setSaveStatus } = useAdminFormState({
    onSave: async () => {
      setLoading(true);
      setError("");
      setMessage("");
      setSaveStatus("saving");
      try {
        const result = await updateCustomerUserAction(user.id, form);
        if (!result.success) {
          setError(result.error);
          setSaveStatus("error");
          return false;
        }
        setMessage("Profile updated.");
        markSaved();
        return true;
      } catch {
        setSaveStatus("error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    onCancel: () => {
      setForm(buildInitialForm(user));
      setError("");
      setMessage("");
    },
    saveLabel: "Save profile",
    selfManagedSaveStatus: true,
    canCancel: true,
  });

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      markUnsaved();
    },
    [markUnsaved],
  );

  useEffect(() => {
    setForm(buildInitialForm(user));
  }, [user]);

  async function savePassword() {
    setLoading(true);
    setError("");
    setMessage("");
    const result = await setCustomerPasswordAction(user.id, { newPassword, confirmPassword });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  }

  async function sendReset() {
    setLoading(true);
    setError("");
    setMessage("");
    const result = await sendCustomerPasswordResetAction(user.id);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage("Password reset email sent.");
  }

  return (
    <>
      <AdminPageHeader
        title={user.name}
        description={user.email}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Back to list</Link>
          </Button>
        }
      />

      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => updateField("addressLine1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input
                id="addressLine2"
                value={form.addressLine2}
                onChange={(e) => updateField("addressLine2", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) => updateField("marketingOptIn", e.target.checked)}
              />
              Marketing opt-in
            </label>
            <Button
              type="button"
              className="lg:hidden"
              disabled={loading}
              onClick={() => {
                void (async () => {
                  setLoading(true);
                  setError("");
                  setMessage("");
                  setSaveStatus("saving");
                  try {
                    const result = await updateCustomerUserAction(user.id, form);
                    if (!result.success) {
                      setError(result.error);
                      setSaveStatus("error");
                      return;
                    }
                    setMessage("Profile updated.");
                    markSaved();
                  } catch {
                    setSaveStatus("error");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
            >
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" onClick={sendReset} disabled={loading}>
              Send password reset email
            </Button>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Set new password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <Button type="button" onClick={savePassword} disabled={loading || !newPassword}>
              Update password
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
      </div>
    </>
  );
}
