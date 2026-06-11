"use client";

import { useRef, useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { mergeLocalFavoritesToServer } from "@/features/account/lib/favorites-sync";

type Props = {
  locale: string;
};

const STEPS = ["personal", "contact", "address", "security"] as const;
type StepId = (typeof STEPS)[number];

function RegisterSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)} aria-labelledby={id}>
      <div>
        <h2 id={id} className="font-heading text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function AccountRegisterForm({ locale }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const stepLabels: Record<StepId, string> = {
    personal: t("sectionPersonal"),
    contact: t("sectionContact"),
    address: t("sectionAddress"),
    security: t("sectionAccount"),
  };

  function validateCurrentStep(): boolean {
    const root = formRef.current;
    if (!root) return false;
    const panel = root.querySelector<HTMLElement>(`[data-register-step="${step}"]`);
    if (!panel) return false;
    const fields = panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    );
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goNext() {
    setError("");
    if (!validateCurrentStep()) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stepIndex < STEPS.length - 1) {
      goNext();
      return;
    }
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirmPassword") as string;
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      setLoading(false);
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password,
        phone: fd.get("phone"),
        dateOfBirth: fd.get("dateOfBirth"),
        addressLine1: fd.get("addressLine1"),
        addressLine2: fd.get("addressLine2") || "",
        city: fd.get("city"),
        state: fd.get("state") || "",
        postalCode: fd.get("postalCode") || "",
        country: fd.get("country"),
        marketingOptIn: fd.get("marketingOptIn") === "on",
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("registerFailed"));
      setLoading(false);
      return;
    }
    const signInResult = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (signInResult?.error) {
      setError(t("registerSignInFailed"));
      return;
    }
    const session = await getSession();
    if (session?.user?.role === "ADMIN") {
      await signOut({ redirect: false });
      setError(t("adminUseAdminLogin"));
      return;
    }
    if (session?.user?.role !== "CUSTOMER") {
      await signOut({ redirect: false });
      setError(t("registerSignInFailed"));
      return;
    }
    await mergeLocalFavoritesToServer(locale);
    router.push(`/${locale}/account`);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border bg-primary/5">
          <UserPlus className="size-6 text-primary" aria-hidden />
        </div>
        <CardTitle>{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerDescription")}</CardDescription>
      </CardHeader>

      <div className="px-6 pb-2">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("registerStepOf", { current: stepIndex + 1, total: STEPS.length })}</span>
          <span className="font-medium text-foreground">{stepLabels[step]}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={stepLabels[step]}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-4 hidden gap-2 sm:grid sm:grid-cols-4">
          {STEPS.map((id, index) => (
            <li key={id}>
              <span
                className={cn(
                  "block rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                  index === stepIndex
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : index < stepIndex
                      ? "border-border bg-muted/30 text-muted-foreground"
                      : "border-transparent text-muted-foreground"
                )}
              >
                {stepLabels[id]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <Separator />

      <form ref={formRef} onSubmit={handleSubmit} noValidate={stepIndex < STEPS.length - 1}>
        <CardContent className="space-y-6 pt-6">
          <div data-register-step="personal" className={cn(step !== "personal" && "hidden")}>
            <RegisterSection
              id="register-section-personal"
              title={t("sectionPersonal")}
              description={t("sectionPersonalHint")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">{t("fullName")}</Label>
                  <Input id="name" name="name" required minLength={2} autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    autoComplete="bday"
                  />
                </div>
              </div>
            </RegisterSection>
          </div>

          <div data-register-step="contact" className={cn(step !== "contact" && "hidden")}>
            <RegisterSection
              id="register-section-contact"
              title={t("sectionContact")}
              description={t("sectionContactHint")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    minLength={6}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </RegisterSection>
          </div>

          <div data-register-step="address" className={cn(step !== "address" && "hidden")}>
            <RegisterSection
              id="register-section-address"
              title={t("sectionAddress")}
              description={t("sectionAddressHint")}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">{t("addressLine1")}</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    required
                    minLength={2}
                    autoComplete="address-line1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">{t("addressLine2")}</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    autoComplete="address-line2"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("city")}</Label>
                    <Input id="city" name="city" required autoComplete="address-level2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t("state")}</Label>
                    <Input id="state" name="state" autoComplete="address-level1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{t("postalCode")}</Label>
                    <Input id="postalCode" name="postalCode" autoComplete="postal-code" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">{t("country")}</Label>
                    <Input
                      id="country"
                      name="country"
                      required
                      minLength={2}
                      autoComplete="country-name"
                    />
                  </div>
                </div>
              </div>
            </RegisterSection>
          </div>

          <div data-register-step="security" className={cn(step !== "security" && "hidden")}>
            <RegisterSection
              id="register-section-security"
              title={t("sectionAccount")}
              description={t("sectionAccountHint")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                <input
                  type="checkbox"
                  name="marketingOptIn"
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                />
                <span>{t("marketingOptIn")}</span>
              </label>
            </RegisterSection>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t bg-muted/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full gap-2 sm:w-auto">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goBack} disabled={loading}>
                <ChevronLeft className="size-4" aria-hidden />
                {t("back")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" asChild className="text-muted-foreground">
                <Link href={`/${locale}/account/login`}>{t("signIn")}</Link>
              </Button>
            )}
          </div>
          <Button type="submit" className="w-full sm:w-auto sm:min-w-[10rem]" disabled={loading}>
            {loading
              ? t("creating")
              : stepIndex < STEPS.length - 1
                ? t("continue")
                : t("register")}
          </Button>
        </CardFooter>
      </form>

      <p className="text-muted-foreground px-6 pb-6 text-center text-sm">
        {t("alreadyHaveAccount")}{" "}
        <Link href={`/${locale}/account/login`} className="text-primary font-medium underline">
          {t("signIn")}
        </Link>
      </p>
    </Card>
  );
}
