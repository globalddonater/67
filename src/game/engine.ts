import * as THREE from "three";
import type { Actor, GameMode, HudState, KillFeedItem, MatchConfig, Team, Vec3, WeaponId, WorldBox } from "./types";
import { WEAPONS, starterLoadout } from "./weapons";
import { GameInput } from "./input";
import { GameAudio } from "./audio";
import { buildWorld, type WorldData } from "./world";
import { buildChams, buildSoldier, buildViewmodel, worldWeapon } from "./models";
import {
  actorBodyBox,
  angDiff,
  clamp,
  lookDir,
  losBlocked,
  moveCollide,
  rayAabb,
  raySphere,
  yawPitchTo,
} from "./math";
import { useCheats, type CheatConfig } from "@/store/cheats";
import { useSession } from "@/store/session";

const GRAVITY = 24;
const JUMP = 7.6;
const WALK = 5.4;
const STEP = 1 / 60;
const NAMES_T = ["KABAN", "RAX", "SMOKE", "TIGR", "N0X"];
const NAMES_CT = ["POLAR", "SOVA", "PULSE", "ICE", "GRID"];

const dir = { x: 0, y: 0, z: 0 };
const eye = { x: 0, y: 0, z: 0 };
const aim = { x: 0, y: 0, z: 0 };

