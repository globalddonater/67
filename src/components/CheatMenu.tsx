import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Crosshair,
  Eye,
  RotateCcw,
  Target,
  Users,
  Wrench,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCheats, type CheatConfig } from "@/store/cheats";
import { useSession } from "@/store/session";
import type { CheatTab } from "@/game/types";

const TABS: { id: CheatTab; label: string; icon: typeof Crosshair }[] = [
  { id: "rage", label: "Rage", icon: Crosshair },
  { id: "aa", label: "Anti-aim", icon: RotateCcw },
  { id: "legit", label: "Legit", icon: Target },
  { id: "visuals", label: "Visuals", icon: Eye },
  { id: "misc", label: "Misc", icon: Wrench },
  { id: "players", label: "Players", icon: Users },
  { id: "configs", label: "Configs", icon: Save },
];

export function CheatMenu() {
  const open = useCheats((s) => s.menuOpen);
  const tab = useCheats((s) => s.tab);
  const setTab = useCheats((s) => s.setTab);
  const setMenuOpen = useCheats((s) => s.setMenuOpen);
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      setPos({
        x: drag.current.l + e.clientX - drag.current.x,
        y: drag.current.t + e.clientY - drag.current.y,
      });
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center p-3">
      <div
        ref={box}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        className="pointer-events-auto flex h-[min(560px,86dvh)] w-full max-w-[840px] overflow-hidden rounded-lg border border-border bg-[#0c0c10]/95 text-[#d8dbe2] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-white/5 bg-black/30 py-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={t.label}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-md transition-colors",
                  on ? "bg-accent text-accent-fg" : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex h-12 cursor-grab items-center justify-between border-b border-white/5 px-4 active:cursor-grabbing"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, l: pos.x, t: pos.y };
            }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-mono text-[13px] font-medium tracking-wide text-fg">HAVOC.cc</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-dim">{TABS.find((x) => x.id === tab)?.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "rage" && <RageTab />}
            {tab === "aa" && <AaTab />}
            {tab === "legit" && <LegitTab />}
            {tab === "visuals" && <VisTab />}
            {tab === "misc" && <MiscTab />}
            {tab === "players" && <PlayersTab />}
            {tab === "configs" && <CfgTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 rounded-md border border-white/6 bg-white/[0.03] p-3">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-sm px-1 py-1.5 text-left text-[13px] hover:bg-white/5"
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border",
          checked ? "border-accent bg-accent" : "border-white/25 bg-transparent",
        )}
      >
        {checked ? <span className="h-1.5 w-1.5 bg-accent-fg" /> : null}
      </span>
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block px-1 py-1.5 text-[13px]">
      <span className="mb-1 flex justify-between text-muted">
        {label}
        <span className="font-mono text-fg">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block px-1 py-1.5 text-[13px]">
      <span className="mb-1 block text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full rounded-sm border border-white/10 bg-[#141418] px-2 text-fg"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function usePatch<K extends keyof CheatConfig>(group: K) {
  const cfg = useCheats((s) => s.cfg[group]);
  const patch = useCheats((s) => s.patch);
  return [cfg, (p: Partial<CheatConfig[K]>) => patch(group, p)] as const;
}

function RageTab() {
  const [r, set] = usePatch("rage");
  return (
    <>
      <Group title="Aimbot">
        <Check label="Enabled" checked={r.enabled} onChange={(v) => set({ enabled: v })} />
        <Check label="Silent aim" checked={r.silent} onChange={(v) => set({ silent: v })} />
        <Check label="Autoshoot" checked={r.autoshoot} onChange={(v) => set({ autoshoot: v })} />
        <Check label="Autoscope" checked={r.autoscope} onChange={(v) => set({ autoscope: v })} />
        <Check label="Autowall" checked={r.autowall} onChange={(v) => set({ autowall: v })} />
        <Select
          label="Hitbox"
          value={r.hitbox}
          onChange={(v) => set({ hitbox: v })}
          options={[
            { id: "auto", name: "Auto" },
            { id: "head", name: "Head" },
            { id: "body", name: "Body" },
          ]}
        />
      </Group>
      <Group title="Accuracy">
        <Slider label="FOV" value={r.fov} min={1} max={180} step={1} onChange={(v) => set({ fov: v })} />
        <Slider label="Hitchance" value={r.hitchance} min={0} max={100} step={1} onChange={(v) => set({ hitchance: v })} />
        <Slider label="Min damage" value={r.minDamage} min={1} max={100} step={1} onChange={(v) => set({ minDamage: v })} />
      </Group>
    </>
  );
}

