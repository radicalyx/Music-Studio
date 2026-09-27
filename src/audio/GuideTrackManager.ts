/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class GuideTrackManager {
  private ctx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode | PannerNode;
  private isPlaying = false;
  private peaks: Float32Array[] | null = null;

  // Track settings
  public volume = 1.0;
  public pan = 0.0;
  public isMuted = false;
  public isSolo = false;
  public fileName: string | null = null;
  public duration = 0;
  public sampleRate = 44100;

  constructor(ctx: AudioContext, destinationNode: AudioNode) {
    this.ctx = ctx;

    this.gainNode = ctx.createGain();
    this.pannerNode = ctx.createStereoPanner();

    this.gainNode.connect(this.pannerNode);
    this.pannerNode.connect(destinationNode);
  }

  public async loadAudioFile(file: File): Promise<{
    buffer: AudioBuffer;
    duration: number;
    peaks: Float32Array[];
  }> {
    const arrayBuffer = await file.arrayBuffer();
    // decodeAudioData requires fresh copy in some browsers
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffer = decoded;
    this.duration = decoded.duration;
    this.sampleRate = decoded.sampleRate;
    this.fileName = file.name;

    // Generate peak overview (approx 1000 data points for waveform)
    this.peaks = this.calculatePeaks(decoded, 1200);

    return {
      buffer: decoded,
      duration: decoded.duration,
      peaks: this.peaks,
    };
  }

  public setBufferDirectly(buffer: AudioBuffer, fileName: string) {
    this.buffer = buffer;
    this.duration = buffer.duration;
    this.sampleRate = buffer.sampleRate;
    this.fileName = fileName;
    this.peaks = this.calculatePeaks(buffer, 1200);
  }

  public getBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  public getPeaks(): Float32Array[] | null {
    return this.peaks;
  }

  private calculatePeaks(buffer: AudioBuffer, numPoints: number): Float32Array[] {
    const channels = buffer.numberOfChannels;
    const peaks: Float32Array[] = [];
    const step = Math.floor(buffer.length / numPoints);

    for (let c = 0; c < Math.min(2, channels); c++) {
      const channelData = buffer.getChannelData(c);
      const channelPeaks = new Float32Array(numPoints * 2); // [min0, max0, min1, max1, ...]

      for (let i = 0; i < numPoints; i++) {
        let min = 0;
        let max = 0;
        const start = i * step;
        const end = Math.min(start + step, buffer.length);

        for (let j = start; j < end; j += 4) { // downsample sample scan for speed
          const val = channelData[j];
          if (val < min) min = val;
          if (val > max) max = val;
        }

        channelPeaks[i * 2] = min;
        channelPeaks[i * 2 + 1] = max;
      }
      peaks.push(channelPeaks);
    }
    return peaks;
  }

  public startPlayback(timelineOffsetSeconds: number, loop = false, loopStart = 0, loopEnd = 0) {
    this.stopPlayback();
    if (!this.buffer) return;

    if (timelineOffsetSeconds >= this.duration && !loop) {
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;

    if (loop && loopEnd > loopStart) {
      source.loop = true;
      source.loopStart = Math.max(0, loopStart);
      source.loopEnd = Math.min(this.duration, loopEnd);
    }

    source.connect(this.gainNode);

    const safeOffset = Math.max(0, Math.min(timelineOffsetSeconds, this.duration - 0.01));
    const now = this.ctx.currentTime;

    try {
      source.start(now, safeOffset);
      this.currentSource = source;
      this.isPlaying = true;

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
          this.isPlaying = false;
        }
      };
    } catch {
      // ignore
    }
  }

  public stopPlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  public updateVolume(vol: number) {
    this.volume = vol;
    this.applyGain();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.applyGain();
  }

  public setSolo(solo: boolean) {
    this.isSolo = solo;
  }

  public updatePan(pan: number) {
    this.pan = pan;
    if ('pan' in this.pannerNode) {
      (this.pannerNode as StereoPannerNode).pan.setValueAtTime(
        Math.max(-1, Math.min(1, pan)),
        this.ctx.currentTime
      );
    }
  }

  public applyGain(isAnyOtherTrackSoloed = false) {
    const effectiveMute = this.isMuted || (isAnyOtherTrackSoloed && !this.isSolo);
    const targetGain = effectiveMute ? 0 : Math.max(0, this.volume);
    this.gainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  public clear() {
    this.stopPlayback();
    this.buffer = null;
    this.peaks = null;
    this.fileName = null;
    this.duration = 0;
  }
}
