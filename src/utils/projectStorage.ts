/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentPreset, MidiNoteEvent, ProjectData } from '../types/daw';

const STORAGE_KEY_PRESETS = 'aurastudio_custom_presets_v1';
const STORAGE_KEY_PROJECT = 'aurastudio_current_project_v1';

export function saveCustomPresetToStorage(preset: InstrumentPreset): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    const list: InstrumentPreset[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((p) => p.id === preset.id);
    if (index >= 0) {
      list[index] = preset;
    } else {
      list.push(preset);
    }
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save preset to storage:', err);
  }
}

export function getCustomPresetsFromStorage(): InstrumentPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteCustomPresetFromStorage(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return;
    const list: InstrumentPreset[] = JSON.parse(raw);
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete preset:', err);
  }
}

export function saveProjectToStorage(data: ProjectData): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to auto-save project:', err);
  }
}

export function loadProjectFromStorage(): ProjectData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function exportProjectToFile(
  projectName: string,
  bpm: number,
  timeSignature: [number, number],
  preset: InstrumentPreset,
  notes: MidiNoteEvent[],
  guideTrackName?: string | null
): void {
  const project: ProjectData = {
    version: 1,
    name: projectName || 'Untitled Session',
    bpm,
    timeSignature,
    preset,
    notes,
    guideTrack: guideTrackName ? {
      fileName: guideTrackName,
      volume: 1.0,
      pan: 0,
      isMuted: false,
      isSolo: false,
    } : undefined,
  };

  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${(projectName || 'AuraStudio_Project').replace(/\s+/g, '_')}.aurastudio.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function importProjectFromFile(file: File): Promise<ProjectData> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectData;
  if (!parsed.preset || !parsed.notes) {
    throw new Error('Invalid project file format: missing preset or notes.');
  }
  return parsed;
}
