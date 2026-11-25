export type Vec3 = [number, number, number];

export const v3 = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];

export function set(o: Vec3, x: number, y: number, z: number): Vec3 {
  o[0] = x;
  o[1] = y;
  o[2] = z;
  return o;
}

export function copy(o: Vec3, a: readonly number[]): Vec3 {
  o[0] = a[0];
  o[1] = a[1];
  o[2] = a[2];
  return o;
}

export function scale(o: Vec3, a: readonly number[], s: number): Vec3 {
  o[0] = a[0] * s;
  o[1] = a[1] * s;
  o[2] = a[2] * s;
  return o;
}

export function lerp(o: Vec3, a: readonly number[], b: readonly number[], t: number): Vec3 {
  o[0] = a[0] + (b[0] - a[0]) * t;
  o[1] = a[1] + (b[1] - a[1]) * t;
  o[2] = a[2] + (b[2] - a[2]) * t;
  return o;
}

export const dot = (a: readonly number[], b: readonly number[]): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const lenSq = (a: readonly number[]): number =>
  a[0] * a[0] + a[1] * a[1] + a[2] * a[2];

export const len = (a: readonly number[]): number => Math.sqrt(lenSq(a));

export function distSq(a: readonly number[], b: readonly number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

export function distXZ(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function normalize(o: Vec3, a: readonly number[]): Vec3 {
  const l = len(a);
  if (l < 1e-9) return set(o, 0, 0, 0);
  return scale(o, a, 1 / l);
}

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

export const lerpN = (a: number, b: number, t: number): number => a + (b - a) * t;

export function approach(current: number, target: number, tau: number, dt: number): number {
  if (tau <= 0) return target;
  return target + (current - target) * Math.exp(-dt / tau);
}

export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDiff(b, a) * t;
}

export function turnToward(a: number, b: number, maxStep: number): number {
  const d = angleDiff(b, a);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

export function yawOf(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

export function dirFromYawPitch(o: Vec3, yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch);
  return set(o, -Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
}
