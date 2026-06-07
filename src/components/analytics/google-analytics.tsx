type Props = {
  gaId: string;
};

/** Server-rendered gtag loader (executable scripts belong in server HTML, not client trees). */
export function GoogleAnalytics({ gaId }: Props) {
  const init = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <script dangerouslySetInnerHTML={{ __html: init }} />
    </>
  );
}
