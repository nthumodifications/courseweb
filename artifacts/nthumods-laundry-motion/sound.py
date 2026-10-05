"""Original 128 BPM score and sound design for the laundry film, synthesized without samples."""
from pathlib import Path
import wave
import numpy as np

RATE, DURATION, BEAT = 48000, 15, 60/128
CUT1, CUT2, CUT3 = 6*BEAT, 14*BEAT, 24*BEAT
MORPH, FF, DONE = 12.7*BEAT, 16*BEAT, 20*BEAT
rng = np.random.default_rng(2026)
mix = np.zeros((RATE*DURATION, 2), dtype=np.float64)

def clock(length):
    return np.arange(round(length*RATE))/RATE

def add(sig, start, gain=1, pan=0):
    offset = round(start*RATE)
    if offset < 0:
        sig, offset = sig[-offset:], 0
    n = min(len(sig), len(mix)-offset)
    if n <= 0:
        return
    angle = (pan+1)*np.pi/4
    mix[offset:offset+n, 0] += sig[:n]*gain*np.cos(angle)
    mix[offset:offset+n, 1] += sig[:n]*gain*np.sin(angle)

def freq(midi):
    return 440*2**((midi-69)/12)

def smooth_noise(length, width):
    return np.convolve(rng.normal(0, 1, round(length*RATE)), np.ones(width)/width, mode='same')

def tone(midi, length, decay=7):
    t = clock(length)
    f = freq(midi)
    env = (1-np.exp(-t*350))*np.exp(-t*decay)
    return (np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))*env

def bell(midi, length=1.4, decay=3.5):
    t = clock(length)
    f = freq(midi)
    return (1-np.exp(-t*900))*(np.sin(2*np.pi*f*t)*np.exp(-t*decay)+.35*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*decay*3)+.12*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*decay*6))

def kick(gain=.66, at=0):
    t = clock(.32)
    phase = 2*np.pi*(46*t+(125-46)*.022*(1-np.exp(-t/.022)))
    add(np.sin(phase)*np.exp(-t*16)*(1-np.exp(-t*1800)), at, gain)

def snare(at, gain):
    t = clock(.16)
    noise = rng.normal(0, 1, len(t))
    hi = noise-np.convolve(noise, np.ones(10)/10, mode='same')
    add(.32*hi*np.exp(-t*34)+.24*np.sin(2*np.pi*188*t)*np.exp(-t*30), at, gain)

def hat(at, gain, pan):
    t = clock(.06)
    noise = rng.normal(0, 1, len(t))
    add((noise-np.convolve(noise, np.ones(6)/6, mode='same'))*np.exp(-t*80), at, gain, pan)

def click(at, gain=.06, pitch=1100):
    t = clock(.08)
    add(np.sin(2*np.pi*pitch*t)*np.exp(-t*90)+.25*rng.normal(0, 1, len(t))*np.exp(-t*160), at, gain)

def pop(at, gain=.07, pitch=520):
    # Rising sine blip, like a soft bubble.
    t = clock(.09)
    add(np.sin(2*np.pi*(pitch*t+pitch*2.2*t*t/.09))*np.exp(-t*45)*(1-np.exp(-t*900)), at, gain)

def whoosh(start, length, gain=.24, pan=0, rise=True):
    t = clock(length)
    progress = t/length
    dark, bright = smooth_noise(length, 70), smooth_noise(length, 5)*.5
    blend = progress if rise else 1-progress
    swell = np.sin(np.pi*np.clip(progress, 0, 1))**2 if not rise else progress**2.2*np.exp(-np.maximum(0, progress-.92)*30)
    add((dark*(1-blend)+bright*blend)*swell, start, gain, pan)

def impact(at, gain=.3):
    t = clock(.7)
    add(np.sin(2*np.pi*(62*t+28*(1-np.exp(-t*7))))*np.exp(-t*6), at, gain)
    add(smooth_noise(.7, 14)*np.exp(-clock(.7)*9), at, gain*.45)

# Chord per bar (4 beats): Dm, Bb, F, C, Csus4 build, Fmaj7 drop, Bbmaj7, F add9.
bars = [([50, 53, 57], 38), ([46, 50, 53], 34), ([53, 57, 60], 41), ([48, 52, 55], 36),
        ([48, 53, 55], 36), ([53, 57, 60, 64], 41), ([46, 50, 53, 57], 34), ([53, 57, 60, 67], 41)]

# Inside the drum: muffled water and bubbles before the camera pulls out on beat 1.
t = clock(CUT1)
slosh = smooth_noise(CUT1, 260)*(.6+.4*np.sin(2*np.pi*5.5*t))*(1-np.exp(-t*30))
slosh *= np.where(t < BEAT, 1, np.exp(-(t-BEAT)*1.2)*.45+.1)
add(slosh, 0, .9, -.1)
add(np.sin(2*np.pi*(36*t+18*t*t))*np.clip(t/BEAT, 0, 1)**2*(t < BEAT), 0, .35)
for at in [.06, .15, .23, .31, .39, 2.42, 2.5, 2.57, 2.64, 2.7]:
    pop(at, .05, 380+rng.random()*500)

