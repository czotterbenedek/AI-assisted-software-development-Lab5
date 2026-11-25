import { Input } from "../engine/input";
import { approach, clamp, v3, Vec3 } from "../math/vec3";
import { PLAYER_HEIGHT, PLAYER_RADIUS, PlayerFrameInput, World } from "./world";

export const WALK_SPEED = 4;
const ACCEL = 30;
const AIR_ACCEL = 10;
const GRAVITY = 16;
const JUMP_VELOCITY = Math.sqrt(2 * GRAVITY * 1);
const MAX_PITCH = Math.PI / 2 - 0.02;
const STEP_HEIGHT = 0.42;

export interface PlayerLookSettings {
  sensitivity: number;
  invertY: boolean;
}

export class PlayerController {
  pos: Vec3 = v3();
  vel: Vec3 = v3();
  yaw = 0;
  pitch = 0;
  grounded = true;
  lookSpeed = 0;
  stride = 0;
  mouseDx = 0;
  mouseDy = 0;
  private delta: Vec3 = v3();

  reset(pos: readonly number[], yaw: number): void {
    this.pos[0] = pos[0];
    this.pos[1] = pos[1];
    this.pos[2] = pos[2];
    this.vel[0] = this.vel[1] = this.vel[2] = 0;
    this.yaw = yaw;
    this.pitch = 0;
    this.grounded = true;
    this.stride = 0;
  }

  look(input: Input, dt: number, s: PlayerLookSettings): void {
    this.mouseDx = input.mouseDx;
    this.mouseDy = input.mouseDy;
    this.yaw += input.mouseDx * s.sensitivity;
    this.pitch -= input.mouseDy * s.sensitivity * (s.invertY ? -1 : 1);
    this.pitch = clamp(this.pitch, -MAX_PITCH, MAX_PITCH);
    this.yaw %= Math.PI * 2;
    this.lookSpeed = dt > 0 ? Math.hypot(input.mouseDx, input.mouseDy) / dt : 0;
  }

  update(input: Input, dt: number, world: World, s: PlayerLookSettings, canMove: boolean): void {
    this.look(input, dt, s);
    const axes = canMove ? input.moveAxes() : { x: 0, y: 0 };
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const wishX = (fx * axes.y + rx * axes.x) * WALK_SPEED;
    const wishZ = (fz * axes.y + rz * axes.x) * WALK_SPEED;
    const a = (this.grounded ? ACCEL : AIR_ACCEL) * dt;
    this.vel[0] += clamp(wishX - this.vel[0], -a, a);
    this.vel[2] += clamp(wishZ - this.vel[2], -a, a);
    if (canMove && this.grounded && input.wasPressed("jump")) {
      this.vel[1] = JUMP_VELOCITY;
      this.grounded = false;
    }
    this.vel[1] -= GRAVITY * dt;
    if (this.vel[1] < -40) this.vel[1] = -40;
    this.delta[0] = this.vel[0] * dt;
    this.delta[1] = this.vel[1] * dt;
    this.delta[2] = this.vel[2] * dt;
    const res = world.static.moveCharacter(
      this.pos,
      this.delta,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      STEP_HEIGHT,
      this.grounded
    );
    this.grounded = res.grounded;
    if (res.grounded && this.vel[1] < 0) this.vel[1] = 0;
    if (res.hitCeiling && this.vel[1] > 0) this.vel[1] = 0;
    for (const e of world.enemies) {
      if (!e.alive || e.spawnT < 1) continue;
      if (Math.abs(e.pos[1] - this.pos[1]) > 1.6) continue;
      const dx = this.pos[0] - e.pos[0];
      const dz = this.pos[2] - e.pos[2];
      const d = Math.hypot(dx, dz);
      const minD = PLAYER_RADIUS + 0.3;
      if (d < minD && d > 1e-4) {
        const push: Vec3 = [(dx / d) * (minD - d), 0, (dz / d) * (minD - d)];
        world.static.moveCharacter(this.pos, push, PLAYER_RADIUS, PLAYER_HEIGHT, 0, false);
      }
    }
    this.stride += Math.hypot(this.vel[0], this.vel[2]) * dt;
  }

  get planarSpeed(): number {
    return Math.hypot(this.vel[0], this.vel[2]);
  }

  toFrame(fire: boolean, throwItem: boolean, interact: boolean): PlayerFrameInput & { steps: number } {
    return {
      pos: [this.pos[0], this.pos[1], this.pos[2]],
      vel: [this.vel[0], this.vel[1], this.vel[2]],
      yaw: this.yaw,
      pitch: this.pitch,
      grounded: this.grounded,
      fire,
      throwItem,
      interact,
      steps: 0,
    };
  }
}

export class TimeScaleDriver {
  static readonly MIN = 0.015;
  static readonly LOOK_WEIGHT = 0.35;
  static readonly LOOK_FULL = 900;
  static readonly KICK_TIME = 0.12;
  static readonly RISE = 0.05;
  static readonly FALL = 0.1;

  value = TimeScaleDriver.MIN;
  kick = 0;

  reset(): void {
    this.value = TimeScaleDriver.MIN;
    this.kick = 0;
  }

  actionKick(): void {
    this.kick = TimeScaleDriver.KICK_TIME;
  }

  update(
    realDt: number,
    planarSpeed: number,
    maxSpeed: number,
    lookSpeed: number,
    airborne: boolean,
    busy: boolean
  ): number {
    this.kick = Math.max(0, this.kick - realDt);
    const moveInput = clamp(planarSpeed / maxSpeed, 0, 1);
    const lookInput = clamp(lookSpeed / TimeScaleDriver.LOOK_FULL, 0, 1) * TimeScaleDriver.LOOK_WEIGHT;
    const kickInput = this.kick > 0 || busy ? 1 : 0;
    let target = Math.max(moveInput, lookInput, kickInput);
    if (airborne) target = Math.max(target, 0.8);
    target = Math.max(target, TimeScaleDriver.MIN);
    const tau = target > this.value ? TimeScaleDriver.RISE : TimeScaleDriver.FALL;
    this.value = clamp(approach(this.value, target, tau, realDt), TimeScaleDriver.MIN, 1);
    return this.value;
  }
}
