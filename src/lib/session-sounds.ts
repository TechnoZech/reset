let audioCtx: AudioContext | null = null;
let alarmTimer: number | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctor();
  }
  return audioCtx;
}

export function unlockSessionAudio() {
  const ctx = context();
  if (!ctx) return;

  void ctx.resume().then(() => {
    if (ctx.state !== "running") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  });
}

/** Keep the overtime chime ready without a dedicated enable button. */
export function armSessionAudio() {
  if (typeof window === "undefined") return;
  unlockSessionAudio();

  const unlock = () => unlockSessionAudio();
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("touchstart", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });

  return () => {
    window.removeEventListener("pointerdown", unlock, { capture: true });
    window.removeEventListener("touchstart", unlock, { capture: true });
    window.removeEventListener("keydown", unlock, { capture: true });
  };
}

function tone(
  ctx: AudioContext,
  frequency: number,
  when: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, when);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function playOvertimeChime() {
  const ctx = context();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const t = ctx.currentTime + 0.02;
    tone(ctx, 880, t, 0.22, 0.14);
    tone(ctx, 1174.66, t + 0.14, 0.38, 0.16);
    tone(ctx, 880, t + 0.4, 0.45, 0.12, "triangle");
  });
}

/** Repeats until pause/end. One global loop for the dashboard. */
export function startOvertimeAlarm() {
  if (typeof window === "undefined" || alarmTimer != null) return;
  playOvertimeChime();
  alarmTimer = window.setInterval(playOvertimeChime, 1800);
}

export function stopOvertimeAlarm() {
  if (alarmTimer == null) return;
  window.clearInterval(alarmTimer);
  alarmTimer = null;
}

export function isOvertimeAlarmPlaying() {
  return alarmTimer != null;
}
