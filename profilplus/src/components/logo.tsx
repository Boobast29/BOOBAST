import { cn } from "@/lib/utils";

// Logo PROFIL+ (vectoriel, couleurs marque)
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-profil-blue shadow-md">
        <span className="text-lg font-black text-white">P</span>
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-profil-rose text-[10px] font-bold text-white">
          +
        </span>
      </div>
      {withText && (
        <div className="leading-tight">
          <span className="block text-base font-extrabold tracking-tight">
            PROFIL<span className="text-profil-rose">+</span>
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Support Diagnostic
          </span>
        </div>
      )}
    </div>
  );
}
