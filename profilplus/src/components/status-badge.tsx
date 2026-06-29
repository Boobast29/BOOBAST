import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META.EN_COURS;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", m.bg, className)}
      style={{ color: m.color }}
    >
      <span>{m.emoji}</span> {m.label}
    </span>
  );
}
