import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AaPitch, AaYaw, CheatTab, Hitbox } from "@/game/types";

export interface CheatConfig {
  rage: {
    enabled: boolean;
    silent: boolean;
    autoshoot: boolean;
    autoscope: boolean;
    autowall: boolean;
    fov: number;
    hitchance: number;
    minDamage: number;
    hitbox: Hitbox;
  };
  aa: {
    enabled: boolean;
    pitch: AaPitch;
    yaw: AaYaw;
    yawOffset: number;
    jitterRange: number;
    fakeLag: boolean;
    fakeLagLimit: number;
  };
  legit: {
    enabled: boolean;
    fov: number;
    smooth: number;
    rcs: boolean;
    trigger: boolean;
    triggerDelay: number;
  };
  visuals: {
    box: boolean;
    name: boolean;
    health: boolean;
    skeleton: boolean;
    chams: boolean;
    xqz: boolean;
    glow: boolean;
    radar: boolean;
    tracers: boolean;
    hitmarkers: boolean;
    thirdperson: boolean;
    fov: number;
    nightmode: boolean;
    aspect: number;
    teamCheck: boolean;
    watermark: boolean;
    recoilCross: boolean;
  };
  misc: {
    bhop: boolean;
    autostrafer: boolean;
    autoReload: boolean;
    hitsound: boolean;
    infiniteAmmo: boolean;
    speedhack: boolean;
    noclip: boolean;
    autoPistol: boolean;
    clanTag: boolean;
    thirdpersonDist: number;
  };
}

export const DEFAULT_CHEATS: CheatConfig = {
  rage: {
    enabled: false,
    silent: true,
    autoshoot: true,
    autoscope: true,
    autowall: true,
    fov: 180,
    hitchance: 70,
    minDamage: 15,
    hitbox: "auto",
  },
  aa: {
    enabled: false,
    pitch: "down",
    yaw: "jitter",
    yawOffset: 180,
    jitterRange: 35,
    fakeLag: true,
    fakeLagLimit: 14,
  },
  legit: {
    enabled: false,
    fov: 8,
    smooth: 6,
    rcs: true,
    trigger: false,
    triggerDelay: 40,
  },
  visuals: {
    box: true,
    name: true,
    health: true,
    skeleton: false,
    chams: true,
    xqz: true,
    glow: false,
    radar: true,
    tracers: true,
    hitmarkers: true,
    thirdperson: false,
    fov: 90,
    nightmode: false,
    aspect: 1.7,
    teamCheck: true,
    watermark: true,
    recoilCross: true,
  },
  misc: {
    bhop: true,
    autostrafer: true,
    autoReload: true,
    hitsound: true,
    infiniteAmmo: false,
    speedhack: false,
    noclip: false,
    autoPistol: true,
    clanTag: true,
    thirdpersonDist: 1.8,
  },
};

export const HVH_PRESET: CheatConfig = {
  ...DEFAULT_CHEATS,
  rage: { ...DEFAULT_CHEATS.rage, enabled: true, hitchance: 78, minDamage: 10 },
  aa: { ...DEFAULT_CHEATS.aa, enabled: true },
  visuals: { ...DEFAULT_CHEATS.visuals, box: true, chams: true, xqz: true, thirdperson: false },
  misc: { ...DEFAULT_CHEATS.misc, bhop: true, autostrafer: true, infiniteAmmo: false },
};

export const LEGIT_PRESET: CheatConfig = {
  ...DEFAULT_CHEATS,
  rage: { ...DEFAULT_CHEATS.rage, enabled: false },
  aa: { ...DEFAULT_CHEATS.aa, enabled: false },
  legit: { ...DEFAULT_CHEATS.legit, enabled: true, fov: 6, smooth: 8, trigger: true },
  visuals: {
    ...DEFAULT_CHEATS.visuals,
    box: false,
    chams: false,
    xqz: false,
    skeleton: false,
    glow: false,
  },
  misc: { ...DEFAULT_CHEATS.misc, bhop: true, autostrafer: false, infiniteAmmo: false },
};

export const RAGE_PRESET: CheatConfig = {
  ...HVH_PRESET,
  aa: { ...HVH_PRESET.aa, yaw: "spin" },
  visuals: { ...HVH_PRESET.visuals, thirdperson: true },
  misc: { ...HVH_PRESET.misc, infiniteAmmo: true, speedhack: true },
};

interface CheatStore {
  cfg: CheatConfig;
  menuOpen: boolean;
  tab: CheatTab;
  friends: string[];
  setMenuOpen: (v: boolean) => void;
  toggleMenu: () => void;
  setTab: (t: CheatTab) => void;
  patch: <K extends keyof CheatConfig>(group: K, partial: Partial<CheatConfig[K]>) => void;
  loadPreset: (name: "default" | "hvh" | "legit" | "rage") => void;
  toggleFriend: (id: string) => void;
  reset: () => void;
}

export const useCheats = create<CheatStore>()(
  persist(
    (set, get) => ({
      cfg: structuredClone(DEFAULT_CHEATS),
      menuOpen: false,
      tab: "rage",
      friends: [],
      setMenuOpen: (v) => set({ menuOpen: v }),
      toggleMenu: () => set({ menuOpen: !get().menuOpen }),
      setTab: (tab) => set({ tab }),
      patch: (group, partial) =>
        set({
          cfg: {
            ...get().cfg,
            [group]: { ...get().cfg[group], ...partial },
          },
        }),
      loadPreset: (name) => {
        const map = {
          default: DEFAULT_CHEATS,
          hvh: HVH_PRESET,
          legit: LEGIT_PRESET,
          rage: RAGE_PRESET,
        };
        set({ cfg: structuredClone(map[name]) });
      },
      toggleFriend: (id) => {
        const friends = get().friends.includes(id)
          ? get().friends.filter((x) => x !== id)
          : [...get().friends, id];
        set({ friends });
      },
      reset: () => set({ cfg: structuredClone(DEFAULT_CHEATS), friends: [] }),
    }),
    {
      name: "havoc-nl-cfg",
      partialize: (s) => ({ cfg: s.cfg, friends: s.friends }),
      storage: createJSONStorage(() => {
        if (typeof localStorage === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
    },
  ),
);
