type LogoMarkProps = {
  href?: string;
  className?: string;
  badgeClassName?: string;
  ariaLabel?: string;
  wordMark?: string;
  badgeText?: string;
  useCase?: "nav" | "default";
};

export default function LogoMark({
  href = "/",
  className = "",
  badgeClassName = "",
  ariaLabel = "Molt Volt home",
  wordMark = "Molt",
  badgeText = "Volt",
  useCase = "default",
}: LogoMarkProps) {
  const wordFontSizeByUseCase = {
    nav: 24,
    default: 20,
  };
  const badgeFontSizeByUseCase = {
    nav: 20,
    default: 15,
  };
  const wordFontSizePx = wordFontSizeByUseCase[useCase] ?? wordFontSizeByUseCase.default;
  const badgeFontSizePx = badgeFontSizeByUseCase[useCase] ?? badgeFontSizeByUseCase.default;
  const badgePaddingByUseCase = {
    nav: { x: 4, y: 0 },
    default: { x: 3, y: 0 },
  };
  const badgePadding = badgePaddingByUseCase[useCase] ?? badgePaddingByUseCase.default;
  const badgeGapByUseCase = {
    nav: 6,
    default: 4,
  };
  const badgeGap = badgeGapByUseCase[useCase] ?? badgeGapByUseCase.default;
  const lineHeightByUseCase = {
    nav: 26,
    default: 20,
  };
  const lineHeightPx = lineHeightByUseCase[useCase] ?? lineHeightByUseCase.default;
  const baseClassName = "flex items-center gap-0 font-black tracking-tight text-molt-text";
  const baseBadgeClassName =
    "rounded bg-molt-accent font-bold text-black";

  return (
    <a
      href={href}
      className={[baseClassName, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      style={{ lineHeight: `${lineHeightPx}px` }}
    >
      <span style={{ fontSize: `${wordFontSizePx}px` }}>{wordMark}</span>
      <span
        className={[baseBadgeClassName, badgeClassName].filter(Boolean).join(" ")}
        style={{
          fontSize: `${badgeFontSizePx}px`,
          marginLeft: `${badgeGap}px`,
          padding: `${badgePadding.y}px ${badgePadding.x}px`,
        }}
      >
        {badgeText}
      </span>
    </a>
  );
}
