/** Removes the inline boot-time preloader injected before React hydrates. */
export function removeBootPreloader(): void {
  if (typeof document === "undefined") return;
  document.getElementById("azura-boot-preloader")?.remove();
}

export function buildPreloaderBootScript(maxDurationMs: number, debug = false): string {
  const debugPrefix = debug
    ? `(function(){var ep="http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";var sid="9fed69";var log=function(msg,data,hid){var body=JSON.stringify({sessionId:sid,timestamp:Date.now(),location:"preloader-boot-script:inline",message:msg,data:data||{},hypothesisId:hid,runId:"post-fix"});fetch(ep,{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":sid},body:body}).catch(function(){});fetch("/api/debug/flash-probe",{method:"POST",headers:{"Content-Type":"application/json"},body:body}).catch(function(){});};`
    : `(function(){var log=function(){};`;

  return `${debugPrefix}(function(){var removeBoot=function(){var el=document.getElementById("azura-boot-preloader");if(el)el.remove();};var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(reduced){log("boot skip reduced motion",{},"H5");removeBoot();document.documentElement.classList.remove("site-preloading");document.dispatchEvent(new CustomEvent("azura:shell-ready"));return;}document.documentElement.classList.add("site-preloading");log("site-preloading added",{perfNow:performance.now()},"H2");var boot=document.createElement("div");boot.id="azura-boot-preloader";boot.className="az-preloader az-preloader--fullscreen";boot.setAttribute("aria-hidden","true");boot.innerHTML='<div class="pre-bg" aria-hidden></div><div class="pre-stage"><div class="pre-center"><span class="pre-text">Loading</span></div></div>';document.body.appendChild(boot);var cleared=false;var clear=function(reason){if(cleared)return;cleared=true;log("boot safety clear",{reason:reason,perfNow:performance.now(),preloaderMounted:!!document.querySelector(".az-preloader:not(.hidden)")},"H2");removeBoot();document.documentElement.classList.remove("site-preloading");document.dispatchEvent(new CustomEvent("azura:shell-ready"));};setTimeout(function(){clear("max-timeout");},${maxDurationMs});})();})();`;
}
