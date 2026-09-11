/**
 * Notification UI & Sound Alert Manager
 */

const NotificationManager = {
  audioCtx: null,

  // Initialize Web Audio API on first user interaction to comply with browser autoplay policies
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  },

  // Play a crisp, gentle two-tone chime
  playNotificationSound() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio chime playback error:", e);
    }
  },

  // Show floating real-time toast alert
  showToast({ title, message, type = "LEAVE_APPLIED", timestamp = new Date().toISOString() }) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const icons = {
      LEAVE_APPLIED: "📝",
      LEAVE_APPROVED: "✅",
      LEAVE_REJECTED: "❌",
      LEAVE_CANCELLED: "⚪",
      PENDING_REMINDER: "⏳"
    };

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || "🔔"}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
        <div class="toast-time">${timeFormatted}</div>
      </div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 200);
    });

    container.appendChild(toast);
    this.playNotificationSound();

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        setTimeout(() => toast.remove(), 200);
      }
    }, 6000);
  }
};
