"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
  /**
   * Site key to render. Pass one only after the server confirmed a captcha is
   * actually enforced for this scope/form. When omitted the widget falls back
   * to NEXT_PUBLIC_TURNSTILE_SITE_KEY, then renders nothing.
   */
  siteKey?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Renders Cloudflare Turnstile when a site key is available.
 *
 * When no key is available the component renders nothing AND reports a null
 * token. Callers must therefore never treat a missing token as a hard failure
 * on its own: the server decides whether a token is required
 * (`resolveCaptchaFor`). Requiring one client-side while rendering nothing is
 * what produced "Complete the captcha before continuing." with no captcha.
 */
export function TurnstileField({ onToken, className, siteKey: siteKeyProp }: Props) {
  const siteKey =
    siteKeyProp?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      onToken(null);
      return;
    }

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
      setReady(true);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]',
    );
    if (existing && window.turnstile) {
      renderWidget();
    } else if (existing) {
      existing.addEventListener("load", renderWidget);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      data-turnstile-ready={ready ? "1" : "0"}
      aria-label="Captcha"
    />
  );
}
