/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web MIDI API types fallback if not present in ambient environment
export interface WebMidiInput {
  id: string;
  name?: string;
  manufacturer?: string;
  state?: string;
  connection?: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

export interface WebMidiAccess {
  inputs: Map<string, WebMidiInput>;
  onstatechange: ((event: unknown) => void) | null;
}

export interface MidiListenerCallbacks {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  onPitchBend: (bendValue: number) => void; // -8192 to 8191
  onModWheel: (modValue: number) => void; // 0 to 127
  onSustainPedal: (isDown: boolean) => void;
  onDeviceChange: (devices: Array<{ id: string; name: string; manufacturer?: string }>) => void;
  onStatusChange: (status: 'granted' | 'denied' | 'prompt' | 'unsupported', message?: string) => void;
  onActivity: () => void;
}

export class MidiManager {
  private midiAccess: WebMidiAccess | null = null;
  public status: 'granted' | 'denied' | 'prompt' | 'unsupported' = 'prompt';
  public statusMessage = '';
  public devices: Array<{ id: string; name: string; manufacturer?: string }> = [];
  public selectedDeviceId: string | 'all' = 'all';
  private callbacks: MidiListenerCallbacks;

  // Active notes state
  public activeNotes: Map<number, number> = new Map(); // note -> velocity
  public isSustainDown = false;
  public pitchBendValue = 0; // -8192 to 8191
  public modWheelValue = 0; // 0 to 127

  // Computer keyboard state
  public computerOctaveOffset = 3; // C3 default
  public computerVelocity = 100;
  private computerKeysDown: Set<string> = new Set();

  constructor(callbacks: MidiListenerCallbacks) {
    this.callbacks = callbacks;
  }

  public async initMidi(): Promise<void> {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      this.status = 'unsupported';
      this.statusMessage = 'Web MIDI is not supported in this browser. Use Chrome/Edge/Opera or the built-in keyboard.';
      this.callbacks.onStatusChange(this.status, this.statusMessage);
      return;
    }

    try {
      const nav = navigator as unknown as { requestMIDIAccess: (opts?: { sysex: boolean }) => Promise<WebMidiAccess> };
      const access = await nav.requestMIDIAccess({ sysex: false });
      this.midiAccess = access;
      this.status = 'granted';
      this.statusMessage = 'MIDI Connected';
      this.callbacks.onStatusChange(this.status, this.statusMessage);

      this.updateDeviceList();

      access.onstatechange = () => {
        this.updateDeviceList();
      };
    } catch (err: unknown) {
      this.status = 'denied';
      const msg = err instanceof Error ? err.message : 'MIDI permission denied';
      this.statusMessage = `MIDI Access Denied: ${msg}`;
      this.callbacks.onStatusChange(this.status, this.statusMessage);
    }
  }

  private updateDeviceList() {
    if (!this.midiAccess) return;
    const list: Array<{ id: string; name: string; manufacturer?: string }> = [];

    this.midiAccess.inputs.forEach((input: WebMidiInput) => {
      list.push({
        id: input.id,
        name: input.name || `MIDI Device (${input.id})`,
        manufacturer: input.manufacturer,
      });

      // Attach message handler
      input.onmidimessage = (event: { data: Uint8Array }) => {
        if (this.selectedDeviceId === 'all' || this.selectedDeviceId === input.id) {
          this.handleMidiMessage(event.data);
        }
      };
    });

    this.devices = list;
    this.callbacks.onDeviceChange(list);
  }

  public setSelectedDevice(deviceId: string | 'all') {
    this.selectedDeviceId = deviceId;
  }

