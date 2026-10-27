"use client";

/**
 * Password reset, shared by the public "forgot password" flow.
 *
 * Three steps over two server actions:
 *   request  → email + captcha → the server mails a 6-digit code
 *   verify   → code → a short-lived ticket
 *   password → new password → done
 *
 * The browser never receives an account id: it holds only a ticket that the
 * server can map back to the address that was sent the code.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountPublicPath } from "@/features/account/account-public-path";
import {
  requestPasswordResetAction,
  verifyResetCodeAction,
  completePasswordResetAction,
} from "@/features/account/password-reset.actions";
import {
  PASSWORD_RESET_NO_DELIVERY_CONFIRMATION,
  resolvePasswordResetStage,
} from "@/features/account/password-reset-otp.helpers";

export type ResetFlowState = {
  stage: "request" | "verify" | "password" | "done";
  email: string;
  ticket: string | null;
};

const INITIAL: ResetFlowState = { stage: "request", email: "", ticket: null };

export function usePasswordResetFlow(options: {
  locale: string;
  /** Called after the password is set; navigate to sign-in or stay put. */
  redirectToLogin?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ResetFlowState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hint, setHint] = useState("");

  function reset(next: Partial<ResetFlowState>) {
    setState((current) => ({ ...current, ...next }));
  }

  async function request(input: { email: string; turnstileToken?: string | null }) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestPasswordResetAction({
        email: input.email.trim(),
        turnstileToken: input.turnstileToken ?? undefined,
        locale: options.locale,
      });
      if (!result.success) {
        setError(result.error);
        return false;
      }
      const ticket = result.ticket ?? null;
      // Ticket only when mail was accepted for this browser. Keep the generic
      // success for anti-enumeration; show a no-confirmation notice otherwise.
      setNotice(ticket ? result.message : PASSWORD_RESET_NO_DELIVERY_CONFIRMATION);
      reset({ stage: "verify", email: input.email.trim(), ticket });
      setHint(result.hint ?? "");
      return true;
    } catch {
      setError("Could not process your request. Try again later.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verify(input: { code: string }) {
    setBusy(true);
    setError("");
    try {
      const result = await verifyResetCodeAction({
        ...(state.ticket ? { ticket: state.ticket } : { email: state.email }),
        code: input.code,
      });
      if (!result.success) {
        setError(result.error);
        return false;
      }
      reset({ stage: "password", ticket: result.ticket });
      return true;
    } catch {
      setError("Could not verify the code. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function complete(input: { password: string; confirmPassword: string }) {
    if (!state.ticket) {
      setError("Request a new code to continue.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const result = await completePasswordResetAction({
        ticket: state.ticket,
        password: input.password,
        confirmPassword: input.confirmPassword,
      });
      if (!result.success) {
        setError(result.error);
        return false;
      }
      reset({ stage: "done", ticket: null });
      if (options.redirectToLogin !== false) {
        router.push(`${accountPublicPath(options.locale, "login")}?reset=1`);
        router.refresh();
      }
      return true;
    } catch {
      setError("Could not reset the password. Request a new code.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** Back to the start (or to the code step for a resend). */
  function restart() {
    setError("");
    setNotice("");
    setHint("");
    reset({ stage: "request", ticket: null });
  }

  const stage = resolvePasswordResetStage({
    hasTicket: Boolean(state.ticket),
    ticketVerified: state.stage === "password" || state.stage === "done",
  });

  return {
    state,
    stage,
    busy,
    error,
    notice,
    hint,
    request,
    verify,
    complete,
    restart,
    setError,
  };
}
