/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TransportState,
  GuideTrackState,
  InstrumentTrackState,
  MidiNoteEvent,
  InstrumentPreset,
  MidiDeviceState,
} from './types/daw';
import { AudioEngine } from './audio/AudioEngine';
import { STARTER_PRESETS } from './audio/presets';
import { MidiManager } from './midi/MidiManager';
import { TopTransportBar } from './components/TopTransportBar';
import { TimelineArranger } from './components/TimelineArranger';
import { SoundDesignerPanel } from './components/SoundDesignerPanel';
import { PianoRollEditor } from './components/PianoRollEditor';
import { MixerPanel } from './components/MixerPanel';
import { VirtualPianoKeyboard } from './components/VirtualPianoKeyboard';
import { LogicExportModal } from './components/LogicExportModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import {
  saveCustomPresetToStorage,
  getCustomPresetsFromStorage,
  exportProjectToFile,
  importProjectFromFile,
} from './utils/projectStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sound' | 'pianoroll' | 'mixer' | 'export'>('sound');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Core state
  const [preset, setPreset] = useState<InstrumentPreset>(STARTER_PRESETS[0]);
  const [customPresets, setCustomPresets] = useState<InstrumentPreset[]>([]);
  const [notes, setNotes] = useState<MidiNoteEvent[]>([]);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);

  // Engine instance references
  const engineRef = useRef<AudioEngine | null>(null);
  const midiManagerRef = useRef<MidiManager | null>(null);

  // Mirror engine states in React
  const [transport, setTransport] = useState<TransportState>({
    bpm: 120,
    timeSignature: [4, 4],
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    countInRemaining: 0,
    countInBars: 1,
    currentTime: 0,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 16,
    metronomeEnabled: false,
    metronomeVolume: 0.6,
  });

  const [guideTrack, setGuideTrack] = useState<GuideTrackState>({
    fileName: null,
    duration: 0,
    sampleRate: 44100,
    volume: 1.0,
    pan: 0,
    isMuted: false,
    isSolo: false,
    buffer: null,
    peaks: null,
  });

  const [instrumentTrack, setInstrumentTrack] = useState<InstrumentTrackState>({
    name: STARTER_PRESETS[0].name,
    volume: 1.0,
    pan: 0,
    isMuted: false,
    isSolo: false,
    isArmed: true,
  });

  const [midiState, setMidiState] = useState<MidiDeviceState>({
    supported: true,
    permissionState: 'prompt',
    inputs: [],
    selectedInputId: 'all',
    activeNotes: new Map(),
    sustainPedalActive: false,
    pitchBendValue: 0,
    modWheelValue: 0,
    lastActivityTimestamp: 0,
  });

  // Undo / Redo tracking
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Load custom presets from storage
  useEffect(() => {
    const loaded = getCustomPresetsFromStorage();
    setCustomPresets(loaded);
  }, []);

  // Initialize AudioEngine and Web MIDI Manager
  useEffect(() => {
    const engine = new AudioEngine({
      onTransportUpdate: (t) => setTransport(t),
      onNotesUpdate: (n) => {
        setNotes(n);
        if (engineRef.current) {
          setCanUndo(engineRef.current.undoStack.length > 0);
          setCanRedo(engineRef.current.redoStack.length > 0);
        }
      },
      onGuideTrackUpdate: (g) => setGuideTrack(g),
      onInstrumentTrackUpdate: (i) => setInstrumentTrack(i),
      onActiveNotesChange: (act) => setActiveNotes(act),
    });
    engineRef.current = engine;

    const midi = new MidiManager({
      onNoteOn: (note, velocity) => {
        engine.handleLiveNoteOn(note, velocity);
      },
      onNoteOff: (note) => {
        engine.handleLiveNoteOff(note);
      },
      onPitchBend: (bendVal) => {
        engine.instrumentEngine.setPitchBend(bendVal);
        setMidiState((prev) => ({ ...prev, pitchBendValue: bendVal }));
      },
      onModWheel: (modVal) => {
        engine.instrumentEngine.setModWheel(modVal);
        setMidiState((prev) => ({ ...prev, modWheelValue: modVal }));
      },
      onSustainPedal: (isDown) => {
        engine.instrumentEngine.setSustainPedal(isDown);
        setMidiState((prev) => ({ ...prev, sustainPedalActive: isDown }));
      },
      onDeviceChange: (devices) => {
        setMidiState((prev) => ({ ...prev, inputs: devices }));
      },
      onStatusChange: (status) => {
        setMidiState((prev) => ({ ...prev, permissionState: status }));
      },
      onActivity: () => {
        setMidiState((prev) => ({ ...prev, lastActivityTimestamp: Date.now() }));
      },
    });
    midiManagerRef.current = midi;

    // Connect to Web MIDI API
    midi.initMidi();

    return () => {
      engine.destroy();
      midi.allNotesOff();
    };
  }, []);

  // Global Keyboard Shortcuts (Space to play, R to record, QWERTY keys for notes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Space: Toggle Play / Stop
      if (e.code === 'Space') {
        e.preventDefault();
        if (transport.isPlaying) {
          engineRef.current?.stop();
        } else {
          engineRef.current?.play();
        }
        return;
      }

      // R: Toggle Record
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (transport.isRecording) {
          engineRef.current?.stop();
        } else {
          engineRef.current?.record();
        }
        return;
      }

      // Ctrl+Z: Undo, Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        engineRef.current?.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        engineRef.current?.redo();
        return;
      }

      // Computer piano key input
      if (midiManagerRef.current) {
        const handled = midiManagerRef.current.handleKeyDown(e.code, e.repeat);
        if (handled) {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (midiManagerRef.current) {
        midiManagerRef.current.handleKeyUp(e.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [transport.isPlaying, transport.isRecording]);

  // Handlers
  const handlePresetChange = useCallback((newPreset: InstrumentPreset) => {
    setPreset(newPreset);
    engineRef.current?.setPreset(newPreset);
  }, []);

  const handleSaveCustomPreset = useCallback((newPreset: InstrumentPreset) => {
    saveCustomPresetToStorage(newPreset);
    setCustomPresets(getCustomPresetsFromStorage());
  }, []);

  const handleUploadGuide = useCallback((file: File) => {
    engineRef.current?.loadGuideFile(file);
  }, []);

  const handleClearGuide = useCallback(() => {
    engineRef.current?.clearGuideTrack();
  }, []);

  const handleUploadSample = useCallback(async (file: File) => {
    if (!engineRef.current) return;
    try {
      const arrayBuf = await file.arrayBuffer();
      const decoded = await engineRef.current.ctx.decodeAudioData(arrayBuf);
      engineRef.current.instrumentEngine.setSampleBuffer(decoded);
    } catch (err) {
      console.error('Failed to decode user sample:', err);
    }
  }, []);

  const handleExportProject = useCallback(() => {
    exportProjectToFile(
      'AuraStudio_Project',
      transport.bpm,
      transport.timeSignature,
      preset,
      notes,
      guideTrack.fileName
    );
  }, [transport.bpm, transport.timeSignature, preset, notes, guideTrack.fileName]);

  const handleImportProject = useCallback(async (file: File) => {
    try {
      const project = await importProjectFromFile(file);
      handlePresetChange(project.preset);
      engineRef.current?.setBpm(project.bpm);
      engineRef.current?.setNotes(project.notes);
      setIsSettingsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid project file');
    }
  }, [handlePresetChange]);

  const handleResetSession = useCallback(() => {
    engineRef.current?.clearAllNotes();
    engineRef.current?.clearGuideTrack();
    handlePresetChange(STARTER_PRESETS[0]);
  }, [handlePresetChange]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0d12] text-neutral-200">
      {/* 1. Top Transport & Brand Bar */}
      <TopTransportBar
        transport={transport}
        midiState={midiState}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'export') {
            setIsExportModalOpen(true);
          } else {
            setActiveTab(tab as 'sound' | 'pianoroll' | 'mixer');
          }
        }}
        onPlay={() => engineRef.current?.play()}
        onStop={() => engineRef.current?.stop()}
        onRecord={() => engineRef.current?.record()}
        onSeek={(sec) => engineRef.current?.seek(sec)}
        onBpmChange={(bpm) => engineRef.current?.setBpm(bpm)}
        onLoopToggle={() => engineRef.current?.setLoopEnabled(!transport.loopEnabled)}
        onMetronomeToggle={() => engineRef.current?.setMetronomeEnabled(!transport.metronomeEnabled)}
        onCountInChange={(bars) => engineRef.current?.setCountInBars(bars)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* 2. Timeline & Track Arranger View */}
      <div className="h-[250px] shrink-0 flex flex-col">
        <TimelineArranger
          transport={transport}
          guideTrack={guideTrack}
          instrumentTrack={instrumentTrack}
          notes={notes}
          onSeek={(sec) => engineRef.current?.seek(sec)}
          onSetLoopRange={(start, end) => engineRef.current?.setLoopRange(start, end)}
          onUploadGuide={handleUploadGuide}
          onClearGuide={handleClearGuide}
          onGuideVolumeChange={(vol) => engineRef.current?.setGuideVolume(vol)}
          onGuidePanChange={(pan) => engineRef.current?.setGuidePan(pan)}
          onGuideMuteToggle={() => engineRef.current?.setGuideMute(!guideTrack.isMuted)}
          onGuideSoloToggle={() => engineRef.current?.setGuideSolo(!guideTrack.isSolo)}
          onInstrumentVolumeChange={(vol) => engineRef.current?.setInstrumentVolume(vol)}
          onInstrumentPanChange={(pan) => engineRef.current?.setInstrumentPan(pan)}
          onInstrumentMuteToggle={() => engineRef.current?.setInstrumentMute(!instrumentTrack.isMuted)}
          onInstrumentSoloToggle={() => engineRef.current?.setInstrumentSolo(!instrumentTrack.isSolo)}
          onInstrumentArmToggle={() => engineRef.current?.setInstrumentArmed(!instrumentTrack.isArmed)}
          onOpenPianoRoll={() => setActiveTab('pianoroll')}
        />
      </div>

      {/* 3. Center Workspace Area (Switchable between Sound Design, Piano Roll, Mixer) */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'sound' && (
          <SoundDesignerPanel
            preset={preset}
            onPresetChange={handlePresetChange}
            onSaveCustomPreset={handleSaveCustomPreset}
            customPresets={customPresets}
            onUploadSample={handleUploadSample}
            customSampleName={preset.sampleParams?.sampleName}
          />
        )}

        {activeTab === 'pianoroll' && (
          <PianoRollEditor
            notes={notes}
            transport={transport}
            onNotesChange={(newNotes) => engineRef.current?.setNotes(newNotes)}
            onQuantize={(grid) => engineRef.current?.quantizeNotes(grid)}
            onUndo={() => engineRef.current?.undo()}
            onRedo={() => engineRef.current?.redo()}
            canUndo={canUndo}
            canRedo={canRedo}
            onClearNotes={() => engineRef.current?.clearAllNotes()}
            onSeek={(sec) => engineRef.current?.seek(sec)}
            onPlayNote={(note, vel) => engineRef.current?.handleLiveNoteOn(note, vel)}
            onStopNote={(note) => engineRef.current?.handleLiveNoteOff(note)}
          />
        )}

        {activeTab === 'mixer' && (
          <MixerPanel
            guideTrack={guideTrack}
            instrumentTrack={instrumentTrack}
            masterVolume={masterVolume}
            onGuideVolumeChange={(vol) => engineRef.current?.setGuideVolume(vol)}
            onGuidePanChange={(pan) => engineRef.current?.setGuidePan(pan)}
            onGuideMuteToggle={() => engineRef.current?.setGuideMute(!guideTrack.isMuted)}
            onGuideSoloToggle={() => engineRef.current?.setGuideSolo(!guideTrack.isSolo)}
            onInstrumentVolumeChange={(vol) => engineRef.current?.setInstrumentVolume(vol)}
            onInstrumentPanChange={(pan) => engineRef.current?.setInstrumentPan(pan)}
            onInstrumentMuteToggle={() => engineRef.current?.setInstrumentMute(!instrumentTrack.isMuted)}
            onInstrumentSoloToggle={() => engineRef.current?.setInstrumentSolo(!instrumentTrack.isSolo)}
            onInstrumentArmToggle={() => engineRef.current?.setInstrumentArmed(!instrumentTrack.isArmed)}
            onMasterVolumeChange={(vol) => {
              setMasterVolume(vol);
              engineRef.current?.setMasterVolume(vol);
            }}
          />
        )}
      </div>

      {/* 4. Bottom Playable Piano Keyboard (with pitch bend & mod wheel) */}
      <VirtualPianoKeyboard
        activeNotes={activeNotes}
        onNoteOn={(note, vel) => engineRef.current?.handleLiveNoteOn(note, vel)}
        onNoteOff={(note) => engineRef.current?.handleLiveNoteOff(note)}
        onPitchBend={(bendVal) => engineRef.current?.instrumentEngine.setPitchBend(bendVal)}
        onModWheel={(modVal) => engineRef.current?.instrumentEngine.setModWheel(modVal)}
        computerOctave={midiManagerRef.current?.computerOctaveOffset ?? 3}
      />

      {/* 5. Logic Pro Export Modal Dialog */}
      <LogicExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        preset={preset}
        notes={notes}
        guideBuffer={guideTrack.buffer}
        guideVolume={guideTrack.volume}
        guidePan={guideTrack.pan}
        bpm={transport.bpm}
        customSampleBuffer={engineRef.current?.instrumentEngine.customSampleBuffer ?? null}
      />

      {/* 6. Settings & MIDI Hardware Modal Dialog */}
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        midiState={midiState}
        onSelectMidiDevice={(id) => {
          midiManagerRef.current?.setSelectedDevice(id);
          setMidiState((prev) => ({ ...prev, selectedInputId: id }));
        }}
        onRefreshMidi={() => midiManagerRef.current?.initMidi()}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        onResetSession={handleResetSession}
      />
    </div>
  );
}
