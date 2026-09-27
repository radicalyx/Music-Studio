/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentPreset } from '../types/daw';

export class SynthVoice {
  public note: number;
  public velocity: number;
  public isReleasing = false;
  public isSustained = false; // Held by sustain pedal
  private ctx: BaseAudioContext;
  private preset: InstrumentPreset;
  private outputNode: GainNode;
  private voiceGainNode: GainNode;
  private filterNode: BiquadFilterNode;

  // Nodes for synth mode
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  // Nodes for sampler mode
  private sampleSource: AudioBufferSourceNode | null = null;

  private baseFreq: number;
  private sampleBuffer: AudioBuffer | null = null;

  constructor(
    ctx: BaseAudioContext,
    note: number,
    velocity: number,
    preset: InstrumentPreset,
    outputNode: GainNode,
    sampleBuffer: AudioBuffer | null = null,
    pitchBendFactor = 1.0,
    startTime?: number
  ) {
    this.ctx = ctx;
    this.note = note;
    this.velocity = velocity;
    this.preset = preset;
    this.outputNode = outputNode;
    this.sampleBuffer = sampleBuffer;

    this.baseFreq = 440 * Math.pow(2, (note - 69) / 12);

    const now = startTime !== undefined ? startTime : ctx.currentTime;
    const { synthParams, isSampleBased, sampleParams } = preset;

    // 1. Create Filter Node
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = synthParams.filter.type;
    
    // Key tracking calculation
    const keyTrackOffset = (note - 60) * 35 * synthParams.filter.keyTracking;
    const baseCutoff = Math.max(20, Math.min(20000, synthParams.filter.cutoff + keyTrackOffset));
    this.filterNode.frequency.setValueAtTime(baseCutoff, now);
    this.filterNode.Q.setValueAtTime(synthParams.filter.resonance, now);

    // Filter Envelope modulation
    const envAmt = synthParams.filter.envAmount;
    if (Math.abs(envAmt) > 0.01) {
      const peakFreq = Math.max(20, Math.min(20000, baseCutoff + envAmt * 7500));
      const sustainFreq = Math.max(20, Math.min(20000, baseCutoff + (peakFreq - baseCutoff) * synthParams.filterEnv.sustain));

      this.filterNode.frequency.setValueAtTime(baseCutoff, now);
      this.filterNode.frequency.linearRampToValueAtTime(peakFreq, now + Math.max(0.005, synthParams.filterEnv.attack));
      this.filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(20, sustainFreq),
        now + Math.max(0.005, synthParams.filterEnv.attack) + Math.max(0.01, synthParams.filterEnv.decay)
      );
    }

    // 2. Create Voice Amp Envelope Gain Node
    this.voiceGainNode = ctx.createGain();
    const velNorm = Math.pow(velocity / 127, 1.2);
    const velScale = 1 - synthParams.velocitySensitivity + synthParams.velocitySensitivity * velNorm;
    const peakGain = Math.max(0.001, velScale * 0.8);
    const sustainGain = Math.max(0.0001, peakGain * synthParams.ampEnv.sustain);

    this.voiceGainNode.gain.setValueAtTime(0.0001, now);
    this.voiceGainNode.gain.linearRampToValueAtTime(peakGain, now + Math.max(0.002, synthParams.ampEnv.attack));
    this.voiceGainNode.gain.exponentialRampToValueAtTime(
      sustainGain,
      now + Math.max(0.002, synthParams.ampEnv.attack) + Math.max(0.01, synthParams.ampEnv.decay)
    );

    // Connect: Voice Gain -> Filter -> Master Instrument Output
    this.voiceGainNode.connect(this.filterNode);
    this.filterNode.connect(this.outputNode);

