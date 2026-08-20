import Script from "next/script";

type Props = {
  htmlAttributes: Record<string, string>;
  cursorEffect?: string | null;
};

function buildThemeDocumentAttributesScript(
  htmlAttributes: Record<string, string>,
  cursorEffect: string | null,
): string {
  const attrsJson = JSON.stringify(htmlAttributes);
  const cursorJson = JSON.stringify(cursorEffect);
  return `(function(){try{var attrs=${attrsJson};var cursorId=${cursorJson};var root=document.documentElement;var body=document.body;if(!attrs||root.getAttribute("data-visitor-theme-bootstrapped")==="true")return;for(var k in attrs){if(!Object.prototype.hasOwnProperty.call(attrs,k))continue;if(k.indexOf("data-")!==0)continue;if(k==="data-theme"||k==="data-theme-mode")continue;root.setAttribute(k,attrs[k]);}if(!body)return;var bg=attrs["data-preset-background"];if(bg)body.setAttribute("data-bg-effect",bg);var cursorOn=attrs["data-site-cursor-effects"]==="on";if(cursorOn&&cursorId&&cursorId!=="default"&&cursorId!=="none"){body.setAttribute("data-cursor",cursorId);}else if(!cursorOn){body.removeAttribute("data-cursor");}}catch(e){}})();`;
}

/** Apply resolved site preset data-* hooks before hydration (after theme-init appearance boot). */
export function ThemeDocumentAttributes({ htmlAttributes, cursorEffect = null }: Props) {
  return (
    <Script
      id="az-theme-doc-attrs"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: buildThemeDocumentAttributesScript(htmlAttributes, cursorEffect),
      }}
    />
  );
}
