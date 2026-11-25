import { Time } from "./time";

export interface LoopCallbacks {
  frame(time: Time): void;
  fixedStep(time: Time): void;
  render(time: Time): void;
}

export class Loop {
  callbacks: LoopCallbacks;
  time = new Time();
  running = false;
  handle = 0;

  constructor(callbacks: LoopCallbacks) {
    this.callbacks = callbacks;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.time.resetBaseline();
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.time.resetBaseline();
    this.handle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const t = this.time;
    t.beginFrame(now);
    this.callbacks.frame(t);
    t.advanceSim();
    while (t.consumeStep()) this.callbacks.fixedStep(t);
    t.endSteps();
    this.callbacks.render(t);
    this.handle = requestAnimationFrame(this.tick);
  };
}
