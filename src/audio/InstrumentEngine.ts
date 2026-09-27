/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentPreset } from '../types/daw';
import { SynthVoice } from './SynthVoice';
import { createReverbImpulse, makeDistortionCurve } from './reverbImpulse';
import { createDefaultSampleBuffer } from './defaultSample';

export class InstrumentEngine {
  public ctx: BaseAudioContext;
  public preset: InstrumentPreset;
  public activeVoices: Map<number, SynthVoice> = new Map();
  public sustainedVoices: Set<SynthVoice> = new Set();
  public sustainPedalDown = false;
  public pitchBendSemitones = 2; // standard 2 semitones bend range
  public currentPitchBendFactor = 1.0;
  public currentModWheel = 0; // 0 to 127

  // Audio Nodes
  public outputNode: GainNode;
  private voiceBusGain: GainNode;
  private driveNode: WaveShaperNode;
  private driveGain: GainNode;
  private chorusDelay: DelayNode;
  private chorusLfo: OscillatorNode | null = null;
  private chorusLfoGain: GainNode;
  private chorusWetGain: GainNode;
  private delayNode: DelayNode;
  private delayFeedbackGain: GainNode;
  private delayWetGain: GainNode;
  private reverbConvolver: ConvolverNode;
  private reverbWetGain: GainNode;
  private dryGain: GainNode;
  private masterGainNode: GainNode;
  private pannerNode: StereoPannerNode | PannerNode;

  public customSampleBuffer: AudioBuffer | null = null;

  constructor(ctx: BaseAudioContext, preset: InstrumentPreset, destinationNode?: AudioNode) {
    this.ctx = ctx;
    this.preset = preset;

    // 1. Output & Panner
    this.outputNode = ctx.createGain();
    if (destinationNode) {
      this.outputNode.connect(destinationNode);
    }

    this.pannerNode = ctx.createStereoPanner();

    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(preset.synthParams.masterGain, ctx.currentTime);

    // 2. Voice bus summing node
    this.voiceBusGain = ctx.createGain();
    this.voiceBusGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // 3. Effects Rack
    // A. Drive / Saturation
    this.driveNode = ctx.createWaveShaper();
    this.driveGain = ctx.createGain();
    this.updateDrive();

    // B. Chorus
    this.chorusDelay = ctx.createDelay(0.05);
    this.chorusDelay.delayTime.setValueAtTime(0.015, ctx.currentTime);
    this.chorusLfoGain = ctx.createGain();
    this.chorusWetGain = ctx.createGain();
    this.setupChorusLfo();

    // C. Delay
    this.delayNode = ctx.createDelay(2.0);
    this.delayFeedbackGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();
    this.updateDelayParams();

    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // D. Reverb
    this.reverbConvolver = ctx.createConvolver();
    try {
      this.reverbConvolver.buffer = createReverbImpulse(
        ctx,
        preset.synthParams.effects.reverb.decay,
        2.2
      );
    } catch {
      // ignore in offline mock
    }
    this.reverbWetGain = ctx.createGain();
    this.updateReverbParams();

    // E. Dry Path
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Wire Effects:
    // voiceBusGain -> driveNode -> driveGain
    this.voiceBusGain.connect(this.driveNode);
    this.driveNode.connect(this.driveGain);

    // From driveGain:
    // -> Dry Gain
    this.driveGain.connect(this.dryGain);

    // -> Chorus
    this.driveGain.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusWetGain);

    // -> Delay
    this.driveGain.connect(this.delayNode);