  public handleMidiMessage(data: Uint8Array) {
    if (!data || data.length < 1) return;
    const statusByte = data[0];
    const command = statusByte >> 4;
    // const channel = statusByte & 0xf;

    this.callbacks.onActivity();

    // 0x9 = Note On, 0x8 = Note Off
    if (command === 0x9) {
      const note = data[1];
      const velocity = data[2];
      if (velocity > 0) {
        this.activeNotes.set(note, velocity);
        this.callbacks.onNoteOn(note, velocity);
      } else {
        // Velocity 0 is note-off
        this.activeNotes.delete(note);
        this.callbacks.onNoteOff(note);
      }
    } else if (command === 0x8) {
      const note = data[1];
      this.activeNotes.delete(note);
      this.callbacks.onNoteOff(note);
    } else if (command === 0xb) {
      // Control Change
      const controller = data[1];
      const value = data[2];

      if (controller === 64) {
        // Sustain Pedal (CC 64)
        const isDown = value >= 64;
        this.isSustainDown = isDown;
        this.callbacks.onSustainPedal(isDown);
      } else if (controller === 1) {
        // Modulation Wheel (CC 1)
        this.modWheelValue = value;
        this.callbacks.onModWheel(value);
      }
    } else if (command === 0xe) {
      // Pitch Bend (14-bit: LSB = data[1], MSB = data[2])
      const lsb = data[1];
      const msb = data[2];
      const bend14 = (msb << 7) | lsb; // 0 to 16383, center is 8192
      const centered = bend14 - 8192; // -8192 to 8191
      this.pitchBendValue = centered;
      this.callbacks.onPitchBend(centered);
    }
  }

  // Virtual On-Screen Note triggers
  public triggerVirtualNoteOn(note: number, velocity = 100) {
    this.activeNotes.set(note, velocity);
    this.callbacks.onActivity();
    this.callbacks.onNoteOn(note, velocity);
  }

  public triggerVirtualNoteOff(note: number) {
    this.activeNotes.delete(note);
    this.callbacks.onNoteOff(note);
  }

  public triggerVirtualPitchBend(centeredValue: number) {
    this.pitchBendValue = centeredValue;
    this.callbacks.onPitchBend(centeredValue);
  }

  public triggerVirtualModWheel(value: number) {
    this.modWheelValue = value;
    this.callbacks.onModWheel(value);
  }

  // Computer Keyboard QWERTY mapping
  public handleKeyDown(code: string, isRepeat: boolean): boolean {
    if (isRepeat) return false;

    // Octave adjust: Z = Octave down, X = Octave up
    if (code === 'KeyZ') {
      this.computerOctaveOffset = Math.max(1, this.computerOctaveOffset - 1);
      return true;
    }
    if (code === 'KeyX') {
      this.computerOctaveOffset = Math.min(7, this.computerOctaveOffset + 1);
      return true;
    }
    // Velocity adjust: C = -15, V = +15
    if (code === 'KeyC') {
      this.computerVelocity = Math.max(20, this.computerVelocity - 15);
      return true;
    }
    if (code === 'KeyV') {
      this.computerVelocity = Math.min(127, this.computerVelocity + 15);
      return true;
    }

    const note = this.codeToMidiNote(code);
    if (note !== null && !this.computerKeysDown.has(code)) {
      this.computerKeysDown.add(code);
      this.triggerVirtualNoteOn(note, this.computerVelocity);
      return true;
    }

    return false;
  }

  public handleKeyUp(code: string): boolean {
    if (this.computerKeysDown.has(code)) {
      this.computerKeysDown.delete(code);
      const note = this.codeToMidiNote(code);
      if (note !== null) {
        this.triggerVirtualNoteOff(note);
      }
      return true;
    }
    return false;
  }

  public codeToMidiNote(code: string): number | null {
    // Relative semitones from root C of current octave
    // White keys: A(0), S(2), D(4), F(5), G(7), H(9), J(11), K(12), L(14), Semicolon(16), Quote(17)
    // Black keys: W(1), E(3), T(6), Y(8), U(10), O(13), P(15)
    const keyMap: Record<string, number> = {
      KeyA: 0,  // C
      KeyW: 1,  // C#
      KeyS: 2,  // D
      KeyE: 3,  // D#
      KeyD: 4,  // E
      KeyF: 5,  // F
      KeyT: 6,  // F#
      KeyG: 7,  // G
      KeyY: 8,  // G#
      KeyH: 9,  // A
      KeyU: 10, // A#
      KeyJ: 11, // B
      KeyK: 12, // C (+1 oct)
      KeyO: 13, // C#
      KeyL: 14, // D
      KeyP: 15, // D#
      Semicolon: 16, // E
      Quote: 17, // F
    };

    if (keyMap[code] !== undefined) {
      const rootC = (this.computerOctaveOffset + 1) * 12; // C3 = 48, C4 = 60
      return rootC + keyMap[code];
    }
    return null;
  }

  public allNotesOff() {
    this.computerKeysDown.clear();
    for (const note of this.activeNotes.keys()) {
      this.callbacks.onNoteOff(note);
    }
    this.activeNotes.clear();
  }
}
