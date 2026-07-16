import { Preset } from '../types';

class DelayPitchShifter {
  private bufferSize = 16384;
  private delayBuffer = new Float32Array(this.bufferSize);
  private writeIndex = 0;
  private p = 0.0;
  private delayLength = 2048; // ~46ms at 44.1kHz

  constructor(delayLength: number = 2048) {
    this.delayLength = delayLength;
  }

  public process(input: Float32Array, output: Float32Array, pitchRatio: number, downsampleAmount: number | null) {
    const len = input.length;
    let lastSampleValue = 0.0;

    for (let i = 0; i < len; i++) {
      const sample = input[i];

      // 1. Write input sample to circular delay buffer
      this.delayBuffer[this.writeIndex] = sample;

      let outSample = 0.0;

      if (Math.abs(pitchRatio - 1.0) < 0.01) {
        // No pitch shifting: read from a stable medium delay offset
        const readIndex = (this.writeIndex - 1024 + this.bufferSize) % this.bufferSize;
        outSample = this.delayBuffer[readIndex];
      } else {
        // Modulate read head rate
        this.p += (1.0 - pitchRatio);
        if (this.p < 0) {
          this.p += this.delayLength;
        } else if (this.p >= this.delayLength) {
          this.p -= this.delayLength;
        }

        const pA = this.p;
        const pB = (this.p + this.delayLength / 2) % this.delayLength;

        // Smooth triangular windows
        const halfLength = this.delayLength / 2;
        const wA = 1.0 - Math.abs(pA - halfLength) / halfLength;
        const wB = 1.0 - wA;

        // Interpolated read heads for maximum fidelity
        const readIndexA = Math.floor(this.writeIndex - pA + this.bufferSize) % this.bufferSize;
        const sampleA = this.delayBuffer[readIndexA];

        const readIndexB = Math.floor(this.writeIndex - pB + this.bufferSize) % this.bufferSize;
        const sampleB = this.delayBuffer[readIndexB];

        outSample = (sampleA * wA) + (sampleB * wB);
      }

      // 2. Downsampling simulation (holding sample)
      if (downsampleAmount && downsampleAmount > 1) {
        if (i % downsampleAmount === 0) {
          lastSampleValue = outSample;
        }
        outSample = lastSampleValue;
      }

      output[i] = outSample;

      // Advance circular write pointer
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
  }

  public clear() {
    this.delayBuffer.fill(0);
    this.writeIndex = 0;
    this.p = 0.0;
  }
}

export class LyrebirdAudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private filterHigh: BiquadFilterNode | null = null;
  private filterLow: BiquadFilterNode | null = null;
  private filterCustom: BiquadFilterNode | null = null;
  
  public analyserInput: AnalyserNode | null = null;
  public analyserOutput: AnalyserNode | null = null;

  // Delay & Studio effects nodes
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private dryGain: GainNode | null = null;
  
  private reverbNode: DelayNode | null = null;
  private reverbFeedback: GainNode | null = null;
  private reverbWet: GainNode | null = null;

  private leftShifter = new DelayPitchShifter(2048);
  private rightShifter = new DelayPitchShifter(2048);

  // Active soundboard elements for playing, stopping and looping
  private activeMemeSounds: Map<string, { audio: HTMLAudioElement; onEnd?: () => void }> = new Map();

  // Live configuration
  private currentPitchValue = 0.0; // semitones (-10 to 10)
  private currentDownsample: number | null = null;
  private monitorSelf = false;

  constructor() {}