    // -> Reverb
    this.driveGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);

    // Sum Dry + Wet to masterGainNode
    this.dryGain.connect(this.masterGainNode);
    this.chorusWetGain.connect(this.masterGainNode);
    this.delayWetGain.connect(this.masterGainNode);
    this.reverbWetGain.connect(this.masterGainNode);

    // MasterGain -> Panner -> OutputNode
    this.masterGainNode.connect(this.pannerNode);
    this.pannerNode.connect(this.outputNode);

    // Default sample buffer initialization
    if (preset.isSampleBased && !this.customSampleBuffer) {
      this.customSampleBuffer = createDefaultSampleBuffer(ctx);
    }
  }

  private setupChorusLfo() {
    if (this.ctx instanceof OfflineAudioContext) return;
    try {
      this.chorusLfo = this.ctx.createOscillator();
      this.chorusLfo.type = 'sine';
      this.chorusLfo.frequency.setValueAtTime(this.preset.synthParams.effects.chorus.rate, this.ctx.currentTime);
      this.chorusLfo.connect(this.chorusLfoGain);
      this.chorusLfoGain.connect(this.chorusDelay.delayTime);
      this.chorusLfo.start();
    } catch {
      // ignore
    }
    this.updateChorusParams();
  }

  public updatePreset(preset: InstrumentPreset) {
    this.preset = preset;
    const now = this.ctx.currentTime;
    this.masterGainNode.gain.setValueAtTime(preset.synthParams.masterGain, now);
    this.updateDrive();
    this.updateChorusParams();
    this.updateDelayParams();
    this.updateReverbParams();

    if (preset.isSampleBased && !this.customSampleBuffer) {
      this.customSampleBuffer = createDefaultSampleBuffer(this.ctx);
    }
  }

  public setSampleBuffer(buffer: AudioBuffer | null) {
    this.customSampleBuffer = buffer;
  }

  private updateDrive() {
    const { drive } = this.preset.synthParams.effects;
    if (drive.enabled && drive.amount > 0.01) {
      this.driveNode.curve = makeDistortionCurve(drive.amount) as unknown as Float32Array<ArrayBuffer>;
      this.driveGain.gain.setValueAtTime(1.0 / (1 + drive.amount * 0.5), this.ctx.currentTime);
    } else {
      this.driveNode.curve = null;
      this.driveGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  private updateChorusParams() {
    const { chorus } = this.preset.synthParams.effects;
    const now = this.ctx.currentTime;
    if (chorus.enabled && chorus.mix > 0.01) {
      this.chorusLfoGain.gain.setValueAtTime(0.003 * chorus.depth, now);
      if (this.chorusLfo) {
        this.chorusLfo.frequency.setValueAtTime(chorus.rate, now);
      }
      this.chorusWetGain.gain.setValueAtTime(chorus.mix * 0.7, now);
    } else {
      this.chorusLfoGain.gain.setValueAtTime(0, now);
      this.chorusWetGain.gain.setValueAtTime(0, now);
    }
  }

  private updateDelayParams() {
    const { delay } = this.preset.synthParams.effects;
    const now = this.ctx.currentTime;
    if (delay.enabled && delay.mix > 0.01) {
      this.delayNode.delayTime.setValueAtTime(Math.max(0.02, delay.time), now);
      this.delayFeedbackGain.gain.setValueAtTime(Math.min(0.85, delay.feedback), now);
      this.delayWetGain.gain.setValueAtTime(delay.mix * 0.8, now);
    } else {
      this.delayWetGain.gain.setValueAtTime(0, now);
    }
  }

  private updateReverbParams() {
    const { reverb } = this.preset.synthParams.effects;
    const now = this.ctx.currentTime;
    if (reverb.enabled && reverb.mix > 0.01) {
      this.reverbWetGain.gain.setValueAtTime(reverb.mix * 0.8, now);
    } else {
      this.reverbWetGain.gain.setValueAtTime(0, now);
    }
  }

  public setPan(pan: number) {
    if ('pan' in this.pannerNode) {
      (this.pannerNode as StereoPannerNode).pan.setValueAtTime(
        Math.max(-1, Math.min(1, pan)),
        this.ctx.currentTime
      );
    }
  }

  public setVolume(vol: number) {
    this.outputNode.gain.setValueAtTime(Math.max(0, vol), this.ctx.currentTime);
  }

  public noteOn(note: number, velocity: number, time?: number): SynthVoice {
    const playTime = time !== undefined ? time : this.ctx.currentTime;

    // Check polyphony limit & voice stealing
    const maxPoly = Math.max(1, this.preset.synthParams.polyphony);
    if (this.activeVoices.size >= maxPoly) {
      // Steal oldest active voice
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        const stolenVoice = this.activeVoices.get(oldestKey);
        if (stolenVoice) {
          stolenVoice.stop(playTime);
          this.activeVoices.delete(oldestKey);
        }
      }
    }

    // If same note already playing, stop existing one
    const existing = this.activeVoices.get(note);
    if (existing) {
      existing.stop(playTime);
      this.activeVoices.delete(note);
    }

    const voice = new SynthVoice(
      this.ctx,
      note,
      velocity,
      this.preset,
      this.voiceBusGain,
      this.customSampleBuffer,
      this.currentPitchBendFactor,
      playTime
    );

    this.activeVoices.set(note, voice);
    return voice;
  }

  public noteOff(note: number, time?: number) {
    const stopTime = time !== undefined ? time : this.ctx.currentTime;
    const voice = this.activeVoices.get(note);
    if (!voice) return;

    if (this.sustainPedalDown) {
      // Sustain pedal is holding this note
      voice.isSustained = true;
      this.sustainedVoices.add(voice);
    } else {
      voice.stop(stopTime);
      this.activeVoices.delete(note);
    }
  }

  public setSustainPedal(isDown: boolean) {
    this.sustainPedalDown = isDown;
    if (!isDown) {
      // Release all sustained voices
      const now = this.ctx.currentTime;
      for (const voice of this.sustainedVoices) {
        voice.stop(now);
        this.activeVoices.delete(voice.note);
      }
      this.sustainedVoices.clear();
    }
  }

  public setPitchBend(bendValue: number, time?: number) {
    // bendValue: -8192 to 8191
    const semitones = (bendValue / 8192) * this.pitchBendSemitones;
    this.currentPitchBendFactor = Math.pow(2, semitones / 12);

    for (const voice of this.activeVoices.values()) {
      voice.setPitchBend(this.currentPitchBendFactor, time);
    }
  }

  public setModWheel(wheelValue: number) {
    // wheelValue: 0 to 127
    this.currentModWheel = wheelValue;
    const norm = wheelValue / 127;
    // Route mod wheel to vibrato or filter resonance
    if (this.preset.synthParams.lfo.enabled && this.chorusLfoGain) {
      this.chorusLfoGain.gain.setValueAtTime(0.005 * norm, this.ctx.currentTime);
    }
  }

  public allNotesOff() {
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices.values()) {
      voice.stop(now);
    }
    for (const voice of this.sustainedVoices) {
      voice.stop(now);
    }
    this.activeVoices.clear();
    this.sustainedVoices.clear();
  }

  public destroy() {
    this.allNotesOff();
    try {
      if (this.chorusLfo) {
        this.chorusLfo.stop();
        this.chorusLfo.disconnect();
      }
      this.voiceBusGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // ignore
    }
  }
}