function AaTab() {
  const [a, set] = usePatch("aa");
  return (
    <>
      <Group title="Angles">
        <Check label="Enabled" checked={a.enabled} onChange={(v) => set({ enabled: v })} />
        <Select
          label="Pitch"
          value={a.pitch}
          onChange={(v) => set({ pitch: v })}
          options={[
            { id: "off", name: "Off" },
            { id: "down", name: "Down" },
            { id: "up", name: "Up" },
            { id: "zero", name: "Zero" },
            { id: "jitter", name: "Jitter" },
          ]}
        />
        <Select
          label="Yaw"
          value={a.yaw}
          onChange={(v) => set({ yaw: v })}
          options={[
            { id: "off", name: "Off" },
            { id: "back", name: "Backward" },
            { id: "jitter", name: "Jitter" },
            { id: "spin", name: "Spin" },
            { id: "freestand", name: "Freestanding" },
          ]}
        />
        <Slider label="Yaw offset" value={a.yawOffset} min={-180} max={180} step={1} onChange={(v) => set({ yawOffset: v })} />
        <Slider label="Jitter" value={a.jitterRange} min={0} max={90} step={1} onChange={(v) => set({ jitterRange: v })} />
      </Group>
      <Group title="Fake lag">
        <Check label="Enabled" checked={a.fakeLag} onChange={(v) => set({ fakeLag: v })} />
        <Slider label="Limit" value={a.fakeLagLimit} min={1} max={16} step={1} onChange={(v) => set({ fakeLagLimit: v })} />
      </Group>
    </>
  );
}

function LegitTab() {
  const [l, set] = usePatch("legit");
  return (
    <>
      <Group title="General">
        <Check label="Enabled" checked={l.enabled} onChange={(v) => set({ enabled: v })} />
        <Check label="Recoil control" checked={l.rcs} onChange={(v) => set({ rcs: v })} />
        <Slider label="FOV" value={l.fov} min={1} max={30} step={0.5} onChange={(v) => set({ fov: v })} />
        <Slider label="Smooth" value={l.smooth} min={1} max={20} step={0.5} onChange={(v) => set({ smooth: v })} />
      </Group>
      <Group title="Triggerbot">
        <Check label="Enabled" checked={l.trigger} onChange={(v) => set({ trigger: v })} />
        <Slider label="Delay ms" value={l.triggerDelay} min={0} max={200} step={5} onChange={(v) => set({ triggerDelay: v })} />
      </Group>
    </>
  );
}

