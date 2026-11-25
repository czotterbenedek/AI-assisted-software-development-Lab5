Prompt:

Analyze Lab05-Testing-Index.html

What kind of game it is?
How to play it?
Collect design problems with the game!
Collect bugs that might inside the game!


Save your result in a Part1.md file




# Part 1 — STILLFRAME game analysis

## What kind of game is it?

`Lab05-Testing-Index.html` is a browser-based, first-person arena shooter with a stylized, low-poly presentation. It uses WebGPU for rendering and divides its 15 short combat levels into three acts: Transit, Office Tower, and Rooftops. The campaign mixes enemy waves, throwable objects, and weapons such as pistols, scatterguns, carbines, and a blade.

Its defining mechanic is intended to be reactive slow motion: the game world nearly stops while the player is still, and speeds up as the player moves, looks around, acts, or jumps. The tagline is “time moves only when you move.”

## How to play

The title screen lists these controls (`Lab05-Testing-Index.html:3548–3550`):

- **WASD / arrow keys:** move
- **Mouse:** look around
- **Left mouse button:** fire, punch, or throw, depending on the held item
- **Right mouse button:** throw the held item
- **E:** pick up an item
- **Space:** jump
- **R:** restart
- **Esc:** pause

Fight through the waves in each arena. Most levels clear when all enemies are defeated; levels with an exit instead ask the player to reach it. Weapons have limited ammunition, while nearby objects can be picked up and thrown. Completing levels unlocks the next ones and saves best times in local storage. The results screen also offers a replay.

There is no reload control: when a gun is empty, the HUD says to click to throw it. The game requires a browser with WebGPU enabled and loads `wgpu-matrix` from jsDelivr (`Lab05-Testing-Index.html:505`, `528–532`).

## Design problems

1. **The main mechanic is not currently delivered** — the time-scaling calculation has an argument-order defect (details below), so the tagline and core tactical promise conflict with actual behavior.
2. **Controls are overloaded and underspecified.** Left-click has several context-dependent actions, and the instructions do not explain how to distinguish firing from throwing, or that an empty gun is thrown instead of reloaded. A short in-game tutorial or contextual prompts would reduce trial and error.
3. **Combat is potentially unforgiving.** The player has no visible health indicator, and a single enemy projectile or successful melee strike kills them (`Lab05-Testing-Index.html:5594–5599`). If one-hit deaths are intentional, communicate that early and make enemy attack cues especially clear.
4. **Desktop-first accessibility.** The game relies on keyboard/mouse and pointer lock; there are no touch movement/look controls or key-rebinding options. Gamepad input exists in code but is not advertised on the title screen. Small, widely letter-spaced text and strong visual effects may also be hard to use; reduced-motion settings do not appear to disable every animated or flashing effect.
5. **Compatibility and startup depend on external support.** WebGPU is mandatory, and the graphics math module is fetched from a CDN. The unsupported-browser message is helpful, but there is no offline dependency fallback.
6. **The results statistic is mislabeled.** “Accuracy” is calculated from kills divided by shots, not actual hits divided by shots. It can count kills from melee or thrown objects and can report 100% despite missed shots (`Lab05-Testing-Index.html:3666`).

## Bugs and risks found by static inspection

These are source-based findings; the game was not run through a browser or playtested during this analysis.

| Priority | Finding | Evidence and impact |
|---|---|---|
| **High — confirmed** | **Slow-motion inputs are passed in reverse order.** | `TimeScaleDriver.update` expects `(realDt, planarSpeed, maxSpeed, ...)` and computes `planarSpeed / maxSpeed` (`Lab05-Testing-Index.html:6177–6179`). The caller passes `WALK_SPEED` before the player's actual speed (`Lab05-Testing-Index.html:6998`). When stationary, this is effectively `4 / 0`, clamped to `1`; at ordinary speeds up to the walk speed it is also clamped to `1`. Thus the world runs at full speed instead of nearly freezing while idle. Pass `this.player.planarSpeed` first and `WALK_SPEED` second. |
| **Medium — confirmed** | **Debug time overrides are active in normal play.** | F2 toggles a frozen simulation and F3 toggles forced real-time (`Lab05-Testing-Index.html:1890–1891`, `6963–6966`). These shortcuts are not shown to players, and `startLevel` does not reset the time lock (`Lab05-Testing-Index.html:6837–6844`), so they can unexpectedly pause gameplay or bypass the intended time mechanic and affect results. Gate them behind a debug mode or remove them from release input. |
| **Medium — confirmed** | **“Accuracy” does not measure accuracy.** | The results UI uses `min(kills, shots) / shots` (`Lab05-Testing-Index.html:3666`), while kills can be earned by means other than gunfire. Track hit projectiles and fired projectiles separately, or rename the statistic. |
| **Low — needs gameplay verification** | **Exit completion ignores vertical position.** | Exit checks only the player's horizontal X/Z coordinates and does not check height or whether the player is grounded (`Lab05-Testing-Index.html:5780–5786`). If a player can fall or jump into the exit's X/Z rectangle from an unintended height, the level may clear early. Test the exit levels and include a height/grounding check if that can occur. |
| **Low — performance-dependent risk** | **Simulation time can be discarded during slow frames.** | The fixed-step loop caps work at eight steps and clears the accumulator when that cap is reached (`Lab05-Testing-Index.html:2058`, `2088–2089`). At sufficiently low frame rates, simulation time can fall behind wall-clock time, potentially affecting AI timing, replays, and the displayed “time that passed.” Test on slower devices before deciding whether to increase the cap or handle backlog differently. |

## Suggested test focus

1. Stand still, then move and look around; verify that enemy/projectile time changes as the tagline describes.
2. Press F2/F3 during a level and then restart or start another level; check whether the override persists.
3. Compare the results “accuracy” value for gun kills, missed shots, melee kills, and thrown-object kills.
4. In the exit levels, test the exit while jumping and while falling near it.
5. Repeat a level at low frame rates and compare real time, simulation time, and replay behavior.
