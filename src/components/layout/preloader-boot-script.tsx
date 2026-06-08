type Props = {
  active: boolean;
};

export function PreloaderBootScript({ active }: Props) {
  if (!active) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "document.documentElement.classList.add('site-preloading');",
      }}
    />
  );
}
