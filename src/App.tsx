import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  HelpCircle,
  Plus,
  Trash2,
  Info,
  X,
  Radio as RadioIcon,
  Headphones,
  Volume2,
  Sparkles,
  Link as LinkIcon,
  Terminal as TerminalIcon,
  Music as MusicIcon,
  Keyboard as KeyboardIcon,
  Search,
  Upload,
  PlusCircle,
  Disc,
  Mic,
  Repeat,
  Square,
  Play,
  VolumeX
} from 'lucide-react';
import { Preset, SoundboardSound } from './types';
import { DEFAULT_PRESETS } from './data/presets';
import { DEFAULT_SOUNDS } from './data/sounds';
import { LyrebirdAudioEngine } from './utils/audioEngine';
import { AudioVisualizer } from './components/AudioVisualizer';

// Initialize singleton audio engine
const engine = new LyrebirdAudioEngine();

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [pitch, setPitch] = useState(0.0);
  const [listenToMyself, setListenToMyself] = useState(false);
  const [selectedPresetName, setSelectedPresetName] = useState('Off');
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  // Advanced FX and visualizer state
  const [delayWet, setDelayWet] = useState(0.0);
  const [delayTime, setDelayTime] = useState(0.35);
  const [delayFeedback, setDelayFeedback] = useState(0.4);
  const [reverbWet, setReverbWet] = useState(0.0);
  const [visualizerType, setVisualizerType] = useState<'waveform' | 'frequency' | 'circular'>('circular');

  // Key rebinding state
  const [rebindingSoundId, setRebindingSoundId] = useState<string | null>(null);

  // Meme Sequencer Beat Maker state
  const [isBeatMakerPlaying, setIsBeatMakerPlaying] = useState(false);
  const [beatMakerBpm, setBeatMakerBpm] = useState(110);
  const [beatMakerStep, setBeatMakerStep] = useState(0);
  const [beatMakerSequence, setBeatMakerSequence] = useState<{
    kick: boolean[];
    hat: boolean[];
    clap: boolean[];
  }>({
    kick: [true, false, false, false, true, false, false, false],
    hat: [false, true, false, true, false, true, false, true],
    clap: [false, false, true, false, false, false, true, false],
  });

  // Soundboard state
  const [soundboardSounds, setSoundboardSounds] = useState<SoundboardSound[]>([]);
  const [soundboardVolume, setSoundboardVolume] = useState(0.8);
  const [soundboardSpeed, setSoundboardSpeed] = useState(1.0);
  const [soundboardSearch, setSoundboardSearch] = useState('');
  const [selectedMemeCategory, setSelectedMemeCategory] = useState('All');
  const [isAddSoundOpen, setIsAddSoundOpen] = useState(false);
  const [playingSounds, setPlayingSounds] = useState<Record<string, boolean>>({});
  const [loopingSoundIds, setLoopingSoundIds] = useState<Record<string, boolean>>({});

  // MP3Paw online search & download states
  const [isSearchingPaw, setIsSearchingPaw] = useState(false);
  const [pawResults, setPawResults] = useState<any[]>([]);
  const [showPawResults, setShowPawResults] = useState(false);
  const [downloadingPawId, setDownloadingPawId] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // New Meme Form inputs
  const [newSoundName, setNewSoundName] = useState('');
  const [newSoundUrl, setNewSoundUrl] = useState('');
  const [newSoundCategory, setNewSoundCategory] = useState('My Memes');
  const [newSoundIcon, setNewSoundIcon] = useState('🎵');
  const [newSoundKeybind, setNewSoundKeybind] = useState('');

  // UI Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'soundboard' | 'links'>('presets');
  
  // Link Guide Tab state
  const [linkGuidePlatform, setLinkGuidePlatform] = useState<'linux' | 'discord' | 'roblox'>('linux');

  // Input States for New Custom Preset
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetPitch, setNewPresetPitch] = useState(0.0);
  const [newPresetDownsample, setNewPresetDownsample] = useState<number | null>(null);
  const [newPresetVolume, setNewPresetVolume] = useState(0);

  // Custom filter configs for new preset
  const [newPresetFilterType, setNewPresetFilterType] = useState<'none' | 'peaking' | 'highpass' | 'lowpass' | 'highshelf'>('none');
  const [newPresetFilterFreq, setNewPresetFilterFreq] = useState(1000);
  const [newPresetFilterQ, setNewPresetFilterQ] = useState(1.0);
  const [newPresetFilterGain, setNewPresetFilterGain] = useState(0.0);

  // Combine default and custom presets
  const allPresets = useMemo(() => {
    return [...DEFAULT_PRESETS, ...customPresets];
  }, [customPresets]);

  // Find currently selected preset
  const currentPreset = useMemo(() => {
    return allPresets.find(p => p.name === selectedPresetName) || DEFAULT_PRESETS[DEFAULT_PRESETS.length - 1]; // default 'Off'
  }, [allPresets, selectedPresetName]);

  // Load Custom Presets & Custom Sounds from LocalStorage on mount
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem('lyrebird_custom_presets');
      if (storedPresets) {
        setCustomPresets(JSON.parse(storedPresets));
      }

      const storedSounds = localStorage.getItem('lyrebird_custom_sounds');
      if (storedSounds) {
        const parsedCustom = JSON.parse(storedSounds);
        setSoundboardSounds([...DEFAULT_SOUNDS, ...parsedCustom]);
      } else {
        setSoundboardSounds(DEFAULT_SOUNDS);
      }
    } catch (e) {
      console.error('Failed to load local data', e);
      setSoundboardSounds(DEFAULT_SOUNDS);
    }
  }, []);

  // Periodic level meter updates
  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setInputLevel(engine.getLiveLevel('input'));
        setOutputLevel(engine.getLiveLevel('output'));
      }, 50);
    } else {
      setInputLevel(0);
      setOutputLevel(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Keyboard Hotkeys listener for memes and inline rebinding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Rebinding interceptor
      if (rebindingSoundId) {
        e.preventDefault();
        const pressedKey = e.key.toLowerCase();
        
        if (pressedKey === 'escape') {
          setRebindingSoundId(null);
          return;
        }

        const updatedSounds = soundboardSounds.map(s => {
          if (s.id === rebindingSoundId) {
            return { ...s, keybind: pressedKey };
          }
          if (s.keybind?.toLowerCase() === pressedKey) {
            return { ...s, keybind: undefined };
          }
          return s;
        });

        const customOnly = updatedSounds.filter(s => s.isCustom);
        localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(customOnly));
        setSoundboardSounds(updatedSounds);
        setRebindingSoundId(null);
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT'
      )) {
        return;
      }

      const key = e.key.toLowerCase();
      const sound = soundboardSounds.find(s => s.keybind?.toLowerCase() === key);
      if (sound) {
        e.preventDefault();
        triggerSound(sound);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundboardSounds, soundboardVolume, rebindingSoundId, playingSounds, loopingSoundIds, soundboardSpeed]);

  // Handle Voice Changer Toggle (Switch)
  const handleToggleActive = async (checked: boolean) => {
    if (checked) {
      setErrorMsg(null);
      await engine.start(
        () => {
          setIsActive(true);
          engine.updateParameters(pitch, currentPreset, listenToMyself);
        },
        () => {
          setIsActive(false);
          setErrorMsg(
            'Microphone access was denied or could not be initialized. Please check your browser microphone settings.'
          );
        }
      );
    } else {
      await engine.stop();
      setIsActive(false);
    }
  };

  // Live Sync Slider/Preset Changes and Studio DSP FX to Audio Engine
  useEffect(() => {
    if (isActive) {
      engine.updateParameters(
        pitch, 
        currentPreset, 
        listenToMyself,
        delayTime,
        delayFeedback,
        delayWet,
        reverbWet
      );
    }
  }, [pitch, currentPreset, listenToMyself, isActive, delayTime, delayFeedback, delayWet, reverbWet]);

  // Sequencer / Meme Beat Maker Eighth-note Loop
  useEffect(() => {
    if (!isBeatMakerPlaying) return;

    // Convert BPM to eighth note interval (2 steps per beat)
    const intervalMs = (60000 / beatMakerBpm) / 2;
    
    // Play immediately on start
    const triggerSequencerDrums = (stepIndex: number) => {
      if (beatMakerSequence.kick[stepIndex]) {
        engine.playDrumKick(soundboardVolume);
      }
      if (beatMakerSequence.hat[stepIndex]) {
        engine.playDrumHat(soundboardVolume);
      }
      if (beatMakerSequence.clap[stepIndex]) {
        engine.playDrumClap(soundboardVolume);
      }
    };

    triggerSequencerDrums(beatMakerStep);

    const interval = setInterval(() => {
      setBeatMakerStep(prevStep => {
        const nextStep = (prevStep + 1) % 8;
        triggerSequencerDrums(nextStep);
        return nextStep;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isBeatMakerPlaying, beatMakerBpm, beatMakerSequence, soundboardVolume]);

  // Select Preset Trigger
  const handleSelectPreset = (preset: Preset) => {
    setSelectedPresetName(preset.name);
    if (preset.pitchValue !== null) {
      setPitch(preset.pitchValue);
    }
  };

  // Add Custom Preset
  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const trimmedName = newPresetName.trim();
    if (allPresets.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A preset with this name already exists.');
      return;
    }

    const newPreset: Preset = {
      name: trimmedName,
      pitchValue: newPresetPitch,
      downsampleAmount: newPresetDownsample,
      volumeBoost: newPresetVolume || null,
      description: `Custom Shift: ${newPresetPitch} ST.`,
      isCustom: true,
      filterType: newPresetFilterType !== 'none' ? newPresetFilterType : undefined,
      filterFreq: newPresetFilterType !== 'none' ? newPresetFilterFreq : undefined,
      filterQ: newPresetFilterType !== 'none' ? newPresetFilterQ : undefined,
      filterGain: newPresetFilterType !== 'none' ? newPresetFilterGain : undefined,
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('lyrebird_custom_presets', JSON.stringify(updated));

    // Reset Form & Close
    setNewPresetName('');
    setNewPresetPitch(0.0);
    setNewPresetDownsample(null);
    setNewPresetVolume(0);
    setNewPresetFilterType('none');
    setNewPresetFilterFreq(1000);
    setNewPresetFilterQ(1.0);
    setNewPresetFilterGain(0.0);
    setIsAddCustomOpen(false);

    // Auto-select newly created preset
    handleSelectPreset(newPreset);
  };

  // Delete Custom Preset
  const handleDeletePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.name !== name);
    setCustomPresets(updated);
    localStorage.setItem('lyrebird_custom_presets', JSON.stringify(updated));
    if (selectedPresetName === name) {
      setSelectedPresetName('Off');
      setPitch(0.0);
    }
  };

  // Recording timer useEffect
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordDuration(p => p + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedUrl(null);
    } catch (err) {
      console.error("Microphone access error for recording", err);
      setErrorMsg("Microphone access is required to record your voice.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const saveRecordedMeme = (name: string, icon: string) => {
    if (!recordedUrl) return;
    
    const newSound: SoundboardSound = {
      id: `custom-sound-${Date.now()}`,
      name: name || `Recorded Clip ${new Date().toLocaleTimeString()}`,
      category: 'My Recordings',
      url: recordedUrl,
      icon: icon || '🎙️',
      isCustom: true
    };

    const customSoundsOnly = soundboardSounds.filter(s => s.isCustom);
    const updatedCustom = [newSound, ...customSoundsOnly];
    
    localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(updatedCustom));
    setSoundboardSounds([...DEFAULT_SOUNDS, ...updatedCustom]);

    setRecordedUrl(null);
  };

  // Toggle dynamic looping for a soundcard
  const toggleLoop = (soundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoopingSoundIds(prev => {
      const isLoop = !prev[soundId];
      engine.setMemeSoundLoop(soundId, isLoop);
      return { ...prev, [soundId]: isLoop };
    });
  };

  // Stop a playing soundboard sound
  const stopMemeSound = (soundId: string) => {
    engine.stopMemeSound(soundId);
    setPlayingSounds(prev => {
      const copy = { ...prev };
      delete copy[soundId];
      return copy;
    });
  };

  // Play/Stop Soundboard Sound
  const triggerSound = (sound: SoundboardSound) => {
    const isPlaying = !!playingSounds[sound.id];
    
    if (isPlaying) {
      stopMemeSound(sound.id);
    } else {
      setPlayingSounds(prev => ({ ...prev, [sound.id]: true }));
      
      const isLoop = !!loopingSoundIds[sound.id];
      engine.playMemeSound(
        sound.url, 
        soundboardVolume, 
        sound.id, 
        soundboardSpeed, 
        isLoop,
        () => {
          // Normal finish callback (only triggers if loop = false)
          setPlayingSounds(prev => {
            const copy = { ...prev };
            delete copy[sound.id];
            return copy;
          });
        }
      );
    }
  };

  // Add Custom Sound
  const handleCreateSound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoundName.trim() || !newSoundUrl.trim()) return;

    const newSound: SoundboardSound = {
      id: `custom-sound-${Date.now()}`,
      name: newSoundName.trim(),
      category: newSoundCategory,
      url: newSoundUrl.trim(),
      icon: newSoundIcon || '🎵',
      keybind: newSoundKeybind.trim() || undefined,
      isCustom: true
    };

    const customSoundsOnly = soundboardSounds.filter(s => s.isCustom);
    const updatedCustom = [newSound, ...customSoundsOnly];
    
    localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(updatedCustom));
    setSoundboardSounds([...DEFAULT_SOUNDS, ...updatedCustom]);

    // Reset
    setNewSoundName('');
    setNewSoundUrl('');
    setNewSoundKeybind('');
    setIsAddSoundOpen(false);
  };

  // Search memes from MP3Paw via backend
  const searchMp3Paw = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingPaw(true);
    setShowPawResults(true);
    setPawResults([]);
    try {
      const res = await fetch('/api/search-paw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        setPawResults(data.items || []);
      } else {
        console.error('Failed to search MP3Paw');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingPaw(false);
    }
  };

  // Download sound from MP3Paw via backend and add to board
  const downloadPawSound = async (item: any) => {
    setDownloadingPawId(item.id);
    try {
      // Use the video title to create a safe filename
      const safeFilename = item.title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30);
      const res = await fetch('/api/download-paw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.url,
          filename: safeFilename,
          title: item.title
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Add newly downloaded sound to the board!
          const newSound: SoundboardSound = {
            id: `paw-${Date.now()}`,
            name: item.title.replace(/(\.mp3|sound effect|meme|troll)/gi, '').trim() || item.title,
            category: 'My Downloads',
            url: data.url, // "/sounds/<safeFilename>.mp3"
            icon: '⚡',
            isCustom: true
          };

          const customSoundsOnly = soundboardSounds.filter(s => s.isCustom);
          const updatedCustom = [newSound, ...customSoundsOnly];
          localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(updatedCustom));
          setSoundboardSounds([...DEFAULT_SOUNDS, ...updatedCustom]);
        } else {
          alert('Failed to process download.');
        }
      } else {
        const errorData = await res.json();
        alert(`Error downloading: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network or server error while downloading.');
    } finally {
      setDownloadingPawId(null);
    }
  };

  // Drag and Drop Audio Upload
  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAudioFile(files[0]);
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAudioFile(files[0]);
    }
  };

  const processAudioFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const newSound: SoundboardSound = {
      id: `local-file-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      category: 'Uploaded',
      url: url,
      icon: '📂',
      isCustom: true
    };

    const customSoundsOnly = soundboardSounds.filter(s => s.isCustom);
    const updatedCustom = [newSound, ...customSoundsOnly];
    localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(updatedCustom));
    setSoundboardSounds([...DEFAULT_SOUNDS, ...updatedCustom]);
  };

  // Delete custom sound
  const handleDeleteSound = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const customSoundsOnly = soundboardSounds.filter(s => s.isCustom && s.id !== id);
    localStorage.setItem('lyrebird_custom_sounds', JSON.stringify(customSoundsOnly));
    setSoundboardSounds([...DEFAULT_SOUNDS, ...customSoundsOnly]);
  };

  // Filter soundboard sounds by category & search query
  const filteredSounds = useMemo(() => {
    return soundboardSounds.filter(sound => {
      const matchSearch = sound.name.toLowerCase().includes(soundboardSearch.toLowerCase()) || 
                          sound.category.toLowerCase().includes(soundboardSearch.toLowerCase());
      const matchCategory = selectedMemeCategory === 'All' || sound.category === selectedMemeCategory;
      return matchSearch && matchCategory;
    });
  }, [soundboardSounds, soundboardSearch, selectedMemeCategory]);

  const soundCategories = useMemo(() => {
    const cats = new Set(soundboardSounds.map(s => s.category));
    return ['All', ...Array.from(cats)];
  }, [soundboardSounds]);

  return (
    <div id="lyrebird-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 lg:p-8 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* HEADER BAR */}
      <header id="header-bar" className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-cyan-500/10 border border-cyan-400/20">
            <RadioIcon className="w-6 h-6 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-display text-white">Lyrebird V2</h1>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">Created by EyesHD</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Advanced Audio DSP Voice Modulator & Soundboard Player</p>
          </div>
        </div>

        <button
          id="btn-about"
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-sm text-slate-300 hover:text-white hover:bg-slate-900 hover:border-slate-700 transition"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>About</span>
        </button>
      </header>

      {/* ERROR DISPLAY */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl w-full mx-auto mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/25 text-rose-200 text-sm flex items-start gap-3"
        >
          <Info className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-300">Microphone Initialization Failed</h4>
            <p className="mt-1 opacity-90">{errorMsg}</p>
          </div>
        </motion.div>
      )}

      {/* MAIN LAYOUT */}
      <main id="main-content" className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (4 COLS): ENGINE SWITCH & SLIDERS */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* TOGGLE SWITCH CARD */}
          <div id="card-toggle" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display">Toggle Voice Changer</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isActive ? 'Processing real-time stream' : 'Voice modulator is offline'}
                </p>
              </div>
              
              <button
                id="switch-lyrebird"
                onClick={() => handleToggleActive(!isActive)}
                className={`relative w-14 h-7 rounded-full p-1 transition-colors duration-300 outline-none ${
                  isActive ? 'bg-cyan-500 shadow-md shadow-cyan-500/20' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform duration-300 flex items-center justify-center ${
                    isActive ? 'translate-x-7' : 'translate-x-0'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-400 shadow-glow shadow-cyan-400/50' : 'bg-slate-600'}`} />
                </div>
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-900/60 flex flex-col gap-4">
              {/* MONITOR TOGGLE */}
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <div className="flex items-center gap-2.5">
                  <Headphones className={`w-4 h-4 ${listenToMyself ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-semibold block text-slate-300">Listen to Myself</span>
                    <span className="text-[10px] text-slate-500 block">Monitor modulated output</span>
                  </div>
                </div>
                <button
                  id="toggle-monitor"
                  onClick={() => setListenToMyself(!listenToMyself)}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                    listenToMyself ? 'bg-cyan-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${listenToMyself ? 'translate-x-4.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* WARNING BOX */}
              {listenToMyself && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Feedback Warning:</strong> Please use <strong>Headphones</strong> while monitoring to prevent screeching microphone feedback loop.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PITCH SHIFT SCALE */}
          <div id="card-pitch" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display">Pitch Shift Scale</h3>
              </div>
              <span className="text-lg font-mono font-bold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">ST</span>
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Shift the audio spectrum in real-time. Positive numbers elevate pitch (e.g. cute e-girl), negative numbers deepen pitch (e.g. rizz hot boy).
            </p>

            {/* SLIDER SCALE */}
            <div className="space-y-2 py-2">
              <input
                id="slider-pitch"
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>-10 ST (Deep)</span>
                <span className="cursor-pointer hover:text-white" onClick={() => setPitch(0)}>0.0 (Bypass)</span>
                <span>+10 ST (High)</span>
              </div>
            </div>

            {/* QUICK ADJUST BUTTONS */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                id="btn-pitch-down"
                onClick={() => setPitch(prev => Math.max(-10, prev - 1))}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition"
              >
                -1.0 ST
              </button>
              <button
                id="btn-pitch-reset"
                onClick={() => {
                  setPitch(0);
                  setSelectedPresetName('Off');
                }}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 hover:text-cyan-400 hover:border-cyan-500/20 transition"
              >
                Reset
              </button>
              <button
                id="btn-pitch-up"
                onClick={() => setPitch(prev => Math.min(10, prev + 1))}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition"
              >
                +1.0 ST
              </button>
            </div>
          </div>

          {/* STUDIO FX PROCESSOR */}
          <div id="card-studio-fx" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-500" />
              <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display">Studio DSP Effects</h3>
            </div>

            <p className="text-xs text-slate-500">
              Layer simulated environmental acoustics and custom feedback delays directly into your modulated voice.
            </p>

            <div className="space-y-4">
              {/* Reverb Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">Vocal Reverb (Space)</span>
                  <span className="text-pink-400">{Math.round(reverbWet * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={reverbWet}
                  onChange={(e) => setReverbWet(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              {/* Echo Wet Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">Echo Feedback Wet</span>
                  <span className="text-cyan-400">{Math.round(delayWet * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={delayWet}
                  onChange={(e) => setDelayWet(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {delayWet > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-1 pl-3 border-l border-slate-800"
                >
                  {/* Echo Time */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-slate-500">Delay Time</span>
                      <span className="text-slate-300">{Math.round(delayTime * 1000)} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={delayTime}
                      onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-cyan-600"
                    />
                  </div>

                  {/* Echo Feedback */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-slate-500">Feedback Decay</span>
                      <span className="text-slate-300">{Math.round(delayFeedback * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.95"
                      step="0.05"
                      value={delayFeedback}
                      onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-cyan-600"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* REAL-TIME AUDIO VISUALIZATION */}
          <div id="card-visualization" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Audio Core
              </h3>
              
              {/* Visualizer Type Selector */}
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900">
                {(['waveform', 'frequency', 'circular'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setVisualizerType(style)}
                    className={`px-2 py-0.5 text-[9px] font-mono rounded uppercase transition ${
                      visualizerType === style
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {style === 'waveform' ? 'Laser' : style === 'frequency' ? 'EQ' : 'Core'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Input Amplitude visualizer */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>INPUT MICROPHONE FEED</span>
                <span className={inputLevel > 0.01 ? "text-cyan-400 animate-pulse" : ""}>
                  {inputLevel > 0.01 ? "SIGNAL OK" : "SILENT"}
                </span>
              </div>
              <AudioVisualizer
                analyser={engine.analyserInput}
                isActive={isActive}
                type="waveform"
                color="rgb(59, 130, 246)" // Blue-500
                height={50}
              />
            </div>

            {/* Output Amplitude visualizer */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>MODULATED OUTPUT</span>
                <span className={outputLevel > 0.01 ? "text-cyan-400 animate-pulse" : ""}>
                  {outputLevel > 0.01 ? "MODULATING" : "IDLE"}
                </span>
              </div>
              <AudioVisualizer
                analyser={engine.analyserOutput}
                isActive={isActive}
                type={visualizerType}
                color="rgb(6, 182, 212)" // Cyan-500
                height={visualizerType === 'circular' ? 100 : 50}
              />
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN (8 COLS): TABBED SECTIONS */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* NAVIGATION TABS */}
          <div className="flex bg-slate-900/60 border border-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-display transition ${
                activeTab === 'presets' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Voice Presets</span>
            </button>
            <button
              onClick={() => setActiveTab('soundboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-display transition ${
                activeTab === 'soundboard' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MusicIcon className="w-4 h-4" />
              <span>Meme Soundboard</span>
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-display transition ${
                activeTab === 'links' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Discord & Games Link</span>
            </button>
          </div>

          {/* TAB 1: PRESETS GRID */}
          {activeTab === 'presets' && (
            <div id="card-presets" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display">Vocal Character Presets</h3>
                  <p className="text-xs text-slate-500">Pick standard models or specialized e-girl & hot-boy configurations</p>
                </div>
                
                <button
                  id="btn-add-preset"
                  onClick={() => setIsAddCustomOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 text-xs font-semibold rounded-lg hover:brightness-110 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>Create Custom</span>
                </button>
              </div>

              {/* BENTO GRID OF PRESETS */}
              <div id="presets-flowbox" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allPresets.map((preset) => {
                  const isSelected = selectedPresetName === preset.name;
                  
                  // Specific styling for featured user presets to make them pop!
                  const isFeatured = ['E-Girl', 'Hot Boy (Rizz/Gamer)', 'E-Boy'].includes(preset.name);
                  
                  return (
                    <button
                      key={preset.name}
                      id={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between min-h-[115px] group select-none ${
                        isSelected
                          ? isFeatured 
                            ? 'bg-slate-900/90 border-pink-500 shadow-md shadow-pink-500/10 ring-1 ring-pink-500/20' 
                            : 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/20'
                          : isFeatured
                            ? 'bg-slate-900/30 border-slate-900/90 hover:border-pink-500/40 hover:bg-slate-900/50'
                            : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        {/* Name & custom indicator */}
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold font-display tracking-tight group-hover:text-white transition-colors flex items-center gap-1.5 ${
                            isSelected 
                              ? isFeatured ? 'text-pink-400' : 'text-cyan-400' 
                              : isFeatured ? 'text-indigo-300' : 'text-slate-200'
                          }`}>
                            {preset.name}
                            {preset.name === 'E-Girl' && '🌸'}
                            {preset.name === 'Hot Boy (Rizz/Gamer)' && '🔥'}
                            {preset.name === 'E-Boy' && '🎧'}
                          </span>

                          {preset.isCustom && (
                            <button
                              id={`delete-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={(e) => handleDeletePreset(preset.name, e)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isSelected && !preset.isCustom && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isFeatured ? 'bg-pink-400' : 'bg-cyan-400'}`} />
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed group-hover:text-slate-300">
                          {preset.description || 'No description.'}
                        </p>
                      </div>

                      {/* Meta-info labels */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {preset.pitchValue !== null && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-900/80">
                            P: {preset.pitchValue > 0 ? `+${preset.pitchValue}` : preset.pitchValue}
                          </span>
                        )}
                        {preset.downsampleAmount !== null && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-900/80">
                            DS: {preset.downsampleAmount}x
                          </span>
                        )}
                        {preset.filterType && preset.filterType !== 'none' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-900/80">
                            EQ: {preset.filterType}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SOUNDBOARD & MEMES */}
          {activeTab === 'soundboard' && (
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-5">
              
              {/* TOP HEADER CONTROLS */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display flex items-center gap-2">
                    <MusicIcon className="w-4 h-4 text-cyan-400" />
                    Meme Soundboard
                  </h3>
                  <p className="text-xs text-slate-500">Play instant audio effects, troll clips, and memes mixed directly into your stream</p>
                </div>

                <div className="flex items-center gap-2.5">
                  {Object.keys(playingSounds).length > 0 && (
                    <button
                      onClick={() => {
                        engine.stopAllMemeSounds();
                        setPlayingSounds({});
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-slate-950 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-250 shrink-0"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Stop All ({Object.keys(playingSounds).length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsAddSoundOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-indigo-500 text-slate-950 text-xs font-semibold rounded-lg hover:brightness-110 active:scale-95 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add custom sound</span>
                  </button>

                  <label className="relative flex items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer hover:bg-slate-850 transition">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* SEARCH & VOLUME BAR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950/40 p-4 rounded-xl border border-slate-900/60">
                {/* Search field */}
                <div className="md:col-span-4 flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={soundboardSearch}
                      onChange={(e) => setSoundboardSearch(e.target.value)}
                      placeholder="Search memes, songs & sound FX..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition"
                    />
                  </div>
                  <button
                    onClick={() => searchMp3Paw(soundboardSearch)}
                    disabled={!soundboardSearch.trim() || isSearchingPaw}
                    title="Search and download high-quality memes online from MP3Paw"
                    className="px-3 py-2 bg-gradient-to-r from-pink-500 to-indigo-500 text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0 flex items-center gap-1"
                  >
                    {isSearchingPaw ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    )}
                    <span>Online Search</span>
                  </button>
                </div>

                {/* Soundboard Volume Slider */}
                <div className="md:col-span-4 flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 uppercase">Board Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundboardVolume}
                    onChange={(e) => setSoundboardVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0">
                    {Math.round(soundboardVolume * 100)}%
                  </span>
                </div>

                {/* Meme Playback Speed / Pitch Slider */}
                <div className="md:col-span-4 flex items-center gap-3">
                  <Disc className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 uppercase">Pitch Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={soundboardSpeed}
                    onChange={(e) => setSoundboardSpeed(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0 font-bold text-cyan-400">
                    {soundboardSpeed.toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* MP3PAW ONLINE RESULTS TRAY */}
              <AnimatePresence>
                {showPawResults && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-950/60 p-4 rounded-xl border border-pink-500/20 space-y-3.5 relative overflow-hidden"
                  >
                    <button
                      onClick={() => setShowPawResults(false)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-slate-350"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      <h4 className="text-xs font-mono font-bold uppercase text-pink-400 tracking-wider">
                        MP3Paw Online Search Results for "{soundboardSearch}"
                      </h4>
                    </div>

                    {isSearchingPaw ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-mono text-slate-500">Contacting MP3Paw APIs...</span>
                      </div>
                    ) : pawResults.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 font-mono">
                        No online results found. Try another query like "Vine Boom" or "Metal Pipe".
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                        {pawResults.map((item) => {
                          const isDownloading = downloadingPawId === item.id;
                          return (
                            <div
                              key={item.id}
                              className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between gap-3 text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.thumbnail ? (
                                  <img
                                    src={item.thumbnail}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 object-cover rounded bg-slate-950 shrink-0 border border-slate-800"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-slate-950 flex items-center justify-center text-lg shrink-0">
                                    🎵
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 truncate" title={item.title}>
                                    {item.title}
                                  </p>
                                  <span className="text-[9px] font-mono text-slate-500">
                                    Duration: {item.duration || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => downloadPawSound(item)}
                                disabled={downloadingPawId !== null}
                                className="px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-slate-950 rounded-lg text-[10px] font-bold border border-pink-500/20 transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                              >
                                {isDownloading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Downloading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3" />
                                    <span>Import</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CATEGORY SELECTOR CHIPS */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {soundCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedMemeCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-medium uppercase border transition shrink-0 ${
                      selectedMemeCategory === cat
                        ? 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                        : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* DRAG & DROP & VOICE RECORDER GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drag and Drop Box */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleAudioDrop}
                  className="border border-dashed border-slate-800/80 bg-slate-950/20 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-900/20 hover:border-pink-500/30 transition cursor-pointer group h-[120px]"
                >
                  <Upload className="w-5 h-5 text-pink-400 mb-1.5 group-hover:scale-110 transition" />
                  <p className="text-xs text-slate-300 font-bold mb-0.5">Drag & Drop Sound Files</p>
                  <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed">
                    Drop any MP3 / WAV audio here to load custom memes instantly!
                  </p>
                </div>

                {/* Voice Recorder Box */}
                <div className="border border-slate-800/80 bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between h-[120px] relative overflow-hidden">
                  {/* Glowing recording pulse when active */}
                  {isRecording && (
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`} />
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {isRecording ? 'RECORDING VOICE...' : 'VOICE CLIP RECORDER'}
                      </span>
                    </div>
                    {isRecording && (
                      <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full">
                        {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {!recordedUrl ? (
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                        Record your voice, scream a meme, or capture system audio to save as a custom sound.
                      </p>
                      <button
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 active:scale-95 ${
                          isRecording
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25'
                            : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Mic className={`w-3.5 h-3.5 ${isRecording ? 'animate-bounce' : 'text-slate-400'}`} />
                        <span>{isRecording ? 'Stop Rec' : 'Record Mic'}</span>
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const name = (target.elements.namedItem('clipName') as HTMLInputElement).value;
                        const icon = (target.elements.namedItem('clipIcon') as HTMLInputElement).value;
                        saveRecordedMeme(name, icon);
                      }}
                      className="flex items-center gap-2 mt-1"
                    >
                      <input
                        name="clipIcon"
                        type="text"
                        defaultValue="🎙️"
                        maxLength={2}
                        className="w-10 bg-slate-900 border border-slate-800 rounded-lg text-center py-1.5 text-sm"
                        placeholder="Emoji"
                        title="Emoji representation"
                      />
                      <input
                        name="clipName"
                        type="text"
                        placeholder="Name your voice clip..."
                        required
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-lg hover:brightness-110 active:scale-95 transition shrink-0"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordedUrl(null)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 text-xs hover:text-slate-200 transition"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* SOUNDS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredSounds.map((sound) => {
                  const isPlaying = !!playingSounds[sound.id];
                  const isLooping = !!loopingSoundIds[sound.id];
                  
                  return (
                    <button
                      key={sound.id}
                      onClick={() => triggerSound(sound)}
                      className={`relative p-3 rounded-xl border text-left flex flex-col justify-between min-h-[100px] group transition-all select-none ${
                        isPlaying 
                          ? 'bg-slate-900 border-pink-500 ring-1 ring-pink-500/30 shadow-md shadow-pink-500/5'
                          : 'bg-slate-900/40 border-slate-900/80 hover:border-slate-850 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-xl">{sound.icon || '🎵'}</span>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Loop Button */}
                          <button
                            title={isLooping ? "Dynamic Looping Active (Click to toggle)" : "Enable looping for this sound"}
                            onClick={(e) => toggleLoop(sound.id, e)}
                            className={`p-1 rounded text-[9px] transition active:scale-95 flex items-center justify-center ${
                              isLooping
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-300 hover:border-slate-800'
                            }`}
                          >
                            <Repeat className={`w-3 h-3 ${isLooping ? 'animate-pulse' : ''}`} />
                          </button>

                          {rebindingSoundId === sound.id ? (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-pink-500 text-slate-950 border border-pink-400 animate-pulse font-bold">
                              PRESS...
                            </span>
                          ) : (
                            <div
                              title="Click to rebind hotkey"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRebindingSoundId(sound.id);
                              }}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-900 group-hover:text-pink-400 group-hover:border-pink-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <KeyboardIcon className="w-2.5 h-2.5" />
                              <span>{sound.keybind ? sound.keybind.toUpperCase() : 'BIND'}</span>
                            </div>
                          )}

                          {sound.isCustom && (
                            <button
                              onClick={(e) => handleDeleteSound(sound.id, e)}
                              className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full mt-2">
                        <p className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
                          {sound.name}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                          {sound.category}
                        </p>
                      </div>

                      {/* Play/Stop status indicator */}
                      <div className="absolute right-2.5 bottom-2.5">
                        {isPlaying ? (
                          <div className="flex items-center justify-center bg-pink-500 text-slate-950 rounded-full p-1 shadow-lg shadow-pink-500/20">
                            <Square className="w-2.5 h-2.5 fill-current" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center opacity-0 group-hover:opacity-60 bg-slate-950 text-slate-400 rounded-full p-1 border border-slate-800 transition-opacity">
                            <Play className="w-2.5 h-2.5 fill-current text-[10px]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredSounds.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-slate-500">
                    No memes or sounds found matching "{soundboardSearch}" in this category.
                  </div>
                )}
              </div>

              {/* PROCEDURAL LIVE MEME BEAT MAKER */}
              <div className="border-t border-slate-900/60 pt-6 mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                      <Disc className={`w-4 h-4 text-pink-400 ${isBeatMakerPlaying ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold tracking-wide text-slate-300 font-display">Procedural Meme Beat Maker</h4>
                      <p className="text-[11px] text-slate-500">Enable an active synchronized drum rhythm to play memes and troll live to a beat</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Tempo range */}
                    <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-900">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">TEMPO:</span>
                      <input
                        type="range"
                        min="75"
                        max="150"
                        step="5"
                        value={beatMakerBpm}
                        onChange={(e) => setBeatMakerBpm(parseInt(e.target.value))}
                        className="w-20 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-pink-500"
                      />
                      <span className="text-[10px] font-mono text-pink-400 font-bold w-12 text-right">{beatMakerBpm} BPM</span>
                    </div>

                    {/* Play/Stop Button */}
                    <button
                      onClick={() => {
                        setIsBeatMakerPlaying(!isBeatMakerPlaying);
                        if (!isBeatMakerPlaying) {
                          setBeatMakerStep(0);
                        }
                      }}
                      className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                        isBeatMakerPlaying
                          ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold shadow-md shadow-rose-500/15'
                          : 'bg-slate-900 hover:bg-slate-850 text-pink-400 border-pink-500/30'
                      }`}
                    >
                      {isBeatMakerPlaying ? 'Stop Beat' : 'Start Beat'}
                    </button>
                  </div>
                </div>

                {/* Grid of Steps */}
                <div className="bg-slate-950/50 rounded-xl border border-slate-900 p-4 space-y-3.5">
                  {(['kick', 'hat', 'clap'] as const).map((instrument) => (
                    <div key={instrument} className="grid grid-cols-12 gap-2 items-center">
                      {/* Label */}
                      <span className="col-span-3 sm:col-span-2 text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                        {instrument === 'kick' ? '🥁 Sub Kick' : instrument === 'hat' ? '⚡ Hi-Hat' : '👏 Snare/Clap'}
                      </span>
                      
                      {/* Steps */}
                      <div className="col-span-9 sm:col-span-10 grid grid-cols-8 gap-1.5">
                        {beatMakerSequence[instrument].map((active, stepIdx) => {
                          const isCurrentStep = beatMakerStep === stepIdx && isBeatMakerPlaying;
                          
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => {
                                const newSeq = [...beatMakerSequence[instrument]];
                                newSeq[stepIdx] = !newSeq[stepIdx];
                                setBeatMakerSequence({
                                  ...beatMakerSequence,
                                  [instrument]: newSeq
                                });
                              }}
                              className={`h-8 rounded-lg border transition-all relative ${
                                active
                                  ? isCurrentStep 
                                    ? 'bg-pink-400 border-white text-slate-950 scale-105' 
                                    : 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                                  : isCurrentStep
                                    ? 'bg-slate-800 border-slate-400 scale-105'
                                    : 'bg-slate-900/60 border-slate-900 hover:border-slate-850 text-slate-600'
                              }`}
                            >
                              <span className="text-[9px] font-mono font-bold block">{stepIdx + 1}</span>
                              {isCurrentStep && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white animate-ping" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* Step Sequencer Legend */}
                  <div className="flex justify-end text-[9px] font-mono text-slate-650 pt-1">
                    <span>Steps 1 and 5 are Downbeats. Click any cells to toggle procedural beats!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISCORD & GAME ROUTING LINK HUB */}
          {activeTab === 'links' && (
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-5">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-cyan-400" />
                  Roblox, Discord & Games Virtual Link Hub
                </h3>
                <p className="text-xs text-slate-500">Learn how to easily link your shifted browser microphone and soundboard into native gaming apps</p>
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="flex bg-slate-950/40 p-1 rounded-xl border border-slate-900 gap-1.5">
                <button
                  onClick={() => setLinkGuidePlatform('linux')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition ${
                    linkGuidePlatform === 'linux' ? 'bg-slate-900 text-cyan-400 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5 inline mr-1.5" />
                  Linux Chromebook CLI
                </button>
                <button
                  onClick={() => setLinkGuidePlatform('discord')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition ${
                    linkGuidePlatform === 'discord' ? 'bg-slate-900 text-cyan-400 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5 inline mr-1.5" />
                  Discord setup
                </button>
                <button
                  onClick={() => setLinkGuidePlatform('roblox')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition ${
                    linkGuidePlatform === 'roblox' ? 'bg-slate-900 text-cyan-400 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5 inline mr-1.5" />
                  Roblox setup
                </button>
              </div>

              {/* ROUTING DESCRIPTION PANEL */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-900 space-y-4">
                
                {/* LINUX CHROMEOBOK INSTRUCTIONS */}
                {linkGuidePlatform === 'linux' && (
                  <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                    <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <TerminalIcon className="w-4 h-4 text-cyan-400" />
                      Create Virtual Mic on Linux / Chromebook
                    </h4>
                    
                    <p>
                      Since the browser environment runs sandboxed, you must route your audio output into a virtual loopback input sink. This allows Roblox, Discord, or Steam to listen directly to your morphed voice and played memes!
                    </p>

                    <div className="space-y-3">
                      <p className="font-semibold text-slate-200">1. Run this terminal command in your Chromebook Linux Terminal (Crostini):</p>
                      
                      {/* Copyable terminal area */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-emerald-400 flex justify-between items-center group relative">
                        <code>pactl load-module module-null-sink sink_name=LyrebirdVirtualMic sink_properties=device.description=Lyrebird_Voice_Changer</code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText("pactl load-module module-null-sink sink_name=LyrebirdVirtualMic sink_properties=device.description=Lyrebird_Voice_Changer");
                            alert("Command copied to clipboard!");
                          }}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 text-[10px] text-slate-300 transition"
                        >
                          Copy
                        </button>
                      </div>

                      <p className="font-semibold text-slate-200">2. Link the loopback module to send the output:</p>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-emerald-400 flex justify-between items-center group relative">
                        <code>pactl load-module module-loopback source=LyrebirdVirtualMic.monitor</code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText("pactl load-module module-loopback source=LyrebirdVirtualMic.monitor");
                            alert("Command copied to clipboard!");
                          }}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 text-[10px] text-slate-300 transition"
                        >
                          Copy
                        </button>
                      </div>

                      <p className="text-slate-400">
                        This creates a system input device named <strong className="text-white">Lyrebird_Voice_Changer</strong>. Any games running inside your Linux shell can now read your voice modifications and soundboards instantly!
                      </p>
                    </div>
                  </div>
                )}

                {/* DISCORD SETUP INSTRUCTIONS */}
                {linkGuidePlatform === 'discord' && (
                  <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                    <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider text-cyan-400">
                      Linking with Discord (App / Web)
                    </h4>
                    
                    <p>
                      Want to rizz up people on Discord or blast funny memes using E-Girl and Hot Boy presets? Follow these simple steps:
                    </p>

                    <ol className="list-decimal pl-4 space-y-2.5 text-slate-350">
                      <li>
                        Open <strong className="text-white">Discord Settings</strong> (the gear icon next to your name).
                      </li>
                      <li>
                        Navigate to the <strong className="text-white">Voice & Video</strong> tab on the left.
                      </li>
                      <li>
                        Change your <strong className="text-white">Input Device</strong> from Default to <strong className="text-cyan-400">Lyrebird_Voice_Changer</strong> (or your Virtual Audio Cable loopback).
                      </li>
                      <li>
                        Make sure <strong className="text-white">Echo Cancellation</strong> and <strong className="text-white">Noise Suppression (Krisi/Standard)</strong> are <strong className="text-amber-400 font-bold">DISABLED</strong> in Discord, otherwise Discord will filter out your soundboard memes thinking they are background noise!
                      </li>
                      <li>
                        Join a voice channel, toggle your Lyrebird voice changer on, and you are ready to Modulate!
                      </li>
                    </ol>
                  </div>
                )}

                {/* ROBLOX SETUP INSTRUCTIONS */}
                {linkGuidePlatform === 'roblox' && (
                  <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                    <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider text-cyan-400">
                      Linking with Roblox & In-Game Voice Chats
                    </h4>
                    
                    <p>
                      Follow this guide to use E-Girl, Hot Boy, and our meme catalog in Roblox voice-enabled servers:
                    </p>

                    <ol className="list-decimal pl-4 space-y-2.5 text-slate-350">
                      <li>
                        Open your <strong className="text-white">System Sound Settings</strong> in Chrome OS or Linux.
                      </li>
                      <li>
                        Set your default system recording input microphone device to the <strong className="text-cyan-400">Lyrebird_Voice_Changer Loopback / Virtual Cable</strong>.
                      </li>
                      <li>
                        Launch <strong className="text-white">Roblox</strong> and join any game with voice chat activated.
                      </li>
                      <li>
                        Press <strong className="text-white">Esc</strong> to open Roblox's settings menu, look at the microphone selection list, and verify <strong className="text-white">Lyrebird_Voice_Changer</strong> is selected.
                      </li>
                      <li>
                        Unmute in-game! You can now use your hotkeys (e.g. <strong className="text-pink-400">Q</strong> for Vine Boom, <strong className="text-pink-400">W</strong> for Sax Rizz) while talking!
                      </li>
                    </ol>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* SYSTEM SPECIFICATIONS & STATUS CARDS */}
          <div id="card-stats" className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-slate-400 uppercase font-display">System Diagnostics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Status</span>
                <span className={`font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isActive ? '● ACTIVE' : '○ OFFLINE'}
                </span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Latency Buffer</span>
                <span className="text-slate-300">2048 smp</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Hotkeys</span>
                <span className="text-pink-400">ENABLED</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">Audio Server</span>
                <span className="text-cyan-400">Browser DSP</span>
              </div>
            </div>
          </div>

        </section>
      </main>

      {/* FOOTER */}
      <footer id="footer-bar" className="max-w-6xl w-full mx-auto mt-auto pt-8 border-t border-slate-900/60 text-center text-xs text-slate-600 font-mono">
        <p>Lyrebird V2 • Ported to high-performance Web Audio DSP • Created by EyesHD</p>
      </footer>

      {/* ABOUT DIALOG (MODAL) */}
      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4"
            >
              <button
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex bg-gradient-to-tr from-cyan-500 to-indigo-500 p-4 rounded-2xl shadow-xl shadow-cyan-500/10 border border-cyan-400/20 mx-auto">
                <RadioIcon className="w-10 h-10 text-slate-950 animate-pulse" />
              </div>

              <h2 className="text-xl font-bold font-display text-white">Lyrebird V2</h2>
              <p className="text-xs font-mono text-cyan-400">v2.0.0 (Created by EyesHD)</p>

              <p className="text-sm text-slate-300 leading-relaxed">
                Advanced vocal morpher and soundboard. Created for Chromebook and Linux users to route high-performance shifted audio, adorable e-girls, rizz hot-boys, and thousands of funny soundboard memes straight into Roblox, Discord, and other games!
              </p>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
                <p>Designed and programmed with love for EyesHD.</p>
                <p>Copyright © 2026. All rights reserved.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM PRESET MODAL */}
      <AnimatePresence>
        {isAddCustomOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddCustomOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <button
                onClick={() => setIsAddCustomOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold font-display text-white">Create Custom Preset</h2>
              </div>

              <form onSubmit={handleCreatePreset} className="space-y-4">
                {/* NAME INPUT */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Preset Name</label>
                  <input
                    id="input-new-preset-name"
                    type="text"
                    required
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g. Toxic Troll"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* PITCH INPUT */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5 uppercase font-display">
                    <span>Pitch Shift</span>
                    <span className="text-cyan-400 font-mono">{newPresetPitch > 0 ? `+${newPresetPitch}` : newPresetPitch} ST</span>
                  </div>
                  <input
                    id="input-new-preset-pitch"
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={newPresetPitch}
                    onChange={(e) => setNewPresetPitch(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* DOWNSAMPLE SELECT */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Downsampling Amount</label>
                  <select
                    id="input-new-preset-downsample"
                    value={newPresetDownsample || ''}
                    onChange={(e) => setNewPresetDownsample(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="">None (Standard fidelity)</option>
                    <option value="2">2x (High Lo-Fi)</option>
                    <option value="4">4x (Moderate Distortion)</option>
                    <option value="6">6x (Retro Radio)</option>
                    <option value="8">8x (Low Bitrate Mic)</option>
                    <option value="12">12x (Extreme Aliasing)</option>
                  </select>
                </div>

                {/* VOLUME BOOST INPUT */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5 uppercase font-display">
                    <span>Volume Adjust</span>
                    <span className="text-cyan-400 font-mono">{newPresetVolume > 0 ? `+${newPresetVolume}` : newPresetVolume} dB</span>
                  </div>
                  <input
                    id="input-new-preset-volume"
                    type="range"
                    min="-20"
                    max="15"
                    step="1"
                    value={newPresetVolume}
                    onChange={(e) => setNewPresetVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                {/* CUSTOM EQ TUNER */}
                <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Custom Advanced Filter EQ</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1 uppercase">Filter Type</label>
                      <select
                        value={newPresetFilterType}
                        onChange={(e: any) => setNewPresetFilterType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                      >
                        <option value="none">Disabled</option>
                        <option value="peaking">Peaking (EQ Peak)</option>
                        <option value="highpass">High Pass</option>
                        <option value="lowpass">Low Pass</option>
                        <option value="highshelf">High Shelf</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1 uppercase">Freq (Hz)</label>
                      <input
                        type="number"
                        min="50"
                        max="15000"
                        value={newPresetFilterFreq}
                        onChange={(e) => setNewPresetFilterFreq(parseInt(e.target.value) || 1000)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {newPresetFilterType !== 'none' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1 uppercase">Filter Q</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10.0"
                          value={newPresetFilterQ}
                          onChange={(e) => setNewPresetFilterQ(parseFloat(e.target.value) || 1.0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1 uppercase">Gain (dB)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="-20"
                          max="20"
                          value={newPresetFilterGain}
                          onChange={(e) => setNewPresetFilterGain(parseFloat(e.target.value) || 0.0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomOpen(false)}
                    className="flex-1 py-2 px-4 rounded-xl border border-slate-850 text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-850 transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-preset"
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-95 transition"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM SOUND DIALOG (MODAL) */}
      <AnimatePresence>
        {isAddSoundOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSoundOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <button
                onClick={() => setIsAddSoundOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <MusicIcon className="w-5 h-5 text-pink-400" />
                <h2 className="text-lg font-bold font-display text-white">Add Custom Meme Sound</h2>
              </div>

              <form onSubmit={handleCreateSound} className="space-y-4">
                {/* NAME */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Sound Title</label>
                  <input
                    type="text"
                    required
                    value={newSoundName}
                    onChange={(e) => setNewSoundName(e.target.value)}
                    placeholder="e.g. My Favorite Rizz"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition"
                  />
                </div>

                {/* MP3 URL */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Direct Audio MP3 URL</label>
                  <input
                    type="url"
                    required
                    value={newSoundUrl}
                    onChange={(e) => setNewSoundUrl(e.target.value)}
                    placeholder="https://example.com/sound.mp3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Must be a direct link to an MP3, WAV or OGG file.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* CATEGORY */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Category</label>
                    <select
                      value={newSoundCategory}
                      onChange={(e) => setNewSoundCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500 transition"
                    >
                      <option value="My Memes">My Memes</option>
                      <option value="Roblox Classic">Roblox Classic</option>
                      <option value="Rizz & Gamer">Rizz & Gamer</option>
                      <option value="Sound Effects">Sound Effects</option>
                      <option value="Legendary Memes">Legendary Memes</option>
                    </select>
                  </div>

                  {/* KEYBIND */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display flex items-center gap-1">
                      <KeyboardIcon className="w-3.5 h-3.5" />
                      <span>Hotkey</span>
                    </label>
                    <input
                      type="text"
                      maxLength={1}
                      value={newSoundKeybind}
                      onChange={(e) => setNewSoundKeybind(e.target.value)}
                      placeholder="e.g. k"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white text-center focus:outline-none focus:border-pink-500 transition uppercase font-mono font-bold"
                    />
                  </div>
                </div>

                {/* EMOJI ICON */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase font-display">Emoji Icon</label>
                  <div className="flex gap-2">
                    {['🎵', '🔥', '🌸', '💀', '🤡', '🗣️', '🔊', '🤖', '👑'].map(emoji => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewSoundIcon(emoji)}
                        className={`p-2.5 rounded-lg border text-base flex-1 hover:bg-slate-850 transition ${
                          newSoundIcon === emoji ? 'border-pink-500 bg-pink-500/10' : 'border-slate-850 bg-slate-950'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUBMIT */}
                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddSoundOpen(false)}
                    className="flex-1 py-2 px-4 rounded-xl border border-slate-850 text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-850 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-95 transition"
                  >
                    Add Sound
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
