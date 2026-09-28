"""Original 128 BPM electronic score, synthesized without samples."""
from pathlib import Path
import wave
import numpy as np

RATE = 48000
DURATION = 15
BEAT = 60 / 128
rng = np.random.default_rng(817)
mix = np.zeros((RATE * DURATION, 2), dtype=np.float64)

def add(signal, start, gain=1, pan=0):
    offset = round(start * RATE)
    n = min(len(signal), len(mix) - offset)
    if n <= 0:
        return
    angle = (pan + 1) * np.pi / 4
    mix[offset:offset+n, 0] += signal[:n] * gain * np.cos(angle)
    mix[offset:offset+n, 1] += signal[:n] * gain * np.sin(angle)

def time(length):
    return np.arange(round(length * RATE)) / RATE

def tone(freq, length, decay=7):
    t = time(length)
    env = (1 - np.exp(-t * 350)) * np.exp(-t * decay)
    return (np.sin(2*np.pi*freq*t) + .24*np.sin(2*np.pi*freq*2*t) + .08*np.sin(2*np.pi*freq*3*t)) * env

for beat in range(32):
    # Short, tuned kick with a gentle transient.
    t = time(.3)
    phase = 2*np.pi*(46*t + (120-46)*.022*(1-np.exp(-t/.022)))
    kick = np.sin(phase) * np.exp(-t*17) * (1-np.exp(-t*1800))
    if beat < 29:
        add(kick, beat*BEAT, .68)
    if beat % 2 == 1 and beat < 27:
        t = time(.16)
        noise = rng.normal(0, 1, len(t))
        hi = noise - np.convolve(noise, np.ones(10)/10, mode='same')
        clap = .3*hi*np.exp(-t*36) + .25*np.sin(2*np.pi*185*t)*np.exp(-t*30)
        add(clap, beat*BEAT, .19)
    if 3 <= beat < 27:
        for sub in [0, .5]:
            t = time(.065)
            noise = rng.normal(0, 1, len(t))
            hat = (noise-np.convolve(noise,np.ones(6)/6,mode='same'))*np.exp(-t*75)
            add(hat, (beat+sub)*BEAT, .035 if sub else .022, -.35 if sub else .35)
    root = [49, 58.2705, 77.7817, 43.6535][min(3, beat//8)]
    if beat < 28:
        add(tone(root, .4, 10), beat*BEAT+.012, .3)
        if beat % 2 == 0:
            add(tone(root*2, .22, 13), (beat+.75)*BEAT, .13, .1)

# Plucked arpeggio, arranged around G minor.
notes = [392, 587.33, 698.46, 880, 784, 587.33, 466.16, 587.33]
for k in range(58):
    start = .46875 + k*BEAT/2
    if start > 13.4:
        break
    n = notes[k%8] * (1 if k<32 else .5)
    sig = tone(n, .65, 9)
    pan = -.42 if k%2 else .42
    add(sig,start,.075,pan)
    add(sig,start+BEAT*.75,.024,-pan)

# Soft harmonic beds create scale under the cuts.
for idx, chord in enumerate([[196,233.08,293.66],[233.08,293.66,349.23],[155.56,196,233.08],[174.61,220,261.63]]):
    t = time(3.75)
    env = np.sin(np.pi*np.clip(t/3.75,0,1))**.7
    sig = sum(np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*1.003*t) for f in chord)/len(chord)
    add(sig*env, idx*3.75, .065, -.2)
    add(sig*env, idx*3.75+.015, .05, .2)

# Air sweeps and sub drops at the scene changes.
for cut in [2.8125,5.625,8.4375,11.71875]:
    t=time(.42)
    noise=rng.normal(0,1,len(t))
    smooth=np.convolve(noise,np.ones(42)/42,mode='same')
    swell=np.sin(np.pi*np.clip(t/.42,0,1))**2
    sig=smooth*swell+np.sin(2*np.pi*(180*t+600*t*t))*swell*.05
    add(sig,cut-.25,.28,-.3)
    t=time(.55)
    add(np.sin(2*np.pi*(38*t+12*(1-np.exp(-t*9))))*np.exp(-t*12),cut,.2)

# Resolved logo chord and fine bell.
for freq in [196,293.66,392,587.33]:
    add(tone(freq,2.8,1.8),12.25,.075,(freq/600-.6))
add(tone(1174.66,1.4,4),13.0,.035,.15)
mix=np.tanh(mix*1.1)
mix*=.88/max(.01,np.max(np.abs(mix)))
fade=np.minimum(1,np.arange(len(mix))/480)
fade*=np.minimum(1,np.arange(len(mix))[::-1]/(RATE*.52))
mix*=fade[:,None]
dest=Path(__file__).resolve().parent/'soundtrack.wav'
with wave.open(str(dest),'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes((mix*32767).astype('<i2').tobytes())
print('Original score written',dest.name,'15 seconds, stereo 48 kHz')
