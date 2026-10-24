import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { HISTORY_LOOP_GUARD_SCRIPT } from "../history-loop-guard.ts";

type HistoryFn = (state: unknown, title: string, url?: string) => void;

function installGuard(startHref = "https://brt-me.com/products") {
  const nativeCalls: string[] = [];
  const documentLoads: string[] = [];
  const listeners: Array<(event: { stopImmediatePropagation(): void }) => void> = [];
  const location = new URL(startHref);
  const setPath = (url?: string) => {
    if (!url) return;
    const next = new URL(url, location.href);
    location.pathname = next.pathname;
    location.search = next.search;
  };
  const history: { replaceState: HistoryFn; pushState: HistoryFn } = {
    replaceState(_state, _title, url) {
      nativeCalls.push(String(url ?? ""));
      setPath(url);
    },
    pushState(_state, _title, url) {
      nativeCalls.push(`push:${String(url ?? "")}`);
      setPath(url);
    },
  };
  const window = {
    history,
    location: {
      get href() {
        return location.href;
      },
      get origin() {
        return location.origin;
      },
      get pathname() {
        return location.pathname;
      },
      assign: (href: string) => documentLoads.push(`assign:${href}`),
      replace: (href: string) => documentLoads.push(`replace:${href}`),
      reload: () => documentLoads.push(`reload:${location.href}`),
    },
    addEventListener(type: string, fn: (event: { stopImmediatePropagation(): void }) => void) {
      if (type === "popstate") listeners.push(fn);
    },
  };
  vm.runInNewContext(HISTORY_LOOP_GUARD_SCRIPT, { window, URL, Date, Object, RegExp, String });
  return {
    history,
    nativeCalls,
    documentLoads,
    popTo(path: string) {
      setPath(path);
      let stopped = false;
      for (const fn of listeners) fn({ stopImmediatePropagation: () => (stopped = true) });
      return stopped;
    },
  };
}

test("client navigation into /account loads it as a document", () => {
  const { history, nativeCalls, documentLoads } = installGuard();
  history.pushState({}, "", "/account");
  assert.deepEqual(nativeCalls, []);
  assert.deepEqual(documentLoads, ["assign:https://brt-me.com/account"]);
});

test("server redirect to the sign-in page during a soft navigation loads a document", () => {
  const { history, documentLoads } = installGuard();
  history.replaceState({}, "", "/en/account/login?callbackUrl=%2Faccount");
  assert.deepEqual(documentLoads, [
    "replace:https://brt-me.com/en/account/login?callbackUrl=%2Faccount",
  ]);
});

test("admin navigation into account settings loads a document; other admin pages stay soft", () => {
  const { history, nativeCalls, documentLoads } = installGuard("https://brt-me.com/admin");
  history.pushState({}, "", "/admin/products");
  assert.deepEqual(nativeCalls, ["push:/admin/products"]);
  history.pushState({}, "", "/admin/settings/account?tab=password");
  assert.deepEqual(documentLoads, [
    "assign:https://brt-me.com/admin/settings/account?tab=password",
  ]);
});

test("tab changes on the account page stay client-side", () => {
  const { history, nativeCalls, documentLoads } = installGuard(
    "https://brt-me.com/admin/settings/account",
  );
  history.replaceState({}, "", "/admin/settings/account?tab=password");
  assert.deepEqual(nativeCalls, ["/admin/settings/account?tab=password"]);
  assert.deepEqual(documentLoads, []);
});

test("back/forward onto an account page reloads it as a document", () => {
  const { popTo, documentLoads } = installGuard();
  assert.equal(popTo("/about"), false);
  assert.equal(popTo("/account"), true);
  assert.deepEqual(documentLoads, ["reload:https://brt-me.com/account"]);
});

test("history guard drops a replaceState flood", () => {
  const { history, nativeCalls } = installGuard("https://brt-me.com/admin");
  for (let i = 0; i < 40; i += 1) {
    history.replaceState({}, "", "/admin");
  }
  assert.equal(nativeCalls.length, 30);
});

test("history guard keeps analytics wrappers from recursing into replaceState", () => {
  const { history, nativeCalls } = installGuard("https://brt-me.com/admin");
  const guarded = history.replaceState;
  let wrappedCalls = 0;
  history.replaceState = function (state, title, url) {
    wrappedCalls += 1;
    return guarded.call(history, state, title, url);
  };
  for (let i = 0; i < 40; i += 1) {
    history.replaceState({}, "", "/admin");
  }
  assert.equal(nativeCalls.length, 30);
  assert.equal(wrappedCalls, 30);
  assert.equal(history.replaceState, guarded);
});
