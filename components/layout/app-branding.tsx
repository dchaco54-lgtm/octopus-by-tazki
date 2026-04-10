import Link from "next/link";
import Image from "next/image";

function TazkiOctopusMark() {
  return (
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-[var(--tazki-slate-200)] bg-white shadow-sm">
      <Image
        src="/octopus-mark.png"
        alt="Octopus"
        width={72}
        height={72}
        priority
        className="h-9 w-9 object-contain"
      />
    </span>
  );
}

export function AppBranding() {
  return (
    <Link
      href="/dashboard"
      className="group inline-flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--tazki-slate-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tazki-blue-200)]"
      aria-label="Octopus by Tazki (ir al dashboard)"
      title="Octopus by Tazki"
    >
      <TazkiOctopusMark />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-2">
          <span className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--tazki-slate-950)] transition-colors group-hover:text-[var(--tazki-blue-900)]">
            Octopus
          </span>
          <span className="text-[12px] font-medium text-[var(--tazki-slate-500)]">
            by Tazki
          </span>
        </span>
      </span>
    </Link>
  );
}
