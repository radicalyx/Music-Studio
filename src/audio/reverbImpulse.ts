/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an algorithmic stereo impulse response buffer for a ConvolverNode
 * providing rich natural reverb without loading external impulse files.
 */
export function createReverbImpulse(
  ctx: BaseAudioContext,
  durationSeconds = 2.5,
  decayRate = 2.0,
  reverse = false
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - i : i;
    // Exponential decay curve with high-frequency absorption
    const decay = Math.pow(1 - n / length, decayRate);
    
    // Stereo decorrelated diffusion noise
    const whiteNoiseL = (Math.random() * 2 - 1);
    const whiteNoiseR = (Math.random() * 2 - 1);

    // Early reflections clustering followed by diffuse tail
    const earlyReflect = i < sampleRate * 0.05 ? Math.sin(i * 0.1) * 0.3 : 0;
    
    left[i] = (whiteNoiseL * 0.7 + earlyReflect) * decay;
    right[i] = (whiteNoiseR * 0.7 + earlyReflect * 0.8) * decay;
  }

  return impulse;
}

/**
 * Creates a distortion curve for the WaveShaperNode
 */
export function makeDistortionCurve(amount = 0): Float32Array {
  const k = typeof amount === 'number' ? amount * 50 : 10;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  
  if (k <= 0.01) {
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = x;
    }
    return curve;
  }

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