  public async start(onSuccess: () => void, onError: (err: any) => void) {
    try {
      if (this.ctx) {
        await this.stop();
      }

      // Create standard AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Clear previous shifter buffers
      this.leftShifter.clear();
      this.rightShifter.clear();

      // Define nodes
      this.source = this.ctx.createMediaStreamSource(this.stream);
      
      // Analysers for visualizations
      this.analyserInput = this.ctx.createAnalyser();
      this.analyserInput.fftSize = 512;
      
      this.analyserOutput = this.ctx.createAnalyser();
      this.analyserOutput.fftSize = 512;

      // ScriptProcessorNode for custom float-buffer DSP
      // 2048 buffer size gives ~46ms latency, a great balance of performance and delay
      this.processor = this.ctx.createScriptProcessor(2048, 1, 1);

      // Filters to simulate megaphones and radios
      this.filterHigh = this.ctx.createBiquadFilter();
      this.filterHigh.type = 'highpass';
      this.filterHigh.frequency.value = 20; // default off

      this.filterLow = this.ctx.createBiquadFilter();
      this.filterLow.type = 'lowpass';
      this.filterLow.frequency.value = 20000; // default off

      // Custom parametric filter for vocal sculpting (E-Girl, Hot Boy, etc.)
      this.filterCustom = this.ctx.createBiquadFilter();
      this.filterCustom.type = 'peaking';
      this.filterCustom.frequency.value = 1000;
      this.filterCustom.Q.value = 1.0;
      this.filterCustom.gain.value = 0.0;

      // GainNode for volume boost
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      // Wire nodes:
      // Source -> AnalyserInput -> Processor -> FilterHigh -> FilterLow -> GainNode -> AnalyserOutput -> Destination (Optionally)
      this.source.connect(this.analyserInput);
      this.analyserInput.connect(this.processor);
      
      // Hook up processor logic
      this.processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer;
        const outputBuffer = e.outputBuffer;

        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);

        // Convert semitones pitch value to pitch ratio
        const ratio = Math.pow(2, this.currentPitchValue / 12.0);

        // Run DSP
        this.leftShifter.process(inputData, outputData, ratio, this.currentDownsample);
        
        // If stereo output, replicate to other channels if needed (though we created mono processor)
        if (outputBuffer.numberOfChannels > 1) {
          const rOut = outputBuffer.getChannelData(1);
          rOut.set(outputData);
        }
      };

      this.processor.connect(this.filterHigh);
      this.filterHigh.connect(this.filterLow);
      this.filterLow.connect(this.filterCustom);
      this.filterCustom.connect(this.gainNode);

      // Instantiate Delay and Reverb components
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayFeedback = this.ctx.createGain();
      this.delayWet = this.ctx.createGain();
      this.dryGain = this.ctx.createGain();

      this.reverbNode = this.ctx.createDelay(1.0);
      this.reverbFeedback = this.ctx.createGain();
      this.reverbWet = this.ctx.createGain();

      // Configure default values
      this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
      this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.delayWet.gain.setValueAtTime(0.0, this.ctx.currentTime); // off by default
      this.dryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.reverbNode.delayTime.setValueAtTime(0.08, this.ctx.currentTime);
      this.reverbFeedback.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.reverbWet.gain.setValueAtTime(0.0, this.ctx.currentTime); // off by default

      // Wiring Connections:
      // gainNode goes to dry path and delay/reverb path
      this.gainNode.connect(this.dryGain);
      this.dryGain.connect(this.analyserOutput);

