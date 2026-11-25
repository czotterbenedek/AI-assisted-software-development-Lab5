import { ACT1 } from "./act1";
import { ACT2 } from "./act2";
import { ACT3 } from "./act3";
import type { LevelDef } from "./builder";

export const LEVELS: LevelDef[] = [...ACT1, ...ACT2, ...ACT3];

export const ACT_NAMES: Record<number, string> = {
  1: "TRANSIT",
  2: "OFFICE TOWER",
  3: "ROOFTOPS",
};

export type { LevelDef, LevelMeta, EnemySpawn, PickupSpawn, GlassPaneSpec } from "./builder";
