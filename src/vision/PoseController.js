import { clamp } from "../game/utils/math.js";

export class PoseController {
  constructor({ videoEl, getSensitivity, onArmLevel }) {
    this.videoEl = videoEl;
    this.getSensitivity = getSensitivity ?? (() => 1.2);
    this.onArmLevel = onArmLevel ?? (() => {});

    this._running = false;
    this._lastLevel = 0.5;

    // MediaPipe Pose instance
    this.pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults((results) => {
      console.log("has landmarks:", !!results.poseLandmarks);
      if (!results.poseLandmarks) {
        this.onArmLevel({ ok: false, level: this._lastLevel });
        return;
      }
      const { ok, level } = this._computeArmLevel(results.poseLandmarks);
      if (ok) this._lastLevel = level;
      this.onArmLevel({ ok, level: this._lastLevel });
    });

    this.camera = null;
  }

  isRunning() {
    return this._running;
  }

  async start() {
    if (this._running) return;
    this._running = true;

    console.log("Starting camera...");
    console.log("Camera class available:", typeof Camera !== 'undefined');
    
    // Try using MediaPipe Camera if available, otherwise fallback to getUserMedia
    if (typeof Camera !== 'undefined' && Camera.Camera) {
      console.log("Using MediaPipe Camera");
      this.camera = new Camera.Camera(this.videoEl, {
        onFrame: async () => {
          await this.pose.send({ image: this.videoEl });
        },
        width: 640,
        height: 480,
      });
      await this.camera.start();
    } else {
      console.log("Using native getUserMedia fallback");
      // Fallback to native browser API
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      this.videoEl.srcObject = stream;
      await this.videoEl.play();
      
      // Set up frame processing loop
      const processFrame = async () => {
        if (this._running) {
          await this.pose.send({ image: this.videoEl });
          requestAnimationFrame(processFrame);
        }
      };
      requestAnimationFrame(processFrame);
    }
    
    console.log(
      "Camera started! Video size:",
      this.videoEl.videoWidth,
      this.videoEl.videoHeight,
    );
  }

  _computeArmLevel(landmarks) {
    // Mediapipe Pose indices:
    // left shoulder 11, right shoulder 12, left wrist 15, right wrist 16
    const LS = landmarks[11],
      RS = landmarks[12],
      LW = landmarks[15],
      RW = landmarks[16];

    const ok =
      LS.visibility > 0.25 &&
      RS.visibility > 0.25 &&
      LW.visibility > 0.15 &&
      RW.visibility > 0.15;

    const shoulderY = (LS.y + RS.y) / 2;
    const wristY = (LW.y + RW.y) / 2;

    const sensitivity = this.getSensitivity();

    // delta positive when wrists are ABOVE shoulders (since smaller y = higher)
    const delta = shoulderY - wristY;
    let level = 0.5 + delta * (2.2 * sensitivity);
    level = clamp(level, 0, 1);

    return { ok: true, level };
  }
}
