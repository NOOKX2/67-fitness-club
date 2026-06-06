import { LoginBrandLogo } from "./LoginBrandLogo";

const STREAKS: {
  top: string;
  left: string;
  height: string;
  opacity: string;
  duration: string;
  delay?: string;
}[] = [
  { top: "10%", left: "30%", height: "60%", opacity: "opacity-60", duration: "7s" },
  {
    top: "30%",
    left: "55%",
    height: "40%",
    opacity: "opacity-35",
    duration: "11s",
    delay: "-4s",
  },
  {
    top: "5%",
    left: "72%",
    height: "70%",
    opacity: "opacity-25",
    duration: "9s",
    delay: "-7s",
  },
];

const PARTICLES: {
  left: string;
  size: string;
  duration: string;
  delay?: string;
}[] = [
  { left: "15%", size: "h-[3px] w-[3px]", duration: "12s" },
  { left: "32%", size: "h-0.5 w-0.5", duration: "16s", delay: "-5s" },
  { left: "50%", size: "h-1 w-1", duration: "10s", delay: "-2s" },
  { left: "67%", size: "h-0.5 w-0.5", duration: "14s", delay: "-8s" },
  { left: "80%", size: "h-[3px] w-[3px]", duration: "18s", delay: "-3s" },
  { left: "42%", size: "h-0.5 w-0.5", duration: "13s", delay: "-11s" },
];

const STREAK_CLASS =
  "animate-login-streak pointer-events-none absolute w-0.5 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.18),transparent)]";

/** .bg-photo — Ken Burns zoom/pan on the hero background image */
function LoginBgPhoto() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 origin-center bg-[url('/login-bg.png')] bg-cover bg-center bg-no-repeat will-change-transform animate-login-ken-burns"
    />
  );
}

/** .bg-overlay — dark cinematic gradient over the photo */
function LoginBgOverlay() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.72),rgba(0,0,0,0.35)),linear-gradient(to_top,rgba(0,0,0,0.8),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent_40%)]"
    />
  );
}

export function LoginHeroPanel() {
  return (
    <div className="relative hidden flex-1 flex-col overflow-hidden bg-[#0a0a0a] md:flex">
      <LoginBgPhoto />
      <LoginBgOverlay />
      <div className="animate-login-sweep pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(107,147,184,0.06)_40%,rgba(107,147,184,0.12)_50%,rgba(107,147,184,0.06)_60%,transparent_100%)] bg-[length:300%_300%]" />

      {STREAKS.map((streak) => (
        <div
          key={`${streak.top}-${streak.left}`}
          className={`${STREAK_CLASS} ${streak.opacity}`}
          style={{
            top: streak.top,
            left: streak.left,
            height: streak.height,
            animationDuration: streak.duration,
            animationDelay: streak.delay,
          }}
        />
      ))}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((particle) => (
          <div
            key={`${particle.left}-${particle.duration}`}
            className={`animate-login-float-up absolute bottom-[-10px] rounded-full bg-white/55 ${particle.size}`}
            style={{
              left: particle.left,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:52px_52px]" />

      <div className="relative z-[3] flex min-h-screen flex-col justify-between p-12">
        <LoginBrandLogo />
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <div className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#a8c5dc]" />
            <span className="text-xs font-medium tracking-[0.15em] text-white/80 uppercase">
              Mind · Body · Sky
            </span>
          </div>
          <h1 className="mb-[22px] font-[family-name:var(--font-inter)] text-[clamp(36px,4vw,54px)] leading-[1.12] font-extrabold tracking-tight text-white">
            Train Beyond
            <br />
            Your <span className="text-[#a8c5dc]">Limits.</span>
          </h1>
          <p className="max-w-[340px] text-base leading-relaxed text-white/55">
            Strength, flexibility, and clarity — a modern training experience that unites the
            discipline of the gym with the serenity of yoga under an open sky.
          </p>
        </div>
      </div>
    </div>
  );
}