    // 3. Mode Selection: Sampler vs Synth
    if (isSampleBased && sampleBuffer) {
      this.setupSamplerVoice(sampleBuffer, sampleParams, pitchBendFactor, now);
    } else {
      this.setupSynthVoice(synthParams, pitchBendFactor, now);
    }
  }

  private setupSamplerVoice(
    buffer: AudioBuffer,
    sampleParams: InstrumentPreset['sampleParams'],
    pitchBendFactor: number,
    now: number
  ) {
    const root = sampleParams?.rootNote ?? 60;
    const tune = sampleParams?.tune ?? 0;
    const semitonesFromRoot = this.note - root + tune;
    const rate = Math.pow(2, semitonesFromRoot / 12) * pitchBendFactor;

    this.sampleSource = this.ctx.createBufferSource();
    this.sampleSource.buffer = buffer;
    this.sampleSource.playbackRate.setValueAtTime(Math.max(0.05, rate), now);

    if (sampleParams?.loop) {
      this.sampleSource.loop = true;
      this.sampleSource.loopStart = (sampleParams.loopStart || 0) * buffer.duration;
      this.sampleSource.loopEnd = (sampleParams.loopEnd || 1) * buffer.duration;
    }

    this.sampleSource.connect(this.voiceGainNode);
    this.sampleSource.start(now);
  }

  private setupSynthVoice(
    synthParams: InstrumentPreset['synthParams'],
    pitchBendFactor: number,
    now: number
  ) {
    // Osc 1
    if (synthParams.osc1.enabled) {
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = synthParams.osc1.type;
      const freq1 = this.calculateOscFrequency(
        this.baseFreq,
        synthParams.osc1.octave,
        synthParams.osc1.semi,
        synthParams.osc1.detune
      ) * pitchBendFactor;
      this.osc1.frequency.setValueAtTime(freq1, now);

      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.setValueAtTime(synthParams.osc1.gain, now);
      this.osc1.connect(osc1Gain);
      osc1Gain.connect(this.voiceGainNode);
      this.osc1.start(now);
    }

    // Osc 2
    if (synthParams.osc2.enabled) {
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = synthParams.osc2.type;
      const freq2 = this.calculateOscFrequency(
        this.baseFreq,
        synthParams.osc2.octave,
        synthParams.osc2.semi,
        synthParams.osc2.detune
      ) * pitchBendFactor;
      this.osc2.frequency.setValueAtTime(freq2, now);

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(synthParams.osc2.gain, now);
      this.osc2.connect(osc2Gain);
      osc2Gain.connect(this.voiceGainNode);
      this.osc2.start(now);
    }

    // Sub Osc
    if (synthParams.subOsc.enabled) {
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = synthParams.subOsc.type;
      const subFreq = (this.baseFreq * Math.pow(2, synthParams.subOsc.octave)) * pitchBendFactor;
      this.subOsc.frequency.setValueAtTime(subFreq, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(synthParams.subOsc.gain, now);
      this.subOsc.connect(subGain);
      subGain.connect(this.voiceGainNode);
      this.subOsc.start(now);
    }

    // Noise Generator
    if (synthParams.noise.enabled && synthParams.noise.gain > 0.005) {
      const bufferSize = this.ctx.sampleRate * 2; // 2-second noise loop
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0; // for pink noise approximation

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (synthParams.noise.type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
        } else {
          output[i] = white * 0.3;
        }
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(synthParams.noise.gain, now);
      this.noiseNode.connect(noiseGain);
      noiseGain.connect(this.voiceGainNode);
      this.noiseNode.start(now);
    }
  }

  private calculateOscFrequency(base: number, octave: number, semi: number, detuneCents: number): number {
    const octMult = Math.pow(2, octave);
    const semiMult = Math.pow(2, semi / 12);
    const centMult = Math.pow(2, detuneCents / 1200);
    return base * octMult * semiMult * centMult;
  }

  public setPitchBend(pitchBendFactor: number, time?: number) {
    const now = time !== undefined ? time : this.ctx.currentTime;
    const { synthParams, isSampleBased, sampleParams } = this.preset;

    if (isSampleBased && this.sampleSource) {
      const root = sampleParams?.rootNote ?? 60;
      const tune = sampleParams?.tune ?? 0;
      const semitonesFromRoot = this.note - root + tune;
      const rate = Math.pow(2, semitonesFromRoot / 12) * pitchBendFactor;
      this.sampleSource.playbackRate.setValueAtTime(Math.max(0.05, rate), now);
      return;
    }

    if (this.osc1 && synthParams.osc1.enabled) {
      const freq1 = this.calculateOscFrequency(
        this.baseFreq,
        synthParams.osc1.octave,
        synthParams.osc1.semi,
        synthParams.osc1.detune
      ) * pitchBendFactor;
      this.osc1.frequency.setValueAtTime(freq1, now);
    }

    if (this.osc2 && synthParams.osc2.enabled) {
      const freq2 = this.calculateOscFrequency(
        this.baseFreq,
        synthParams.osc2.octave,
        synthParams.osc2.semi,
        synthParams.osc2.detune
      ) * pitchBendFactor;
      this.osc2.frequency.setValueAtTime(freq2, now);
    }

    if (this.subOsc && synthParams.subOsc.enabled) {
      const subFreq = (this.baseFreq * Math.pow(2, synthParams.subOsc.octave)) * pitchBendFactor;
      this.subOsc.frequency.setValueAtTime(subFreq, now);
    }
  }

  public stop(time?: number) {
    if (this.isReleasing) return;
    this.isReleasing = true;

    const now = time !== undefined ? time : this.ctx.currentTime;
    const relTime = Math.max(0.02, this.preset.synthParams.ampEnv.release);

    try {
      this.voiceGainNode.gain.cancelScheduledValues(now);
      const currentGain = Math.max(0.0001, this.voiceGainNode.gain.value);
      this.voiceGainNode.gain.setValueAtTime(currentGain, now);
      this.voiceGainNode.gain.exponentialRampToValueAtTime(0.00001, now + relTime);

      const stopAt = now + relTime + 0.05;

      if (this.osc1) {
        this.osc1.stop(stopAt);
      }
      if (this.osc2) {
        this.osc2.stop(stopAt);
      }
      if (this.subOsc) {
        this.subOsc.stop(stopAt);
      }
      if (this.noiseNode) {
        this.noiseNode.stop(stopAt);
      }
      if (this.sampleSource) {
        this.sampleSource.stop(stopAt);
      }

      // Disconnect after finished
      setTimeout(() => {
        try {
          this.voiceGainNode.disconnect();
          this.filterNode.disconnect();
        } catch {
          // ignore already disconnected
        }
      }, (relTime + 0.1) * 1000);
    } catch {
      // ignore ramp errors
    }
  }

  public destroyImmediately() {
    try {
      this.voiceGainNode.gain.setValueAtTime(0.00001, this.ctx.currentTime);
      if (this.osc1) this.osc1.stop();
      if (this.osc2) this.osc2.stop();
      if (this.subOsc) this.subOsc.stop();
      if (this.noiseNode) this.noiseNode.stop();
      if (this.sampleSource) this.sampleSource.stop();
      this.voiceGainNode.disconnect();
      this.filterNode.disconnect();
    } catch {
      // ignore
    }
  }
}
