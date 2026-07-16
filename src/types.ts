export interface Preset {
  name: string;
  pitchValue: number | null; // scale from -10.0 to 10.0 (semitones, or scaled pitch)
  downsampleAmount: number | null; // integer factor (2, 6, 8, etc.)
  volumeBoost: number | null; // dB boost
  description?: string;
  isCustom?: boolean;
  // Custom filter configs to make presets sound incredibly precise
  filterType?: 'highpass' | 'lowpass' | 'peaking' | 'highshelf' | 'none';
  filterFreq?: number;
  filterQ?: number;
  filterGain?: number;
}

export interface SoundboardSound {
  id: string;
  name: string;
  category: string;
  url: string;
  icon?: string; // Emoji representation
  keybind?: string; // e.g. "1", "q", "space"
  isCustom?: boolean;
}

export interface AudioSettings {
  pitch: number;
  listenToMyself: boolean;
  isActive: boolean;
  volumeBoost: number;
  downsampleAmount: number | null;
  selectedPresetName: string;
}
