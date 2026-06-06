import { clientGymBackgroundImage } from "@/lib/client-ui";

export function ClientAppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -inset-4 scale-110 bg-cover bg-center bg-no-repeat opacity-[0.22] grayscale contrast-[1.2]"
        style={{ backgroundImage: `url(${clientGymBackgroundImage})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.06),transparent_40%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/72 to-black/88" />
    </div>
  );
}
