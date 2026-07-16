import { Preset } from '../types';

export const DEFAULT_PRESETS: Preset[] = [
  {
    name: 'E-Girl',
    pitchValue: 3.8,
    downsampleAmount: null,
    volumeBoost: 1.5,
    description: 'High, sweet, airy, and incredibly cute voice that melts hearts.',
    filterType: 'peaking',
    filterFreq: 4000,
    filterQ: 1.5,
    filterGain: 4.0
  },
  {
    name: 'E-Boy',
    pitchValue: -1.2,
    downsampleAmount: null,
    volumeBoost: 1.0,
    description: 'Relaxed, smooth, cool gamer voice with a slightly dry, modern tone.',
    filterType: 'peaking',
    filterFreq: 180,
    filterQ: 2.0,
    filterGain: 3.0
  },
  {
    name: 'Hot Boy (Rizz/Gamer)',
    pitchValue: -2.2,
    downsampleAmount: null,
    volumeBoost: 2.0,
    description: 'Deep, rich, ultra-warm masculine voice overflowing with pure charisma and rizz.',
    filterType: 'peaking',
    filterFreq: 130,
    filterQ: 1.8,
    filterGain: 5.0
  },
  {
    name: 'Man',
    pitchValue: -1.6,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Deconstructs your pitch to convey deep, resonant, and natural masculine tones.',
    filterType: 'peaking',
    filterFreq: 150,
    filterQ: 1.2,
    filterGain: 2.0
  },
  {
    name: 'Woman',
    pitchValue: 2.6,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Bright and highly natural feminine voice with crisp upper registers.',
    filterType: 'highshelf',
    filterFreq: 3000,
    filterQ: 1.0,
    filterGain: 2.5
  },
  {
    name: 'Goku (Super Saiyan)',
    pitchValue: -1.0,
    downsampleAmount: null,
    volumeBoost: 2.5,
    description: 'Intense anime hero shout with heavy energy, bass resonance, and screaming power.',
    filterType: 'peaking',
    filterFreq: 220,
    filterQ: 3.5,
    filterGain: 5.0
  },
  {
    name: 'Pikachu Mascot',
    pitchValue: 7.5,
    downsampleAmount: null,
    volumeBoost: 1.2,
    description: 'Super squeaky, energetic electric rodent voice that squeals Pikachu!',
    filterType: 'highpass',
    filterFreq: 400,
    filterQ: 1.5,
    filterGain: 0
  },
  {
    name: 'Naruto (Kage Bunshin)',
    pitchValue: 1.8,
    downsampleAmount: null,
    volumeBoost: 1.5,
    description: 'Gutsy, enthusiastic raspy ninja tone ready to yell Dattebayo!',
    filterType: 'peaking',
    filterFreq: 1500,
    filterQ: 2.0,
    filterGain: 4.0
  },
  {
    name: 'Sailor Moon',
    pitchValue: 4.5,
    downsampleAmount: null,
    volumeBoost: 1.1,
    description: 'High-pitched magical princess vocal frequency filled with justice and sparkle.',
    filterType: 'highshelf',
    filterFreq: 4000,
    filterQ: 0.8,
    filterGain: 3.0
  },
  {
    name: 'Squeaker (Xbox Live)',
    pitchValue: 8.5,
    downsampleAmount: 4,
    volumeBoost: 3.0,
    description: 'High-pitched, clipping 12-year-old console voice with heavy room static.',
    filterType: 'highpass',
    filterFreq: 350,
    filterQ: 2.5,
    filterGain: 6.0
  },
  {
    name: 'Anonymous Hacker',
    pitchValue: -4.0,
    downsampleAmount: 8,
    volumeBoost: 1.5,
    description: 'Ultra-deep disguised digital voice with high bandpass crackling.',
    filterType: 'lowpass',
    filterFreq: 1200,
    filterQ: 1.5,
    filterGain: 0
  },
  {
    name: 'Lofi Radio Girl',
    pitchValue: 0.8,
    downsampleAmount: 6,
    volumeBoost: 1.0,
    description: 'Warm, cozy vinyl filter with cozy low-frequency hums.',
    filterType: 'lowpass',
    filterFreq: 2000,
    filterQ: 0.9,
    filterGain: 0
  },
  {
    name: 'Boy',
    pitchValue: 1.3,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Youthful, energetic, and slightly lighter voice tone.',
  },
  {
    name: 'Girl',
    pitchValue: 2.9,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Bright, highly elevated, and playful child voice.',
  },
  {
    name: 'Darth Vader',
    pitchValue: -6.5,
    downsampleAmount: null,
    volumeBoost: 3.0,
    description: 'Mechanical, menacing bass voice with a heavy, robotic filter.',
    filterType: 'peaking',
    filterFreq: 80,
    filterQ: 3.0,
    filterGain: 6.0
  },
  {
    name: 'Chipmunk',
    pitchValue: 9.5,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Squeaky, ultra-fast, high-pitched cartoon squirrel voice.',
    filterType: 'highpass',
    filterFreq: 250,
    filterQ: 0.8,
    filterGain: 0
  },
  {
    name: 'Demon Lord',
    pitchValue: -8.0,
    downsampleAmount: null,
    volumeBoost: 2.5,
    description: 'Sub-bass mechanical deep growl from the deepest depths of the underworld.',
    filterType: 'peaking',
    filterFreq: 70,
    filterQ: 4.0,
    filterGain: 7.0
  },
  {
    name: 'Bad Mic',
    pitchValue: null,
    downsampleAmount: 8,
    volumeBoost: 2.0,
    description: 'Vintage high-distortion 8-bit output simulating an old laptop or bad console headset.',
    filterType: 'peaking',
    filterFreq: 1000,
    filterQ: 2.5,
    filterGain: 5.0
  },
  {
    name: 'Radio',
    pitchValue: null,
    downsampleAmount: 6,
    volumeBoost: 1.5,
    description: 'Authentic 1940s bandwidth-limited walkie-talkie communication.',
    filterType: 'lowpass',
    filterFreq: 3500,
    filterQ: 1.0,
    filterGain: 0
  },
  {
    name: 'Megaphone',
    pitchValue: null,
    downsampleAmount: 2,
    volumeBoost: 3.0,
    description: 'Loud, echoey projection horn effect with high midrange saturation and honk.',
    filterType: 'peaking',
    filterFreq: 1200,
    filterQ: 4.0,
    filterGain: 8.0
  },
  {
    name: 'Deku (One For All)',
    pitchValue: 1.1,
    downsampleAmount: null,
    volumeBoost: 1.8,
    description: 'Enthusiastic, bright young anime hero with crisp vocal presence and raw passion.',
    filterType: 'peaking',
    filterFreq: 1200,
    filterQ: 1.8,
    filterGain: 3.5
  },
  {
    name: 'Luffy (Gear 5)',
    pitchValue: 2.2,
    downsampleAmount: null,
    volumeBoost: 2.0,
    description: 'Bouncy, whimsical cartoon pirate king voice filled with joy and pure freedom.',
    filterType: 'highshelf',
    filterFreq: 3500,
    filterQ: 1.0,
    filterGain: 4.0
  },
  {
    name: 'Levi Ackerman',
    pitchValue: -0.6,
    downsampleAmount: null,
    volumeBoost: 1.2,
    description: 'Cold, sharp, calm, and highly focused elite soldier tone with clinical presence.',
    filterType: 'peaking',
    filterFreq: 160,
    filterQ: 2.5,
    filterGain: 2.5
  },
  {
    name: 'Megumin (Explosion!)',
    pitchValue: 4.0,
    downsampleAmount: null,
    volumeBoost: 1.6,
    description: 'High-pitched chuunibyou archmage voice ready to cast the ultimate explosion spell.',
    filterType: 'highshelf',
    filterFreq: 4500,
    filterQ: 1.2,
    filterGain: 5.0
  },
  {
    name: 'Among Us Crewmate',
    pitchValue: 0.5,
    downsampleAmount: 6,
    volumeBoost: 1.4,
    description: 'Slightly static radio-limited astronaut space-suit communicator.',
    filterType: 'lowpass',
    filterFreq: 1800,
    filterQ: 1.5,
    filterGain: 0
  },
  {
    name: 'Helium Balloon',
    pitchValue: 8.0,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Squeaky, extremely light voice full of pure helium gas pressure.',
    filterType: 'highpass',
    filterFreq: 500,
    filterQ: 1.0,
    filterGain: 0
  },
  {
    name: 'T-Rex Growl',
    pitchValue: -7.0,
    downsampleAmount: 2,
    volumeBoost: 3.0,
    description: 'Roaring, cavernous prehistoric creature growl with heavy sub-bass vibration.',
    filterType: 'peaking',
    filterFreq: 90,
    filterQ: 3.5,
    filterGain: 7.0
  },
  {
    name: 'Off',
    pitchValue: 0.0,
    downsampleAmount: null,
    volumeBoost: null,
    description: 'Perfect pass-through of your raw natural microphone feed.',
    filterType: 'none'
  }
];

