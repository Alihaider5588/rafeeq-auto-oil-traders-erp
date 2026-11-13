/**
 * Rafiq Auto & Oil Traders - Interactive UI Sound Effects & Audio Engine
 * Uses Web Audio API for 100% offline, zero-latency, crisp physical tactile feedback.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Check localStorage preference
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('pos_sound_effects');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

export const isSoundEnabled = (): boolean => soundEnabled;

export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos_sound_effects', String(enabled));
  }
};

export const toggleSound = (): boolean => {
  setSoundEnabled(!soundEnabled);
  if (soundEnabled) {
    playClickSound();
  }
  return soundEnabled;
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
};

/**
 * 1. Crisp, tactile UI Click sound
 * Simulates a satisfying mechanical switch / Apple-style UI click
 */
export const playClickSound = (): void => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Body of the click (warm thud)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);

    // Micro top click transient (sharp snappy feel)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1600, now);
    clickOsc.frequency.exponentialRampToValueAtTime(450, now + 0.012);

    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.015);
  } catch (e) {
    console.debug('Click sound error:', e);
  }
};

/**
 * 2. Tab Navigation Switch sound
 * Soft, melodic smooth transition sound
 */
export const playTabSound = (): void => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.055);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  } catch (e) {
    console.debug('Tab sound error:', e);
  }
};

/**
 * 3. Authentic POS Thermal Receipt Printer sound effect!
 * Simulates the mechanical paper feed motor pulses ("krrrr-krrr"),
 * followed by receipt cutter click and a pleasant register chime.
 */
export const playPrintSound = (): void => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const start = ctx.currentTime;

    // A. Stepper motor feeding paper - 5 rapid micro bursts
    const numPulses = 5;
    const pulseDuration = 0.05;
    const pulseInterval = 0.07;

    for (let i = 0; i < numPulses; i++) {
      const pulseTime = start + (i * pulseInterval);

      // Noise-like sawtooth stepper buzz
      const motorOsc = ctx.createOscillator();
      const motorGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      motorOsc.type = 'sawtooth';
      // Vary pitch slightly like a genuine motor stepping
      const baseFreq = 950 + (i % 2 === 0 ? 150 : -80);
      motorOsc.frequency.setValueAtTime(baseFreq, pulseTime);
      motorOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, pulseTime + pulseDuration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, pulseTime);
      filter.Q.setValueAtTime(3.0, pulseTime);

      motorGain.gain.setValueAtTime(0.14, pulseTime);
      motorGain.gain.exponentialRampToValueAtTime(0.001, pulseTime + pulseDuration);

      motorOsc.connect(filter);
      filter.connect(motorGain);
      motorGain.connect(ctx.destination);

      motorOsc.start(pulseTime);
      motorOsc.stop(pulseTime + pulseDuration + 0.01);
    }

    const cutterTime = start + (numPulses * pulseInterval) + 0.04;

    // B. Paper cutter mechanical "snip / click"
    const cutterOsc = ctx.createOscillator();
    const cutterGain = ctx.createGain();

    cutterOsc.type = 'square';
    cutterOsc.frequency.setValueAtTime(2200, cutterTime);
    cutterOsc.frequency.exponentialRampToValueAtTime(200, cutterTime + 0.04);

    cutterGain.gain.setValueAtTime(0.2, cutterTime);
    cutterGain.gain.exponentialRampToValueAtTime(0.0001, cutterTime + 0.045);

    cutterOsc.connect(cutterGain);
    cutterGain.connect(ctx.destination);

    cutterOsc.start(cutterTime);
    cutterOsc.stop(cutterTime + 0.05);

    // C. Elegant POS Register completion bell chime
    const chimeTime = cutterTime + 0.06;
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(1320, chimeTime); // E6 pleasant bell

    chimeGain.gain.setValueAtTime(0.18, chimeTime);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 0.55);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    chimeOsc.start(chimeTime);
    chimeOsc.stop(chimeTime + 0.56);
  } catch (e) {
    console.debug('Print sound error:', e);
  }
};

/**
 * 4. Success / Sale Completed Chime
 */
export const playSuccessSound = (): void => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Note 1 (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Note 2 (G5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.09);
    gain2.gain.setValueAtTime(0.18, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.36);
  } catch (e) {
    console.debug('Success sound error:', e);
  }
};

/**
 * Automatic global click listener installer:
 * Intercepts clicks on buttons, links, tabs, and print actions throughout the entire software.
 */
export const initGlobalAudioListeners = (): void => {
  if (typeof window === 'undefined') return;

  // Intercept window.print to guarantee authentic print sound everywhere
  const originalPrint = window.print;
  window.print = function (...args: any[]) {
    try {
      playPrintSound();
    } catch { }
    return originalPrint.apply(this, args as any);
  };

  // Delegated click listener on document
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if target or parent is a clickable element
      const clickable = target.closest('button, a, select, [role="tab"], .btn, input[type="button"], input[type="submit"]');
      if (!clickable) return;

      // Check if this action is a print trigger
      const text = (clickable.textContent || '').toLowerCase();
      const title = (clickable.getAttribute('title') || '').toLowerCase();
      const isPrint = text.includes('print') || title.includes('print') || text.includes('پرنٹ') || clickable.classList.contains('print-btn');

      if (isPrint) {
        playPrintSound();
      } else {
        // Check if it's a tab or sidebar link
        const isTab = clickable.closest('.sidebar nav') || clickable.getAttribute('role') === 'tab' || clickable.classList.contains('tab');
        if (isTab) {
          playTabSound();
        } else {
          playClickSound();
        }
      }
    },
    { passive: true }
  );
};
