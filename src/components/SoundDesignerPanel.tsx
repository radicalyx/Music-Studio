/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Save,
  FolderOpen,
  Volume2,
  Waves,
  Music,
  Upload,
  Info,
  Layers,
  Activity,
  Play,
} from 'lucide-react';
import { InstrumentPreset, SynthOscType } from '../types/daw';
import { STARTER_PRESETS } from '../audio/presets';

interface SoundDesignerPanelProps {
  preset: InstrumentPreset;
  onPresetChange: (preset: InstrumentPreset) => void;
  onSaveCustomPreset: (preset: InstrumentPreset) => void;
  customPresets: InstrumentPreset[];
  onUploadSample: (file: File) => void;
  customSampleName?: string;
}

export const SoundDesignerPanel: React.FC<SoundDesignerPanelProps> = ({
  preset,
  onPresetChange,
  onSaveCustomPreset,
  customPresets,
  onUploadSample,
  customSampleName,
}) => {
  const [activeSection, setActiveSection] = useState<'synth' | 'sampler' | 'fx'>('synth');
  const [customNameInput, setCustomNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const allPresets = [...STARTER_PRESETS, ...customPresets];
  const filteredPresets = categoryFilter === 'all'
    ? allPresets
    : allPresets.filter((p) => p.category === categoryFilter);

  const handleOsc1Change = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        osc1: {
          ...preset.synthParams.osc1,
          [field]: val,
        },
      },
    });
  };

  const handleOsc2Change = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        osc2: {
          ...preset.synthParams.osc2,
          [field]: val,
        },
      },
    });
  };

  const handleSubOscChange = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        subOsc: {
          ...preset.synthParams.subOsc,
          [field]: val,
        },
      },
    });
  };

  const handleNoiseChange = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        noise: {
          ...preset.synthParams.noise,
          [field]: val,
        },
      },
    });
  };

  const handleFilterChange = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        filter: {
          ...preset.synthParams.filter,
          [field]: val,
        },
      },
    });
  };

  const handleAmpEnvChange = (field: string, val: number) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        ampEnv: {
          ...preset.synthParams.ampEnv,
          [field]: val,
        },
      },
    });
  };

  const handleFilterEnvChange = (field: string, val: number) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        filterEnv: {
          ...preset.synthParams.filterEnv,
          [field]: val,
        },
      },
    });
  };

  const handleLfoChange = (field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        lfo: {
          ...preset.synthParams.lfo,
          [field]: val,
        },
      },
    });
  };

  const handleEffectChange = (effectName: 'drive' | 'chorus' | 'delay' | 'reverb', field: string, val: unknown) => {
    onPresetChange({
      ...preset,
      synthParams: {
        ...preset.synthParams,
        effects: {
          ...preset.synthParams.effects,
          [effectName]: {
            ...preset.synthParams.effects[effectName],
            [field]: val,
          },
        },
      },
    });
  };

  const handleSampleParamChange = (field: string, val: unknown) => {
    if (!preset.sampleParams) return;
    onPresetChange({
      ...preset,
      sampleParams: {
        ...preset.sampleParams,
        [field]: val,
      },
    });
  };

  const handleSavePreset = () => {
    if (!customNameInput.trim()) return;
    const newPreset: InstrumentPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      name: customNameInput.trim(),
    };
    onSaveCustomPreset(newPreset);
    onPresetChange(newPreset);
    setIsSaving(false);
    setCustomNameInput('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f1118] overflow-y-auto text-neutral-300 select-none">
      {/* Top Preset Bar & Category Filter */}
      <div className="h-12 bg-[#141722] border-b border-[#232736] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-neutral-300">Preset:</span>
          {/* Preset Selector Dropdown */}
          <select
            value={preset.id}
            onChange={(e) => {
              const selected = allPresets.find((p) => p.id === e.target.value);
              if (selected) onPresetChange(selected);
            }}
            className="bg-[#1c202e] border border-[#2b3145] text-xs font-semibold text-white rounded px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            {filteredPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isSampleBased ? '[Sample]' : ''}
              </option>
            ))}
          </select>

          {/* Category Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-[#181b26] p-0.5 rounded border border-[#232736]">
            {['all', 'piano', 'keys', 'synth', 'bass', 'strings', 'lead', 'sampler'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 text-[11px] font-medium capitalize rounded transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#2b3145] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Save Custom Preset Trigger */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customNameInput}
                placeholder="Preset Name..."
                onChange={(e) => setCustomNameInput(e.target.value)}
                className="bg-[#1c202e] text-xs text-white px-2 py-1 rounded border border-[#2b3145] focus:outline-none w-36"
                autoFocus
              />
              <button
                onClick={handleSavePreset}
                className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded"
              >
                Save
              </button>
              <button
                onClick={() => setIsSaving(false)}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setCustomNameInput(`${preset.name} (Custom)`);
                setIsSaving(true);
              }}
              className="px-2.5 py-1 text-xs font-medium bg-[#1c202e] hover:bg-[#252a3b] text-neutral-300 rounded border border-[#2b3145] flex items-center gap-1 transition-colors"
            >
              <Save className="w-3 h-3 text-sky-400" />
              Save As
            </button>
          )}

          {/* Section Tabs */}
          <div className="flex items-center gap-1 bg-[#181b26] p-0.5 rounded border border-[#232736]">
            <button
              onClick={() => setActiveSection('synth')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeSection === 'synth'
                  ? 'bg-[#2b3145] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Synth Architecture
            </button>
            <button
              onClick={() => setActiveSection('sampler')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeSection === 'sampler'
                  ? 'bg-[#2b3145] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sample Mapping
            </button>
            <button
              onClick={() => setActiveSection('fx')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeSection === 'fx'
                  ? 'bg-[#2b3145] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Effects Rack
            </button>
          </div>
        </div>
      </div>

      {/* Acoustic Approximation Warning / Informational Banner */}
      {preset.description && (
        <div className="bg-[#121520] border-b border-[#232736] px-4 py-2 flex items-center gap-2 text-xs text-neutral-400">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{preset.description}</span>
        </div>
      )}

      {/* Main Sound Controls Body */}
      <div className="p-4 flex-1">
        {activeSection === 'synth' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Oscillators Column */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Oscillators
                </span>
                <span className="text-[10px] text-neutral-500">Dual + Sub + Noise</span>
              </div>

              {/* Osc 1 */}
              <div className="bg-[#191c2b] p-2.5 rounded border border-[#262c3e] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200">Oscillator 1</span>
                  <select
                    value={preset.synthParams.osc1.type}
                    onChange={(e) => handleOsc1Change('type', e.target.value as SynthOscType)}
                    className="bg-[#131520] text-xs text-sky-300 rounded px-1.5 py-0.5 border border-[#272c3d]"
                  >
                    <option value="sawtooth">Sawtooth</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="sine">Sine</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-500">Octave ({preset.synthParams.osc1.octave})</span>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="1"
                      value={preset.synthParams.osc1.octave}
                      onChange={(e) => handleOsc1Change('octave', parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-neutral-500">Detune ({preset.synthParams.osc1.detune}c)</span>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={preset.synthParams.osc1.detune}
                      onChange={(e) => handleOsc1Change('detune', parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Osc 2 */}
              <div className="bg-[#191c2b] p-2.5 rounded border border-[#262c3e] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 font-semibold text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preset.synthParams.osc2.enabled}
                      onChange={(e) => handleOsc2Change('enabled', e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Oscillator 2</span>
                  </label>
                  <select
                    value={preset.synthParams.osc2.type}
                    onChange={(e) => handleOsc2Change('type', e.target.value as SynthOscType)}
                    disabled={!preset.synthParams.osc2.enabled}
                    className="bg-[#131520] text-xs text-sky-300 rounded px-1.5 py-0.5 border border-[#272c3d]"
                  >
                    <option value="sawtooth">Sawtooth</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="sine">Sine</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-500">Semi ({preset.synthParams.osc2.semi})</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      value={preset.synthParams.osc2.semi}
                      onChange={(e) => handleOsc2Change('semi', parseInt(e.target.value, 10))}
                      disabled={!preset.synthParams.osc2.enabled}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-neutral-500">Detune ({preset.synthParams.osc2.detune}c)</span>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={preset.synthParams.osc2.detune}
                      onChange={(e) => handleOsc2Change('detune', parseInt(e.target.value, 10))}
                      disabled={!preset.synthParams.osc2.enabled}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sub Osc & Noise */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#191c2b] p-2 rounded border border-[#262c3e] flex flex-col gap-1 text-xs">
                  <label className="flex items-center gap-1 font-semibold text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preset.synthParams.subOsc.enabled}
                      onChange={(e) => handleSubOscChange('enabled', e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Sub Osc</span>
                  </label>
                  <span className="text-[10px] text-neutral-500">Level: {(preset.synthParams.subOsc.gain * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={preset.synthParams.subOsc.gain}
                    onChange={(e) => handleSubOscChange('gain', parseFloat(e.target.value))}
                    disabled={!preset.synthParams.subOsc.enabled}
                    className="w-full"
                  />
                </div>

                <div className="bg-[#191c2b] p-2 rounded border border-[#262c3e] flex flex-col gap-1 text-xs">
                  <label className="flex items-center gap-1 font-semibold text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preset.synthParams.noise.enabled}
                      onChange={(e) => handleNoiseChange('enabled', e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Noise</span>
                  </label>
                  <span className="text-[10px] text-neutral-500">Level: {(preset.synthParams.noise.gain * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    value={preset.synthParams.noise.gain}
                    onChange={(e) => handleNoiseChange('gain', parseFloat(e.target.value))}
                    disabled={!preset.synthParams.noise.enabled}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 2. Resonant Filter Column */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Filter
                </span>
                <select
                  value={preset.synthParams.filter.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="bg-[#1a1e2d] text-xs text-emerald-300 rounded px-1.5 py-0.5 border border-[#272c3d]"
                >
                  <option value="lowpass">24dB Lowpass</option>
                  <option value="highpass">Highpass</option>
                  <option value="bandpass">Bandpass</option>
                  <option value="notch">Notch</option>
                </select>
              </div>

              {/* Cutoff & Resonance */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Cutoff Frequency</span>
                    <span className="font-mono text-emerald-400">{Math.round(preset.synthParams.filter.cutoff)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="18000"
                    step="10"
                    value={preset.synthParams.filter.cutoff}
                    onChange={(e) => handleFilterChange('cutoff', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Resonance (Q)</span>
                    <span className="font-mono text-emerald-400">{preset.synthParams.filter.resonance.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="12"
                    step="0.1"
                    value={preset.synthParams.filter.resonance}
                    onChange={(e) => handleFilterChange('resonance', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Filter Env Amount</span>
                    <span className="font-mono text-emerald-400">{(preset.synthParams.filter.envAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={preset.synthParams.filter.envAmount}
                    onChange={(e) => handleFilterChange('envAmount', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Key Tracking</span>
                    <span className="font-mono text-emerald-400">{(preset.synthParams.filter.keyTracking * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={preset.synthParams.filter.keyTracking}
                    onChange={(e) => handleFilterChange('keyTracking', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 3. ADSR Envelopes Column */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Envelopes (ADSR)
                </span>
                <span className="text-[10px] text-neutral-500">Amp & Filter</span>
              </div>

              {/* Amp Envelope */}
              <div className="bg-[#191c2b] p-2.5 rounded border border-[#262c3e] flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-neutral-200">Amp Envelope</span>
                <div className="grid grid-cols-4 gap-1 text-[10px] text-center text-neutral-400">
                  <div>
                    <span>A ({(preset.synthParams.ampEnv.attack * 1000).toFixed(0)}ms)</span>
                    <input
                      type="range"
                      min="0.002"
                      max="2.0"
                      step="0.01"
                      value={preset.synthParams.ampEnv.attack}
                      onChange={(e) => handleAmpEnvChange('attack', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>D ({preset.synthParams.ampEnv.decay.toFixed(1)}s)</span>
                    <input
                      type="range"
                      min="0.02"
                      max="4.0"
                      step="0.05"
                      value={preset.synthParams.ampEnv.decay}
                      onChange={(e) => handleAmpEnvChange('decay', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>S ({(preset.synthParams.ampEnv.sustain * 100).toFixed(0)}%)</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={preset.synthParams.ampEnv.sustain}
                      onChange={(e) => handleAmpEnvChange('sustain', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>R ({preset.synthParams.ampEnv.release.toFixed(1)}s)</span>
                    <input
                      type="range"
                      min="0.02"
                      max="5.0"
                      step="0.05"
                      value={preset.synthParams.ampEnv.release}
                      onChange={(e) => handleAmpEnvChange('release', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Envelope */}
              <div className="bg-[#191c2b] p-2.5 rounded border border-[#262c3e] flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-neutral-200">Filter Envelope</span>
                <div className="grid grid-cols-4 gap-1 text-[10px] text-center text-neutral-400">
                  <div>
                    <span>A ({(preset.synthParams.filterEnv.attack * 1000).toFixed(0)}ms)</span>
                    <input
                      type="range"
                      min="0.002"
                      max="2.0"
                      step="0.01"
                      value={preset.synthParams.filterEnv.attack}
                      onChange={(e) => handleFilterEnvChange('attack', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>D ({preset.synthParams.filterEnv.decay.toFixed(1)}s)</span>
                    <input
                      type="range"
                      min="0.02"
                      max="4.0"
                      step="0.05"
                      value={preset.synthParams.filterEnv.decay}
                      onChange={(e) => handleFilterEnvChange('decay', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>S ({(preset.synthParams.filterEnv.sustain * 100).toFixed(0)}%)</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={preset.synthParams.filterEnv.sustain}
                      onChange={(e) => handleFilterEnvChange('sustain', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span>R ({preset.synthParams.filterEnv.release.toFixed(1)}s)</span>
                    <input
                      type="range"
                      min="0.02"
                      max="5.0"
                      step="0.05"
                      value={preset.synthParams.filterEnv.release}
                      onChange={(e) => handleFilterEnvChange('release', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Voice, Polyphony & Modulation Column */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Voice & Dynamics
                </span>
                <span className="text-[10px] text-neutral-500">Portamento & LFO</span>
              </div>

              {/* Polyphony & Glide */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Voice Mode</span>
                  <select
                    value={preset.synthParams.polyphony}
                    onChange={(e) =>
                      onPresetChange({
                        ...preset,
                        synthParams: {
                          ...preset.synthParams,
                          polyphony: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="bg-[#1a1e2d] text-xs text-purple-300 rounded px-1.5 py-0.5 border border-[#272c3d]"
                  >
                    <option value={1}>Monophonic (Solo/Legato)</option>
                    <option value={4}>4 Voices</option>
                    <option value={8}>8 Voices</option>
                    <option value={12}>12 Voices</option>
                    <option value={16}>16 Voices</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Glide Portamento</span>
                    <span className="font-mono text-purple-400">{(preset.synthParams.glide * 1000).toFixed(0)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={preset.synthParams.glide}
                    onChange={(e) =>
                      onPresetChange({
                        ...preset,
                        synthParams: {
                          ...preset.synthParams,
                          glide: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Velocity Sensitivity</span>
                    <span className="font-mono text-purple-400">{(preset.synthParams.velocitySensitivity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={preset.synthParams.velocitySensitivity}
                    onChange={(e) =>
                      onPresetChange({
                        ...preset,
                        synthParams: {
                          ...preset.synthParams,
                          velocitySensitivity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>

                {/* LFO quick controls */}
                <div className="bg-[#191c2b] p-2 rounded border border-[#262c3e] flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 font-semibold text-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preset.synthParams.lfo.enabled}
                        onChange={(e) => handleLfoChange('enabled', e.target.checked)}
                        className="rounded accent-sky-500"
                      />
                      <span>LFO Mod</span>
                    </label>
                    <select
                      value={preset.synthParams.lfo.destination}
                      onChange={(e) => handleLfoChange('destination', e.target.value)}
                      disabled={!preset.synthParams.lfo.enabled}
                      className="bg-[#131520] text-[10px] text-sky-300 rounded px-1 py-0.5 border border-[#272c3d]"
                    >
                      <option value="cutoff">Filter Cutoff</option>
                      <option value="pitch">Vibrato Pitch</option>
                      <option value="pan">Stereo Pan</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                    <div>
                      <span>Rate ({preset.synthParams.lfo.rate.toFixed(1)}Hz)</span>
                      <input
                        type="range"
                        min="0.2"
                        max="15"
                        step="0.2"
                        value={preset.synthParams.lfo.rate}
                        onChange={(e) => handleLfoChange('rate', parseFloat(e.target.value))}
                        disabled={!preset.synthParams.lfo.enabled}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span>Depth ({(preset.synthParams.lfo.depth * 100).toFixed(0)}%)</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={preset.synthParams.lfo.depth}
                        onChange={(e) => handleLfoChange('depth', parseFloat(e.target.value))}
                        disabled={!preset.synthParams.lfo.enabled}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Sampler Mapping Section */}
        {activeSection === 'sampler' && (
          <div className="max-w-3xl mx-auto bg-[#141722] border border-[#232736] rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#232736] pb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Custom Audio Sample Mapping</h3>
                <p className="text-xs text-neutral-400">
                  Drop your own acoustic piano, drum hit, vocal, or synth sample to play across all keys.
                </p>
              </div>
              <span className="text-xs text-sky-400 font-mono">
                {preset.isSampleBased ? 'Sample Engine Active' : 'Synthesizer Active'}
              </span>
            </div>

            {/* Drag & drop upload area */}
            <div
              onClick={() => {
                const input = document.getElementById('sampler-file-input');
                if (input) input.click();
              }}
              className="border-2 border-dashed border-[#2d354b] hover:border-sky-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#171a26]"
            >
              <input
                id="sampler-file-input"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadSample(file);
                    onPresetChange({
                      ...preset,
                      isSampleBased: true,
                      sampleParams: {
                        rootNote: 60,
                        tune: 0,
                        loop: false,
                        loopStart: 0,
                        loopEnd: 1,
                        sampleName: file.name,
                      },
                    });
                  }
                }}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-sky-400 mb-2" />
              <span className="text-sm font-medium text-neutral-200">
                {customSampleName || preset.sampleParams?.sampleName || 'Click or drag an audio file to load sample'}
              </span>
              <span className="text-xs text-neutral-500 mt-1">Supports WAV, MP3, AIFF, FLAC</span>
            </div>

            {/* Root note & tune parameters */}
            {preset.sampleParams && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-[#191c2b] p-3 rounded border border-[#262c3e] flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-neutral-300">Root Note (C4 = 60)</span>
                  <input
                    type="number"
                    min="12"
                    max="108"
                    value={preset.sampleParams.rootNote}
                    onChange={(e) => handleSampleParamChange('rootNote', parseInt(e.target.value, 10))}
                    className="bg-[#131520] text-xs text-sky-300 rounded px-2 py-1 border border-[#272c3d]"
                  />
                  <span className="text-[10px] text-neutral-500">Key where sample plays at original speed</span>
                </div>

                <div className="bg-[#191c2b] p-3 rounded border border-[#262c3e] flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-neutral-300">Fine Tune ({preset.sampleParams.tune} semi)</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={preset.sampleParams.tune}
                    onChange={(e) => handleSampleParamChange('tune', parseInt(e.target.value, 10))}
                    className="w-full mt-2"
                  />
                </div>

                <div className="bg-[#191c2b] p-3 rounded border border-[#262c3e] flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-neutral-300">Sustain Loop</span>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preset.sampleParams.loop}
                      onChange={(e) => handleSampleParamChange('loop', e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Loop sample while key held</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Studio Effects Rack Section */}
        {activeSection === 'fx' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Drive / Saturation */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preset.synthParams.effects.drive.enabled}
                    onChange={(e) => handleEffectChange('drive', 'enabled', e.target.checked)}
                    className="rounded accent-rose-500"
                  />
                  <span>Overdrive</span>
                </label>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Drive Amount</span>
                  <span className="font-mono text-rose-400">{(preset.synthParams.effects.drive.amount * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preset.synthParams.effects.drive.amount}
                  onChange={(e) => handleEffectChange('drive', 'amount', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.drive.enabled}
                  className="w-full"
                />
              </div>
            </div>

            {/* Stereo Chorus */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preset.synthParams.effects.chorus.enabled}
                    onChange={(e) => handleEffectChange('chorus', 'enabled', e.target.checked)}
                    className="rounded accent-sky-500"
                  />
                  <span>Stereo Chorus</span>
                </label>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Depth</span>
                  <span className="font-mono text-sky-400">{(preset.synthParams.effects.chorus.depth * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preset.synthParams.effects.chorus.depth}
                  onChange={(e) => handleEffectChange('chorus', 'depth', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.chorus.enabled}
                  className="w-full"
                />

                <div className="flex justify-between text-neutral-400">
                  <span>Mix</span>
                  <span className="font-mono text-sky-400">{(preset.synthParams.effects.chorus.mix * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preset.synthParams.effects.chorus.mix}
                  onChange={(e) => handleEffectChange('chorus', 'mix', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.chorus.enabled}
                  className="w-full"
                />
              </div>
            </div>

            {/* Stereo Delay */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preset.synthParams.effects.delay.enabled}
                    onChange={(e) => handleEffectChange('delay', 'enabled', e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Tempo Delay</span>
                </label>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Time</span>
                  <span className="font-mono text-amber-400">{(preset.synthParams.effects.delay.time * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.2"
                  step="0.02"
                  value={preset.synthParams.effects.delay.time}
                  onChange={(e) => handleEffectChange('delay', 'time', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.delay.enabled}
                  className="w-full"
                />

                <div className="flex justify-between text-neutral-400">
                  <span>Feedback</span>
                  <span className="font-mono text-amber-400">{(preset.synthParams.effects.delay.feedback * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={preset.synthParams.effects.delay.feedback}
                  onChange={(e) => handleEffectChange('delay', 'feedback', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.delay.enabled}
                  className="w-full"
                />

                <div className="flex justify-between text-neutral-400">
                  <span>Mix</span>
                  <span className="font-mono text-amber-400">{(preset.synthParams.effects.delay.mix * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preset.synthParams.effects.delay.mix}
                  onChange={(e) => handleEffectChange('delay', 'mix', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.delay.enabled}
                  className="w-full"
                />
              </div>
            </div>

            {/* Algorithmic Reverb */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232736] pb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preset.synthParams.effects.reverb.enabled}
                    onChange={(e) => handleEffectChange('reverb', 'enabled', e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Reverb Space</span>
                </label>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Decay</span>
                  <span className="font-mono text-emerald-400">{preset.synthParams.effects.reverb.decay.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.2"
                  value={preset.synthParams.effects.reverb.decay}
                  onChange={(e) => handleEffectChange('reverb', 'decay', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.reverb.enabled}
                  className="w-full"
                />

                <div className="flex justify-between text-neutral-400">
                  <span>Mix</span>
                  <span className="font-mono text-emerald-400">{(preset.synthParams.effects.reverb.mix * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preset.synthParams.effects.reverb.mix}
                  onChange={(e) => handleEffectChange('reverb', 'mix', parseFloat(e.target.value))}
                  disabled={!preset.synthParams.effects.reverb.enabled}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
