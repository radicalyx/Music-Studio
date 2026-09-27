/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Metronome {
  private ctx: BaseAudioContext;
  private outputNode: GainNode;
  public enabled = false;
  public volume = 0.5;

  constructor(ctx: BaseAudioContext, destinationNode: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.outputNode.connect(destinationNode);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.outputNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
  }

  public triggerClick(time: number, isDownbeat: boolean) {
    if (!this.enabled && this.volume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Downbeat is higher pitch (1400Hz) and slightly louder; other beats 900Hz
    const freq = isDownbeat ? 1400 : 900;
    const peakGain = (isDownbeat ? 0.8 : 0.5) * this.volume;

    osc.frequency.setValueAtTime(freq, time);
    // Slight pitch drop for woodblock click feel
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.03);

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.05);

    setTimeout(() => {
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // ignore
      }
    }, 100);
  }
}
