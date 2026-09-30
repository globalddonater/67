import { Play, Settings, Swords, Target, Users, Crosshair } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession } from "@/store/session";
import type { GameMode } from "@/game/types";

const MODES: { id: GameMode; title: string; sub: string; icon: typeof Play }[] = [
  { id: "dm", title: "Смертельный бой", sub: "Все против всех · боты · респаун", icon: Crosshair },
  { id: "comp", title: "Соревновательный 5 на 5", sub: "Террористы vs Спецназ · раунды", icon: Users },
  { id: "hvh", title: "1 на 1 HVH", sub: "Rage vs Rage · HAVOC.cc", icon: Swords },
  { id: "aim", title: "Тренировка", sub: "Мишени · разбор стрельбы", icon: Target },
];

export function MainMenu() {
  const screen = useSession((s) => s.screen);
  const mode = useSession((s) => s.mode);
  const setScreen = useSession((s) => s.setScreen);
  const setMode = useSession((s) => s.setMode);
  const startMatch = useSession((s) => s.startMatch);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, color-mix(in oklab, var(--color-ct) 18%, transparent), transparent 60%), radial-gradient(ellipse 50% 50% at 15% 80%, color-mix(in oklab, var(--color-t) 12%, transparent), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10">
        <div>
          <p className="font-display text-3xl font-semibold tracking-[0.22em] text-fg md:text-4xl">HAVOC</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.28em] text-muted">Tactical FPS</p>
        </div>
        <button
          type="button"
          onClick={() => setScreen("settings")}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-fg"
          aria-label="Настройки"
        >
          <Settings className="size-5" />
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-end gap-8 px-5 pb-10 md:justify-center md:px-10">
        {screen === "menu" && (
          <div className="max-w-xl">
            <h1 className="font-display text-6xl font-semibold leading-none tracking-tight md:text-8xl">Играть</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted md:text-base">
              Карта Dune · боты 5 на 5 · дэзматч · дуэль HVH. Insert или кнопка NL открывают клиент HAVOC.cc.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                data-play="1"
                onClick={() => setScreen("play")}
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-fg px-8 text-sm font-semibold tracking-wide text-bg transition-transform hover:opacity-90 active:scale-[0.98]"
              >
                <Play className="size-4 fill-current" />
                Выбрать режим
              </button>
              <button
                type="button"
                onClick={() => setScreen("settings")}
                className="h-12 rounded-md border border-border bg-surface px-6 text-sm font-medium text-fg"
              >
                Настройки
              </button>
            </div>
          </div>
        )}

        {screen === "play" && !mode && (
          <div className="w-full max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Режим</p>
            <h2 className="mt-1 font-display text-4xl font-semibold">Как играем</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className="group flex items-start gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-fg/30 hover:bg-raised"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-raised text-fg">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-display text-xl font-semibold">{m.title}</span>
                      <span className="mt-1 block text-sm text-muted">{m.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setScreen("menu")}
              className="mt-5 text-sm text-muted hover:text-fg"
            >
              Назад
            </button>
          </div>
        )}

        {screen === "play" && mode && (
          <div className="w-full max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Сторона</p>
            <h2 className="mt-1 font-display text-4xl font-semibold">Выбери команду</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => startMatch({ mode, team: "t" })}
                className="rounded-lg border border-border bg-surface p-6 text-left transition-colors hover:border-t/50"
              >
                <p className="font-display text-3xl font-semibold text-t">Террористы</p>
                <p className="mt-2 text-sm text-muted">AK-47 · Glock · тёплая сторона Dune</p>
              </button>
              <button
                type="button"
                onClick={() => startMatch({ mode, team: "ct" })}
                className="rounded-lg border border-border bg-surface p-6 text-left transition-colors hover:border-ct/50"
              >
                <p className="font-display text-3xl font-semibold text-ct">Спецназ</p>
                <p className="mt-2 text-sm text-muted">M4A1 · USP-S · холодная сторона</p>
              </button>
            </div>
            <button
              type="button"
              onClick={() => useSession.setState({ mode: null })}
              className="mt-5 text-sm text-muted hover:text-fg"
            >
              Другой режим
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 flex items-center justify-between px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-dim md:px-10">
        <span>Insert / ~  клиент</span>
        <span className="hidden sm:inline">WASD  мышь  R  Ctrl  1–2</span>
      </footer>
    </div>
  );
}

export function SettingsScreen() {
  const setScreen = useSession((s) => s.setScreen);
  const sensitivity = useSession((s) => s.sensitivity);
  const volume = useSession((s) => s.volume);
  const setSensitivity = useSession((s) => s.setSensitivity);
  const setVolume = useSession((s) => s.setVolume);

  return (
    <div className="flex h-dvh flex-col bg-bg px-5 py-8 text-fg md:px-10">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">Опции</p>
      <h1 className="mt-1 font-display text-5xl font-semibold">Настройки</h1>
      <div className="mt-8 max-w-md space-y-6">
        <label className="block">
          <span className="text-sm text-muted">Чувствительность мыши</span>
          <input
            type="range"
            min={0.4}
            max={3.5}
            step={0.1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="mt-2 w-full accent-accent"
          />
          <span className="font-mono text-xs text-dim">{sensitivity.toFixed(1)}</span>
        </label>
        <label className="block">
          <span className="text-sm text-muted">Громкость</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mt-2 w-full accent-accent"
          />
        </label>
        <p className={cn("text-sm leading-relaxed text-muted")}>
          На ПК: WASD, мышь, пробел — прыжок, Ctrl — присед, R — перезарядка, 1/2 — оружие, Tab —
          таблица, Insert — HAVOC.cc. На телефоне — стик слева, взгляд справа, кнопка NL.
        </p>
        <button
          type="button"
          onClick={() => setScreen("menu")}
          className="h-11 rounded-md bg-fg px-6 text-sm font-semibold text-bg"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
