import { SoundCategory } from './types';

interface ToneConfig {
  type: OscillatorType;
  frequency: number;
  gain: number;
  duration: number;
}

interface SweepConfig {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  gain: number;
  duration: number;
}

function createToneSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
  config: ToneConfig,
): void {
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  osc.type = config.type;
  osc.frequency.setValueAtTime(config.frequency, now);
  gainNode.gain.setValueAtTime(config.gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
  osc.connect(gainNode).connect(destination);
  osc.start(now);
  osc.stop(now + config.duration);
}

function createSweepingTone(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
  config: SweepConfig,
): void {
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  osc.type = config.type;
  osc.frequency.setValueAtTime(config.startFreq, now);
  osc.frequency.linearRampToValueAtTime(config.endFreq, now + config.duration);
  gainNode.gain.setValueAtTime(config.gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
  osc.connect(gainNode).connect(destination);
  osc.start(now);
  osc.stop(now + config.duration);
}

function createAmbientSevereDrone(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, now);
  osc.frequency.linearRampToValueAtTime(45, now + 3);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 3);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 3);
}

function createAmbientLowHum(audioContext: AudioContext, destination: GainNode, now: number): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  gain.gain.setValueAtTime(0.05, now);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

export function generateAmbientSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'severeDrone') {
    createAmbientSevereDrone(audioContext, destination, now);
  } else {
    createAmbientLowHum(audioContext, destination, now);
  }
}

function createKeyClickSound(audioContext: AudioContext, destination: GainNode, now: number): void {
  createToneSound(audioContext, destination, now, {
    type: 'square',
    frequency: 2000,
    gain: 0.1,
    duration: 0.05,
  });
}

function createPanelSwitchSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  createSweepingTone(audioContext, destination, now, {
    type: 'triangle',
    startFreq: 800,
    endFreq: 400,
    gain: 0.08,
    duration: 0.1,
  });
}

function createDefaultUiSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  createToneSound(audioContext, destination, now, {
    type: 'sine',
    frequency: 600,
    gain: 0.06,
    duration: 0.08,
  });
}

export function generateUiFeedbackSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'keyClick') {
    createKeyClickSound(audioContext, destination, now);
  } else if (variantId === 'panelSwitch') {
    createPanelSwitchSound(audioContext, destination, now);
  } else {
    createDefaultUiSound(audioContext, destination, now);
  }
}

function createNewEmailChord(audioContext: AudioContext, destination: GainNode, now: number): void {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
    osc.connect(gain).connect(destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.15);
  });
}

function createThreatEscalationSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(800, now + 0.4);
  osc.frequency.linearRampToValueAtTime(400, now + 0.8);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 0.8);
}

function createModulatedAlertSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, now);
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.frequency.value = 20;
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start(now);
  lfo.stop(now + 1);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 1);
}

export function generateAlertsSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'newEmail') {
    createNewEmailChord(audioContext, destination, now);
  } else if (variantId === 'threatEscalation') {
    createThreatEscalationSound(audioContext, destination, now);
  } else {
    createModulatedAlertSound(audioContext, destination, now);
  }
}

function createNoiseBuffer(
  audioContext: AudioContext,
  duration: number,
  decayFactor: number,
): AudioBuffer {
  const buffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * duration,
    audioContext.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * decayFactor));
  }
  return buffer;
}

function createApproveStampNoise(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const noise = audioContext.createBufferSource();
  noise.buffer = createNoiseBuffer(audioContext, 0.3, 0.1);
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, now);
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(now);
}

function createApproveStampThump(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(80, now);
  thump.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  thumpGain.gain.setValueAtTime(0.5, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  thump.connect(thumpGain).connect(destination);
  thump.start(now);
  thump.stop(now + 0.2);
}

function createDenyStampNoise(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const noise = audioContext.createBufferSource();
  noise.buffer = createNoiseBuffer(audioContext, 0.25, 0.08);
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(now);
}

function createDenyStampThump(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(100, now);
  thump.frequency.exponentialRampToValueAtTime(50, now + 0.1);
  thumpGain.gain.setValueAtTime(0.45, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  thump.connect(thumpGain).connect(destination);
  thump.start(now);
  thump.stop(now + 0.15);
}

export function generateStampsSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'approveStamp') {
    createApproveStampNoise(audioContext, destination, now);
    createApproveStampThump(audioContext, destination, now);
  } else {
    createDenyStampNoise(audioContext, destination, now);
    createDenyStampThump(audioContext, destination, now);
  }
}

function createMorpheusMessageSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(110, now);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(165, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain.gain.setValueAtTime(0.08, now + 2.5);
  gain.gain.linearRampToValueAtTime(0, now + 3);
  osc1.connect(gain).connect(destination);
  osc2.connect(gain).connect(destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 3);
  osc2.stop(now + 3);
}

function createStoryStingSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.setValueAtTime(277.18, now + 0.5);
  osc.frequency.setValueAtTime(329.63, now + 1);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
  gain.gain.setValueAtTime(0.1, now + 1.5);
  gain.gain.linearRampToValueAtTime(0, now + 2);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 2);
}

export function generateNarrativeSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'morpheusMessage') {
    createMorpheusMessageSound(audioContext, destination, now);
  } else {
    createStoryStingSound(audioContext, destination, now);
  }
}

function createCrtPowerOnSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(30, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gain.gain.setValueAtTime(0.15, now + 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 0.8);
}

function createStaticBurstSound(
  audioContext: AudioContext,
  destination: GainNode,
  now: number,
): void {
  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * 0.4,
    audioContext.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(now);
  noise.stop(now + 0.4);
}

export function generateEffectsSound(
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;
  if (variantId === 'crtPowerOn') {
    createCrtPowerOnSound(audioContext, destination, now);
  } else {
    createStaticBurstSound(audioContext, destination, now);
  }
}

export const SOUND_GENERATORS: Record<
  SoundCategory,
  (variantId: string, audioContext: AudioContext, destination: GainNode) => void
> = {
  [SoundCategory.Ambient]: generateAmbientSound,
  [SoundCategory.UiFeedback]: generateUiFeedbackSound,
  [SoundCategory.Alerts]: generateAlertsSound,
  [SoundCategory.Stamps]: generateStampsSound,
  [SoundCategory.Narrative]: generateNarrativeSound,
  [SoundCategory.Effects]: generateEffectsSound,
};

export function synthesizeSound(
  category: SoundCategory,
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const generator = SOUND_GENERATORS[category];
  if (generator) {
    generator(variantId, audioContext, destination);
  }
}
