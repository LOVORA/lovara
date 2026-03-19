import Link from "next/link";
import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Section({
  title,
  description,
  accent = "default",
  children,
}: {
  title: string;
  description?: string;
  accent?: "default" | "fuchsia" | "cyan";
  children: ReactNode;
}) {
  const accentClass =
    accent === "fuchsia"
      ? "from-fuchsia-400/8"
      : accent === "cyan"
        ? "from-cyan-400/8"
        : "from-white/[0.04]";

  return (
    <section
      className={cn(
        "rounded-[30px] border border-white/10 bg-gradient-to-br to-transparent p-5 md:p-6",
        accentClass,
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(244,114,182,0.08)]"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(244,114,182,0.08)]"
      />
    </label>
  );
}

export function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

export function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[24px] border p-4 text-left transition",
        active
          ? "border-fuchsia-400/40 bg-fuchsia-400/10 shadow-[0_0_0_1px_rgba(217,70,239,0.12),0_24px_60px_rgba(217,70,239,0.12)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]",
      )}
    >
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
    </button>
  );
}

export function VibeChip({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[22px] border px-4 py-3 text-left transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/10 shadow-[0_16px_40px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <div className="text-sm font-medium text-white">{label}</div>
      <div className="mt-1 text-xs leading-5 text-white/55">{description}</div>
    </button>
  );
}

export function MiniChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

export function RegionChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm transition",
        active
          ? "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-100"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

export function PresetCard({
  title,
  badge,
  description,
  active,
  onClick,
}: {
  title: string;
  badge: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-[26px] border p-4 text-left transition",
        active
          ? "border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-400/12 to-cyan-400/12 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]"
          : "border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] hover:border-fuchsia-400/25 hover:from-fuchsia-400/10 hover:to-cyan-400/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45 transition group-hover:text-fuchsia-100">
          {badge}
        </div>
      </div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-fuchsia-200/80">
        {active ? "Applied" : "Apply template"}
      </div>
    </button>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-white/75">{label}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-fuchsia-400"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-fuchsia-400/30 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(244,114,182,0.08)]"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#0d1020]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/80">{value}</div>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function TopNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-100 transition"
          : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
      }
    >
      {label}
    </Link>
  );
}

export function StepPill({
  title,
  active,
  complete,
  onClick,
}: {
  title: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs transition",
        active
          ? "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-100"
          : complete
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10",
      )}
    >
      {title}
    </button>
  );
}

export function DividerLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
