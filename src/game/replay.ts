import { FIXED_STEP } from "../engine/time";
import type { LevelDef } from "../levels/builder";
import type { Vec3 } from "../math/vec3";
import { PlayerFrameInput, SharedStaticData, World } from "./world";

export interface ReplayFrame extends PlayerFrameInput {
  steps: number;
}

export class ReplayRecorder {
  frames: ReplayFrame[] = [];

  reset(): void {
    this.frames = [];
  }

  push(f: ReplayFrame): void {
    this.frames.push({ ...f, pos: [...f.pos] as Vec3, vel: [...f.vel] as Vec3 });
  }

  setLastSteps(steps: number): void {
    const last = this.frames[this.frames.length - 1];
    if (last) last.steps += steps;
  }
}

export class ReplayPlayer {
  frames: ReplayFrame[];
  world: World;
  index = 0;
  simPlayed = 0;
  clock = 0;
  speed = 1;
  stride = 0;
  current: ReplayFrame | null = null;
  private prevX = 0;
  private prevZ = 0;
  private hasPrev = false;

  constructor(def: LevelDef, frames: ReplayFrame[], shared: SharedStaticData) {
    this.frames = frames;
    this.world = new World(def, shared);
  }

  get done(): boolean {
    return this.index >= this.frames.length;
  }

  get progress(): number {
    return this.frames.length === 0 ? 1 : this.index / this.frames.length;
  }

  update(realDt: number): number {
    this.clock += realDt * this.speed;
    let steps = 0;
    let applied = 0;
    while (this.index < this.frames.length && (this.simPlayed < this.clock || applied === 0)) {
      const f = this.frames[this.index++];
      this.world.applyPlayerFrame({ ...f, pos: [...f.pos] as Vec3, vel: [...f.vel] as Vec3 });
      for (let i = 0; i < f.steps; i++) this.world.step(FIXED_STEP);
      this.simPlayed += f.steps * FIXED_STEP;
      steps += f.steps;
      if (this.hasPrev) {
        this.stride += Math.hypot(f.pos[0] - this.prevX, f.pos[2] - this.prevZ);
      }
      this.prevX = f.pos[0];
      this.prevZ = f.pos[2];
      this.hasPrev = true;
      this.current = f;
      applied++;
      if (applied > 2e3) break;
    }
    return steps;
  }
}
