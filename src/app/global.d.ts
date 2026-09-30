import type { GameMode, Team } from "@/game/types";
import type { CheatConfig } from "@/store/cheats";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      getPos: () => { x: number; y: number; z: number; yaw: number };
    };
    __havoc?: {
      play: (mode: GameMode, team: Team) => void;
      cheats: () => void;
      cfg: () => CheatConfig;
    };
  }
}

export {};
