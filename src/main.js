console.log("main.js loaded");
import { Game } from "./game/Game.js";
import { PoseController } from "./vision/PoseController.js";
import { CameraOverlay } from "./vision/CameraOverlay.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  scoreEl: document.getElementById("score"),
  stateEl: document.getElementById("state"),
  armsEl: document.getElementById("arms"),
  videoEl: document.getElementById("video"),
  cameraStatus: document.getElementById("camera-status"),
  skeletonCanvas: document.getElementById("skeleton-overlay"),
};

const cameraOverlay = new CameraOverlay(ui.skeletonCanvas, ui.videoEl);

const game = new Game({
  canvas,
  ctx,
  onScore: (s) => (ui.scoreEl.textContent = String(s)),
  onState: (st) => (ui.stateEl.textContent = st),
});

const pose = new PoseController({
  videoEl: ui.videoEl,
  getSensitivity: () => 0.6, // Fixed minimum sensitivity
  onArmLevel: ({ ok, level, joints, elbowAngles, armAngles, bodyVector }) => {
    ui.armsEl.textContent = ok ? `${Math.round(level * 100)}%` : "not detected";
    game.setPoseControl({ ok, level, smooth: 0.35, joints, elbowAngles }); // Fixed maximum smoothness
    // Draw skeleton on camera overlay
    cameraOverlay.draw(joints, elbowAngles, armAngles, bodyVector);
  },
});

ui.resetBtn.addEventListener("click", () => {
  game.stop();
  game.reset();
});

ui.startBtn.addEventListener("click", async () => {
  if (!pose.isRunning()) {
    try {
      await pose.start();
    } catch (e) {
      ui.stateEl.textContent = "camera blocked";
      alert("Camera access failed. Allow camera permissions and reload.");
      return;
    }
  }
  game.start();
});

// Start camera immediately on page load
window.addEventListener('load', async () => {
  console.log("Page loaded, attempting to start camera...");
  console.log("Camera available:", typeof Camera !== 'undefined');
  console.log("Pose available:", typeof Pose !== 'undefined');
  
  ui.cameraStatus.textContent = "Initializing camera...";
  
  // Wait a bit for MediaPipe scripts to fully initialize
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    await pose.start();
    console.log("Camera started successfully!");
    ui.cameraStatus.textContent = "Camera active";
    // Hide status after 2 seconds
    setTimeout(() => {
      ui.cameraStatus.style.display = 'none';
    }, 2000);
  } catch (e) {
    ui.stateEl.textContent = "camera blocked";
    ui.cameraStatus.textContent = "Camera failed";
    ui.cameraStatus.style.background = "rgba(255,0,0,0.7)";
    console.error("Camera access failed:", e);
    alert("Camera access failed. Please allow camera permissions and reload the page.");
  }
});

// start render loop immediately
game.loop();
game.reset();
