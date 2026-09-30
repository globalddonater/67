import * as THREE from "three";
import type { Team, WeaponId } from "./types";

function mat(color: number, roughness = 0.7, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const SKIN = mat(0xc9a88a, 0.72, 0.02);
const DARK = mat(0x16181c, 0.55, 0.25);
const T_VEST = mat(0x8a6a32, 0.78, 0.08);
const CT_VEST = mat(0x4a6280, 0.62, 0.18);
const T_PANT = mat(0x3a2c18, 0.85, 0.04);
const CT_PANT = mat(0x1c2834, 0.8, 0.08);
const GUN_METAL = mat(0x2a2d32, 0.4, 0.55);
const GUN_WOOD = mat(0x5a3a20, 0.8, 0.05);
const GUN_BLACK = mat(0x111214, 0.45, 0.4);
const SCOPE = mat(0x1a1a1e, 0.3, 0.5);

export function buildSoldier(team: Team): THREE.Group {
  const g = new THREE.Group();
  const vest = team === "t" ? T_VEST : CT_VEST;
  const pant = team === "t" ? T_PANT : CT_PANT;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.26), vest);
  torso.position.y = 1.18;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), SKIN);
  head.position.y = 1.58;
  head.name = "head";
  g.add(head);

  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), DARK);
  helm.position.y = 1.62;
  g.add(helm);

  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.24), pant);
  hip.position.y = 0.82;
  g.add(hip);

  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.16), pant);
    leg.position.set(s * 0.12, 0.38, 0);
    g.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), vest);
    arm.position.set(s * 0.28, 1.14, 0);
    g.add(arm);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.22), DARK);
    boot.position.set(s * 0.12, 0.05, 0.02);
    g.add(boot);
  }

  g.traverse((o: THREE.Object3D) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function buildChams(team: Team): THREE.Group {
  const color = team === "t" ? 0xe8b423 : 0x4c8bf5;
  const vis = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.55,
  });
  const hid = new THREE.MeshBasicMaterial({
    color,
    depthTest: true,
    transparent: true,
    opacity: 0.85,
  });
  const src = buildSoldier(team);
  const g = new THREE.Group();
  src.updateMatrixWorld(true);
  src.traverse((o: THREE.Object3D) => {
    if (o instanceof THREE.Mesh) {
      const a = new THREE.Mesh(o.geometry, vis);
      a.position.copy(o.position);
      a.rotation.copy(o.rotation);
      a.scale.copy(o.scale);
      a.renderOrder = 2;
      g.add(a);
      const b = new THREE.Mesh(o.geometry, hid);
      b.position.copy(o.position);
      b.rotation.copy(o.rotation);
      b.scale.copy(o.scale);
      b.renderOrder = 3;
      g.add(b);
    }
  });
  return g;
}

function box(
  parent: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function buildViewmodel(id: WeaponId): THREE.Group {
  const g = new THREE.Group();
  if (id === "ak") {
    box(g, 0.08, 0.1, 0.42, 0, 0.02, -0.05, GUN_METAL);
    box(g, 0.05, 0.05, 0.38, 0, 0.04, -0.38, GUN_METAL);
    box(g, 0.07, 0.16, 0.08, 0, -0.08, 0.08, GUN_WOOD);
    box(g, 0.05, 0.18, 0.06, 0, -0.1, -0.02, GUN_WOOD);
    box(g, 0.04, 0.14, 0.05, 0, -0.08, -0.06, GUN_WOOD);
    box(g, 0.09, 0.04, 0.22, 0, 0.08, -0.12, GUN_WOOD);
  } else if (id === "m4") {
    box(g, 0.07, 0.09, 0.4, 0, 0.02, -0.04, GUN_BLACK);
    box(g, 0.04, 0.04, 0.32, 0, 0.03, -0.34, GUN_METAL);
    box(g, 0.09, 0.09, 0.12, 0, 0.1, 0.02, GUN_BLACK);
    box(g, 0.06, 0.14, 0.07, 0, -0.07, 0.1, GUN_BLACK);
    box(g, 0.04, 0.16, 0.05, 0, -0.08, -0.04, GUN_BLACK);
    box(g, 0.05, 0.05, 0.16, 0, 0.02, 0.22, GUN_BLACK);
  } else if (id === "awp") {
    box(g, 0.08, 0.1, 0.55, 0, 0.0, -0.1, GUN_METAL);
    box(g, 0.035, 0.035, 0.5, 0, 0.02, -0.52, GUN_BLACK);
    box(g, 0.07, 0.07, 0.22, 0, 0.1, -0.05, SCOPE);
    box(g, 0.06, 0.16, 0.08, 0, -0.1, 0.14, GUN_WOOD);
    box(g, 0.05, 0.12, 0.18, 0, -0.04, 0.28, GUN_WOOD);
  } else if (id === "deagle") {
    box(g, 0.06, 0.08, 0.18, 0, 0.02, -0.04, GUN_METAL);
    box(g, 0.05, 0.14, 0.06, 0, -0.06, 0.06, GUN_BLACK);
    box(g, 0.04, 0.04, 0.1, 0, 0.04, -0.14, GUN_METAL);
  } else {
    box(g, 0.05, 0.07, 0.16, 0, 0.02, -0.03, GUN_BLACK);
    box(g, 0.045, 0.12, 0.05, 0, -0.05, 0.05, GUN_BLACK);
    box(g, 0.03, 0.03, 0.08, 0, 0.03, -0.12, GUN_METAL);
  }

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.28), SKIN);
  arm.position.set(0.08, -0.08, 0.18);
  g.add(arm);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.22), DARK);
  sleeve.position.set(0.1, -0.1, 0.32);
  g.add(sleeve);

  g.position.set(0.28, -0.22, -0.52);
  g.rotation.y = 0.04;
  return g;
}

export function worldWeapon(id: WeaponId): THREE.Group {
  const g = buildViewmodel(id);
  g.position.set(0.22, 1.1, 0.28);
  g.scale.setScalar(0.85);
  g.rotation.set(0.1, Math.PI, 0);
  return g;
}
