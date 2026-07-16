import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  type?: 'waveform' | 'frequency' | 'circular';
  color?: string; // e.g., 'rgb(6, 182, 212)'
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isActive,
  type = 'waveform',
  color = 'rgb(6, 182, 212)', // Cyan-500
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution to match container dimensions
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 300) * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Render loop
    const draw = () => {
      if (!ctx || !canvas) return;

      const width = canvas.width / window.devicePixelRatio;
      const heightVal = canvas.height / window.devicePixelRatio;

      // Clear with slight transparency to create trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, width, heightVal);

      if (!isActive || !analyser) {
        // Draw idle center line
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, heightVal / 2);
        ctx.lineTo(width, heightVal / 2);
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;

      if (type === 'waveform') {
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        // Clear canvas with a nice cyber grid background
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
        ctx.lineWidth = 1;
        const gridSpacing = 20;
        for (let xG = 0; xG < width; xG += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(xG, 0);
          ctx.lineTo(xG, heightVal);
          ctx.stroke();
        }
        for (let yG = 0; yG < heightVal; yG += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, yG);
          ctx.lineTo(width, yG);
          ctx.stroke();
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * heightVal) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, heightVal / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      } else if (type === 'circular') {
        // Circular Cyber Core Audio Portal!
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const centerX = width / 2;
        const centerY = heightVal / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;

        // Draw outer ring glow
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Render circular radiating frequency beams
        const numBeams = Math.min(bufferLength, 80);
        for (let i = 0; i < numBeams; i++) {
          const angle = (i / numBeams) * Math.PI * 2;
          const amplitude = dataArray[i] / 255;
          const beamLen = baseRadius + amplitude * 45;

          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * beamLen;
          const endY = centerY + Math.sin(angle) * beamLen;

          const grad = ctx.createLinearGradient(startX, startY, endX, endY);
          grad.addColorStop(0, color);
          grad.addColorStop(1, 'rgba(236, 72, 153, 0.2)'); // fades to warm pink/magenta

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Draw pulsing center cyber core
        let avgFreq = 0;
        for (let i = 0; i < 20; i++) avgFreq += dataArray[i];
        avgFreq = avgFreq / 20 / 255;

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * (0.8 + avgFreq * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, baseRadius * (0.8 + avgFreq * 0.25));
        ctx.fillStyle.addColorStop(0, 'white');
        ctx.fillStyle.addColorStop(0.3, color);
        ctx.fillStyle.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
        ctx.fill();

        ctx.shadowBlur = 0;
      } else {
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Cyber grid background
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.1)';
        ctx.lineWidth = 1;
        const gridSpacing = 15;
        for (let xG = 0; xG < width; xG += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(xG, 0);
          ctx.lineTo(xG, heightVal);
          ctx.stroke();
        }

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const barHeight = percent * heightVal * 0.95;

          // Stunning neon gradient for each EQ frequency band!
          const grad = ctx.createLinearGradient(x, heightVal, x, heightVal - barHeight);
          grad.addColorStop(0, 'rgb(99, 102, 241)'); // Indigo-500
          grad.addColorStop(0.5, color);            // Cyan-500
          grad.addColorStop(1, 'rgb(236, 72, 153)');  // Pink-500

          ctx.fillStyle = grad;
          
          // Draw rounded aesthetic bars
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, heightVal - barHeight, barWidth - 1.5, barHeight, [3, 3, 0, 0]);
          } else {
            ctx.rect(x, heightVal - barHeight, barWidth - 1.5, barHeight);
          }
          ctx.fill();

          x += barWidth;
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, type, color, height]);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-1">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      />
    </div>
  );
};
