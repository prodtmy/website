/**
 * Client-Side Audio Analysis Engine (Web Audio API)
 * Detects BPM (Tempo) & Musical Key (Pitch Class Profile) directly from raw PCM AudioBuffer
 */

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler Key Profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 2.69, 3.34, 3.17, 3.33];

export async function analyzeAudioFile(file: File): Promise<{ bpm: string | null; key: string | null }> {
  try {
    if (typeof window === 'undefined') return { bpm: null, key: null };
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return { bpm: null, key: null };

    const audioCtx = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode Audio Data
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const pcm = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Use max first 30 seconds of audio for ultra-fast analysis
    const maxSamples = Math.min(pcm.length, sampleRate * 30);
    const slicedPcm = pcm.subarray(0, maxSamples);

    const bpm = detectBpm(slicedPcm, sampleRate);
    const key = detectKey(slicedPcm, sampleRate);

    audioCtx.close();
    return { bpm, key };
  } catch (err) {
    console.warn("Audio analysis warning:", err);
    return { bpm: null, key: null };
  }
}

/**
 * BPM Detection via Low-Pass Filtered Onset Energy Intervals
 */
function detectBpm(pcm: Float32Array, sampleRate: number): string | null {
  try {
    // 1. Downsample for speed (chunk size ~10ms = ~441 samples)
    const chunkSize = Math.floor(sampleRate * 0.01);
    const numChunks = Math.floor(pcm.length / chunkSize);
    const energyEnvelope = new Float32Array(numChunks);

    for (let i = 0; i < numChunks; i++) {
      let sum = 0;
      const start = i * chunkSize;
      for (let j = 0; j < chunkSize; j++) {
        const val = pcm[start + j];
        sum += val * val; // Energy
      }
      energyEnvelope[i] = Math.sqrt(sum / chunkSize);
    }

    // 2. Differentiate to get Onsets
    const onsets = new Float32Array(numChunks);
    for (let i = 1; i < numChunks; i++) {
      const diff = energyEnvelope[i] - energyEnvelope[i - 1];
      onsets[i] = diff > 0 ? diff : 0;
    }

    // 3. Autocorrelation over BPM range 70 to 180 (intervals ~333ms to 857ms)
    // Envelope is 100Hz (10ms per step)
    const minLag = Math.floor(60 / 180 * 100); // 33 steps
    const maxLag = Math.floor(60 / 70 * 100);  // 85 steps

    let bestLag = 0;
    let maxCorr = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < numChunks - lag; i++) {
        corr += onsets[i] * onsets[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag > 0) {
      const secondsPerBeat = (bestLag * 0.01);
      let calculatedBpm = Math.round(60 / secondsPerBeat);
      
      // Normalize to standard trap/hiphop/pop BPM range 90-165
      if (calculatedBpm < 80) calculatedBpm *= 2;
      if (calculatedBpm > 175) calculatedBpm = Math.round(calculatedBpm / 2);

      return String(calculatedBpm);
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

/**
 * Musical Key Detection via Chromagram & Pitch Class Correlation
 */
function detectKey(pcm: Float32Array, sampleRate: number): string | null {
  try {
    const chromagram = new Float32Array(12);

    // Analyze 12 note frequencies across 3 octaves (C3 to B5)
    // Frequencies: C3 (~130.81Hz) up to B5 (~987.77Hz)
    const baseFreq = 130.81; // C3
    const step = 2048;
    const numSteps = Math.floor(pcm.length / step);

    for (let i = 0; i < numSteps; i++) {
      const start = i * step;
      // Calculate energy for each of the 12 pitch classes
      for (let note = 0; note < 12; note++) {
        for (let octave = 0; octave < 3; octave++) {
          const freq = baseFreq * Math.pow(2, octave + note / 12);
          const k = Math.round((freq * step) / sampleRate);
          
          let real = 0;
          let imag = 0;
          for (let n = 0; n < step; n++) {
            const angle = (2 * Math.PI * k * n) / step;
            const sample = pcm[start + n];
            real += sample * Math.cos(angle);
            imag -= sample * Math.sin(angle);
          }
          const mag = Math.sqrt(real * real + imag * imag);
          chromagram[note] += mag;
        }
      }
    }

    // Match chromagram against Major and Minor Krumhansl-Schmuckler profiles
    let bestKey = '';
    let maxCorrelation = -Infinity;

    for (let root = 0; root < 12; root++) {
      // Shift chromagram for current root
      const shifted = new Float32Array(12);
      for (let i = 0; i < 12; i++) {
        shifted[i] = chromagram[(i + root) % 12];
      }

      // 1. Test Major Profile
      const majCorr = pearsonCorrelation(shifted, MAJOR_PROFILE);
      if (majCorr > maxCorrelation) {
        maxCorrelation = majCorr;
        bestKey = `${PITCH_NAMES[root]} MAJ`;
      }

      // 2. Test Minor Profile
      const minCorr = pearsonCorrelation(shifted, MINOR_PROFILE);
      if (minCorr > maxCorrelation) {
        maxCorrelation = minCorr;
        bestKey = `${PITCH_NAMES[root]} MIN`;
      }
    }

    return bestKey || null;
  } catch (e) {
    console.error(e);
  }
  return null;
}

function pearsonCorrelation(x: Float32Array, y: number[]): number {
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = x.length;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}
