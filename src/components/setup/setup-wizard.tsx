"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_PRODUCT_NAME } from "@/config/site";
import { DEMO_PROFILE_META } from "@/features/setup/demo-import/profiles";
import type { InstallMode } from "@/features/setup/demo-import/types";

type Step = 1 | 2 | 3;

type SetupWizardProps = {
  setupToken?: string;
  databaseReady?: boolean;
  databaseError?: string | null;
  setupAlreadyComplete?: boolean;
};

export function SetupWizard({
  setupToken,
  databaseReady = true,
  databaseError = null,
  setupAlreadyComplete = false,
}: SetupWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(setupAlreadyComplete);
  const [loading, setLoading] = useState(false);

  const [installMode, setInstallMode] = useState<InstallMode>("blank");
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [siteUrl, setSiteUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  function handleInstallModeChange(mode: InstallMode) {
    setInstallMode(mode);
    if (mode === "blank") {
      if (!siteName || DEMO_PROFILE_META.some((p) => p.siteName === siteName)) {
        setSiteName("");
      }
      if (!tagline || DEMO_PROFILE_META.some((p) => p.tagline === tagline)) {
        setTagline("");
      }
      return;
    }
    const profile = DEMO_PROFILE_META.find((p) => p.id === mode);
    if (profile) {
      setSiteName(profile.siteName);
      setTagline(profile.tagline);
    }
  }

  async function handleFinish() {
    setError("");
    if (!databaseReady) {
      setError(databaseError ?? "Database connection failed. Fix DATABASE_URL before completing setup.");
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          tagline: tagline || undefined,
          siteUrl: siteUrl || undefined,
          adminEmail,
          adminPassword,
          adminName,
          registrationEnabled,
          installMode,
          setupToken,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        redirectTo?: string;
      };
      if (!res.ok) {
        if (res.status === 403 && data.error?.toLowerCase().includes("already completed")) {
          setAlreadyCompleted(true);
          setError("");
          return;
        }
        throw new Error(data.error ?? `Setup failed (${res.status})`);
      }
      if (!data.success) {
        throw new Error("Setup did not complete");
      }
      window.location.href = data.redirectTo ?? "/en?setup=done";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">{SITE_PRODUCT_NAME} Setup</CardTitle>
        <CardDescription>
          Step {step} of 3 —{" "}
          {step === 1 ? "Website & installation" : step === 2 ? "Admin account" : "Finish"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyCompleted ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-800 dark:text-emerald-300 space-y-3">
            <p>Setup is already complete. Your site is ready for visitors.</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/en"
                className="inline-block font-medium text-primary underline underline-offset-2"
              >
                View website
              </a>
              <a
                href="/admin/login"
                className="inline-block font-medium text-muted-foreground underline underline-offset-2"
              >
                Admin login
              </a>
            </div>
          </div>
        ) : null}
        {!databaseReady ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-2">
            <p>
              Database connection failed. In hPanel, set a valid Supabase{" "}
              <code className="text-xs">DATABASE_URL</code> (postgresql://…, password URL-encoded), then
              import <code className="text-xs">database/postgres/import-blank.sql</code> in the Supabase
              SQL Editor. Rebuild/restart the app after saving env vars.
            </p>
            {databaseError ? (
              <p className="text-xs">
                <strong>Details:</strong> {databaseError}
              </p>
            ) : null}
          </div>
        ) : null}
        {step === 1 && !alreadyCompleted && (
          <>
            <div className="space-y-3">
              <Label>Installation type</Label>
              <div className="space-y-2">
                {DEMO_PROFILE_META.map((profile) => (
                  <label
                    key={profile.id}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                      installMode === profile.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="installMode"
                      checked={installMode === profile.id}
                      onChange={() => handleInstallModeChange(profile.id)}
                      className="mt-1 size-4"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{profile.label}</span>
                      <span className="block text-sm font-semibold">{profile.title}</span>
                      <span className="text-muted-foreground block text-xs">{profile.description}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                    installMode === "blank" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="installMode"
                    checked={installMode === "blank"}
                    onChange={() => handleInstallModeChange("blank")}
                    className="mt-1 size-4"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Start Blank</span>
                    <span className="text-muted-foreground block text-xs">
                      Install without demo content. Pages, menus, and sample data stay empty.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteName">Website name</Label>
              <Input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                placeholder="My Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline (optional)</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Solutions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Public site URL (optional)</Label>
              <Input
                id="siteUrl"
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={siteName.trim().length < 2}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </>
        )}

        {step === 2 && !alreadyCompleted && (
          <>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin name</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPasswordConfirm">Confirm password</Label>
              <Input
                id="adminPasswordConfirm"
                type="password"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={
                  !adminEmail ||
                  adminPassword.length < 8 ||
                  adminPassword !== adminPasswordConfirm
                }
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 3 && !alreadyCompleted && (
          <>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border p-4">
              <input
                type="checkbox"
                checked={registrationEnabled}
                onChange={(e) => setRegistrationEnabled(e.target.checked)}
                className="size-4"
              />
              <span className="text-sm">
                Allow visitors to register accounts (favorites and inquiry history). Guests can
                still browse and submit inquiries without signing in.
              </span>
            </label>
            <p className="text-muted-foreground text-sm">
              Site: <strong>{siteName}</strong> · Admin: <strong>{adminEmail}</strong>
            </p>
            <p className="text-muted-foreground text-sm">
              Install:{" "}
              <strong>
                {installMode === "blank"
                  ? "Start Blank"
                  : installMode === "demo-brt"
                    ? "Import Demo 1 — BRT TRADING LLC"
                    : "Import Demo 2 — Safar Al-Madina"}
              </strong>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={loading || !databaseReady}
                onClick={handleFinish}
              >
                {loading ? "Saving…" : "Complete setup"}
              </Button>
            </div>
          </>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
