import * as THREE from "three";
import type { Vec3, WorldBox } from "./types";

interface BoxSpec {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  climb?: boolean;
  mat?: "wall" | "crate" | "trim" | "site";
}

function specToBox(s: BoxSpec): WorldBox {
  return {
    minX: s.x - s.sx / 2,
    maxX: s.x + s.sx / 2,
    minY: s.y - s.sy / 2,
    maxY: s.y + s.sy / 2,
    minZ: s.z - s.sz / 2,
    maxZ: s.z + s.sz / 2,
    climb: !!s.climb,
  };
}

function makeTex(w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sandTex() {
  return makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#8a7a58";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2);
    }
    ctx.strokeStyle = "rgba(40,32,20,0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
}

function wallTex() {
  return makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#3a3d42";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? "#32353a" : "#40444a";
      ctx.fillRect(0, y, w, 15);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(0, y, w, 16);
    }
  });
}

function crateTex() {
  return makeTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#6b4e2e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#3a2814";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(w - 6, h - 6);
    ctx.moveTo(w - 6, 6);
    ctx.lineTo(6, h - 6);
    ctx.stroke();
  });
}

export interface WorldData {
  group: THREE.Group;
  boxes: WorldBox[];
  tSpawns: Vec3[];
  ctSpawns: Vec3[];
  waypoints: Vec3[];
  mats: THREE.Material[];
  geos: THREE.BufferGeometry[];
}

export function buildWorld(): WorldData {
  const group = new THREE.Group();
  const specs: BoxSpec[] = [];
  const wall = (x: number, z: number, sx: number, sz: number, sy = 4.6, y?: number) => {
    specs.push({ x, y: y ?? sy / 2, z, sx, sy, sz, mat: "wall" });
  };
  const crate = (x: number, z: number, sy = 1.1, y?: number) => {
    specs.push({ x, y: y ?? sy / 2, z, sx: 1.15, sy, sz: 1.15, climb: true, mat: "crate" });
  };

  // Perimeter
  wall(0, 42, 68, 1.2, 6);
  wall(0, -42, 68, 1.2, 6);
  wall(33.5, 0, 1.2, 85, 6);
  wall(-33.5, 0, 1.2, 85, 6);

  // Mid split with opening
  wall(-14, 2, 16, 1.1, 3.4);
  wall(14, 2, 16, 1.1, 3.4);
  wall(0, 2, 4.5, 0.45, 1.1, 0.55);

  // A long ( +X )
  wall(24, 16, 1.1, 20, 4.2);
  wall(30, 6, 8, 1.1, 4.2);
  wall(24, -8, 1.1, 18, 4.2);
  wall(18, -22, 14, 1.1, 3.6);

  // B tunnels ( -X )
  wall(-24, 16, 1.1, 18, 4);
  wall(-29, 4, 8, 1.1, 3.6);
  wall(-24, -10, 1.1, 16, 4);
  wall(-18, -22, 14, 1.1, 3.6);

  // Sites
  wall(22, -32, 12, 1, 2.4);
  wall(-22, -32, 12, 1, 2.4);
  wall(16, -28, 1, 8, 2.2);
  wall(-16, -28, 1, 8, 2.2);

  // T palace
  wall(-10, 30, 1, 10, 4);
  wall(10, 30, 1, 10, 4);
  wall(-8, 34, 8, 1, 3.2);
  wall(8, 34, 8, 1, 3.2);

  // Cover crates
  crate(4, 8);
  crate(5.2, 8, 1.1, 1.65);
  crate(-5, 9);
  crate(8, -4);
  crate(-8, -3);
  crate(20, -28);
  crate(21.3, -28);
  crate(20, -26.7, 1.1, 1.65);
  crate(-20, -28);
  crate(-21.2, -26.8);
  crate(26, 22);
  crate(-26, 20);
  crate(2, -12);
  crate(-3, -14);
  crate(12, 20);
  crate(-12, 22);
  crate(0, 18);
  crate(18, -8);
  crate(-18, -6);
  crate(8, -32);
  crate(-8, -32);
  crate(0, -24, 1.4);

  // Spawn cover
  crate(-4, 36, 1.3);
  crate(5, 36, 1.3);
  crate(-5, -36, 1.3);
  crate(5, -36, 1.3);

  const sand = sandTex();
  sand.repeat.set(18, 22);
  const brick = wallTex();
  brick.repeat.set(2, 2);
  const wood = crateTex();

  const floorMat = new THREE.MeshStandardMaterial({
    map: sand,
    roughness: 0.95,
    metalness: 0.02,
    color: 0xc4b48a,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: brick,
    roughness: 0.86,
    metalness: 0.05,
    color: 0x9aa0a8,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: wood,
    roughness: 0.8,
    metalness: 0.04,
    color: 0xd4b48a,
  });
  const siteMat = new THREE.MeshStandardMaterial({
    color: 0x6a6558,
    roughness: 0.9,
    metalness: 0.08,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(68, 86), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const mats: THREE.Material[] = [floorMat, wallMat, crateMat, siteMat];
  const geos: THREE.BufferGeometry[] = [floor.geometry];

  for (const s of specs) {
    const geo = new THREE.BoxGeometry(s.sx, s.sy, s.sz);
    geos.push(geo);
    const mat = s.mat === "crate" ? crateMat : s.mat === "site" ? siteMat : wallMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.x, s.y, s.z);
    mesh.castShadow = s.mat === "crate";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Site plates
  const aPlate = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 8), siteMat);
  aPlate.position.set(22, 0.04, -30);
  group.add(aPlate);
  const bPlate = aPlate.clone();
  bPlate.position.set(-22, 0.04, -30);
  group.add(bPlate);

  // Sky ring
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x8aa0b4, side: THREE.BackSide }),
  );
  group.add(sky);
  mats.push(sky.material as THREE.Material);
  geos.push(sky.geometry);

  const tSpawns: Vec3[] = [
    { x: 0, y: 0, z: 36 },
    { x: -6, y: 0, z: 36 },
    { x: 6, y: 0, z: 36 },
    { x: -3, y: 0, z: 33 },
    { x: 3, y: 0, z: 33 },
  ];
  const ctSpawns: Vec3[] = [
    { x: 0, y: 0, z: -36 },
    { x: -6, y: 0, z: -36 },
    { x: 6, y: 0, z: -36 },
    { x: -3, y: 0, z: -33 },
    { x: 3, y: 0, z: -33 },
  ];
  const waypoints: Vec3[] = [
    { x: 0, y: 0, z: 28 },
    { x: 0, y: 0, z: 10 },
    { x: 0, y: 0, z: -8 },
    { x: 8, y: 0, z: 0 },
    { x: -8, y: 0, z: 0 },
    { x: 22, y: 0, z: 18 },
    { x: 26, y: 0, z: 0 },
    { x: 22, y: 0, z: -26 },
    { x: -22, y: 0, z: 16 },
    { x: -26, y: 0, z: 0 },
    { x: -22, y: 0, z: -26 },
    { x: 12, y: 0, z: -18 },
    { x: -12, y: 0, z: -18 },
    { x: 0, y: 0, z: -28 },
    { x: 18, y: 0, z: 28 },
    { x: -18, y: 0, z: 28 },
  ];

  return {
    group,
    boxes: specs.map(specToBox),
    tSpawns,
    ctSpawns,
    waypoints,
    mats,
    geos,
  };
}
