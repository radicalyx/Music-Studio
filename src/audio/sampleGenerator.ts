/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SampleRecipe } from '../types/daw';

/**
 * Procedurally generates an ultra high-fidelity, studio-grade AudioBuffer
 * based on the physical modeling acoustic recipe produced by AI.
 */
export function generateSampleFromRecipe(
  ctx: BaseAudioContext,
  recipe: SampleRecipe
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = Math.max(1.0, Math.min(6.0, recipe.duration || 2.5));
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Fundamental frequency based on rootNote (C4 = 60 -> 261.625565 Hz)
  const rootNote = recipe.rootNote || 60;
  const f0 = 440 * Math.pow(2, (rootNote - 69) / 12);

  const harmonics = recipe.harmonics && recipe.harmonics.length > 0 ? recipe.harmonics : [
    { multiplier: 1.0, amplitude: 1.0, decay: 1.8 },
    { multiplier: 2.0, amplitude: 0.6, decay: 2.5 },
    { multiplier: 3.0, amplitude: 0.35, decay: 3.2 },
    { multiplier: 4.0, amplitude: 0.2, decay: 4.2 },
  ];

  const warmth = Math.max(0, Math.min(1, recipe.warmthSaturation || 0.2));
  const transientGain = Math.max(0, Math.min(0.6, recipe.transientNoiseGain || 0.15));
  const transientType = recipe.transientNoiseType || 'hammer';

  // Generate acoustic waveform
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Sum harmonic partials with independent physical decay curves
    for (const h of harmonics) {
      const decay = Math.max(0.1, h.decay);
      const amp = h.amplitude * Math.exp(-t * decay);
      const freq = f0 * h.multiplier;
      // Slight acoustic phase randomness for natural dispersion
      sample += amp * Math.sin(2 * Math.PI * freq * t);
    }

    // Physical transient generation (first 10ms - 40ms)
    const attackWindow = 0.035; // 35ms
    if (t < attackWindow && transientGain > 0.001) {
      const env = Math.pow(1 - t / attackWindow, 2.5);
      const white = (Math.random() * 2 - 1);
      let noiseComponent = 0;

      switch (transientType) {
        case 'hammer': {
          // Felt piano hammer strike (low-mid resonant thump + strike noise)
          const thump = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 80);
          noiseComponent = (white * 0.4 + thump * 0.6) * env;
          break;
        }
        case 'pluck': {
          // Guitar / harpsichord plectrum transient (high frequency snap)
          const snap = (Math.random() * 2 - 1) * Math.exp(-t * 120);
          noiseComponent = snap * env;
          break;
        }
        case 'bow': {
          // Rosin bow bite on string
          const bite = (white * 0.8) * Math.sin(2 * Math.PI * f0 * 2 * t);
          noiseComponent = bite * env;
          break;
        }
        case 'metal': {
          // Rhodes metallic tine hit or bell chime strike
          const chime = Math.sin(2 * Math.PI * f0 * 7.2 * t) * Math.exp(-t * 50);
          noiseComponent = (white * 0.3 + chime * 0.7) * env;
          break;
        }
        case 'breath': {
          // Flute / vocal breath chuff
          noiseComponent = white * 0.5 * env;
          break;
        }
        case 'click': {
          // Analog organ key click
          noiseComponent = (white * 0.9) * env;
          break;
        }
        default:
          noiseComponent = 0;
      }

      sample += noiseComponent * transientGain * 1.5;
    }

    // Warmth / soft saturation curve (tanh analog limiting)
    if (warmth > 0) {
      const drive = 1 + warmth * 1.8;
      sample = Math.tanh(sample * drive) / drive;
    }

    // Normalize output within headroom
    sample = Math.max(-1, Math.min(1, sample * 0.85));

    // Stereo imaging: subtle phase decorrelation and frequency spread
    left[i] = sample;
    const stereoPhase = 0.04 * Math.sin(2 * Math.PI * (f0 * 0.5) * t);
    right[i] = Math.max(-1, Math.min(1, sample * (1 + stereoPhase)));
  }

  return buffer;
}
