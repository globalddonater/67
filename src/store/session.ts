import { create } from "zustand";
import type { GameMode, HudState, MatchConfig, ScoreRow, Team } from "@/game/types";

export type Screen = "menu" | "play" | "match" | "settings";

const EMPTY_HUD: HudState = {
  hp: 100,
  armor: 100,
  mag: 30,
  reserve: 90,
  weapon: "AK-47",
  scoped: false,
  kills: 0,
  deaths: 0,
  assists: 0,
  round: 1,
  tScore: 0,
  ctScore: 0,
  timeLeft: 115,
  aliveT: 5,
  aliveCt: 5,
  message: null,
  killfeed: [],
  team: "t",
  mode: "dm",
  money: 800,
  fps: 0,
  spectating: false,
  players: [],
};

interface SessionState {
  screen: Screen;
  mode: GameMode | null;
  team: Team | null;
  hud: HudState;
  scoreboard: boolean;
  paused: boolean;
  clickToPlay: boolean;
  isTouch: boolean;
  sensitivity: number;
  volume: number;
  setScreen: (s: Screen) => void;
  setMode: (m: GameMode) => void;
  setTeam: (t: Team) => void;
  startMatch: (cfg?: MatchConfig) => void;
  leaveMatch: () => void;
  setHud: (h: HudState) => void;
  setScoreboard: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setClickToPlay: (v: boolean) => void;
  setIsTouch: (v: boolean) => void;
  setSensitivity: (v: number) => void;
  setVolume: (v: number) => void;
}

function loadNum(key: string, fallback: number) {
  if (typeof localStorage === "undefined") return fallback;
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const useSession = create<SessionState>((set, get) => ({
  screen: "menu",
  mode: null,
  team: null,
  hud: EMPTY_HUD,
  scoreboard: false,
  paused: false,
  clickToPlay: true,
  isTouch: false,
  sensitivity: loadNum("havoc-sens", 1.4),
  volume: loadNum("havoc-vol", 0.7),
  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode, screen: "play" }),
  setTeam: (team) => set({ team }),
  startMatch: (cfg) => {
    const mode = cfg?.mode ?? get().mode ?? "dm";
    const team = cfg?.team ?? get().team ?? "t";
    set({
      mode,
      team,
      screen: "match",
      clickToPlay: true,
      paused: false,
      hud: { ...EMPTY_HUD, mode, team },
    });
  },
  leaveMatch: () =>
    set({
      screen: "menu",
      scoreboard: false,
      paused: false,
      clickToPlay: true,
      hud: EMPTY_HUD,
    }),
  setHud: (hud) => set({ hud }),
  setScoreboard: (scoreboard) => set({ scoreboard }),
  setPaused: (paused) => set({ paused }),
  setClickToPlay: (clickToPlay) => set({ clickToPlay }),
  setIsTouch: (isTouch) => set({ isTouch }),
  setSensitivity: (sensitivity) => {
    localStorage.setItem("havoc-sens", String(sensitivity));
    set({ sensitivity });
  },
  setVolume: (volume) => {
    localStorage.setItem("havoc-vol", String(volume));
    set({ volume });
  },
}));

export const emptyHud = EMPTY_HUD;

export type { ScoreRow };
