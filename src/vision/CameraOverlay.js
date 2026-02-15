export class CameraOverlay {
  constructor(canvasEl, videoEl) {
    this.canvas = canvasEl;
    this.video = videoEl;
    this.ctx = canvasEl.getContext("2d");
    
    // Resize observer to keep canvas size in sync with video
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
    });
    this.resizeObserver.observe(videoEl);
  }

  updateCanvasSize() {
    const rect = this.video.getBoundingClientRect();
    this.canvas.width = this.video.videoWidth || rect.width || this.canvas.offsetWidth;
    this.canvas.height = this.video.videoHeight || rect.height || this.canvas.offsetHeight;
  }

  draw(joints, elbowAngles, armAngles, bodyVector) {
    if (!joints) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Apply horizontal flip transform
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    // Helper function to convert MediaPipe coordinates to canvas coordinates
    const toCanvas = (joint) => ({
      x: joint.x * w,
      y: joint.y * h,
    });

    const ls = toCanvas(joints.leftShoulder);
    const rs = toCanvas(joints.rightShoulder);
    const le = toCanvas(joints.leftElbow);
    const re = toCanvas(joints.rightElbow);
    const lw = toCanvas(joints.leftWrist);
    const rw = toCanvas(joints.rightWrist);
    const lh = toCanvas(joints.leftHip);
    const rh = toCanvas(joints.rightHip);

    // Draw body line (spine)
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    const avgShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    const avgHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
    ctx.moveTo(avgHip.x, avgHip.y);
    ctx.lineTo(avgShoulder.x, avgShoulder.y);
    ctx.stroke();

    // Draw skeleton lines
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(ls.x, ls.y);
    ctx.lineTo(le.x, le.y);
    ctx.lineTo(lw.x, lw.y);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(rs.x, rs.y);
    ctx.lineTo(re.x, re.y);
    ctx.lineTo(rw.x, rw.y);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Draw joints as circles
    ctx.fillStyle = "#00ffff";
    const jointRadius = 6;
    const joints_list = [ls, rs, le, re, lw, rw, avgHip, avgShoulder];
    for (const joint of joints_list) {
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, jointRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw text without flip transform
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 16px system-ui, Arial";
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    if (elbowAngles) {
      // For flipped display, we need to mirror the text positions
      const textLeftElbowX = w - (le.x + 12);
      const textRightElbowX = w - (re.x + 12);
      
      // Left elbow angle
      ctx.fillText(`L: ${elbowAngles.left}°`, textLeftElbowX, le.y - 8);
      // Right elbow angle
      ctx.fillText(`R: ${elbowAngles.right}°`, textRightElbowX, re.y - 8);
    }

    if (armAngles) {
      // Shoulder level area for arm-to-body angles
      const textX = w / 2;
      const textY = Math.min(ls.y, rs.y) - 40;
      ctx.fillText(`Body Angles - L: ${armAngles.left}° | R: ${armAngles.right}° | Avg: ${armAngles.avg}°`, textX - 180, textY);
    }
    
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.resizeObserver.disconnect();
  }
}
