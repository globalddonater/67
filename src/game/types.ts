export type Team = "t" | "ct";
export type GameMode = "dm" | "comp" | "hvh" | "aim";
export type Hitbox = "head" | "body" | "auto";
export type AaPitch = "off" | "down" | "up" | "zero" | "jitter";
export type AaYaw = "off" | "back" | "jitter" | "spin" | "freestand";
export type WeaponId = "ak" | "m4" | "awp" | "deagle" | "glock" | "usp";

export type CheatTab =
  | "rage"
  | "aa"
  | "legit"
  | "visuals"
  | "misc"
  | "players"
  | "configs";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  magSize: number;
  reserve: number;
  rpm: number;
  damage: number;
  armorPen: number;
  move: number;
  recoil: number;
  spread: number;
  range: number;
  automatic: boolean;
  scoped: boolean;
  slot: "primary" | "pistol";
}

export interface WorldBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  climb: boolean;
}

export interface KillFeedItem {
  id: number;
  attacker: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  at: number;
}

export interface HudState {
  hp: number;
  armor: number;
  mag: number;
  reserve: number;
  weapon: string;
  scoped: boolean;
  kills: number;
  deaths: number;
  assists: number;
  round: number;
  tScore: number;
  ctScore: number;
  timeLeft: number;
  aliveT: number;
  aliveCt: number;
  message: string | null;
  killfeed: KillFeedItem[];
  team: Team;
  mode: GameMode;
  money: number;
  fps: number;
  spectating: boolean;
  players: ScoreRow[];
}

export interface ScoreRow {
  id: string;
  name: string;
  team: Team;
  kills: number;
  deaths: number;
  hp: number;
  alive: boolean;
  isPlayer: boolean;
  ping: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Actor {
  id: string;
  name: string;
  team: Team;
  isPlayer: boolean;
  hp: number;
  armor: number;
  alive: boolean;
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  eye: number;
  crouch: boolean;
  grounded: boolean;
  weapon: WeaponId;
  mag: number;
  reserve: number;
  nextShot: number;
  reloading: number;
  kills: number;
  deaths: number;
  assists: number;
  spawn: Vec3;
  waypoint: number;
  lastShotAt: number;
  lastKnown: Vec3 | null;
  flashUntil: number;
  deadUntil: number;
  aaYaw: number;
  visible: boolean;
  friend: boolean;
  money: number;
  scoped: boolean;
  spread: number;
  bob: number;
}

export interface MatchConfig {
  mode: GameMode;
  team: Team;
}
