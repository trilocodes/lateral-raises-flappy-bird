console.log("main.js loaded");
import { Game } from "./game/Game.js";
import { PoseController } from "./vision/PoseController.js";
import { CameraOverlay } from "./vision/CameraOverlay.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startBtn: document.getElementById("startBtn"),
  endBtn: document.getElementById("endBtn"),
  scoreEl: document.getElementById("score"),
  stateEl: document.getElementById("state"),
  armsEl: document.getElementById("arms"),
  videoEl: document.getElementById("video"),
  cameraStatus: document.getElementById("camera-status"),
  skeletonCanvas: document.getElementById("skeleton-overlay"),
  // New UI elements
  settingsModal: document.getElementById("settingsModal"),
  gameOverModal: document.getElementById("gameOverModal"),
  helpModal: document.getElementById("helpModal"),
  goBtn: document.getElementById("goBtn"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  closeBtn: document.getElementById("closeBtn"),
  howToPlayBtn: document.getElementById("howToPlayBtn"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  finalScore: document.getElementById("finalScore"),
  gameCountdown: document.getElementById("gameCountdown"),
  gameCountdownNumber: document.getElementById("gameCountdownNumber"),
  speedBtns: Array.from(document.querySelectorAll("[data-speed]")),
  armBtns: Array.from(document.querySelectorAll("[data-arm]")),
};

const cameraOverlay = new CameraOverlay(ui.skeletonCanvas, ui.videoEl);

let currentState = "idle";
let selectedSpeed = "slow";
let selectedArmMode = "multi";

const speedConfig = {
  slow: { pipeGap: 240, pipeSpeed: 2.0 },
  medium: { pipeGap: 180, pipeSpeed: 3.0 },
  fast: { pipeGap: 120, pipeSpeed: 4.5 },
};

const game = new Game({
  canvas,
  ctx,
  onScore: (s) => (ui.scoreEl.textContent = String(s)),
  onState: (st) => {
    currentState = st;
    ui.stateEl.textContent = st;
    if (st === "running") {
      ui.startBtn.disabled = false;
      ui.startBtn.textContent = "PAUSE";
      ui.endBtn.disabled = false;
    } else if (st === "paused") {
      ui.startBtn.disabled = false;
      ui.startBtn.textContent = "RESUME";
      ui.endBtn.disabled = false;
    } else if (st === "game over") {
      ui.startBtn.disabled = false;
      ui.startBtn.textContent = "START";
      ui.endBtn.disabled = true;
      ui.finalScore.textContent = game.score;
      ui.gameOverModal.classList.add("active");
    } else {
      ui.startBtn.disabled = false;
      ui.startBtn.textContent = "START";
      ui.endBtn.disabled = true;
    }
  },
});

const pose = new PoseController({
  videoEl: ui.videoEl,
  getSensitivity: () => 0.6, // Fixed minimum sensitivity
  onArmLevel: ({ ok, level, joints, elbowAngles, armAngles, bodyVector }) => {
    ui.armsEl.textContent = ok ? `${Math.round(level * 100)}%` : "not detected";
    game.setPoseControl({ ok, level, smooth: 0.35, joints, elbowAngles });
    // Draw skeleton on camera overlay
    cameraOverlay.draw(joints, elbowAngles, armAngles, bodyVector);
  },
});

// Speed button handlers
ui.speedBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    ui.speedBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSpeed = btn.dataset.speed;
  });
});

// Arm mode button handlers
ui.armBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    ui.armBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedArmMode = btn.dataset.arm;
  });
});

// Initialize button states
if (ui.speedBtns[0]) ui.speedBtns[0].classList.add("active");
if (ui.armBtns[0]) ui.armBtns[0].classList.add("active");

// Settings modal handlers
ui.goBtn.addEventListener("click", async () => {
  // Set arm mode for pose
  pose.setArmMode(selectedArmMode);
  
  // Apply speed settings to game
  const config = speedConfig[selectedSpeed];
  game.setSpeedConfig(config);
  
  // Hide settings modal and start countdown
  ui.settingsModal.classList.remove("active");
  
  startCountdown();
});

async function startCountdown() {
  let count = 3;
  ui.gameCountdown.style.display = "flex";
  ui.gameCountdownNumber.textContent = count;
  
  while (count > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    count--;
    if (count > 0) {
      ui.gameCountdownNumber.textContent = count;
    }
  }
  
  ui.gameCountdown.style.display = "none";
  
  // Start the game
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
}

// Start button handler
ui.startBtn.addEventListener("click", () => {
  if (currentState === "running") {
    game.pause();
  } else if (currentState === "paused") {
    game.resume();
  } else if (currentState === "game over") {
    ui.gameOverModal.classList.remove("active");
    ui.settingsModal.classList.add("active");
  } else if (currentState === "idle") {
    ui.settingsModal.classList.add("active");
  }
});

ui.endBtn.addEventListener("click", () => {
  if (currentState === "running" || currentState === "paused") {
    ui.settingsModal.classList.remove("active");
    ui.gameCountdown.style.display = "none";
    game.gameOver();
  }
});

// Game over button handlers
ui.playAgainBtn.addEventListener("click", () => {
  ui.gameOverModal.classList.remove("active");
  game.reset();
  ui.settingsModal.classList.add("active");
});

ui.closeBtn.addEventListener("click", () => {
  ui.gameOverModal.classList.remove("active");
  game.reset();
  game.stop();
});

ui.howToPlayBtn.addEventListener("click", () => {
  ui.helpModal.classList.add("active");
});

ui.closeHelpBtn.addEventListener("click", () => {
  ui.helpModal.classList.remove("active");
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
