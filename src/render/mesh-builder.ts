import { srgbHex } from "../math/color";
import { Vec3 } from "../math/vec3";
import { Mesh, VERTEX_FLOATS } from "./gfx";

const BOX_FACES: [Vec3, Vec3, Vec3][] = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];

const CORNER_SIGNS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

export class MeshBuilder {
  vertices: number[] = [];
  indices: number[] = [];

  get vertexCount(): number {
    return this.vertices.length / VERTEX_FLOATS;
  }

  get isEmpty(): boolean {
    return this.indices.length === 0;
  }

  pushVertex(p: readonly number[], n: readonly number[], c: readonly number[], emissive: number): void {
    this.vertices.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], emissive);
  }

  addTri(a: readonly number[], b: readonly number[], c: readonly number[], color: readonly number[], emissive = 0): this {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const n: Vec3 = [nx, ny, nz];
    const base = this.vertexCount;
    this.pushVertex(a, n, color, emissive);
    this.pushVertex(b, n, color, emissive);
    this.pushVertex(c, n, color, emissive);
    this.indices.push(base, base + 1, base + 2);
    return this;
  }

  addQuad(
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
    d: readonly number[],
    color: readonly number[],
    emissive = 0
  ): this {
    this.addTri(a, b, c, color, emissive);
    this.addTri(a, c, d, color, emissive);
    return this;
  }

  addBox(center: readonly number[], size: readonly number[], color: readonly number[], emissive = 0): this {
    const half = [size[0] / 2, size[1] / 2, size[2] / 2];
    for (const [n, u, v] of BOX_FACES) {
      const base = this.vertexCount;
      for (const [su, sv] of CORNER_SIGNS) {
        const p: Vec3 = [
          center[0] + half[0] * (n[0] + su * u[0] + sv * v[0]),
          center[1] + half[1] * (n[1] + su * u[1] + sv * v[1]),
          center[2] + half[2] * (n[2] + su * u[2] + sv * v[2]),
        ];
        this.pushVertex(p, n, color, emissive);
      }
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return this;
  }

  addBoxMinMax(min: readonly number[], max: readonly number[], color: readonly number[], emissive = 0): this {
    return this.addBox(
      [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
      [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
      color,
      emissive
    );
  }

  addTaperedBox(
    cx: number,
    cz: number,
    y0: number,
    y1: number,
    bw: number,
    bd: number,
    tw: number,
    td: number,
    color: readonly number[],
    emissive = 0
  ): this {
    const b: Vec3[] = [
      [cx - bw / 2, y0, cz + bd / 2],
      [cx + bw / 2, y0, cz + bd / 2],
      [cx + bw / 2, y0, cz - bd / 2],
      [cx - bw / 2, y0, cz - bd / 2],
    ];
    const t: Vec3[] = [
      [cx - tw / 2, y1, cz + td / 2],
      [cx + tw / 2, y1, cz + td / 2],
      [cx + tw / 2, y1, cz - td / 2],
      [cx - tw / 2, y1, cz - td / 2],
    ];
    const flip = y1 < y0;
    const quad = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3) => {
      if (flip) this.addQuad(p3, p2, p1, p0, color, emissive);
      else this.addQuad(p0, p1, p2, p3, color, emissive);
    };
    quad(t[0], t[1], t[2], t[3]);
    quad(b[3], b[2], b[1], b[0]);
    quad(b[0], b[1], t[1], t[0]);
    quad(b[1], b[2], t[2], t[1]);
    quad(b[2], b[3], t[3], t[2]);
    quad(b[3], b[0], t[0], t[3]);
    return this;
  }

  build(device: GPUDevice, label: string): Mesh {
    return new Mesh(device, new Float32Array(this.vertices), new Uint32Array(this.indices), label);
  }
}

export interface MaterialDef {
  color: Vec3;
  emissive: number;
}

export interface ThemeDef {
  lighting: {
    keyDir: Vec3;
    keyColor: Vec3;
    fillDir: Vec3;
    fillColor: Vec3;
    ambientSky: Vec3;
    ambientGround: Vec3;
    fogColor: Vec3;
    fogDensity: number;
  };
  materials: Record<string, MaterialDef>;
}

const m = (hex: number, emissive = 0): MaterialDef => ({ color: srgbHex(hex), emissive });

export const THEMES: Record<"transit" | "office" | "rooftop", ThemeDef> = {
  transit: {
    lighting: {
      keyDir: [0.35, 0.85, 0.4],
      keyColor: [1.7, 0.98, 0.52],
      fillDir: [-0.55, 0.35, -0.6],
      fillColor: [0.16, 0.3, 0.36],
      ambientSky: [0.15, 0.16, 0.19],
      ambientGround: [0.07, 0.06, 0.055],
      fogColor: [0.03, 0.035, 0.04],
      fogDensity: 0.025,
    },
    materials: {
      floor: m(7104354),
      wall: m(9209730),
      dark: m(5130823),
      light: m(11840932),
      trim: m(7827819),
      metal: m(6120038),
      accent: m(16751164, 6),
      glow: m(6283480, 5),
      window: m(1911344, 1.2),
    },
  },
  office: {
    lighting: {
      keyDir: [-0.4, 0.8, 0.45],
      keyColor: [1.5, 1.05, 0.7],
      fillDir: [0.6, 0.3, -0.5],
      fillColor: [0.2, 0.3, 0.36],
      ambientSky: [0.18, 0.19, 0.21],
      ambientGround: [0.08, 0.075, 0.07],
      fogColor: [0.045, 0.05, 0.056],
      fogDensity: 0.02,
    },
    materials: {
      floor: m(6052440),
      wall: m(10130830),
      dark: m(4605002),
      light: m(12762290),
      trim: m(8419954),
      metal: m(6449004),
      accent: m(16756835, 5),
      glow: m(7330047, 4),
      window: m(2306104, 1.5),
    },
  },
  rooftop: {
    lighting: {
      keyDir: [0.5, 0.65, -0.55],
      keyColor: [0.55, 0.75, 1],
      fillDir: [-0.5, 0.25, 0.6],
      fillColor: [0.7, 0.36, 0.14],
      ambientSky: [0.09, 0.11, 0.17],
      ambientGround: [0.06, 0.045, 0.04],
      fogColor: [0.025, 0.03, 0.055],
      fogDensity: 0.018,
    },
    materials: {
      floor: m(5657679),
      wall: m(7696747),
      dark: m(3947325),
      light: m(10459535),
      trim: m(6775646),
      metal: m(5330524),
      accent: m(16747066, 7),
      glow: m(5822696, 5),
      window: m(2767434, 2),
    },
  },
};
