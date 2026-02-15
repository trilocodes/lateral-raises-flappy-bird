import { clamp } from "../game/utils/math.js";

export class PoseController {
  constructor({ videoEl, getSensitivity, onArmLevel }) {
    this.videoEl = videoEl;
    this.getSensitivity = getSensitivity ?? (() => 1.2);
    this.onArmLevel = onArmLevel ?? (() => {});

    this._running = false;
    this._lastLevel = 0.5;
    this.joints = null; // Store joint positions
    this.elbowAngles = null; // Store elbow angles
    this.armAngles = null; // Store arm-to-body angles
    this.bodyVector = null; // Store body vector for visualization
    this.armMode = "multi";

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
        this.onArmLevel({ ok: false, level: this._lastLevel, joints: null, elbowAngles: null, armAngles: null, bodyVector: null });
        return;
      }
      const { ok, level } = this._computeArmLevel(results.poseLandmarks);
      
      // Extract joint data
      const landmarks = results.poseLandmarks;
      this.joints = {
        leftShoulder: { x: landmarks[11].x, y: landmarks[11].y },
        rightShoulder: { x: landmarks[12].x, y: landmarks[12].y },
        leftElbow: { x: landmarks[13].x, y: landmarks[13].y },
        rightElbow: { x: landmarks[14].x, y: landmarks[14].y },
        leftWrist: { x: landmarks[15].x, y: landmarks[15].y },
        rightWrist: { x: landmarks[16].x, y: landmarks[16].y },
        leftHip: { x: landmarks[23].x, y: landmarks[23].y },
        rightHip: { x: landmarks[24].x, y: landmarks[24].y },
        neck: { x: landmarks[0].x, y: landmarks[0].y },
      };
      
      // Calculate elbow angles
      this.elbowAngles = {
        left: this._calculateElbowAngle(landmarks[11], landmarks[13], landmarks[15]),
        right: this._calculateElbowAngle(landmarks[12], landmarks[14], landmarks[16]),
      };
      
      if (ok) this._lastLevel = level;
      this.onArmLevel({ ok, level: this._lastLevel, joints: this.joints, elbowAngles: this.elbowAngles, armAngles: this.armAngles, bodyVector: this.bodyVector });
    });

    this.camera = null;
  }

  setArmMode(mode) {
    this.armMode = mode === "single" ? "single" : "multi";
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
    // Hips: 23, 24 | Shoulders: 11, 12 | Elbows: 13, 14 | Wrists: 15, 16
    const LS = landmarks[11], RS = landmarks[12];
    const LE = landmarks[13], RE = landmarks[14];
    const LW = landmarks[15], RW = landmarks[16];
    const LH = landmarks[23], RH = landmarks[24];

    const leftOk = LS.visibility > 0.25 && LE.visibility > 0.15;
    const rightOk = RS.visibility > 0.25 && RE.visibility > 0.15;
    const ok = this.armMode === "single" ? leftOk || rightOk : leftOk && rightOk;

    if (!ok) return { ok: false, level: 0.5 };

    // Calculate average body line (vertical reference) from hip to shoulder
    const avgShoulder = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
    const avgHip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
    
    // Body vector (spine) from hip to shoulder
    const bodyVector = { 
      x: avgShoulder.x - avgHip.x, 
      y: avgShoulder.y - avgHip.y 
    };

    // Vertical downward reference vector (0, 1) in MediaPipe coords
    const verticalDown = { x: 0, y: 1 };

    // Left arm vector (shoulder to elbow)
    const leftArmVector = { 
      x: LE.x - LS.x, 
      y: LE.y - LS.y 
    };

    // Right arm vector (shoulder to elbow)
    const rightArmVector = { 
      x: RE.x - RS.x, 
      y: RE.y - RS.y 
    };

    // Calculate angles from vertical down reference
    // 0° = arm pointing down (parallel to body)
    // 90° = arm pointing horizontal
    const leftAngle = this._calculateAngle(verticalDown, leftArmVector);
    const rightAngle = this._calculateAngle(verticalDown, rightArmVector);

    // Average the angles
    const avgAngle = this.armMode === "single"
      ? (leftOk && rightOk ? Math.max(leftAngle, rightAngle) : leftOk ? leftAngle : rightAngle)
      : (leftAngle + rightAngle) / 2;

    // Map angle to arm level: 0-90 degrees = 0-100%
    let level = avgAngle / 90;
    level = Math.min(1, Math.max(0, level));

    // Store angles for rendering
    this.bodyVector = bodyVector;
    this.armAngles = { left: Math.round(leftAngle), right: Math.round(rightAngle), avg: Math.round(avgAngle) };

    return { ok: true, level };
  }

  _calculateAngle(vector1, vector2) {
    // Calculate angle between two vectors in degrees
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const mag2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
    
    return Math.round(angle);
  }

  _calculateElbowAngle(shoulder, elbow, wrist) {
    // Calculate vectors from elbow to shoulder and elbow to wrist
    const elbowToShoulder = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
    const elbowToWrist = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };

    // Calculate dot product and magnitudes
    const dotProduct = elbowToShoulder.x * elbowToWrist.x + elbowToShoulder.y * elbowToWrist.y;
    const magnitudeShoulder = Math.sqrt(elbowToShoulder.x ** 2 + elbowToShoulder.y ** 2);
    const magnitudeWrist = Math.sqrt(elbowToWrist.x ** 2 + elbowToWrist.y ** 2);

    // Avoid division by zero
    if (magnitudeShoulder === 0 || magnitudeWrist === 0) return 0;

    // Calculate angle in radians then convert to degrees
    const cosAngle = dotProduct / (magnitudeShoulder * magnitudeWrist);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
    
    return Math.round(angle);
  }
}
