/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Procedurally generates an acoustic piano/bell harmonic sample buffer
 * for the default custom sampler preset.
 */
export function createDefaultSampleBuffer(ctx: BaseAudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 2.0; // 2 seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Fundamental frequency C4 = 261.63 Hz
  const f0 = 261.63;
  // Natural piano/chime harmonic decay series
  const harmonics = [
    { freqMult: 1.0, amp: 1.0, decay: 1.8 },
    { freqMult: 2.0, amp: 0.65, decay: 2.4 },
    { freqMult: 3.0, amp: 0.4, decay: 3.2 },
    { freqMult: 4.0, amp: 0.25, decay: 4.0 },
    { freqMult: 5.0, amp: 0.15, decay: 5.0 },
    { freqMult: 6.0, amp: 0.08, decay: 6.0 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const h of harmonics) {
      const harmonicAmp = h.amp * Math.exp(-t * h.decay);
      sample += harmonicAmp * Math.sin(2 * Math.PI * f0 * h.freqMult * t);
    }

    // Add gentle wooden hammer strike transient in the first 20ms
    if (t < 0.02) {
      const strikeEnvelope = (1 - t / 0.02);
      const hammerNoise = (Math.random() * 2 - 1) * strikeEnvelope * 0.15;
      sample += hammerNoise;
    }

    // Soft clamp
    sample = Math.tanh(sample * 0.75);

    left[i] = sample;
    // Slight stereo spread
    right[i] = sample * (1 + 0.05 * Math.sin(t * 30));
  }

  return buffer;
}