for beat in range(32):
    start = beat*BEAT
    chord, root = bars[beat//4]
    building = 16 <= beat < 20
    if 1 <= beat < 29 and not (18 <= beat < 20):
        kick(.62 if beat < 20 else .7, start)
    if beat % 2 == 1 and 3 <= beat < 27 and not building:
        snare(start, .17 if beat < 20 else .2)
    if 2 <= beat < 27 and not 18 <= beat < 20:
        for sub in [0, .5]:
            hat(start+sub*BEAT, .034 if sub else .02, -.35 if sub else .35)
    if 1 <= beat < 28 and not 18 <= beat < 20:
        add(tone(root, .42, 10), start+.012, .3)
        add(tone(root+12, .22, 13), start+.75*BEAT, .12, .1)

# Plucked arpeggio in eighth notes through each bar's chord.
for k in range(2, 58):
    start = k*BEAT/2
    chord, _ = bars[int(k//8)]
    tones = chord+[n+12 for n in chord]
    note = tones[[0, 2, 1, 3, 2, 4, 3, 5][k % 8] % len(tones)]+12
    gain = .07 if start < FF else .045+.03*((start-FF)/(DONE-FF)) if start < DONE else .08
    pan = -.4 if k % 2 else .4
    add(tone(note, .6, 9), start, gain, pan)
    add(tone(note, .6, 9), start+BEAT*.75, gain*.3, -pan)

# Pads follow the bars and keep the bed continuous through every cut.
for i, (chord, _) in enumerate(bars):
    length = 4*BEAT+.25
    t = clock(length)
    env = np.minimum(1, t/.18)*np.minimum(1, (length-t)/.3)
    sig = sum(np.sin(2*np.pi*freq(n)*t)+.2*np.sin(2*np.pi*freq(n)*1.004*t) for n in chord)/len(chord)
    add(sig*env, i*4*BEAT, .06 if i < 7 else .075, -.2)
    add(sig*env, i*4*BEAT+.016, .045, .2)

# 01 → 02: dive through the porthole.
whoosh(2.3, CUT1-2.3+.04, .3, -.1)
impact(CUT1, .2)
pop(CUT1, .1, 300)

# 02: dorm picker. Ticks follow the reel exactly as drawn in motion.js.
click(CUT1+.24, .07)
def back(x, c):
    x = np.clip(x, 0, 1)
    return 1+(c+1)*(x-1)**3+c*(x-1)**2
u = np.arange(0, 1.2, 1/RATE)
position = 16*back((u-.36)/.7, 1.05)
for index in np.nonzero(np.diff(np.floor(position)) != 0)[0]:
    click(CUT1+u[index], .045, 1600+rng.random()*300)
click(CUT1+1.0, .07)
for idx, note in enumerate([74, 81]):
    add(bell(note, .8, 5), CUT1+1.04+idx*.07, .06, .2)
for i in range(3):
    pop(CUT1+1.5+i*.07, .05, 600+i*80)
    pop(CUT1+1.62+i*.07, .05, 700+i*80)

# 02 → 03: the tile grows into the status card.
whoosh(MORPH-.05, CUT2-MORPH+.05, .22, .15)
impact(CUT2, .12)
for i in range(3):
    pop(CUT2+.4+i*.1, .045, 640+i*120)

# 03: fast-forward build, then the drop when the cycle finishes.
build = np.arange(FF, DONE, 1/RATE)
progress = (build-FF)/(DONE-FF)
speed = np.where(progress < .5, 12*progress**2, 12*(1-progress)**2)/3
rate = 5+70*np.clip(speed, 0, 1)
phase = np.cumsum(rate)/RATE
for index in np.nonzero(np.diff(np.floor(phase)) != 0)[0]:
    click(build[index], .02+.02*speed[index], 2200)
t = clock(DONE-FF)
riser = np.sin(2*np.pi*(110*t+90*t**2))*(t/(DONE-FF))**2
add(riser*.06, FF, 1)
whoosh(FF+BEAT*2, BEAT*2+.02, .28, .1)
# Snare roll accelerates from eighths to thirty-seconds into the drop.
hits = [16, 16.5, 17, 17.5, 18, 18.25, 18.5, 18.75, 19, 19.125, 19.25, 19.375, 19.5, 19.625, 19.75, 19.875]
for i, h in enumerate(hits):
    snare(h*BEAT, .05+.13*i/len(hits))
impact(DONE, .34)
for idx, note in enumerate([84, 89, 93]):
    add(bell(note, 1.6, 2.6), DONE+idx*.075, .08, (idx-1)*.3)
add(smooth_noise(1.4, 2)*np.exp(-clock(1.4)*3.2), DONE, .06, .2)
for i in range(12):
    add(bell(96+rng.integers(0, 8), .35, 12), DONE+.05+i*.045, .015, rng.uniform(-.7, .7))

# 03 → 04: the pickup card opens into purple, machines orbit in, the mark lands.
whoosh(CUT3-.46, .5, .26, -.15)
impact(CUT3, .14)
whoosh(CUT3, BEAT+.02, .14, .25)
impact(CUT3+BEAT, .26)
for i, n in enumerate([53, 60, 65, 69, 72, 79]):
    sig = bell(n, 3.2, 1.3)+.4*tone(n, 3.2, 1.2)
    add(sig, CUT3+BEAT+i*.03, .055, (i-2.5)*.15)
for i, at in enumerate([BEAT+.03, BEAT+.11, BEAT+.17]):
    add(bell(96+i*3, .5, 8), CUT3+at, .03, [.4, -.4, .3][i])
whoosh(CUT3+1.0, .45, .07, 0, rise=False)
for i, n in enumerate([84, 88, 91, 96]):
    add(bell(n, .9, 5), CUT3+4*BEAT+.1+i*.12, .025, -.5+i*.33)

mix = np.tanh(mix*1.1)
mix *= .88/max(.01, np.max(np.abs(mix)))
fade = np.minimum(1, np.arange(len(mix))/(RATE*.012))
fade *= np.minimum(1, np.arange(len(mix))[::-1]/(RATE*.55))
mix *= fade[:, None]
dest = Path(__file__).resolve().parent/'soundtrack.wav'
with wave.open(str(dest), 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes((mix*32767).astype('<i2').tobytes())
print('Original score written', dest.name, '15 seconds, stereo 48 kHz, 128 BPM')
