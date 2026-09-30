import type { Team, WeaponDef, WeaponId } from "./types";

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ak: {
    id: "ak",
    name: "AK-47",
    magSize: 30,
    reserve: 90,
    rpm: 600,
    damage: 36,
    armorPen: 0.77,
    move: 0.86,
    recoil: 0.018,
    spread: 0.012,
    range: 90,
    automatic: true,
    scoped: false,
    slot: "primary",
  },
  m4: {
    id: "m4",
    name: "M4A1",
    magSize: 30,
    reserve: 90,
    rpm: 666,
    damage: 33,
    armorPen: 0.7,
    move: 0.89,
    recoil: 0.014,
    spread: 0.01,
    range: 90,
    automatic: true,
    scoped: false,
    slot: "primary",
  },
  awp: {
    id: "awp",
    name: "AWP",
    magSize: 10,
    reserve: 30,
    rpm: 41,
    damage: 115,
    armorPen: 0.97,
    move: 0.8,
    recoil: 0.04,
    spread: 0.002,
    range: 140,
    automatic: false,
    scoped: true,
    slot: "primary",
  },
  deagle: {
    id: "deagle",
    name: "Desert Eagle",
    magSize: 7,
    reserve: 35,
    rpm: 267,
    damage: 63,
    armorPen: 0.93,
    move: 0.95,
    recoil: 0.03,
    spread: 0.018,
    range: 70,
    automatic: false,
    scoped: false,
    slot: "pistol",
  },
  glock: {
    id: "glock",
    name: "Glock-18",
    magSize: 20,
    reserve: 120,
    rpm: 400,
    damage: 28,
    armorPen: 0.47,
    move: 1,
    recoil: 0.012,
    spread: 0.016,
    range: 50,
    automatic: false,
    scoped: false,
    slot: "pistol",
  },
  usp: {
    id: "usp",
    name: "USP-S",
    magSize: 12,
    reserve: 24,
    rpm: 352,
    damage: 33,
    armorPen: 0.5,
    move: 1,
    recoil: 0.01,
    spread: 0.012,
    range: 50,
    automatic: false,
    scoped: false,
    slot: "pistol",
  },
};

export function starterLoadout(team: Team, mode: string): { primary: WeaponId; pistol: WeaponId } {
  if (mode === "hvh") {
    return { primary: team === "t" ? "ak" : "m4", pistol: "deagle" };
  }
  if (mode === "aim") {
    return { primary: "ak", pistol: "usp" };
  }
  return {
    primary: team === "t" ? "ak" : "m4",
    pistol: team === "t" ? "glock" : "usp",
  };
}

export const FIRE_INTERVAL: Record<WeaponId, number> = {
  ak: 60 / 600,
  m4: 60 / 666,
  awp: 60 / 41,
  deagle: 60 / 267,
  glock: 60 / 400,
  usp: 60 / 352,
};