function cloneV(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

function eyeOf(a: Actor): Vec3 {
  return { x: a.pos.x, y: a.pos.y + a.eye, z: a.pos.z };
}

function headOf(a: Actor): Vec3 {
  return { x: a.pos.x, y: a.pos.y + (a.crouch ? 1.12 : 1.58), z: a.pos.z };
}

function chestOf(a: Actor): Vec3 {
  return { x: a.pos.x, y: a.pos.y + (a.crouch ? 0.85 : 1.18), z: a.pos.z };
}

export class HavocGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(90, 1, 0.05, 160);
  private gunScene = new THREE.Scene();
  private gunCam = new THREE.PerspectiveCamera(55, 1, 0.02, 8);
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  private world!: WorldData;
  private boxes: WorldBox[] = [];
  private actors: Actor[] = [];
  private meshes = new Map<string, THREE.Group>();
  private chams = new Map<string, THREE.Group>();
  private guns = new Map<string, THREE.Group>();
  private viewmodel: THREE.Group | null = null;
  private viewId: WeaponId | null = null;
  private lights: THREE.Light[] = [];
  private input = new GameInput();
  private audio = new GameAudio();
  readonly canvas: HTMLCanvasElement;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private mode: GameMode = "dm";
  private playerTeam: Team = "t";
  private round = 1;
  private tScore = 0;
  private ctScore = 0;
  private timeLeft = 115;
  private roundFreeze = 1.2;
  private message: string | null = "РАУНД";
  private msgUntil = 0;
  private killfeed: KillFeedItem[] = [];
  private feedId = 1;
  private fps = 60;
  private frames = 0;
  private fpsT = 0;
  private recoilP = 0;
  private recoilY = 0;
  private shake = 0;
  private tracers: { ax: number; ay: number; bx: number; by: number; life: number }[] = [];
  private hitmarks: { x: number; y: number; life: number; hs: boolean }[] = [];
  private dmgInd: { amount: number; life: number }[] = [];
  private muzzle = 0;
  private primary: WeaponId = "ak";
  private pistol: WeaponId = "glock";
  private locked = false;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private host: HTMLElement;
  private disposed = false;
  private lastHud = 0;
  private stepPhase = 0;
  private aaSpin = 0;
  private fakeLag: Vec3 | null = null;
  private fakeLagT = 0;
  private lastMdx = 0;
  private night = false;
  private bindRoot: HTMLElement;

  constructor(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, host: HTMLElement) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.host = host;
    this.bindRoot = host;
    this.octx = overlay.getContext("2d")!;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch() ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;
    this.scene.fog = new THREE.Fog(0x8aa0b4, 28, 88);
    this.scene.background = new THREE.Color(0x7e93a8);

    this.hemi = new THREE.HemisphereLight(0xc8d4e4, 0x4a3e2a, 1.05);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d0, 1.35);
    this.sun.position.set(18, 28, 8);
    this.sun.castShadow = !this.touch();
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.camera.near = 2;
      this.sun.shadow.camera.far = 80;
      const s = 40;
      this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -s;
      this.sun.shadow.camera.right = this.sun.shadow.camera.top = s;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.scene.add(this.sun);
    this.lights.push(this.hemi, this.sun);

    this.gunScene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const gl = new THREE.DirectionalLight(0xffffff, 0.8);
    gl.position.set(0.4, 1, 0.6);
    this.gunScene.add(gl);

    this.world = buildWorld();
    this.scene.add(this.world.group);
    this.boxes = this.world.boxes;
    this.input.attach(host);
    this.resize();
    window.addEventListener("resize", this.resize);
    document.addEventListener("pointerlockchange", this.onLock);
    window.addEventListener("keydown", this.onGlobalKey);
  }

  private touch() {
    return useSession.getState().isTouch || window.matchMedia("(pointer: coarse)").matches;
  }

  start(cfg: MatchConfig) {
    this.running = true;
    this.mode = cfg.mode;
    this.playerTeam = cfg.team;
    const load = starterLoadout(cfg.team, cfg.mode);
    this.primary = load.primary;
    this.pistol = load.pistol;
    this.round = 1;
    this.tScore = 0;
    this.ctScore = 0;
    this.spawnRound(true);
    if (cfg.mode === "hvh") useCheats.getState().loadPreset("hvh");
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.exposeProbe();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.input.detach();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("pointerlockchange", this.onLock);
    window.removeEventListener("keydown", this.onGlobalKey);
    if (document.pointerLockElement) document.exitPointerLock();
    this.actors = [];
    this.meshes.forEach((m) => this.scene.remove(m));
    this.chams.forEach((m) => this.scene.remove(m));
    this.viewmodel = null;
    this.world.mats.forEach((m) => m.dispose());
    this.world.geos.forEach((g) => g.dispose());
    this.renderer.dispose();
    delete window.__controlsTest;
    delete window.__havoc;
  }

  tryLock() {
    this.audio.unlock();
    if (this.touch()) {
      useSession.getState().setClickToPlay(false);
      return;
    }
    const el = this.canvas;
    const req = el.requestPointerLock as (opts?: { unadjustedMovement?: boolean }) => Promise<void> | void;
    const p = req.call(el, { unadjustedMovement: true });
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        try {
          el.requestPointerLock();
        } catch {
          useSession.getState().setClickToPlay(false);
        }
      });
    }
  }

  private onLock = () => {
    this.locked = document.pointerLockElement === this.canvas;
    useSession.getState().setClickToPlay(!this.locked && !this.touch() && !useCheats.getState().menuOpen);
  };

  private onGlobalKey = (e: KeyboardEvent) => {
    if (e.code === "Insert" || e.code === "Home" || e.code === "Backquote") {
      e.preventDefault();
      useCheats.getState().toggleMenu();
      if (useCheats.getState().menuOpen && document.pointerLockElement) document.exitPointerLock();
    }
    if (e.code === "Tab") {
      e.preventDefault();
      useSession.getState().setScoreboard(e.type === "keydown" || !useSession.getState().scoreboard ? true : false);
    }
    if (e.code === "Tab") {
      e.preventDefault();
      useSession.getState().setScoreboard(e.type === "keydown" || !useSession.getState().scoreboard ? true : false);
    }
    if (e.code === "Escape") {
      if (useCheats.getState().menuOpen) useCheats.getState().setMenuOpen(false);
      else if (this.locked) document.exitPointerLock();
    }
  };

  private resize = () => {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.gunCam.aspect = this.camera.aspect;
    this.gunCam.updateProjectionMatrix();
    this.overlay.width = w;
    this.overlay.height = h;
  };

  private spawnRound(resetStats: boolean) {
    this.clearActors();
    const counts = this.mode === "hvh" ? 1 : this.mode === "aim" ? 5 : this.mode === "dm" ? 8 : 5;
    const load = starterLoadout(this.playerTeam, this.mode);
    this.primary = load.primary;
    this.pistol = load.pistol;
    const player = this.makeActor("you", this.playerTeam === "t" ? "YOU" : "YOU", this.playerTeam, true, 0);
    player.weapon = this.mode === "aim" ? "ak" : this.primary;
    this.actors.push(player);

    if (this.mode === "dm") {
      for (let i = 0; i < counts; i++) {
        const team: Team = i % 2 === 0 ? "t" : "ct";
        if (team === this.playerTeam && i === 0) continue;
        const name = team === "t" ? NAMES_T[i % NAMES_T.length]! : NAMES_CT[i % NAMES_CT.length]!;
        this.actors.push(this.makeActor(`b${i}`, name + i, team, false, i + 1));
      }
    } else if (this.mode === "aim") {
      for (let i = 0; i < 5; i++) {
        const a = this.makeActor(`b${i}`, `BOT${i + 1}`, this.playerTeam === "t" ? "ct" : "t", false, i);
        a.pos = { x: -16 + i * 8, y: 0, z: -8 };
        a.spawn = cloneV(a.pos);
        a.weapon = "ak";
        this.actors.push(a);
      }
    } else if (this.mode === "hvh") {
      const enemyTeam: Team = this.playerTeam === "t" ? "ct" : "t";
      const e = this.makeActor("hvh", "NEVERMISS", enemyTeam, false, 0);
      e.weapon = enemyTeam === "t" ? "ak" : "m4";
      this.actors.push(e);
    } else {
      let ti = 0;
      let ci = 0;
      for (let i = 0; i < 4; i++) {
        const a = this.makeActor(`t${i}`, NAMES_T[i]!, "t", false, ti++);
        this.actors.push(a);
      }
      for (let i = 0; i < 4; i++) {
        const a = this.makeActor(`ct${i}`, NAMES_CT[i]!, "ct", false, ci++);
        this.actors.push(a);
      }
    }

    this.timeLeft = this.mode === "comp" ? 115 : this.mode === "hvh" ? 180 : 600;
    this.roundFreeze = this.mode === "comp" ? 2 : 0.4;
    this.message = this.mode === "hvh" ? "HVH  1 НА 1" : this.mode === "dm" ? "DEATHMATCH" : this.mode === "aim" ? "ТРЕНИРОВКА" : `РАУНД ${this.round}`;
    this.msgUntil = performance.now() / 1000 + 2.2;
    if (resetStats) {
      this.tScore = 0;
      this.ctScore = 0;
    }
  }

  private makeActor(id: string, name: string, team: Team, isPlayer: boolean, spawnIdx: number): Actor {
    const spawns = team === "t" ? this.world.tSpawns : this.world.ctSpawns;
    const spawn = cloneV(spawns[spawnIdx % spawns.length]!);
    const load = starterLoadout(team, this.mode);
    const weapon = this.mode === "dm" && Math.random() < 0.2 ? "awp" : load.primary;
    const def = WEAPONS[weapon];
    const a: Actor = {
      id,
      name,
      team,
      isPlayer,
      hp: 100,
      armor: this.mode === "aim" ? 0 : 100,
      alive: true,
      pos: cloneV(spawn),
      vel: { x: 0, y: 0, z: 0 },
      yaw: team === "t" ? 0 : Math.PI,
      pitch: 0,
      eye: 1.52,
      crouch: false,
      grounded: true,
      weapon,
      mag: def.magSize,
      reserve: def.reserve,
      nextShot: 0,
      reloading: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      spawn,
      waypoint: spawnIdx % this.world.waypoints.length,
      lastShotAt: 0,
      lastKnown: null,
      flashUntil: 0,
      deadUntil: 0,
      aaYaw: 0,
      visible: true,
      friend: false,
      money: 800,
      scoped: false,
      spread: 0,
      bob: 0,
    };
    const mesh = buildSoldier(team);
    mesh.position.set(spawn.x, spawn.y, spawn.z);
    this.scene.add(mesh);
    this.meshes.set(id, mesh);
    const ch = buildChams(team);
    ch.visible = false;
    this.scene.add(ch);
    this.chams.set(id, ch);
    const wg = worldWeapon(weapon);
    mesh.add(wg);
    this.guns.set(id, wg);
    if (isPlayer) this.setViewmodel(weapon);
    return a;
  }

  private setViewmodel(id: WeaponId) {
    if (this.viewmodel) {
      this.gunCam.remove(this.viewmodel);
      this.viewmodel.traverse((o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
        }
      });
    }
    this.viewmodel = buildViewmodel(id);
    this.gunCam.add(this.viewmodel);
    this.viewId = id;
  }

  private clearActors() {
    for (const a of this.actors) {
      const m = this.meshes.get(a.id);
      if (m) this.scene.remove(m);
      const c = this.chams.get(a.id);
      if (c) this.scene.remove(c);
    }
    this.meshes.clear();
    this.chams.clear();
    this.guns.clear();
    this.actors = [];
  }

  private player() {
    return this.actors.find((a) => a.isPlayer)!;
  }

  private loop = (now: number) => {
    if (!this.running || this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    this.frames++;
    this.fpsT += raw;
    if (this.fpsT >= 0.4) {
      this.fps = this.frames / this.fpsT;
      this.frames = 0;
      this.fpsT = 0;
    }
    const cheats = useCheats.getState();
    const paused = cheats.menuOpen || useSession.getState().paused;
    if (!paused) {
      while (this.acc >= STEP) {
        this.fixed(STEP, cheats.cfg, now / 1000);
        this.acc -= STEP;
      }
    } else {
      this.acc = 0;
      this.input.consumeMouse();
    }
    this.draw(cheats.cfg, now / 1000);
    if (now - this.lastHud > 80) {
      this.lastHud = now;
      useSession.getState().setHud(this.hud());
    }
  };

  private fixed(dt: number, cfg: CheatConfig, t: number) {
    this.input.poll();
    this.roundFreeze = Math.max(0, this.roundFreeze - dt);
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.msgUntil && t > this.msgUntil) {
      this.message = null;
    }
    this.updatePlayer(dt, cfg, t);
    this.updateBots(dt, cfg, t);
    this.updateCombat(dt, cfg, t);
    this.checkRound(t);
    this.recoilP *= Math.pow(0.04, dt);
    this.recoilY *= Math.pow(0.04, dt);
    this.shake = Math.max(0, this.shake - dt * 6);
    this.muzzle = Math.max(0, this.muzzle - dt * 18);
  }

  private updatePlayer(dt: number, cfg: CheatConfig, t: number) {
    const p = this.player();
    if (!p) return;
    p.friend = false;
    const menu = useCheats.getState().menuOpen;
    const { dx, dy } = this.input.consumeMouse();
    this.lastMdx = dx;
    const sens = useSession.getState().sensitivity * 0.0022;
    const scoped = p.scoped && WEAPONS[p.weapon].scoped;
    const sMul = scoped ? 0.28 : 1;
    if (!menu && p.alive) {
      p.yaw -= dx * sens * sMul;
      p.pitch -= dy * sens * sMul;
      p.pitch = clamp(p.pitch, -1.52, 1.52);
    }

    const taps = this.input.consumeTaps();
    if (taps.slot === 1) this.giveWeapon(p, this.primary);
    if (taps.slot === 2) this.giveWeapon(p, this.pistol);
    if (taps.reload) this.startReload(p, t);

    const wantCrouch = this.input.crouchHeld;
    p.crouch = wantCrouch && p.grounded;
    p.eye = p.crouch ? 1.12 : 1.52;
    const height = p.crouch ? 1.22 : 1.74;

    if (!p.alive) {
      p.vel.y -= GRAVITY * dt;
      moveCollide(p.pos, p.vel, dt, 0.32, 0.4, this.boxes, false);
      if (t > p.deadUntil && (this.mode === "dm" || this.mode === "hvh" || this.mode === "aim")) this.respawn(p);
      this.syncMeshes(p, cfg);
      this.cam(p, cfg, dt);
      return;
    }

    if (this.roundFreeze > 0 && this.mode === "comp") {
      this.syncMeshes(p, cfg);
      this.cam(p, cfg, dt);
      return;
    }

    const def = WEAPONS[p.weapon];
    let speed = WALK * def.move * (p.crouch ? 0.48 : 1) * (this.input.has("ShiftLeft") ? 0.52 : 1);
    if (cfg.misc.speedhack) speed *= 1.38;
    if (p.scoped) speed *= 0.45;

    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    const mx = this.input.moveX;
    const my = this.input.moveY;
    let wishX = fx * my + rx * mx;
    let wishZ = fz * my + rz * mx;
    const wlen = Math.hypot(wishX, wishZ);
    if (wlen > 1) {
      wishX /= wlen;
      wishZ /= wlen;
    }

    if (p.grounded) {
      p.vel.x = wishX * speed;
      p.vel.z = wishZ * speed;
      if ((cfg.misc.bhop && this.input.jumpHeld) || (this.input.jumpHeld && !cfg.misc.bhop && p.grounded)) {
        p.vel.y = JUMP;
        p.grounded = false;
      }
    } else {
      p.vel.y -= GRAVITY * dt;
      const air = 8;
      p.vel.x += wishX * air * dt;
      p.vel.z += wishZ * air * dt;
      if (cfg.misc.autostrafer && Math.abs(dx) > 0.2) {
        const side = Math.sign(-dx);
        p.vel.x += rx * side * 14 * dt;
        p.vel.z += rz * side * 14 * dt;
      }
      const sp = Math.hypot(p.vel.x, p.vel.z);
      const cap = speed * 1.35;
      if (sp > cap) {
        p.vel.x *= cap / sp;
        p.vel.z *= cap / sp;
      }
    }

    const noclip = cfg.misc.noclip;
    if (noclip) {
      p.vel.y = (this.input.jumpHeld ? 1 : 0) * 8 + (this.input.crouchHeld ? -1 : 0) * 8;
    }
    const col = moveCollide(p.pos, p.vel, dt, 0.32, height, this.boxes, noclip);
    p.grounded = col.grounded;
    p.pos.x = clamp(p.pos.x, -32.4, 32.4);
    p.pos.z = clamp(p.pos.z, -40.4, 40.4);

    const moving = Math.hypot(p.vel.x, p.vel.z) > 0.4 && p.grounded;
    if (moving) {
      p.bob += dt * 10;
      this.stepPhase += dt * speed;
      if (this.stepPhase > 0.42) {
        this.stepPhase = 0;
        this.audio.step();
      }
    } else p.bob *= 0.9;

    if (def.scoped) {
      if (this.input.adsHeld || (cfg.rage.enabled && cfg.rage.autoscope && this.hasEnemyInFov(p, cfg, 25))) {
        p.scoped = true;
      } else p.scoped = false;
    } else p.scoped = false;

    this.applyAim(p, cfg, dt, t);
    this.tryShoot(p, cfg, t, true);
    if (cfg.misc.autoReload && p.mag <= 0) this.startReload(p, t);
    this.syncMeshes(p, cfg);
    this.cam(p, cfg, dt);
  }

  private hasEnemyInFov(p: Actor, cfg: CheatConfig, fovDeg: number) {
    return this.bestTarget(p, cfg, fovDeg, true) != null;
  }

  private applyAim(p: Actor, cfg: CheatConfig, dt: number, t: number) {
    if (cfg.rage.enabled) {
      const tgt = this.bestTarget(p, cfg, cfg.rage.fov, !cfg.rage.autowall);
      if (tgt && !cfg.rage.silent) {
        const to = cfg.rage.hitbox === "body" ? chestOf(tgt) : headOf(tgt);
        const look = yawPitchTo(eyeOf(p), to);
        p.yaw += angDiff(p.yaw, look.yaw) * Math.min(1, dt * 18);
        p.pitch += angDiff(p.pitch, look.pitch) * Math.min(1, dt * 18);
      }
    } else if (cfg.legit.enabled) {
      const tgt = this.bestTarget(p, cfg, cfg.legit.fov, true);
      if (tgt) {
        const look = yawPitchTo(eyeOf(p), headOf(tgt));
        const sm = Math.max(1, cfg.legit.smooth);
        p.yaw += angDiff(p.yaw, look.yaw) / sm;
        p.pitch += angDiff(p.pitch, look.pitch) / sm;
        if (cfg.legit.rcs) {
          p.pitch += this.recoilP * 0.15;
        }
      }
    }
  }

  private bestTarget(p: Actor, cfg: CheatConfig, fovDeg: number, visOnly: boolean): Actor | null {
    let best: Actor | null = null;
    let bestScore = 1e9;
    const origin = eyeOf(p);
    lookDir(p.yaw, p.pitch, dir);
    for (const e of this.actors) {
      if (e === p || !e.alive) continue;
      if (cfg.visuals.teamCheck && e.team === p.team && this.mode !== "dm") continue;
      if (this.mode === "dm" && e.id === p.id) continue;
      if (useCheats.getState().friends.includes(e.id) || e.friend) continue;
      const bone = cfg.rage.hitbox === "body" ? chestOf(e) : headOf(e);
      const look = yawPitchTo(origin, bone);
      const ad = Math.hypot(angDiff(p.yaw, look.yaw), angDiff(p.pitch, look.pitch));
      if (ad > (fovDeg * Math.PI) / 180) continue;
      if (visOnly) {
        const blocked = losBlocked(origin, bone, this.boxes);
        if (blocked != null) continue;
      }
      const score = ad * 2 + look.dist * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  private tryShoot(p: Actor, cfg: CheatConfig, t: number, isHuman: boolean) {
    if (!p.alive || p.reloading > t) return;
    const def = WEAPONS[p.weapon];
    if (p.mag <= 0) {
      if (isHuman && this.input.fireHeld && t > p.nextShot) {
        this.audio.empty();
        p.nextShot = t + 0.18;
      }
      return;
    }
    if (t < p.nextShot) return;

    let want = this.input.fireHeld;
    if (!isHuman) want = true;
    if (cfg.rage.enabled && cfg.rage.autoshoot && isHuman) {
      const tgt = this.bestTarget(p, cfg, cfg.rage.fov, !cfg.rage.autowall);
      if (tgt) want = true;
    }
    if (cfg.legit.enabled && cfg.legit.trigger && isHuman) {
      const tgt = this.bestTarget(p, cfg, 1.4, true);
      if (tgt) {
        if (!p.lastKnown) p.lastKnown = { x: t, y: 0, z: 0 };
        if (t * 1000 - cfg.legit.triggerDelay > 0) want = true;
      }
    }
    if (!want) {
      p.spread *= 0.85;
      return;
    }
    if (!def.automatic && isHuman && !cfg.misc.autoPistol) {
      if (t - p.lastShotAt < 0.05) return;
    }

    if (cfg.misc.infiniteAmmo) {
      p.mag = def.magSize;
      p.reserve = def.reserve;
    }
    p.mag -= 1;
    p.nextShot = t + 60 / def.rpm;
    p.lastShotAt = t;
    p.spread = Math.min(0.08, p.spread + def.spread);
    this.recoilP += def.recoil;
    this.recoilY += (Math.random() - 0.5) * def.recoil * 0.6;
    this.shake = Math.min(1.2, this.shake + 0.18);
    this.muzzle = 1;
    this.audio.shoot(p.weapon);

    let sy = p.yaw;
    let sp = p.pitch;
    const origin = eyeOf(p);
    let silentTgt: Actor | null = null;
    if (isHuman && cfg.rage.enabled) {
      silentTgt = this.bestTarget(p, cfg, cfg.rage.fov, !cfg.rage.autowall);
      if (silentTgt) {
        const hc = cfg.rage.hitchance / 100;
        if (Math.random() <= hc) {
          const bone =
            cfg.rage.hitbox === "body" ? chestOf(silentTgt) : cfg.rage.hitbox === "head" ? headOf(silentTgt) : Math.random() < 0.72 ? headOf(silentTgt) : chestOf(silentTgt);
          const look = yawPitchTo(origin, bone);
          sy = look.yaw;
          sp = look.pitch;
          if (!cfg.rage.silent) {
            p.yaw = sy;
            p.pitch = sp;
          }
        }
      }
    } else if (!isHuman) {
      const tgt = this.actors.find((a) => a.isPlayer && a.alive);
      if (tgt) {
        const look = yawPitchTo(origin, headOf(tgt));
        const acc = this.mode === "hvh" ? 0.08 : 0.18;
        sy = look.yaw + (Math.random() - 0.5) * acc;
        sp = look.pitch + (Math.random() - 0.5) * acc * 0.5;
      }
    } else {
      const spr = p.spread * (p.grounded ? 1 : 1.6) * (Math.hypot(p.vel.x, p.vel.z) > 1 ? 1.4 : 1);
      sy += (Math.random() - 0.5) * spr * 2 - this.recoilY;
      sp += (Math.random() - 0.5) * spr - this.recoilP * 0.35;
    }

    lookDir(sy, sp, dir);
    const hit = this.hitscan(p, origin, dir, cfg);
    if (isHuman && cfg.visuals.tracers) {
      const end = hit?.point ?? { x: origin.x + dir.x * 80, y: origin.y + dir.y * 80, z: origin.z + dir.z * 80 };
      this.projectTracer(origin, end);
    }
    if (hit?.actor) {
      const hs = hit.part === "head";
      const dmg0 = def.damage * (hs ? 4 : 1) * (hit.wallbang ? 0.55 : 1);
      const dmg = this.applyDamage(hit.actor, dmg0, def.armorPen, p, hs, t);
      if (isHuman) {
        this.audio.hit(hs);
        if (cfg.visuals.hitmarkers) {
          const s = this.project(hit.point);
          if (s) this.hitmarks.push({ x: s.x, y: s.y, life: 0.28, hs });
        }
        if (cfg.misc.hitsound) this.audio.hit(hs);
        this.dmgInd.push({ amount: Math.round(dmg), life: 0.6 });
      }
    }
  }

  private hitscan(src: Actor, origin: Vec3, d: Vec3, cfg: CheatConfig) {
    let wallT = 120;
    for (const b of this.boxes) {
      const t = rayAabb(origin, d, b, wallT);
      if (t != null && t > 0.05 && t < wallT) wallT = t;
    }
    let bestT = 120;
    let part: "head" | "body" = "body";
    let actor: Actor | null = null;
    let point: Vec3 = { x: origin.x + d.x * wallT, y: origin.y + d.y * wallT, z: origin.z + d.z * wallT };
    const allowWall = cfg.rage.enabled && cfg.rage.autowall && src.isPlayer;
    for (const e of this.actors) {
      if (e === src || !e.alive) continue;
      const hd = raySphere(origin, d, headOf(e), 0.14);
      if (hd != null && hd < bestT && (hd < wallT - 0.02 || allowWall)) {
        bestT = hd;
        actor = e;
        part = "head";
        point = { x: origin.x + d.x * hd, y: origin.y + d.y * hd, z: origin.z + d.z * hd };
      }
      const body = actorBodyBox(e.pos, e.crouch, 0.3);
      body.maxY = e.pos.y + (e.crouch ? 1.15 : 1.48);
      const bt = rayAabb(origin, d, body, bestT + 0.25);
      if (bt != null && bt < bestT && (bt < wallT - 0.02 || allowWall)) {
        bestT = bt;
        actor = e;
        part = "body";
        point = { x: origin.x + d.x * bt, y: origin.y + d.y * bt, z: origin.z + d.z * bt };
      }
    }
    if (!actor) {
      point = { x: origin.x + d.x * wallT, y: origin.y + d.y * wallT, z: origin.z + d.z * wallT };
    }
    const wallbang = !!(actor && wallT + 0.05 < bestT);
    return { actor, part, point, wallbang };
  }

  private applyDamage(e: Actor, amount: number, pen: number, attacker: Actor, hs: boolean, t: number) {
    if (this.mode !== "dm" && e.team === attacker.team) return 0;
    let dmg = amount;
    if (e.armor > 0) {
      const absorbed = dmg * (1 - pen) * 0.5;
      e.armor = Math.max(0, e.armor - absorbed);
      dmg -= absorbed * 0.5;
    }
    e.hp -= dmg;
    e.flashUntil = t + 0.12;
    if (e.hp <= 0) {
      e.hp = 0;
      this.kill(e, attacker, hs, t);
    } else if (e.isPlayer) {
      this.audio.hurt();
      this.shake = Math.min(1.6, this.shake + 0.4);
    }
    return dmg;
  }

  private kill(e: Actor, attacker: Actor, hs: boolean, t: number) {
    e.alive = false;
    e.deaths += 1;
    e.deadUntil = t + (this.mode === "comp" ? 999 : 2.2);
    attacker.kills += 1;
    this.audio.kill();
    this.killfeed.unshift({
      id: this.feedId++,
      attacker: attacker.name,
      victim: e.name,
      weapon: WEAPONS[attacker.weapon].name,
      headshot: hs,
      at: t,
    });
    this.killfeed = this.killfeed.slice(0, 6);
    if (e.isPlayer) this.message = "УБИТ";
    if (attacker.isPlayer) this.message = hs ? "ХЕДШОТ" : "УБИТ";
    this.msgUntil = t + 1.1;
    const mesh = this.meshes.get(e.id);
    if (mesh) mesh.rotation.x = 1.2;
  }

  private respawn(a: Actor) {
    a.alive = true;
    a.hp = 100;
    a.armor = this.mode === "aim" ? 0 : 100;
    const sp = a.team === "t" ? this.world.tSpawns : this.world.ctSpawns;
    a.spawn = cloneV(sp[Math.floor(Math.random() * sp.length)]!);
    if (this.mode === "dm") {
      a.spawn = {
        x: (Math.random() - 0.5) * 40,
        y: 0,
        z: (Math.random() - 0.5) * 50,
      };
    }
    a.pos = cloneV(a.spawn);
    a.vel = { x: 0, y: 0, z: 0 };
    const def = WEAPONS[a.weapon];
    a.mag = def.magSize;
    a.reserve = def.reserve;
    a.yaw = a.team === "t" ? 0 : Math.PI;
    a.pitch = 0;
    const mesh = this.meshes.get(a.id);
    if (mesh) mesh.rotation.x = 0;
  }

  private startReload(a: Actor, t: number) {
    const def = WEAPONS[a.weapon];
    if (a.mag >= def.magSize || a.reserve <= 0 || a.reloading > t) return;
    a.reloading = t + (def.id === "awp" ? 2.2 : 1.6);
    this.audio.reload();
  }

  private giveWeapon(a: Actor, id: WeaponId) {
    a.weapon = id;
    const def = WEAPONS[id];
    if (a.mag > def.magSize) a.mag = def.magSize;
    if (a.isPlayer) this.setViewmodel(id);
    const g = this.guns.get(a.id);
    if (g) {
      a; // keep
    }
  }

  private updateBots(dt: number, cfg: CheatConfig, t: number) {
    for (const b of this.actors) {
      if (b.isPlayer) continue;
      b.friend = useCheats.getState().friends.includes(b.id);
      if (!b.alive) {
        if (t > b.deadUntil && this.mode !== "comp") this.respawn(b);
        this.syncMeshes(b, cfg);
        continue;
      }
      if (b.reloading > 0 && t > b.reloading) {
        const def = WEAPONS[b.weapon];
        const need = def.magSize - b.mag;
        const take = Math.min(need, b.reserve);
        b.mag += take;
        b.reserve -= take;
        b.reloading = 0;
      }
      if (this.mode === "aim") {
        b.yaw += dt * 0.15;
        this.syncMeshes(b, cfg);
        continue;
      }
      if (this.roundFreeze > 0 && this.mode === "comp") {
        this.syncMeshes(b, cfg);
        continue;
      }

      const enemy = this.nearestEnemy(b);
      let fighting = false;
      if (enemy) {
        const o = eyeOf(b);
        const tgt = headOf(enemy);
        const blocked = losBlocked(o, tgt, this.boxes);
        const canSee = blocked == null || this.mode === "hvh";
        if (canSee) {
          fighting = true;
          const look = yawPitchTo(o, tgt);
          const turn = this.mode === "hvh" ? 12 : 4.5;
          b.yaw += angDiff(b.yaw, look.yaw) * Math.min(1, dt * turn);
          b.pitch += angDiff(b.pitch, look.pitch) * Math.min(1, dt * turn);
          const dist = Math.hypot(enemy.pos.x - b.pos.x, enemy.pos.z - b.pos.z);
          if (dist > 14) {
            this.steer(b, enemy.pos, dt, 3.6);
          } else if (dist < 6) {
            this.steer(b, { x: b.pos.x * 2 - enemy.pos.x, y: 0, z: b.pos.z * 2 - enemy.pos.z }, dt, 3.2);
          } else {
            b.vel.x *= 0.4;
            b.vel.z *= 0.4;
          }
          if (Math.abs(angDiff(b.yaw, look.yaw)) < 0.25) this.tryShoot(b, cfg, t, false);
        } else {
          this.steer(b, enemy.pos, dt, 4.2);
        }
      }
      if (!fighting) {
        const wp = this.world.waypoints[b.waypoint]!;
        if (Math.hypot(wp.x - b.pos.x, wp.z - b.pos.z) < 1.4) {
          b.waypoint = (b.waypoint + 1 + Math.floor(Math.random() * 3)) % this.world.waypoints.length;
        }
        this.steer(b, this.world.waypoints[b.waypoint]!, dt, 4.5);
        const look = yawPitchTo(b.pos, this.world.waypoints[b.waypoint]!);
        b.yaw += angDiff(b.yaw, look.yaw) * dt * 3;
      }

      if (!b.grounded) b.vel.y -= GRAVITY * dt;
      const col = moveCollide(b.pos, b.vel, dt, 0.32, 1.74, this.boxes, false);
      b.grounded = col.grounded;
      b.pos.x = clamp(b.pos.x, -32.4, 32.4);
      b.pos.z = clamp(b.pos.z, -40.4, 40.4);
      if (b.mag <= 0) this.startReload(b, t);
      this.syncMeshes(b, cfg);
    }
  }

  private steer(b: Actor, target: Vec3, dt: number, speed: number) {
    const dx = target.x - b.pos.x;
    const dz = target.z - b.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    b.vel.x = (dx / l) * speed;
    b.vel.z = (dz / l) * speed;
    if (b.grounded && Math.random() < dt * 0.4) b.vel.y = JUMP * 0.7;
    void dt;
  }

  private nearestEnemy(b: Actor): Actor | null {
    let best: Actor | null = null;
    let bd = 1e9;
    for (const o of this.actors) {
      if (o === b || !o.alive) continue;
      if (this.mode !== "dm" && o.team === b.team) continue;
      const d = Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private updateCombat(dt: number, _cfg: CheatConfig, t: number) {
    for (const a of this.actors) {
      if (a.reloading > 0 && t > a.reloading && a.alive) {
        const def = WEAPONS[a.weapon];
        const need = def.magSize - a.mag;
        const take = Math.min(need, a.reserve);
        a.mag += take;
        a.reserve -= take;
        a.reloading = 0;
      }
    }
    this.killfeed = this.killfeed.filter((k) => t - k.at < 6);
    void dt;
  }

  private checkRound(t: number) {
    if (this.mode === "comp") {
      const tA = this.actors.filter((a) => a.team === "t" && a.alive).length;
      const cA = this.actors.filter((a) => a.team === "ct" && a.alive).length;
      if ((tA === 0 || cA === 0 || this.timeLeft <= 0) && this.roundFreeze <= 0) {
        if (tA === 0 || (this.timeLeft <= 0 && cA > 0)) {
          this.ctScore++;
          this.message = "СПЕЦНАЗ ПОБЕДИЛ";
        } else {
          this.tScore++;
          this.message = "ТЕРРОРИСТЫ ПОБЕДИЛИ";
        }
        this.audio.win();
        this.roundFreeze = 4;
        this.msgUntil = t + 3;
        this.round += 1;
        window.setTimeout(() => {
          if (!this.disposed && this.mode === "comp") this.spawnRound(false);
        }, 2800);
      }
      if (this.tScore >= 8 || this.ctScore >= 8) {
        this.message = this.tScore > this.ctScore ? "T WIN" : "CT WIN";
      }
    }
    if (this.mode === "hvh") {
      const p = this.player();
      if (p && p.kills >= 10) {
        this.message = "ТЫ ВЫИГРАЛ HVH";
        this.msgUntil = t + 5;
      }
    }
  }

  private syncMeshes(a: Actor, cfg: CheatConfig) {
    const m = this.meshes.get(a.id);
    if (!m) return;
    m.position.set(a.pos.x, a.pos.y, a.pos.z);
    let yaw = a.yaw;
    if (cfg.aa.enabled && a.isPlayer) {
      this.aaSpin += 0.18;
      if (cfg.aa.yaw === "spin") yaw = this.aaSpin;
      else if (cfg.aa.yaw === "jitter") yaw = a.yaw + ((Math.random() - 0.5) * cfg.aa.jitterRange * Math.PI) / 180;
      else if (cfg.aa.yaw === "back") yaw = a.yaw + (cfg.aa.yawOffset * Math.PI) / 180;
      else if (cfg.aa.yaw === "freestand") yaw = a.yaw + Math.PI / 2;
      if (cfg.aa.pitch === "down") m.children[1] && (m.children[1].rotation.x = 0.9);
      if (cfg.aa.pitch === "up") m.children[1] && (m.children[1].rotation.x = -0.7);
      if (cfg.aa.fakeLag) {
        this.fakeLagT++;
        if (this.fakeLagT > cfg.aa.fakeLagLimit) {
          this.fakeLag = cloneV(a.pos);
          this.fakeLagT = 0;
        }
        if (this.fakeLag) m.position.set(this.fakeLag.x, this.fakeLag.y, this.fakeLag.z);
      }
    }
    m.rotation.y = yaw;
    m.visible = a.alive && !(a.isPlayer && !cfg.visuals.thirdperson);
    if (!a.alive) m.rotation.x = Math.min(1.35, m.rotation.x + 0.08);

    const ch = this.chams.get(a.id);
    if (ch) {
      const show =
        cfg.visuals.chams &&
        a.alive &&
        !a.isPlayer &&
        (this.mode === "dm" || !cfg.visuals.teamCheck || a.team !== this.playerTeam);
      ch.visible = show;
      ch.position.copy(m.position);
      ch.rotation.copy(m.rotation);
      ch.traverse((o: THREE.Object3D) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
          o.material.depthTest = !cfg.visuals.xqz;
        }
      });
    }
  }

  private cam(p: Actor, cfg: CheatConfig, dt: number) {
    const fov = p.scoped ? 38 : cfg.visuals.fov;
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const aspectWant = cfg.visuals.aspect;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const base = w / Math.max(1, h);
    this.camera.aspect = base * (aspectWant / 1.777);
    this.camera.updateProjectionMatrix();

    if (cfg.visuals.nightmode !== this.night) {
      this.night = cfg.visuals.nightmode;
      this.scene.fog = new THREE.Fog(this.night ? 0x12141a : 0x8aa0b4, this.night ? 18 : 28, this.night ? 60 : 88);
      this.scene.background = new THREE.Color(this.night ? 0x0e1016 : 0x7e93a8);
      this.hemi.intensity = this.night ? 0.35 : 1.05;
      this.sun.intensity = this.night ? 0.25 : 1.35;
      this.renderer.toneMappingExposure = this.night ? 0.55 : 1.05;
    }

    lookDir(p.yaw, p.pitch, dir);
    const origin = eyeOf(p);
    if (cfg.visuals.thirdperson && p.alive) {
      const dist = cfg.misc.thirdpersonDist;
      this.camera.position.set(origin.x - dir.x * dist, origin.y + 0.25 - dir.y * dist * 0.2, origin.z - dir.z * dist);
      this.camera.lookAt(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);
    } else {
      const bob = Math.sin(p.bob) * 0.025;
      this.camera.position.set(origin.x, origin.y + bob, origin.z);
      const lx = origin.x + dir.x;
      const ly = origin.y + dir.y + bob;
      const lz = origin.z + dir.z;
      this.camera.lookAt(lx, ly, lz);
    }
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.04;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.04;
    }
    void dt;
  }

  private project(v: Vec3) {
    const p = new THREE.Vector3(v.x, v.y, v.z).project(this.camera);
    const w = this.overlay.width;
    const h = this.overlay.height;
    lookDir(this.player()?.yaw ?? 0, this.player()?.pitch ?? 0, dir);
    const cam = this.camera.position;
    const vx = v.x - cam.x;
    const vy = v.y - cam.y;
    const vz = v.z - cam.z;
    if (vx * dir.x + vy * dir.y + vz * dir.z < 0.12) return null;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h };
  }

  private projectTracer(a: Vec3, b: Vec3) {
    const pa = this.project(a);
    const pb = this.project(b);
    if (pa && pb) this.tracers.push({ ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y, life: 0.18 });
  }

  private draw(cfg: CheatConfig, t: number) {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (!cfg.visuals.thirdperson && this.player()?.alive) {
      if (this.viewmodel) {
        this.viewmodel.rotation.x = -this.recoilP * 4 + Math.sin(this.player().bob) * 0.03;
        this.viewmodel.rotation.y = this.recoilY * 2;
        this.viewmodel.position.z = -0.52 - this.muzzle * 0.06;
      }
      this.renderer.clearDepth();
      this.renderer.render(this.gunScene, this.gunCam);
    }
    this.drawOverlay(cfg, t);
  }

  private drawOverlay(cfg: CheatConfig, t: number) {
    const ctx = this.octx;
    const w = this.overlay.width;
    const h = this.overlay.height;
    ctx.clearRect(0, 0, w, h);
    const p = this.player();
    if (!p) return;

    if (p.scoped && p.weapon === "awp") {
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      const r = Math.min(w, h) * 0.28;
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - r, h / 2);
      ctx.lineTo(w / 2 + r, h / 2);
      ctx.moveTo(w / 2, h / 2 - r);
      ctx.lineTo(w / 2, h / 2 + r);
      ctx.stroke();
    }

    // Crosshair
    if (!p.scoped) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const gap = 5 + p.spread * 140;
      ctx.strokeStyle = "rgba(232,234,238,0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-gap - 8, 0);
      ctx.lineTo(-gap, 0);
      ctx.moveTo(gap, 0);
      ctx.lineTo(gap + 8, 0);
      ctx.moveTo(0, -gap - 8);
      ctx.lineTo(0, -gap);
      ctx.moveTo(0, gap);
      ctx.lineTo(0, gap + 8);
      ctx.stroke();
      if (cfg.visuals.recoilCross) {
        ctx.fillStyle = "#4c8bf5";
        ctx.fillRect(-1, -1 - this.recoilP * 220, 2, 2);
      }
      ctx.restore();
    }

    for (const e of this.actors) {
      if (e.isPlayer || !e.alive) continue;
      if (this.mode !== "dm" && cfg.visuals.teamCheck && e.team === p.team) continue;
      const feet = this.project(e.pos);
      const head = this.project(headOf(e));
      if (!feet || !head) continue;
      const bh = Math.abs(head.y - feet.y);
      const bw = bh * 0.42;
      const x = head.x - bw / 2;
      const y = head.y - 6;
      const col = e.team === "t" ? "#c9a227" : "#6d8eb8";
      if (cfg.visuals.box) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x, y, bw, bh + 8);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeRect(x - 1, y - 1, bw + 2, bh + 10);
      }
      if (cfg.visuals.health) {
        const hp = e.hp / 100;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x - 5, y, 3, bh + 8);
        ctx.fillStyle = `rgb(${Math.floor(255 * (1 - hp))},${Math.floor(220 * hp)},60)`;
        ctx.fillRect(x - 5, y + (bh + 8) * (1 - hp), 3, (bh + 8) * hp);
      }
      if (cfg.visuals.name) {
        ctx.font = "600 11px Barlow, sans-serif";
        ctx.fillStyle = "#e8eaee";
        ctx.textAlign = "center";
        ctx.fillText(e.name, head.x, y - 4);
      }
      if (cfg.visuals.skeleton) {
        const chest = this.project(chestOf(e));
        if (chest) {
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.moveTo(head.x, head.y);
          ctx.lineTo(chest.x, chest.y);
          ctx.lineTo(feet.x, feet.y);
          ctx.stroke();
        }
      }
      if (cfg.visuals.glow) {
        ctx.strokeStyle = col + "55";
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 3, y - 3, bw + 6, bh + 14);
      }
    }

    if (cfg.visuals.radar) this.drawRadar(ctx, w, cfg);

    for (const tr of this.tracers) {
      ctx.strokeStyle = `rgba(76,139,245,${tr.life * 4})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tr.ax, tr.ay);
      ctx.lineTo(tr.bx, tr.by);
      ctx.stroke();
      tr.life -= 0.016;
    }
    this.tracers = this.tracers.filter((x) => x.life > 0);

    for (const hm of this.hitmarks) {
      ctx.strokeStyle = hm.hs ? "#c4453c" : "#e8eaee";
      ctx.lineWidth = 1.6;
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(w / 2 - s, h / 2 - s);
      ctx.lineTo(w / 2 - 2, h / 2 - 2);
      ctx.moveTo(w / 2 + s, h / 2 - s);
      ctx.lineTo(w / 2 + 2, h / 2 - 2);
      ctx.moveTo(w / 2 - s, h / 2 + s);
      ctx.lineTo(w / 2 - 2, h / 2 + 2);
      ctx.moveTo(w / 2 + s, h / 2 + s);
      ctx.lineTo(w / 2 + 2, h / 2 + 2);
      ctx.stroke();
      hm.life -= 0.016;
    }
    this.hitmarks = this.hitmarks.filter((x) => x.life > 0);

    if (cfg.visuals.watermark) {
      ctx.font = "600 12px JetBrains Mono, monospace";
      ctx.fillStyle = "rgba(232,234,238,0.8)";
      ctx.textAlign = "left";
      const tag = cfg.misc.clanTag ? "HAVOC.cc" : "HAVOC";
      ctx.fillText(`${tag}  |  ${Math.round(this.fps)} fps  |  ${p.name}`, 14, 22);
    }

    void t;
  }

  private drawRadar(ctx: CanvasRenderingContext2D, w: number, cfg: CheatConfig) {
    const s = 118;
    const x = w - s - 16;
    const y = 16;
    ctx.fillStyle = "rgba(10,10,11,0.62)";
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "rgba(232,234,238,0.18)";
    ctx.strokeRect(x, y, s, s);
    const p = this.player();
    const scale = 1.35;
    for (const e of this.actors) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.pos.x;
      const dz = e.pos.z - p.pos.z;
      const ca = Math.cos(-p.yaw);
      const sa = Math.sin(-p.yaw);
      const rx = dx * ca - dz * sa;
      const rz = dx * sa + dz * ca;
      const px = x + s / 2 + rx * scale;
      const pz = y + s / 2 + rz * scale;
      if (px < x || pz < y || px > x + s || pz > y + s) continue;
      ctx.fillStyle = e.isPlayer ? "#e8eaee" : e.team === "t" ? "#c9a227" : "#6d8eb8";
      ctx.fillRect(px - 2, pz - 2, 4, 4);
    }
    void cfg;
  }

  private hud(): HudState {
    const p = this.player();
    const tA = this.actors.filter((a) => a.team === "t" && a.alive).length;
    const cA = this.actors.filter((a) => a.team === "ct" && a.alive).length;
    return {
      hp: Math.max(0, Math.round(p?.hp ?? 0)),
      armor: Math.round(p?.armor ?? 0),
      mag: p?.mag ?? 0,
      reserve: p?.reserve ?? 0,
      weapon: p ? WEAPONS[p.weapon].name : "",
      scoped: !!p?.scoped,
      kills: p?.kills ?? 0,
      deaths: p?.deaths ?? 0,
      assists: p?.assists ?? 0,
      round: this.round,
      tScore: this.tScore,
      ctScore: this.ctScore,
      timeLeft: this.timeLeft,
      aliveT: tA,
      aliveCt: cA,
      message: this.message,
      killfeed: this.killfeed,
      team: this.playerTeam,
      mode: this.mode,
      money: p?.money ?? 800,
      fps: Math.round(this.fps),
      spectating: !p?.alive,
      players: this.actors.map((a) => ({
        id: a.id,
        name: a.name,
        team: a.team,
        kills: a.kills,
        deaths: a.deaths,
        hp: Math.max(0, Math.round(a.hp)),
        alive: a.alive,
        isPlayer: a.isPlayer,
        ping: a.isPlayer ? 12 : 20 + (a.id.charCodeAt(0) % 40),
      })),
    };
  }

  private exposeProbe() {
    window.__controlsTest = {
      getYaw: () => this.player()?.yaw ?? 0,
      getSpeed: () => {
        const p = this.player();
        if (!p) return 0;
        return Math.hypot(p.vel.x, p.vel.z);
      },
      setKeys: (codes: string[]) => {
        this.input.setKeys(codes);
        if (codes.includes("Mouse0")) this.input.fireHeld = true;
        if (!codes.includes("Mouse0")) this.input.fireHeld = codes.length ? this.input.fireHeld : false;
        if (codes.length === 0) {
          this.input.fireHeld = false;
          this.input.jumpHeld = false;
        }
      },
      getPos: () => {
        const p = this.player();
        return p ? { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw } : { x: 0, y: 0, z: 0, yaw: 0 };
      },
    };
    window.__havoc = {
      play: (mode: GameMode, team: Team) => useSession.getState().startMatch({ mode, team }),
      cheats: () => useCheats.getState().toggleMenu(),
      cfg: () => useCheats.getState().cfg,
    };
  }
}

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