      // Delay feedback loop and mix
      this.gainNode.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayWet);
      this.delayWet.connect(this.analyserOutput);

      // Reverb feedback loop and mix
      this.gainNode.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbFeedback);
      this.reverbFeedback.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbWet);
      this.reverbWet.connect(this.analyserOutput);

      // Connect to speakers if monitoring is active
      this.updateNodeConnections();

      // Trigger success callback
      onSuccess();
    } catch (err) {
      console.error('[Lyrebird Engine] Microphone permission denied or setup failed', err);
      onError(err);
    }
  }

  public async stop() {
    this.stopAllMemeSounds();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.filterHigh) {
      this.filterHigh.disconnect();
      this.filterHigh = null;
    }

    if (this.filterLow) {
      this.filterLow.disconnect();
      this.filterLow = null;
    }

    if (this.filterCustom) {
      this.filterCustom.disconnect();
      this.filterCustom = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.delayNode) {
      this.delayNode.disconnect();
      this.delayNode = null;
    }
    if (this.delayFeedback) {
      this.delayFeedback.disconnect();
      this.delayFeedback = null;
    }
    if (this.delayWet) {
      this.delayWet.disconnect();
      this.delayWet = null;
    }
    if (this.dryGain) {
      this.dryGain.disconnect();
      this.dryGain = null;
    }

    if (this.reverbNode) {
      this.reverbNode.disconnect();
      this.reverbNode = null;
    }
    if (this.reverbFeedback) {
      this.reverbFeedback.disconnect();
      this.reverbFeedback = null;
    }
    if (this.reverbWet) {
      this.reverbWet.disconnect();
      this.reverbWet = null;
    }

    if (this.analyserInput) {
      this.analyserInput.disconnect();
      this.analyserInput = null;
    }

    if (this.analyserOutput) {
      this.analyserOutput.disconnect();
      this.analyserOutput = null;
    }

    if (this.ctx) {
      if (this.ctx.state !== 'closed') {
        await this.ctx.close();
      }
      this.ctx = null;
    }
  }

  // Live adjust methods without reloading microphone streams
  public updateParameters(
    pitch: number,
    preset: Preset,
    monitor: boolean,
    delayTime: number = 0.35,
    delayFeedback: number = 0.4,
    delayWet: number = 0.0,
    reverbWet: number = 0.0
  ) {
    this.currentPitchValue = pitch;
    this.currentDownsample = preset.downsampleAmount;
    this.monitorSelf = monitor;

    // 1. Calculate volume boost
    const boostDb = preset.volumeBoost !== null ? preset.volumeBoost : 0;
    if (this.gainNode && this.ctx) {
      const linearGain = Math.pow(10, boostDb / 20);
      this.gainNode.gain.setValueAtTime(linearGain, this.ctx.currentTime);
    }

    // 2. Adjust standard filters for preset physical models (Megaphone / Radio / Bad Mic)
    if (this.filterHigh && this.filterLow && this.ctx) {
      if (preset.name === 'Radio') {
        // Narrow bandpass: 400Hz to 3200Hz
        this.filterHigh.type = 'highpass';
        this.filterHigh.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.filterLow.type = 'lowpass';
        this.filterLow.frequency.setValueAtTime(3200, this.ctx.currentTime);
      } else if (preset.name === 'Megaphone') {
        // Highpass filter at 700Hz + peak filter to add honk
        this.filterHigh.type = 'highpass';
        this.filterHigh.frequency.setValueAtTime(600, this.ctx.currentTime);
        this.filterLow.type = 'peaking';
        this.filterLow.frequency.setValueAtTime(1200, this.ctx.currentTime);
        this.filterLow.Q.setValueAtTime(3, this.ctx.currentTime);
        this.filterLow.gain.setValueAtTime(8, this.ctx.currentTime);
      } else if (preset.name === 'Bad Mic') {
        // Lowpass filter around 4000Hz, plus highpass at 150Hz
        this.filterHigh.type = 'highpass';
        this.filterHigh.frequency.setValueAtTime(150, this.ctx.currentTime);
        this.filterLow.type = 'lowpass';
        this.filterLow.frequency.setValueAtTime(4500, this.ctx.currentTime);
      } else {
        // Standard pass-through frequencies
        this.filterHigh.type = 'highpass';
        this.filterHigh.frequency.setValueAtTime(20, this.ctx.currentTime);
        this.filterLow.type = 'lowpass';
        this.filterLow.frequency.setValueAtTime(20000, this.ctx.currentTime);
      }
    }

    // 2.5 Apply advanced custom parametric filter from preset (e.g. for E-Girl air, Hot Boy warmth)
    if (this.filterCustom && this.ctx) {
      if (preset.filterType && preset.filterType !== 'none') {
        this.filterCustom.type = preset.filterType;
        this.filterCustom.frequency.setValueAtTime(preset.filterFreq || 1000, this.ctx.currentTime);
        this.filterCustom.Q.setValueAtTime(preset.filterQ || 1.0, this.ctx.currentTime);
        this.filterCustom.gain.setValueAtTime(preset.filterGain || 0.0, this.ctx.currentTime);
      } else {
        this.filterCustom.type = 'peaking';
        this.filterCustom.gain.setValueAtTime(0.0, this.ctx.currentTime); // neutral
      }
    }

    // 2.7 Update live Echo / Delay Parameters
    if (this.ctx) {
      if (this.delayNode) {
        this.delayNode.delayTime.setValueAtTime(delayTime, this.ctx.currentTime);
      }
      if (this.delayFeedback) {
        this.delayFeedback.gain.setValueAtTime(delayFeedback, this.ctx.currentTime);
      }
      if (this.delayWet) {
        this.delayWet.gain.setValueAtTime(delayWet, this.ctx.currentTime);
      }
      
      // Update live Reverb parameters
      if (this.reverbWet) {
        this.reverbWet.gain.setValueAtTime(reverbWet, this.ctx.currentTime);
      }
    }

    // 3. Connect or disconnect speakers depending on monitor toggle
    this.updateNodeConnections();
  }

  private updateNodeConnections() {
    if (!this.analyserOutput || !this.ctx) return;

    try {
      this.analyserOutput.disconnect(this.ctx.destination);
    } catch (e) {
      // It might not have been connected, ignore
    }

    if (this.monitorSelf) {
      this.analyserOutput.connect(this.ctx.destination);
    }
  }

  public getLiveLevel(type: 'input' | 'output'): number {
    const analyser = type === 'input' ? this.analyserInput : this.analyserOutput;
    if (!analyser) return 0;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128; // normalise to -1..1
      sumSquares += val * val;
    }
    return Math.sqrt(sumSquares / dataArray.length);
  }

  private ensureAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      
      // Lazy-create output analyser for soundboard visualizations when microphone is off
      this.analyserOutput = this.ctx.createAnalyser();
      this.analyserOutput.fftSize = 512;
      this.analyserOutput.connect(this.ctx.destination);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Pure mathematical synthesis of classic soundboard effects (100% offline, zero CORS, zero lag)
  public synthesizeMemeSound(soundId: string, volume: number = 0.8) {
    try {
      this.ensureAudioContext();
    } catch (e) {
      console.warn("Could not ensure audio context for synthesis, playing offline audio element:", e);
      return;
    }

    const ctx = this.ctx;
    if (!ctx) return;

    const destination = this.analyserOutput || ctx.destination;
    const now = ctx.currentTime;

    const createSynthVoice = () => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.connect(destination);
      return g;
    };

    console.log("[AudioEngine] Synthesizing soundboard meme:", soundId);

    switch (soundId) {
      case 'roblox-oof': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 1.0, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }
      case 'roblox-noob': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.22);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }
      case 'roblox-sword': {
        // Sword Slash: White noise sweep with resonant bandpass
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        
        const gainNode = createSynthVoice();
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        noiseNode.connect(filter);
        filter.connect(gainNode);
        
        noiseNode.start(now);
        noiseNode.stop(now + 0.2);
        break;
      }
      case 'vine-boom': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.70);
        
        // Lowpass filter for deep rumbling bass
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);
        filter.frequency.exponentialRampToValueAtTime(65, now + 0.6);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 1.1, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        // Impact high frequency metal click
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'sawtooth';
        clickOsc.frequency.setValueAtTime(250, now);
        clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        clickGain.gain.setValueAtTime(volume * 0.4, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(filter);
        filter.connect(gainNode);
        
        clickOsc.connect(clickGain);
        clickGain.connect(destination);
        
        osc.start(now);
        osc.stop(now + 1.0);
        clickOsc.start(now);
        clickOsc.stop(now + 0.15);
        break;
      }
      case 'bruh': {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(105, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.35);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(106, now);
        osc2.frequency.linearRampToValueAtTime(81, now + 0.35);
        
        const formant1 = ctx.createBiquadFilter();
        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(420, now); // 'uh' vowel
        formant1.Q.setValueAtTime(4.0, now);

        const formant2 = ctx.createBiquadFilter();
        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(900, now);
        formant2.Q.setValueAtTime(3.0, now);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 1.0, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(formant1);
        osc2.connect(formant2);
        
        formant1.connect(gainNode);
        formant2.connect(gainNode);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.45);
        osc2.stop(now + 0.45);
        break;
      }
      case 'anime-wow': {
        const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + idx * 0.05);
          gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + idx * 0.05 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.3);
        });
        break;
      }
      case 'airhorn': {
        const triggerHornBlip = (startTime: number, duration: number) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const osc3 = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(392, startTime); // G4
          
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(395, startTime);
          
          osc3.type = 'sawtooth';
          osc3.frequency.setValueAtTime(389, startTime);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(550, startTime);
          filter.Q.setValueAtTime(3.0, startTime);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc1.connect(filter);
          osc2.connect(filter);
          osc3.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          osc1.start(startTime);
          osc2.start(startTime);
          osc3.start(startTime);
          
          osc1.stop(startTime + duration + 0.05);
          osc2.stop(startTime + duration + 0.05);
          osc3.stop(startTime + duration + 0.05);
        };
        
        triggerHornBlip(now, 0.25);
        triggerHornBlip(now + 0.3, 0.12);
        triggerHornBlip(now + 0.45, 0.5);
        break;
      }
      case 'fbi-open-up': {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        kickGain.gain.setValueAtTime(volume * 1.2, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        kick.connect(kickGain);
        kickGain.connect(destination);
        kick.start(now);
        kick.stop(now + 0.35);

        const sirenOsc = ctx.createOscillator();
        const sirenGain = ctx.createGain();
        sirenOsc.type = 'sawtooth';
        sirenOsc.frequency.setValueAtTime(700, now + 0.1);
        sirenOsc.frequency.linearRampToValueAtTime(1200, now + 0.4);
        sirenOsc.frequency.linearRampToValueAtTime(700, now + 0.7);
        sirenOsc.frequency.linearRampToValueAtTime(1200, now + 1.0);
        
        sirenGain.gain.setValueAtTime(0, now);
        sirenGain.gain.setValueAtTime(volume * 0.4, now + 0.1);
        sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        sirenOsc.connect(sirenGain);
        sirenGain.connect(destination);
        sirenOsc.start(now + 0.1);
        sirenOsc.stop(now + 1.2);
        break;
      }
      case 'rizz-sax': {
        const riff = [
          { freq: 207.65, time: 0.0, dur: 0.25 }, // G#3
          { freq: 277.18, time: 0.28, dur: 0.25 }, // C#4
          { freq: 311.13, time: 0.55, dur: 0.7 }  // D#4
        ];
        
        riff.forEach((note) => {
          const osc = ctx.createOscillator();
          const oscSaw = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.freq, now + note.time);
          
          oscSaw.type = 'sawtooth';
          oscSaw.frequency.setValueAtTime(note.freq, now + note.time);
          
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 6.5; // Vibrato
          lfoGain.gain.value = note.freq * 0.03;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.setValueAtTime(800, now + note.time);
          filter.Q.setValueAtTime(2.0, now + note.time);
          filter.gain.setValueAtTime(6.0, now + note.time);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + note.time);
          gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + note.time + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfoGain.connect(oscSaw.frequency);
          
          const mixGain = ctx.createGain();
          mixGain.gain.value = 0.5;
          osc.connect(mixGain);
          oscSaw.connect(mixGain);
          
          mixGain.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          lfo.start(now + note.time);
          osc.start(now + note.time);
          oscSaw.start(now + note.time);
          
          lfo.stop(now + note.time + note.dur);
          osc.stop(now + note.time + note.dur);
          oscSaw.stop(now + note.time + note.dur);
        });
        break;
      }
      case 'sad-violin': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, now); // D5
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 5.8;
        lfoGain.gain.value = 15;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        osc.connect(filter);
        filter.connect(gainNode);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 1.5);
        osc.stop(now + 1.5);
        break;
      }
      case 'giga-chad': {
        const notes = [55, 55, 82.4, 55, 55, 82.4, 110]; // A1, A1, E2, A1, A1, E2, A2
        const beats = [0.0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.08];
        const beatDur = 0.15;
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + beats[idx]);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(300, now + beats[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + beats[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + beats[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + beats[idx] + beatDur);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + beats[idx]);
          osc.stop(now + beats[idx] + beatDur + 0.02);
        });
        break;
      }
      case 'headshot': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'level-up': {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + idx * 0.04);
          gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + idx * 0.04 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.3);
        });
        break;
      }
      case 'game-over': {
        const notes = [392.00, 311.13, 261.63, 196.00]; // G4, D#4, C4, G3
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + idx * 0.15);
          gainNode.gain.linearRampToValueAtTime(volume * 0.25, now + idx * 0.15 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.45);
        });
        break;
      }
      case 'meme-laugh': {
        const laughs = [698.46, 880.00, 1046.50, 880.00, 1046.50, 1318.51, 1046.50];
        const times = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
        laughs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + times[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + times[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.35, now + times[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + 0.09);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + times[idx]);
          osc.stop(now + times[idx] + 0.1);
        });
        break;
      }
      case 'coffin-dance': {
        const notes = [392.00, 392.00, 587.33, 493.88, 523.25, 493.88, 440.00, 392.00, 369.99, 392.00, 440.00];
        const beats = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5];
        const durs = [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.25];
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + beats[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + beats[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.2, now + beats[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + beats[idx] + durs[idx]);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + beats[idx]);
          osc.stop(now + beats[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'emotional-damage': {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(95, now + 0.45);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(225, now);
        osc2.frequency.linearRampToValueAtTime(47.5, now + 0.45);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.9, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.55);
        osc2.stop(now + 0.55);
        break;
      }
      case 'windows-error': {
        const notes = [440.00, 440.00, 554.37];
        const times = [0.0, 0.08, 0.16];
        const durs = [0.05, 0.05, 0.25];
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + times[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + times[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + times[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + durs[idx]);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + times[idx]);
          osc.stop(now + times[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'mgs-alert': {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(2000, now);
        filter.Q.setValueAtTime(4.0, now);
        filter.gain.setValueAtTime(15, now);
        
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(volume * 1.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(filter);
        filter.connect(gainNode);
        
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'spongebob-fail': {
        const notes = [349.23, 329.63, 311.13, 293.66];
        const times = [0.0, 0.22, 0.44, 0.66];
        const durs = [0.18, 0.18, 0.18, 0.5];
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + times[idx]);
          osc.frequency.linearRampToValueAtTime(freq - 15, now + times[idx] + durs[idx]);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          
          // Add sliding vibrato (wah-wah) to final trombone note
          if (idx === 3) {
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(6, now + times[idx]);
            lfoGain.gain.setValueAtTime(15, now + times[idx]);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now + times[idx]);
            lfo.stop(now + times[idx] + durs[idx]);
          }
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + times[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + times[idx] + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + durs[idx]);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + times[idx]);
          osc.stop(now + times[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'nyan-cat': {
        const notes = [739.99, 830.61, 622.25, 622.25, 830.61, 739.99, 622.25, 739.99, 830.61, 987.77, 1109.73, 1244.51];
        const beats = [0.0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96, 1.08, 1.2, 1.32];
        const durs = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2];
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + beats[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + beats[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.25, now + beats[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + beats[idx] + durs[idx]);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + beats[idx]);
          osc.stop(now + beats[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'run-meme': {
        const notes = [110, 110, 110, 110, 220, 196, 110, 110, 110, 110, 220, 246.94];
        const beats = [0.0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88];
        const durs = [0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.12];
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + beats[idx]);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now + beats[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + beats[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + beats[idx] + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + beats[idx] + durs[idx]);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + beats[idx]);
          osc.stop(now + beats[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'daddys-home': {
        // Sultry, romantic R&B keyboard chime synthesis
        const chords = [
          // Chord 1: F# maj7 (F#3, A#3, C#4, F4)
          { time: 0.0, freqs: [185.00, 233.08, 277.18, 349.23], dur: 0.35, vol: 0.8 },
          // Chord 2: G# dom7 (G#3, C4, D#4, F#4)
          { time: 0.4, freqs: [207.65, 261.63, 311.13, 369.99], dur: 0.35, vol: 0.8 },
          // Chord 3: A# min7 (A#3, C#4, F4, G#4)
          { time: 0.8, freqs: [233.08, 277.18, 349.23, 415.30], dur: 0.8, vol: 1.0 }
        ];

        chords.forEach(chord => {
          chord.freqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            // Warm, electric piano/tines style
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + chord.time);
            
            // Subtle vibrato (chorus effect)
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(4.5, now + chord.time);
            lfoGain.gain.setValueAtTime(2.0, now + chord.time);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.setValueAtTime(0, now + chord.time);
            gainNode.gain.linearRampToValueAtTime(volume * chord.vol * 0.35, now + chord.time + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + chord.time + chord.dur);
            
            osc.connect(gainNode);
            gainNode.connect(destination);
            
            lfo.start(now + chord.time);
            osc.start(now + chord.time);
            lfo.stop(now + chord.time + chord.dur);
            osc.stop(now + chord.time + chord.dur + 0.02);
          });
        });
        break;
      }
      case 'metal-pipe': {
        // High-fidelity physical modeling synthesis of a falling metal pipe (clang & resonating ringing)
        // 1. Core impact clonk
        const sweepOsc = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweepOsc.type = 'sine';
        sweepOsc.frequency.setValueAtTime(380, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(75, now + 0.15);
        sweepGain.gain.setValueAtTime(volume * 0.8, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        sweepOsc.connect(sweepGain);
        sweepGain.connect(destination);
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.18);

        // 2. High-pitch metallic resonant chimes
        const ringingFreqs = [1120, 1480, 1850, 2210, 2680, 3120];
        ringingFreqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          // Detune slightly over time for a realistic metal clang wobble
          osc.frequency.linearRampToValueAtTime(freq * (1.0 + (idx % 2 === 0 ? 0.005 : -0.005)), now + 0.8);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.005);
          // High-frequency decay faster, lower ring longer
          const ringDecay = 0.4 + (5 - idx) * 0.12; 
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + ringDecay);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now);
          osc.stop(now + ringDecay + 0.02);
        });

        // 3. Highpass metallic crash noise
        const bufferSize = Math.floor(ctx.sampleRate * 0.35);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const bData = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          bData[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3200, now);
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(destination);
        
        noise.start(now);
        noise.stop(now + 0.35);
        break;
      }
      case 'bing-chilling': {
        // Cute, pentatonic, marimba-style Chinese melody (C5, D5, G5, A5, G5)
        const notes = [523.25, 587.33, 783.99, 880.00, 783.99];
        const beats = [0.0, 0.14, 0.28, 0.42, 0.56];
        const durs = [0.12, 0.12, 0.12, 0.12, 0.35];

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          // Rounded marimba/vibraphone chime sound
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + beats[idx]);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + beats[idx]);
          gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + beats[idx] + 0.005);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + beats[idx] + durs[idx]);
          
          osc.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + beats[idx]);
          osc.stop(now + beats[idx] + durs[idx] + 0.02);
        });
        break;
      }
      case 'dog-doin': {
        // Comical synthesized puppy bark (rising pitch sweep + filtered bandpass noise)
        const barks = [0.0, 0.28];
        barks.forEach(time => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sawtooth';
          // Pitch starts at 180Hz and sweeps rapidly to 320Hz then drops
          osc.frequency.setValueAtTime(180, now + time);
          osc.frequency.linearRampToValueAtTime(340, now + time + 0.06);
          osc.frequency.exponentialRampToValueAtTime(120, now + time + 0.15);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(450, now + time);
          filter.Q.setValueAtTime(2.0, now + time);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.setValueAtTime(0, now + time);
          gainNode.gain.linearRampToValueAtTime(volume * 0.9, now + time + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + 0.16);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(destination);
          
          osc.start(now + time);
          osc.stop(now + time + 0.18);
        });
        break;
      }
      default: {
        const osc = ctx.createOscillator();
        const gainNode = createSynthVoice();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  }

  // Stop a specific active meme sound
  public stopMemeSound(soundId: string) {
    const active = this.activeMemeSounds.get(soundId);
    if (active) {
      try {
        active.audio.pause();
        active.audio.currentTime = 0;
      } catch (err) {
        console.warn("Error pausing audio object:", err);
      }
      this.activeMemeSounds.delete(soundId);
      if (active.onEnd) {
        active.onEnd();
      }
    }
  }

  // Stop all active meme sounds
  public stopAllMemeSounds() {
    const keys = Array.from(this.activeMemeSounds.keys());
    for (const key of keys) {
      this.stopMemeSound(key);
    }
  }

  // Toggle looping property dynamically on an active sound
  public setMemeSoundLoop(soundId: string, loop: boolean) {
    const active = this.activeMemeSounds.get(soundId);
    if (active) {
      active.audio.loop = loop;
    }
  }

  // Play a soundboard meme or song, mixing it straight into our visualizer/destination output stream!
  public playMemeSound(
    url: string,
    volume: number = 0.8,
    soundId?: string,
    playbackRate: number = 1.0,
    loop: boolean = false,
    onEnd?: () => void
  ) {
    if (soundId) {
      // If already playing this ID, stop it first
      this.stopMemeSound(soundId);
    }

    if (soundId && !soundId.startsWith('custom-sound-') && !soundId.startsWith('local-file-') && !url.startsWith('/sounds/')) {
      // For all default built-in sound effects, synthesize directly to guarantee 100% offline uptime
      // and prevent CORS/network loading blocks! This is extremely robust and responsive.
      this.synthesizeMemeSound(soundId, volume);
      if (onEnd) {
        // Since synthesis is instantaneous and short, call onEnd after a brief delay
        setTimeout(onEnd, 300);
      }
      return;
    }

    // Prepare helper to handle audio ending
    const setupAudioEvents = (audio: HTMLAudioElement) => {
      audio.loop = loop;
      audio.onended = () => {
        if (!audio.loop) {
          if (soundId) {
            this.activeMemeSounds.delete(soundId);
          }
          if (onEnd) onEnd();
        }
      };
      if (soundId) {
        this.activeMemeSounds.set(soundId, { audio, onEnd });
      }
    };

    try {
      this.ensureAudioContext();
    } catch (e) {
      console.warn("Could not ensure audio context, trying direct Audio element playback:", e);
      // Fallback: direct play via standard Audio element without routing
      try {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.playbackRate = playbackRate;
        setupAudioEvents(audio);
        audio.play().catch(err => {
          console.error("[Soundboard Offline Fallback] Direct play failed:", err);
          if (soundId) {
            this.synthesizeMemeSound(soundId, volume);
            if (onEnd) setTimeout(onEnd, 300);
          }
        });
      } catch (err) {
        console.error("Direct play element creation failed:", err);
        if (soundId) {
          this.synthesizeMemeSound(soundId, volume);
          if (onEnd) setTimeout(onEnd, 300);
        }
      }
      return;
    }

    const ctx = this.ctx;
    if (!ctx) return;

    try {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.playbackRate = playbackRate;
      setupAudioEvents(audio);

      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);

      // Connect to output analyzer so the meme sound is visualized on the oscilloscope and goes to speakers/virtual output
      if (this.analyserOutput) {
        gainNode.connect(this.analyserOutput);
      } else {
        gainNode.connect(ctx.destination);
      }

      audio.play().catch(err => {
        console.warn("[WebAudio CORS restriction] MediaElementSource failed. Playing directly through speakers.", err);
        // If MediaElementSource fails (e.g. CORS), we must recreate direct element to avoid routing crash
        this.stopMemeSound(soundId || '');
        
        const directAudio = new Audio(url);
        directAudio.volume = volume;
        directAudio.playbackRate = playbackRate;
        setupAudioEvents(directAudio);
        
        directAudio.play().catch(e => {
          console.error("Soundboard raw playback failed", e);
          if (soundId) {
            console.log("CORS/network playback failed. Invoking high-fidelity synthesizer fallback.");
            this.synthesizeMemeSound(soundId, volume);
            if (onEnd) setTimeout(onEnd, 300);
          }
        });
      });
    } catch (err) {
      console.warn("Direct WebAudio link failed. Attempting direct speaker play:", err);
      this.stopMemeSound(soundId || '');
      try {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.playbackRate = playbackRate;
        setupAudioEvents(audio);
        audio.play().catch(e => {
          console.error("Soundboard direct speaker play failed", e);
          if (soundId) {
            this.synthesizeMemeSound(soundId, volume);
            if (onEnd) setTimeout(onEnd, 300);
          }
        });
      } catch (e) {
        console.error(e);
        if (soundId) {
          this.synthesizeMemeSound(soundId, volume);
          if (onEnd) setTimeout(onEnd, 300);
        }
      }
    }
  }

  // Synthesizes a warm, deep 808 sub bass drop kick drum
  public playDrumKick(vol = 0.8) {
    try {
      this.ensureAudioContext();
    } catch (e) { return; }
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const destination = this.analyserOutput || ctx.destination;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol * 0.9, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Synthesizes an ultra-crisp high-hat using filtered white noise
  public playDrumHat(vol = 0.5) {
    try {
      this.ensureAudioContext();
    } catch (e) { return; }
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const destination = this.analyserOutput || ctx.destination;

    // Create a 40ms buffer of white noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.05);
  }

  // Synthesizes a classic retro snare/clap
  public playDrumClap(vol = 0.6) {
    try {
      this.ensureAudioContext();
    } catch (e) { return; }
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const destination = this.analyserOutput || ctx.destination;

    // Create a 150ms buffer of white noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.5;

    const gainNode = ctx.createGain();
    
    // Simulate classic retro gated multiple bursts of clapping hands
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol * 0.5, now + 0.002);
    gainNode.gain.setValueAtTime(0.01, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(vol * 0.5, now + 0.012);
    gainNode.gain.setValueAtTime(0.01, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(vol * 0.7, now + 0.022);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.15);
  }
}
