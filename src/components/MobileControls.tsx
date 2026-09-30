import { useSession } from "@/store/session";

export function MobileControls() {
  const touch = useSession((s) => s.isTouch);
  if (!touch) return null;

  return (
    <div className="absolute inset-0 z-20 md:hidden">
      <div className="absolute bottom-[88px] left-5 h-[118px] w-[118px] rounded-full border border-white/15 bg-white/8" />
      <p className="absolute bottom-[132px] left-8 text-[10px] uppercase tracking-[0.16em] text-white/40">ход</p>
      <div className="absolute bottom-[88px] right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Btn action="ads" label="ZOOM" />
          <Btn action="reload" label="R" />
        </div>
        <div className="flex gap-2">
          <Btn action="crouch" label="CTRL" />
          <Btn action="jump" label="JMP" wide />
        </div>
        <button
          type="button"
          data-action="fire"
          className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/15 text-xs font-semibold tracking-[0.14em] text-fg"
        >
          FIRE
        </button>
      </div>
    </div>
  );
}

function Btn({ action, label, wide }: { action: string; label: string; wide?: boolean }) {
  return (
    <button
      type="button"
      data-action={action}
      className={
        wide
          ? "flex h-12 min-w-[88px] items-center justify-center rounded-md border border-white/15 bg-white/10 px-4 text-[11px] font-medium text-fg"
          : "flex h-12 w-12 items-center justify-center rounded-md border border-white/15 bg-white/10 text-[11px] font-medium text-fg"
      }
    >
      {label}
    </button>
  );
}