function VisTab() {
  const [v, set] = usePatch("visuals");
  return (
    <>
      <Group title="ESP">
        <Check label="Bounding box" checked={v.box} onChange={(x) => set({ box: x })} />
        <Check label="Name" checked={v.name} onChange={(x) => set({ name: x })} />
        <Check label="Health" checked={v.health} onChange={(x) => set({ health: x })} />
        <Check label="Skeleton" checked={v.skeleton} onChange={(x) => set({ skeleton: x })} />
        <Check label="Team check" checked={v.teamCheck} onChange={(x) => set({ teamCheck: x })} />
        <Check label="Radar" checked={v.radar} onChange={(x) => set({ radar: x })} />
      </Group>
      <Group title="Models">
        <Check label="Chams" checked={v.chams} onChange={(x) => set({ chams: x })} />
        <Check label="XQZ / through walls" checked={v.xqz} onChange={(x) => set({ xqz: x })} />
        <Check label="Glow" checked={v.glow} onChange={(x) => set({ glow: x })} />
      </Group>
      <Group title="Effects">
        <Check label="Bullet tracers" checked={v.tracers} onChange={(x) => set({ tracers: x })} />
        <Check label="Hitmarkers" checked={v.hitmarkers} onChange={(x) => set({ hitmarkers: x })} />
        <Check label="Recoil crosshair" checked={v.recoilCross} onChange={(x) => set({ recoilCross: x })} />
        <Check label="Watermark" checked={v.watermark} onChange={(x) => set({ watermark: x })} />
        <Check label="Third person" checked={v.thirdperson} onChange={(x) => set({ thirdperson: x })} />
        <Check label="Night mode" checked={v.nightmode} onChange={(x) => set({ nightmode: x })} />
        <Slider label="Camera FOV" value={v.fov} min={60} max={120} step={1} onChange={(x) => set({ fov: x })} />
        <Slider label="Aspect" value={v.aspect} min={1} max={2.4} step={0.05} onChange={(x) => set({ aspect: x })} />
      </Group>
    </>
  );
}

function MiscTab() {
  const [m, set] = usePatch("misc");
  return (
    <>
      <Group title="Movement">
        <Check label="Bunny hop" checked={m.bhop} onChange={(v) => set({ bhop: v })} />
        <Check label="Autostrafer" checked={m.autostrafer} onChange={(v) => set({ autostrafer: v })} />
        <Check label="Speedhack" checked={m.speedhack} onChange={(v) => set({ speedhack: v })} />
        <Check label="Noclip" checked={m.noclip} onChange={(v) => set({ noclip: v })} />
        <Slider label="TP distance" value={m.thirdpersonDist} min={1} max={4} step={0.1} onChange={(v) => set({ thirdpersonDist: v })} />
      </Group>
      <Group title="Other">
        <Check label="Auto reload" checked={m.autoReload} onChange={(v) => set({ autoReload: v })} />
        <Check label="Auto pistol" checked={m.autoPistol} onChange={(v) => set({ autoPistol: v })} />
        <Check label="Hitsound" checked={m.hitsound} onChange={(v) => set({ hitsound: v })} />
        <Check label="Infinite ammo" checked={m.infiniteAmmo} onChange={(v) => set({ infiniteAmmo: v })} />
        <Check label="Clan tag HAVOC" checked={m.clanTag} onChange={(v) => set({ clanTag: v })} />
      </Group>
    </>
  );
}

function PlayersTab() {
  const players = useSession((s) => s.hud.players.filter((p) => !p.isPlayer));
  const friends = useCheats((s) => s.friends);
  const toggle = useCheats((s) => s.toggleFriend);
  return (
    <Group title="Whitelist">
      {players.length === 0 ? (
        <p className="col-span-2 px-1 text-sm text-muted">Список появится в матче.</p>
      ) : (
        players.map((p) => (
          <Check
            key={p.id}
            label={`${p.name}  [${p.team.toUpperCase()}]`}
            checked={friends.includes(p.id)}
            onChange={() => toggle(p.id)}
          />
        ))
      )}
    </Group>
  );
}

function CfgTab() {
  const load = useCheats((s) => s.loadPreset);
  const reset = useCheats((s) => s.reset);
  return (
    <Group title="Presets">
      <button type="button" onClick={() => load("legit")} className="h-10 rounded-sm border border-white/10 bg-white/5 text-sm">
        Legit
      </button>
      <button type="button" onClick={() => load("rage")} className="h-10 rounded-sm border border-white/10 bg-white/5 text-sm">
        Rage
      </button>
      <button type="button" onClick={() => load("hvh")} className="h-10 rounded-sm border border-white/10 bg-white/5 text-sm">
        HVH
      </button>
      <button type="button" onClick={reset} className="h-10 rounded-sm border border-white/10 bg-white/5 text-sm">
        Default
      </button>
    </Group>
  );
}
