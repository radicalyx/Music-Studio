/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Settings,
  Piano,
  FolderOpen,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
} from 'lucide-react';
import { MidiDeviceState, ProjectData } from '../types/daw';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  midiState: MidiDeviceState;
  onSelectMidiDevice: (deviceId: string | 'all') => void;
  onRefreshMidi: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onResetSession: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  midiState,
  onSelectMidiDevice,
  onRefreshMidi,
  onExportProject,
  onImportProject,
  onResetSession,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#131622] border border-[#272c3d] rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 bg-[#181c2b] border-b border-[#272c3d] px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">MIDI & Studio Settings</h2>
              <p className="text-[11px] text-neutral-400">Device configuration and session backups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#252a3d] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-neutral-300 text-xs overflow-y-auto max-h-[80vh]">
          {/* 1. MIDI Input Section */}
          <div className="bg-[#171a27] border border-[#272c3d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Web MIDI Input Device</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    midiState.permissionState === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-mono text-neutral-400 capitalize">
                  {midiState.permissionState}
                </span>
              </div>
            </div>

            {/* Device list or fallback explanation */}
            {midiState.inputs.length > 0 ? (
              <div className="space-y-2">
                <label className="text-[11px] text-neutral-400">Select Input Port:</label>
                <select
                  value={midiState.selectedInputId}
                  onChange={(e) => onSelectMidiDevice(e.target.value)}
                  className="w-full bg-[#1b1f30] text-xs text-white rounded-lg p-2.5 border border-[#272c3d] focus:outline-none"
                >
                  <option value="all">All Connected MIDI Devices (Omni)</option>
                  {midiState.inputs.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} {dev.manufacturer ? `(${dev.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-400">
                  Ready: Note on/off, velocity dynamics, sustain pedal (CC 64), pitch bend, and mod wheel (CC 1) are active.
                </p>
              </div>
            ) : (
              <div className="bg-[#11131c] p-3 rounded-lg border border-[#232736] space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-300 font-medium text-xs">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>No Hardware MIDI Keyboard Detected</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Connect a USB or Bluetooth MIDI keyboard to play. You can also use the playable on-screen piano or your computer keyboard (A-Z keys) at zero latency.
                </p>
                <button
                  onClick={onRefreshMidi}
                  className="mt-2 px-3 py-1 bg-[#1f2436] hover:bg-[#282f47] text-sky-300 text-xs rounded border border-[#2b334d] transition-colors"
                >
                  Rescan MIDI Devices
                </button>
              </div>
            )}
          </div>

          {/* 2. Session Management Section */}
          <div className="bg-[#171a27] border border-[#272c3d] rounded-xl p-4 space-y-3">
            <span className="text-white font-semibold">Session Export & Backup</span>
            <p className="text-[11px] text-neutral-400">
              Save your entire project (sound design presets, recorded MIDI takes, track levels) to a portable file to continue on another computer.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={onExportProject}
                className="py-2.5 px-3 bg-[#1f2436] hover:bg-[#282f47] text-white rounded-lg border border-[#2b334d] flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Project (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 bg-[#1f2436] hover:bg-[#282f47] text-white rounded-lg border border-[#2b334d] flex items-center justify-center gap-2 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Import Project</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.aurastudio.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportProject(file);
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 3. Reset Session */}
          <div className="flex items-center justify-between pt-2 border-t border-[#232736]">
            <div>
              <span className="text-neutral-400 block font-medium">New Clean Session</span>
              <span className="text-[10px] text-neutral-500">Clears recorded takes and restores default synth</span>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset session and clear all recorded notes?')) {
                  onResetSession();
                  onClose();
                }
              }}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-900/40 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
