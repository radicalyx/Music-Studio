/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MidiNoteEvent } from '../types/daw';

interface DiscreteMidiEvent {
  tick: number;
  type: 'on' | 'off';
  note: number;
  velocity: number;
}

export function encodeStandardMidiFile(
  notes: MidiNoteEvent[],
  bpm: number,
  trackName = 'AuraStudio Instrument'
): Uint8Array {
  const ppq = 480; // Standard 480 ticks per quarter note
  const ticksPerSecond = (bpm / 60) * ppq;

  // Convert notes into discrete note-on and note-off events
  const rawEvents: DiscreteMidiEvent[] = [];

  for (const n of notes) {
    const startTick = Math.max(0, Math.round(n.startTime * ticksPerSecond));
    const durationTick = Math.max(12, Math.round(n.duration * ticksPerSecond));
    const endTick = startTick + durationTick;

    rawEvents.push({
      tick: startTick,
      type: 'on',
      note: Math.max(0, Math.min(127, n.note)),
      velocity: Math.max(1, Math.min(127, n.velocity)),
    });

    rawEvents.push({
      tick: endTick,
      type: 'off',
      note: Math.max(0, Math.min(127, n.note)),
      velocity: 64,
    });
  }

  // Sort events chronologically: Note-Off before Note-On if ticks are identical
  rawEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return a.note - b.note;
  });

  const trackBytes: number[] = [];

  // Helper to write Variable-Length Quantity (VLQ)
  const writeVlq = (value: number) => {
    let buffer = value & 0x7f;
    const bytes: number[] = [];
    while ((value >>= 7) > 0) {
      buffer <<= 8;
      buffer |= 0x80;
      buffer += (value & 0x7f);
    }
    while (true) {
      bytes.push(buffer & 0xff);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
    trackBytes.push(...bytes);
  };

  // 1. Initial Meta Events at Delta 0
  // Set Tempo: 0xFF 0x51 0x03 [3-byte microseconds per quarter note]
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  writeVlq(0); // Delta 0
  trackBytes.push(
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Time Signature: 4/4 (0xFF 0x58 0x04 0x04 0x02 0x18 0x08)
  writeVlq(0);
  trackBytes.push(0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Track Name
  writeVlq(0);
  const nameBytes = Array.from(trackName).map((c) => c.charCodeAt(0));
  trackBytes.push(0xff, 0x03, nameBytes.length, ...nameBytes);

  // 2. Note Events
  let lastTick = 0;
  for (const ev of rawEvents) {
    const delta = Math.max(0, ev.tick - lastTick);
    writeVlq(delta);

    if (ev.type === 'on') {
      trackBytes.push(0x90, ev.note, ev.velocity); // Note On channel 0
    } else {
      trackBytes.push(0x80, ev.note, ev.velocity); // Note Off channel 0
    }

    lastTick = ev.tick;
  }

  // 3. End of Track: 0xFF 0x2F 0x00
  writeVlq(0);
  trackBytes.push(0xff, 0x2f, 0x00);

  // 4. Construct Header Chunk (MThd) + Track Chunk (MTrk)
  const headerLength = 14;
  const trackChunkLength = 8 + trackBytes.length;
  const totalLength = headerLength + trackChunkLength;

  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);

  // MThd
  out[0] = 0x4d; // 'M'
  out[1] = 0x54; // 'T'
  out[2] = 0x68; // 'h'
  out[3] = 0x64; // 'd'
  view.setUint32(4, 6, false); // Length = 6 big-endian
  view.setUint16(8, 0, false); // Format 0 (single track)
  view.setUint16(10, 1, false); // 1 track
  view.setUint16(12, ppq, false); // Division (480 ticks/beat)

  // MTrk
  out[14] = 0x4d; // 'M'
  out[15] = 0x54; // 'T'
  out[16] = 0x72; // 'r'
  out[17] = 0x6b; // 'k'
  view.setUint32(18, trackBytes.length, false); // Track byte length big-endian

  // Track data
  out.set(trackBytes, 22);

  return out;
}

export function exportAndDownloadMidi(
  notes: MidiNoteEvent[],
  bpm: number,
  trackName: string,
  filename = 'AuraStudio_Performance.mid'
): Blob {
  const midiBytes = encodeStandardMidiFile(notes, bpm, trackName);
  const blob = new Blob([midiBytes as unknown as BlobPart], { type: 'audio/midi' });
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
  return blob;
}
