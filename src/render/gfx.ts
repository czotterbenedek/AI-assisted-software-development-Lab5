export class UnsupportedError extends Error {}

export class Gfx {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
  width = 0;
  height = 0;
  resolutionScale = 1;
  cssPixelWidth = 1;
  cssPixelHeight = 1;
  resizeListeners: Array<(w: number, h: number) => void> = [];
  observer: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.format = format;
  }

  static async create(
    canvas: HTMLCanvasElement,
    onDeviceLost: (info: GPUDeviceLostInfo) => void
  ): Promise<Gfx> {
    if (!("gpu" in navigator) || !navigator.gpu) {
      throw new UnsupportedError("navigator.gpu is not available.");
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      throw new UnsupportedError("No suitable GPU adapter was found.");
    }
    const device = await adapter.requestDevice({ label: "stillframe-device" });
    device.lost.then((info) => {
      console.error(`[gfx] device lost (${info.reason}): ${info.message}`);
      onDeviceLost(info);
    });
    device.addEventListener("uncapturederror", (ev) => {
      console.error("[gfx] uncaptured WebGPU error:", ev.error.message);
    });
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new UnsupportedError("Could not create a WebGPU canvas context.");
    }
    const format = navigator.gpu.getPreferredCanvasFormat();
    const gfx = new Gfx(canvas, device, context, format);
    gfx.configure();
    const dpr = window.devicePixelRatio || 1;
    gfx.cssPixelWidth = Math.max(1, Math.round(canvas.clientWidth * dpr));
    gfx.cssPixelHeight = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gfx.applySize();
    gfx.observeResize();
    const info = adapter.info;
    console.info(`[gfx] adapter: ${info.vendor} ${info.architecture} ${info.description}, format: ${format}`);
    return gfx;
  }

  onResize(listener: (w: number, h: number) => void): void {
    this.resizeListeners.push(listener);
  }

  setResolutionScale(scale: number): void {
    const clamped = Math.min(1, Math.max(0.25, scale));
    if (clamped === this.resolutionScale) return;
    this.resolutionScale = clamped;
    this.applySize();
  }

  getResolutionScale(): number {
    return this.resolutionScale;
  }

  get aspect(): number {
    return this.width / Math.max(1, this.height);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.device.destroy();
  }

  private configure(): void {
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });
  }

  private observeResize(): void {
    this.observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.devicePixelContentBoxSize?.[0];
      if (box) {
        this.cssPixelWidth = box.inlineSize;
        this.cssPixelHeight = box.blockSize;
      } else {
        const css = entry.contentBoxSize[0];
        const dpr = window.devicePixelRatio || 1;
        this.cssPixelWidth = Math.round((css?.inlineSize ?? 1) * dpr);
        this.cssPixelHeight = Math.round((css?.blockSize ?? 1) * dpr);
      }
      this.applySize();
    });
    try {
      this.observer.observe(this.canvas, { box: "device-pixel-content-box" });
    } catch {
      this.observer.observe(this.canvas, { box: "content-box" });
    }
  }

  private applySize(): void {
    const maxDim = this.device.limits.maxTextureDimension2D;
    const w = Math.max(1, Math.min(maxDim, Math.round(this.cssPixelWidth * this.resolutionScale)));
    const h = Math.max(1, Math.min(maxDim, Math.round(this.cssPixelHeight * this.resolutionScale)));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    for (const listener of this.resizeListeners) {
      listener(w, h);
    }
  }
}

export function showUnsupported(reason: string): void {
  const panel = document.getElementById("unsupported");
  const reasonEl = document.getElementById("unsupported-reason");
  if (reasonEl) reasonEl.textContent = reason;
  if (panel) panel.hidden = false;
}

export const VERTEX_FLOATS = 10;
export const VERTEX_STRIDE = VERTEX_FLOATS * 4;
export const STATIC_VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: VERTEX_STRIDE,
  attributes: [
    { shaderLocation: 0, offset: 0, format: "float32x3" },
    { shaderLocation: 1, offset: 12, format: "float32x3" },
    { shaderLocation: 2, offset: 24, format: "float32x4" },
  ],
};

let nextMeshId = 1;

export class Mesh {
  id = nextMeshId++;
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;

  constructor(
    device: GPUDevice,
    vertices: Float32Array,
    indices: Uint32Array,
    label = "mesh"
  ) {
    this.indexCount = indices.length;
    this.vertexBuffer = createBufferWithData(device, vertices, GPUBufferUsage.VERTEX, `${label}-vb`);
    this.indexBuffer = createBufferWithData(device, indices, GPUBufferUsage.INDEX, `${label}-ib`);
  }

  destroy(): void {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
  }
}

export function createBufferWithData(
  device: GPUDevice,
  data: Float32Array | Uint32Array,
  usage: GPUBufferUsageFlags,
  label: string
): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: Math.max(4, data.byteLength),
    usage,
    mappedAtCreation: true,
  });
  const Ctor = data instanceof Float32Array ? Float32Array : Uint32Array;
  new Ctor(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}
