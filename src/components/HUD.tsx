import { useSession } from "@/store/session";
import { useCheats } from "@/store/cheats";
import { cn } from "@/lib/cn";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function HUD() {
  const hud = useSession((s) => s.hud);
  const scoreboard = useSession((s) => s.scoreboard);
  const leave = useSession((s) => s.leaveMatch);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
        <div className="flex items-center gap-3 rounded-md border border-border bg-bg/70 px-3 py-1.5 font-mono text-sm tabular-nums">
          <span className="font-semibold text-t">{hud.tScore}</span>
          <span className="text-muted">{fmtTime(hud.timeLeft)}</span>
          <span className="font-semibold text-ct">{hud.ctScore}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-36 z-20 flex w-64 flex-col items-end gap-1 sm:right-5">
        {hud.killfeed.map((k) => (
          <div
            key={k.id}
            className="rounded-sm bg-bg/70 px-2 py-1 font-mono text-[11px] text-fg"
          >
            <span className="text-fg">{k.attacker}</span>
            <span className="mx-1 text-dim">{k.weapon}</span>
            <span className="text-danger">{k.victim}</span>
            {k.headshot ? <span className="ml-1 text-t">HS</span> : null}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">
        <div className="flex items-end gap-4">
          <div>
            <p className="font-display text-5xl font-semibold leading-none text-hp tabular-nums">{hud.hp}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">HP · {hud.armor} AR</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{hud.weapon}</p>
          <p className="font-display text-4xl font-semibold leading-none tabular-nums">
            {hud.mag}
            <span className="text-xl text-muted"> / {hud.reserve}</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-dim">
            {hud.kills} / {hud.deaths}
          </p>
        </div>
      </div>

      {hud.message ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="font-display text-4xl font-semibold tracking-[0.12em] text-fg drop-shadow md:text-6xl">
            {hud.message}
          </p>
        </div>
      ) : null}

      {hud.spectating ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 z-20 text-center text-sm text-muted">
          Респаун...
        </p>
      ) : null}

      <button
        type="button"
        onClick={leave}
        className="absolute left-3 top-3 z-30 h-10 rounded-md border border-border bg-bg/70 px-3 text-xs uppercase tracking-[0.14em] text-muted hover:text-fg"
      >
        Меню
      </button>
      <button
        type="button"
        data-action="score"
        onPointerDown={() => useSession.getState().setScoreboard(true)}
        onPointerUp={() => useSession.getState().setScoreboard(false)}
        onPointerCancel={() => useSession.getState().setScoreboard(false)}
        className="absolute left-3 top-14 z-30 h-10 rounded-md border border-border bg-bg/70 px-3 text-xs uppercase tracking-[0.14em] text-muted hover:text-fg md:hidden"
      >
        Счёт
      </button>

      {scoreboard ? <Scoreboard /> : null}
    </>
  );
}

function Scoreboard() {
  const hud = useSession((s) => s.hud);
  const t = hud.players.filter((p) => p.team === "t").sort((a, b) => b.kills - a.kills);
  const ct = hud.players.filter((p) => p.team === "ct").sort((a, b) => b.kills - a.kills);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-surface/95 p-4">
        <p className="font-display text-2xl font-semibold">Счёт</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <TeamList title="Террористы" rows={t} accent="text-t" />
          <TeamList title="Спецназ" rows={ct} accent="text-ct" />
        </div>
      </div>
    </div>
  );
}

function TeamList({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { id: string; name: string; kills: number; deaths: number; hp: number; alive: boolean; isPlayer: boolean }[];
  accent: string;
}) {
  return (
    <div>
      <p className={cn("text-xs uppercase tracking-[0.18em]", accent)}>{title}</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "flex justify-between rounded-sm px-2 py-1 font-mono text-xs",
              r.isPlayer ? "bg-white/8" : "",
              r.alive ? "text-fg" : "text-dim",
            )}
          >
            <span>{r.name}</span>
            <span>
              {r.kills}-{r.deaths}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NlButton() {
  const toggle = useCheats((s) => s.toggleMenu);
  return (
    <button
      type="button"
      data-action="nl"
      onClick={toggle}
      className="absolute right-3 top-14 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-bg/80 font-mono text-[11px] font-medium text-accent shadow md:hidden"
      aria-label="HAVOC.cc"
    >
      NL
    </button>
  );
}
