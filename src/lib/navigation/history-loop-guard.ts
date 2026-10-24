/**
 * Root-document guard around history.pushState / history.replaceState.
 *
 * 1. Auth pages load as a document. Links, router.push, server redirect()
 *    during a client navigation, and back/forward all end in pushState,
 *    replaceState, or popstate with the destination URL. Committing
 *    /account or /admin/settings/account that way leaves a blank page (the
 *    redirect crosses layout trees and auth layouts), while a full load
 *    renders. When the pathname changes to one of those pages, the guard
 *    loads it as a document instead.
 *
 * 2. Replace-state floods are dropped. GA4 (gtag.js) and Meta Pixel
 *    (fbevents.js) wrap these methods and call them again; Next treats that
 *    as another navigation and React keeps re-rendering until Chrome
 *    throttles navigation (crbug.com/1038223). A short burst still goes
 *    through; further calls in that second are dropped. Re-entrant wrappers
 *    call the native method so they cannot recurse.
 *
 * The guard stays the function callers actually invoke, even after
 * analytics assigns its own wrapper.
 */
export const DOCUMENT_NAVIGATION_PATH_PATTERN =
  "^(?:/[a-z]{2}(?:-[a-z0-9]{2,8})?)?/(?:account(?:/.*)?|admin/settings/account(?:/.*)?)$";

export const HISTORY_LOOP_GUARD_SCRIPT = `(function(){
  var history = window.history;
  var nativeReplace = history.replaceState;
  var nativePush = history.pushState;
  var innerReplace = nativeReplace;
  var innerPush = nativePush;
  var depth = 0;
  var stamps = [];
  var leaving = false;
  var documentPath = new RegExp(${JSON.stringify(DOCUMENT_NAVIGATION_PATH_PATTERN)}, "i");

  function trimPath(pathname) {
    return pathname.length > 1 ? pathname.replace(/\\/+$/, "") : pathname;
  }

  var shownPath = trimPath(window.location.pathname);

  function documentTarget(url) {
    if (url == null || url === "") return null;
    var next;
    try {
      next = new URL(String(url), window.location.href);
    } catch (e) {
      return null;
    }
    if (next.origin !== window.location.origin) return null;
    var nextPath = trimPath(next.pathname);
    if (nextPath === trimPath(window.location.pathname)) return null;
    return documentPath.test(nextPath) ? next.href : null;
  }

  function isFlood() {
    var now = Date.now();
    var kept = [];
    for (var i = 0; i < stamps.length; i += 1) {
      if (now - stamps[i] < 1000) kept.push(stamps[i]);
    }
    kept.push(now);
    stamps = kept;
    return kept.length > 30;
  }

  function guarded(native, inner, leave) {
    return function (state, title, url) {
      if (depth > 0) return native().call(history, state, title, url);
      if (leaving) return;
      var target = documentTarget(url);
      if (target) {
        leaving = true;
        leave(target);
        return;
      }
      if (isFlood()) return;
      depth += 1;
      try {
        return inner().call(history, state, title, url);
      } finally {
        depth -= 1;
        shownPath = trimPath(window.location.pathname);
      }
    };
  }

  var wrappedReplace = guarded(
    function () { return nativeReplace; },
    function () { return innerReplace; },
    function (target) { window.location.replace(target); }
  );
  var wrappedPush = guarded(
    function () { return nativePush; },
    function () { return innerPush; },
    function (target) { window.location.assign(target); }
  );

  function own(name, wrapped, assignInner) {
    try {
      Object.defineProperty(history, name, {
        configurable: true,
        enumerable: true,
        get: function () { return wrapped; },
        set: function (fn) {
          if (typeof fn === "function" && fn !== wrapped) assignInner(fn);
        }
      });
    } catch (e) {
      history[name] = wrapped;
    }
  }

  own("replaceState", wrappedReplace, function (fn) { innerReplace = fn; });
  own("pushState", wrappedPush, function (fn) { innerPush = fn; });

  window.addEventListener("popstate", function (event) {
    var path = trimPath(window.location.pathname);
    if (path !== shownPath && documentPath.test(path)) {
      event.stopImmediatePropagation();
      leaving = true;
      window.location.reload();
      return;
    }
    shownPath = path;
  }, true);
})();`;
