const MESSAGE = "GET STRONGER EVERYDAY";

function MarqueeTrack() {
  const items = Array.from({ length: 6 }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <span
          key={i}
          className="flex shrink-0 items-center gap-8 px-8 text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-500"
        >
          <span className="text-zinc-300">{MESSAGE}</span>
          <span className="text-[#a3e635]">✦</span>
        </span>
      ))}
    </>
  );
}

export function PromoMarquee() {
  return (
    <div
      className="relative overflow-hidden border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-zinc-950 to-transparent" />

      <div className="flex w-max animate-promo-marquee py-2">
        <div className="flex shrink-0">
          <MarqueeTrack />
        </div>
        <div className="flex shrink-0" aria-hidden>
          <MarqueeTrack />
        </div>
      </div>
    </div>
  );
}
