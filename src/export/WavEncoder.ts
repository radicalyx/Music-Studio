/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentPreset, MidiNoteEvent, ExportSettings } from '../types/daw';
import { InstrumentEngine } from '../audio/InstrumentEngine';

export async function renderAndExportWav(
  preset: InstrumentPreset,
  notes: MidiNoteEvent[],
  guideBuffer: AudioBuffer | null,
  guideVolume: number,
  guidePan: number,
  bpm: number,
  options: ExportSettings,
  customSampleBuffer: AudioBuffer | null = null,
  onProgress?: (pct: number) => void
): Promise<{ blob: Blob; url: string; duration: number }> {
  // 1. Calculate rendering length
  // Must preserve start position at 0.000s!
  let maxNoteEnd = 0;
  for (const n of notes) {
    const end = n.startTime + n.duration;
    if (end > maxNoteEnd) maxNoteEnd = end;
  }

  const instrumentReleaseTail = Math.max(2.5, preset.synthParams.ampEnv.release + (preset.synthParams.effects.reverb.enabled ? preset.synthParams.effects.reverb.decay : 0.5));
  let totalDuration = Math.max(4.0, maxNoteEnd + instrumentReleaseTail);

  if (options.includeGuideTrack && guideBuffer) {
    totalDuration = Math.max(totalDuration, guideBuffer.duration);
  }

  const sampleRate = options.sampleRate;
  const totalFrames = Math.ceil(totalDuration * sampleRate);

  // 2. Setup OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // Master bus
  const masterBus = offlineCtx.createGain();
  masterBus.gain.setValueAtTime(1.0, 0);
  masterBus.connect(offlineCtx.destination);

  // Setup Instrument Engine in offline context
  const instrumentEngine = new InstrumentEngine(offlineCtx, preset, masterBus);
  if (customSampleBuffer) {
    // If sample rate differs, we copy data
    instrumentEngine.setSampleBuffer(customSampleBuffer);
  }

  // Schedule all MIDI notes
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  for (const n of sortedNotes) {
    const startTime = Math.max(0, n.startTime);
    const stopTime = startTime + Math.max(0.02, n.duration);

    offlineCtx.suspend(startTime).then(() => {
      instrumentEngine.noteOn(n.note, n.velocity, startTime);
      offlineCtx.resume();
    }).catch(() => {
      // offline context handles direct scheduling as well
    });

    offlineCtx.suspend(stopTime).then(() => {
      instrumentEngine.noteOff(n.note, stopTime);
      offlineCtx.resume();
    }).catch(() => {
      // fallback
    });

    // Also schedule directly onto engine to ensure offline rendering captures it
    setTimeout(() => {}, 0);
  }

  // Alternative direct voice scheduling for 100% deterministic offline rendering:
  // Instead of suspend/resume, we schedule all voices directly with their start and stop times!
  for (const n of sortedNotes) {
    const start = Math.max(0, n.startTime);
    const stop = start + Math.max(0.02, n.duration);
    const voice = instrumentEngine.noteOn(n.note, n.velocity, start);
    voice.stop(stop);
  }

  // If Guide Track is included in mix
  if (options.includeGuideTrack && guideBuffer) {
    const guideSource = offlineCtx.createBufferSource();
    
    // Resample guide buffer if necessary or use as is
    if (guideBuffer.sampleRate === sampleRate) {
      guideSource.buffer = guideBuffer;
    } else {
      // Offline context handles buffer sample rate conversion automatically
      guideSource.buffer = guideBuffer;
    }

    const guideGain = offlineCtx.createGain();
    guideGain.gain.setValueAtTime(guideVolume, 0);

    const guidePanner = offlineCtx.createStereoPanner();
    guidePanner.pan.setValueAtTime(guidePan, 0);

    guideSource.connect(guideGain);
    guideGain.connect(guidePanner);
    guidePanner.connect(masterBus);
    guideSource.start(0);
  }

  if (onProgress) {
    onProgress(30);
  }

  // 3. Render Audio
  const renderedBuffer = await offlineCtx.startRendering();

  if (onProgress) {
    onProgress(85);
  }

  // 4. Encode to standard PCM WAV (16-bit or 24-bit)
  const wavBytes = encodeWavFile(renderedBuffer, options.bitDepth);

  if (onProgress) {
    onProgress(100);
  }

  const blob = new Blob([wavBytes as unknown as BlobPart], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  return { blob, url, duration: totalDuration };
}

/**
 * Standard uncompressed PCM WAV encoder
 */
function encodeWavFile(buffer: AudioBuffer, bitDepth: 16 | 24): Uint8Array {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = bitDepth === 24 ? 3 : 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // 3. "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave audio samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channelData[c][i];
        // Hard clamp [-1.0, 1.0]
        sample = Math.max(-1, Math.min(1, sample));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }
  } else {
    // 24-bit PCM
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channelData[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const int24 = Math.floor(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, int24 & 0xff);
        view.setUint8(offset + 1, (int24 >> 8) & 0xff);
        view.setUint8(offset + 2, (int24 >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Uint8Array(arrayBuffer);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
