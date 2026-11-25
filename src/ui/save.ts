export interface GameSettings {
  fov: number;
  sensitivity: number;
  invertY: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  resolutionScale: number;
  autoResolution: boolean;
  postQuality: "low" | "medium" | "high";
  showFps: boolean;
  reduceMotion: boolean;
  crosshairScale: number;
}

export interface LevelRecord {
  cleared: boolean;
  best?: number;
  bestSim?: number;
}

export interface SaveData {
  version: number;
  settings: GameSettings;
  levels: Record<string, LevelRecord>;
}

const KEY = "stillframe.save";

export function defaultSettings(): GameSettings {
  return {
    fov: 90,
    sensitivity: 1,
    invertY: false,
    masterVolume: 0.8,
    sfxVolume: 1,
    musicVolume: 0.5,
    resolutionScale: 1,
    autoResolution: true,
    postQuality: "high",
    showFps: false,
    reduceMotion: false,
    crosshairScale: 1,
  };
}

export function loadSave(): SaveData {
  const fresh: SaveData = { version: 1, settings: defaultSettings(), levels: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return fresh;
    return {
      version: 1,
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      levels: parsed.levels ?? {},
    };
  } catch (err) {
    console.warn("[save] could not read save data:", err);
    return fresh;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[save] could not write save data:", err);
  }
}
