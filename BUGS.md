# Bugs & Suspicious Behavior Found During Refactoring

All items below were observed in the original `Lab05-Testing-Index.html` during extraction and preserved as-is to keep refactoring behavior-neutral.

1. **Slow-motion `TimeScaleDriver.update` arguments are swapped** (`Game.tick` / `TimeScaleDriver.update`): `TimeScaleDriver.update` expects `(realDt, planarSpeed, maxSpeed, ...)`, but the caller passes `WALK_SPEED` before `this.player.planarSpeed`, so `planarSpeed / maxSpeed` evaluates to `4 / 0` (clamped to `1`) when standing still and `>= 1` at normal walk speed, keeping time at full speed instead of slowing down when idle.
2. **Debug time-scale toggles (F2/F3) are active in normal gameplay and persist across level starts**: Pressing F2 freezes simulation time and F3 forces real-time speed without any debug-mode gate, and `startLevel` does not reset these overrides.
3. **Results "Accuracy" actually measures `min(kills, shots) / shots`**: The results screen computes accuracy from total kills (including melee and thrown-object kills) divided by shots fired rather than tracking actual projectile hits.
4. **Exit trigger ignores vertical position (Y) and grounding**: Level exit completion only checks the player's horizontal X/Z bounds, so jumping or falling over an exit region can trigger completion prematurely.
5. **Fixed-timestep accumulator drops simulation time on slow frames**: `Time.step` caps updates at `MAX_STEPS_PER_FRAME = 8` and zeroes the remaining accumulator, causing simulation time to fall behind wall-clock time on low-FPS frames.
6. **Replay viewmodel bobbing uses distance from world origin instead of accumulated stride**: In `Game.render`, `stride` during replay is computed as `Math.hypot(pos[0], pos[2])`, which causes viewmodel bobbing to depend on absolute coordinates rather than distance traveled.
7. **Screen flash still plays when `reduceMotion` is enabled**: `Game.updatePost` zeroes `aberration`, `grain`, and `threat` when `reduceMotion` is true, but still applies `this.flash` on death and level clear.

