import { Game } from "./game/game";
import { Gfx, showUnsupported, UnsupportedError } from "./render/gfx";

async function boot(): Promise<void> {
  const canvas = document.getElementById("gfx") as HTMLCanvasElement | null;
  const overlayEl = document.getElementById("overlay");
  if (!canvas || !overlayEl) {
    throw new Error("Missing #gfx canvas or #overlay element.");
  }

  let game: Game | null = null;
  let gfx: Gfx;
  try {
    gfx = await Gfx.create(canvas, (info) => {
      game?.stop();
      if (info.reason !== "destroyed") {
        showUnsupported(
          `The GPU device was lost: ${info.message || info.reason}. Reload the page to continue.`
        );
      }
    });
  } catch (err) {
    console.error("[boot] WebGPU init failed:", err);
    showUnsupported(
      err instanceof UnsupportedError ? err.message : `WebGPU initialisation failed: ${String(err)}`
    );
    return;
  }

  game = new Game(gfx, canvas, overlayEl);
  game.start();
}

boot().catch((err) => {
  console.error("[boot] fatal:", err);
  showUnsupported(`Startup failed: ${String(err)}`);
});
