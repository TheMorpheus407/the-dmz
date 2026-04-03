import { SoundCategory } from './types';

export function synthesizeSound(
  category: SoundCategory,
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;

  switch (category) {
    case SoundCategory.Ambient:
      if (variantId === 'severeDrone') {
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
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
      break;

    case SoundCategory.UiFeedback:
      if (variantId === 'keyClick') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (variantId === 'panelSwitch') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
      break;

    case SoundCategory.Alerts:
      if (variantId === 'newEmail') {
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
      } else if (variantId === 'threatEscalation') {
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
      } else {
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
      break;

    case SoundCategory.Stamps:
      if (variantId === 'approveStamp') {
        const noise = audioContext.createBufferSource();
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 0.3,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.1));
        }
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(filter).connect(gain).connect(destination);
        noise.start(now);

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
      } else {
        const noise = audioContext.createBufferSource();
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 0.25,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.08));
        }
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noise.connect(filter).connect(gain).connect(destination);
        noise.start(now);

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
      break;

    case SoundCategory.Narrative:
      if (variantId === 'morpheusMessage') {
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
      } else {
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
      break;

    case SoundCategory.Effects:
      if (variantId === 'crtPowerOn') {
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
      } else {
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
      break;
  }
}
