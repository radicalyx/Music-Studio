/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, Sliders, Music, Piano, Disc } from 'lucide-react';
import { GuideTrackState, InstrumentTrackState } from '../types/daw';

interface MixerPanelProps {
  guideTrack: GuideTrackState;
  instrumentTrack: InstrumentTrackState;
  masterVolume: number;
  onGuideVolumeChange: (vol: number) => void;
  onGuidePanChange: (pan: number) => void;
  onGuideMuteToggle: () => void;
  onGuideSoloToggle: () => void;
  onInstrumentVolumeChange: (vol: number) => void;
  onInstrumentPanChange: (pan: number) => void;
  onInstrumentMuteToggle: () => void;
  onInstrumentSoloToggle: () => void;
  onInstrumentArmToggle: () => void;
  onMasterVolumeChange: (vol: number) => void;
}

export const MixerPanel: React.FC<MixerPanelProps> = ({
  guideTrack,
  instrumentTrack,
  masterVolume,
  onGuideVolumeChange,
  onGuidePanChange,
  onGuideMuteToggle,
  onGuideSoloToggle,
  onInstrumentVolumeChange,
  onInstrumentPanChange,
  onInstrumentMuteToggle,
  onInstrumentSoloToggle,
  onInstrumentArmToggle,
  onMasterVolumeChange,
}) => {
  const volToDb = (vol: number): string => {
    if (vol <= 0.001) return '-inf';
    const db = 20 * Math.log10(vol);
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f1118] overflow-y-auto select-none p-4">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between border-b border-[#232736] pb-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Studio Mixer Console</h2>
            <p className="text-xs text-neutral-400">
              Balanced gain staging and stereo panning for playback and export stems.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400">Stereo Bus 0dBFS True Peak</span>
        </div>

        {/* Channel Strips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Strip 1: Guide Audio Track */}
          <div className="bg-[#141722] border border-[#232736] rounded-xl p-4 flex flex-col justify-between h-[360px] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#232736] pb-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-neutral-200">Guide Audio</span>
              </div>
              <span className="text-[10px] text-neutral-500 truncate max-w-[100px]">
                {guideTrack.fileName || 'Empty'}
              </span>
            </div>

            {/* Pan Knob */}
            <div className="flex flex-col items-center gap-1 my-2">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                Pan: {guideTrack.pan === 0 ? 'C' : guideTrack.pan < 0 ? `L${Math.abs(Math.round(guideTrack.pan * 100))}` : `R${Math.round(guideTrack.pan * 100)}`}
              </span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={guideTrack.pan}
                onChange={(e) => onGuidePanChange(parseFloat(e.target.value))}
                className="w-24"
              />
            </div>

            {/* Vertical Fader & Meter */}
            <div className="flex-1 flex justify-center items-center gap-4 py-2">
              {/* Simulated Level Meter */}
              <div className="w-3 h-40 bg-[#0a0b0f] rounded-xs overflow-hidden flex flex-col justify-end p-0.5 border border-[#232736]">
                <div
                  style={{ height: `${guideTrack.isMuted ? 0 : Math.min(100, guideTrack.volume * 70)}%` }}
                  className="w-full bg-gradient-to-t from-emerald-500 via-sky-400 to-rose-500 rounded-xs transition-all duration-75"
                />
              </div>

              {/* Vertical Fader Input */}
              <div className="flex flex-col items-center h-40 justify-center">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={guideTrack.volume}
                  onChange={(e) => onGuideVolumeChange(parseFloat(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '140px', width: '24px' }}
                />
              </div>
            </div>

            <div className="text-center font-mono text-xs font-semibold text-sky-400 mb-2">
              {volToDb(guideTrack.volume)}
            </div>

            {/* Mute & Solo */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232736]">
              <button
                onClick={onGuideMuteToggle}
                className={`py-1 rounded text-xs font-bold transition-colors ${
                  guideTrack.isMuted
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[#1b1f2e] text-neutral-400 hover:text-white'
                }`}
              >
                Mute
              </button>
              <button
                onClick={onGuideSoloToggle}
                className={`py-1 rounded text-xs font-bold transition-colors ${
                  guideTrack.isSolo
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'bg-[#1b1f2e] text-neutral-400 hover:text-white'
                }`}
              >
                Solo
              </button>
            </div>
          </div>

          {/* Strip 2: Software Instrument Track */}
          <div className="bg-[#141722] border border-[#232736] rounded-xl p-4 flex flex-col justify-between h-[360px] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#232736] pb-2">
              <div className="flex items-center gap-2">
                <Piano className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-neutral-200">{instrumentTrack.name}</span>
              </div>
              <button
                onClick={onInstrumentArmToggle}
                title="Record Arm"
                className={`w-5 h-5 rounded-full text-[9px] font-bold border transition-colors ${
                  instrumentTrack.isArmed
                    ? 'bg-rose-600 text-white border-rose-400'
                    : 'bg-[#1c202e] text-neutral-400 border-[#2b3145]'
                }`}
              >
                R
              </button>
            </div>

            {/* Pan Knob */}
            <div className="flex flex-col items-center gap-1 my-2">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                Pan: {instrumentTrack.pan === 0 ? 'C' : instrumentTrack.pan < 0 ? `L${Math.abs(Math.round(instrumentTrack.pan * 100))}` : `R${Math.round(instrumentTrack.pan * 100)}`}
              </span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={instrumentTrack.pan}
                onChange={(e) => onInstrumentPanChange(parseFloat(e.target.value))}
                className="w-24"
              />
            </div>

            {/* Vertical Fader & Meter */}
            <div className="flex-1 flex justify-center items-center gap-4 py-2">
              {/* Simulated Level Meter */}
              <div className="w-3 h-40 bg-[#0a0b0f] rounded-xs overflow-hidden flex flex-col justify-end p-0.5 border border-[#232736]">
                <div
                  style={{ height: `${instrumentTrack.isMuted ? 0 : Math.min(100, instrumentTrack.volume * 70)}%` }}
                  className="w-full bg-gradient-to-t from-emerald-500 via-sky-400 to-rose-500 rounded-xs transition-all duration-75"
                />
              </div>

              {/* Vertical Fader */}
              <div className="flex flex-col items-center h-40 justify-center">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={instrumentTrack.volume}
                  onChange={(e) => onInstrumentVolumeChange(parseFloat(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '140px', width: '24px' }}
                />
              </div>
            </div>

            <div className="text-center font-mono text-xs font-semibold text-emerald-400 mb-2">
              {volToDb(instrumentTrack.volume)}
            </div>

            {/* Mute & Solo */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232736]">
              <button
                onClick={onInstrumentMuteToggle}
                className={`py-1 rounded text-xs font-bold transition-colors ${
                  instrumentTrack.isMuted
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[#1b1f2e] text-neutral-400 hover:text-white'
                }`}
              >
                Mute
              </button>
              <button
                onClick={onInstrumentSoloToggle}
                className={`py-1 rounded text-xs font-bold transition-colors ${
                  instrumentTrack.isSolo
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'bg-[#1b1f2e] text-neutral-400 hover:text-white'
                }`}
              >
                Solo
              </button>
            </div>
          </div>

          {/* Strip 3: Master Stereo Bus */}
          <div className="bg-[#12141c] border border-sky-900/40 rounded-xl p-4 flex flex-col justify-between h-[360px] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#232736] pb-2">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">Master Output</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                Limiter Active
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 my-2">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                Stereo Balance: Center
              </span>
            </div>

            {/* Vertical Fader & Stereo Dual Meter */}
            <div className="flex-1 flex justify-center items-center gap-3 py-2">
              {/* Dual Stereo Meter */}
              <div className="flex gap-1 h-40 p-0.5 bg-[#0a0b0f] rounded-xs border border-[#232736]">
                <div className="w-2.5 h-full overflow-hidden flex flex-col justify-end">
                  <div
                    style={{ height: `${Math.min(100, masterVolume * 75)}%` }}
                    className="w-full bg-gradient-to-t from-emerald-500 via-sky-400 to-rose-500 rounded-xs"
                  />
                </div>
                <div className="w-2.5 h-full overflow-hidden flex flex-col justify-end">
                  <div
                    style={{ height: `${Math.min(100, masterVolume * 73)}%` }}
                    className="w-full bg-gradient-to-t from-emerald-500 via-sky-400 to-rose-500 rounded-xs"
                  />
                </div>
              </div>

              {/* Master Fader */}
              <div className="flex flex-col items-center h-40 justify-center">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={masterVolume}
                  onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '140px', width: '24px' }}
                />
              </div>
            </div>

            <div className="text-center font-mono text-xs font-semibold text-white mb-2">
              {volToDb(masterVolume)}
            </div>

            <div className="pt-2 border-t border-[#232736] text-center text-[10px] text-neutral-500">
              Master Stereo Mix
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
