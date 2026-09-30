import type { Vec3, WorldBox } from "./types";

export const tmpA: Vec3 = { x: 0, y: 0, z: 0 };
export const tmpB: Vec3 = { x: 0, y: 0, z: 0 };

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function angDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function lookDir(yaw: number, pitch: number, out: Vec3) {
  const cp = Math.cos(pitch);
  out.x = -Math.sin(yaw) * cp;
  out.y = Math.sin(pitch);
  out.z = -Math.cos(yaw) * cp;
  return out;
}

export function yawPitchTo(from: Vec3, to: Vec3) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return { yaw, pitch, dist: Math.hypot(dx, dy, dz) };
}

export function dist2(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function raySphere(o: Vec3, d: Vec3, c: Vec3, r: number): number | null {
  const ox = o.x - c.x;
  const oy = o.y - c.y;
  const oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const det = b * b - (ox * ox + oy * oy + oz * oz - r * r);
  if (det < 0) return null;
  const t = -b - Math.sqrt(det);
  return t >= 0 ? t : null;
}

export function rayAabb(o: Vec3, d: Vec3, b: WorldBox, maxT = 200): number | null {
  let tmin = 0;
  let tmax = maxT;
  const min = [b.minX, b.minY, b.minZ];
  const max = [b.maxX, b.maxY, b.maxZ];
  const orig = [o.x, o.y, o.z];
  const dir = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    const di = dir[i]!;
    const oi = orig[i]!;
    if (Math.abs(di) < 1e-8) {
      if (oi < min[i]! || oi > max[i]!) return null;
    } else {
      let t1 = (min[i]! - oi) / di;
      let t2 = (max[i]! - oi) / di;
      if (t1 > t2) {
        const s = t1;
        t1 = t2;
        t2 = s;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

export function actorBodyBox(pos: Vec3, crouch: boolean, half = 0.34): WorldBox {
  const h = crouch ? 1.22 : 1.74;
  return {
    minX: pos.x - half,
    maxX: pos.x + half,
    minY: pos.y,
    maxY: pos.y + h,
    minZ: pos.z - half,
    maxZ: pos.z + half,
    climb: false,
  };
}

export function moveCollide(
  pos: Vec3,
  vel: Vec3,
  dt: number,
  half: number,
  height: number,
  boxes: WorldBox[],
  noclip: boolean,
): { grounded: boolean } {
  if (noclip) {
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;
    return { grounded: false };
  }

  pos.x += vel.x * dt;
  resolveAxis(pos, half, height, boxes, "x");
  pos.z += vel.z * dt;
  if (blocked(pos, half, height, boxes)) {
    pos.y += 0.52;
    if (blocked(pos, half, height, boxes)) {
      pos.y -= 0.52;
      resolveAxis(pos, half, height, boxes, "z");
    }
  }
  pos.y += vel.y * dt;
  const grounded = resolveY(pos, vel, half, height, boxes);
  return { grounded };
}

function blocked(pos: Vec3, half: number, height: number, boxes: WorldBox[]) {
  const minX = pos.x - half;
  const maxX = pos.x + half;
  const minY = pos.y + 0.02;
  const maxY = pos.y + height;
  const minZ = pos.z - half;
  const maxZ = pos.z + half;
  for (const b of boxes) {
    if (minX < b.maxX && maxX > b.minX && minY < b.maxY && maxY > b.minY && minZ < b.maxZ && maxZ > b.minZ) {
      return true;
    }
  }
  return false;
}

function resolveAxis(pos: Vec3, half: number, height: number, boxes: WorldBox[], axis: "x" | "z") {
  const minY = pos.y + 0.04;
  const maxY = pos.y + height;
  for (const b of boxes) {
    if (maxY <= b.minY || minY >= b.maxY) continue;
    if (axis === "x") {
      const minZ = pos.z - half;
      const maxZ = pos.z + half;
      if (maxZ <= b.minZ || minZ >= b.maxZ) continue;
      const minX = pos.x - half;
      const maxX = pos.x + half;
      if (maxX <= b.minX || minX >= b.maxX) continue;
      const left = b.minX - maxX;
      const right = b.maxX - minX;
      pos.x += Math.abs(left) < Math.abs(right) ? left : right;
    } else {
      const minX = pos.x - half;
      const maxX = pos.x + half;
      if (maxX <= b.minX || minX >= b.maxX) continue;
      const minZ = pos.z - half;
      const maxZ = pos.z + half;
      if (maxZ <= b.minZ || minZ >= b.maxZ) continue;
      const back = b.minZ - maxZ;
      const fwd = b.maxZ - minZ;
      pos.z += Math.abs(back) < Math.abs(fwd) ? back : fwd;
    }
  }
}

function resolveY(pos: Vec3, vel: Vec3, half: number, height: number, boxes: WorldBox[]) {
  let grounded = false;
  const minX = pos.x - half;
  const maxX = pos.x + half;
  const minZ = pos.z - half;
  const maxZ = pos.z + half;
  if (pos.y < 0) {
    pos.y = 0;
    vel.y = 0;
    grounded = true;
  }
  for (const b of boxes) {
    if (maxX <= b.minX || minX >= b.maxX || maxZ <= b.minZ || minZ >= b.maxZ) continue;
    const minY = pos.y;
    const maxY = pos.y + height;
    if (maxY <= b.minY || minY >= b.maxY) continue;
    const down = b.minY - maxY;
    const up = b.maxY - minY;
    if (Math.abs(up) < Math.abs(down)) {
      pos.y += up;
      if (vel.y < 0) vel.y = 0;
      grounded = true;
    } else {
      pos.y += down;
      if (vel.y > 0) vel.y = 0;
    }
  }
  return grounded;
}

export function losBlocked(a: Vec3, b: Vec3, boxes: WorldBox[], maxT?: number): number | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return 0;
  const d = { x: dx / len, y: dy / len, z: dz / len };
  let best: number | null = null;
  const cap = maxT ?? len;
  for (const box of boxes) {
    const t = rayAabb(a, d, box, cap);
    if (t != null && t > 0.08 && t < cap - 0.08) {
      if (best == null || t < best) best = t;
    }
  }
  return best;
}
