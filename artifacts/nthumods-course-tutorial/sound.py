"""Original cheerful C-major tutorial score, 120 BPM, no sampled music."""
from pathlib import Path
import numpy as np
import wave

RATE, DURATION, BEAT = 48000, 26, .5
rng = np.random.default_rng(944)
mix = np.zeros((RATE*DURATION,2),dtype=np.float64)
def clock(length):
    return np.arange(round(length*RATE))/RATE
def add(sig,start,gain=1,pan=0):
    offset=round(start*RATE)
    n=min(len(sig),len(mix)-offset)
    if n<=0:
        return
    angle=(pan+1)*np.pi/4
    mix[offset:offset+n,0]+=sig[:n]*gain*np.cos(angle)
    mix[offset:offset+n,1]+=sig[:n]*gain*np.sin(angle)
def freq(midi):
    return 440*2**((midi-69)/12)
def pluck(midi,length=.7):
    t=clock(length)
    f=freq(midi)
    env=(1-np.exp(-t*480))
    return env*(np.sin(2*np.pi*f*t)*np.exp(-t*7)+.2*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*28)+.04*np.sin(2*np.pi*f*4.9*t)*np.exp(-t*50))
chords=[[48,52,55,59],[53,57,60,64],[45,48,52,55],[43,47,50,55]]
melodies=[[72,76,79,76,81,79,76,74],[77,81,84,81,79,77,76,72],[76,79,81,79,76,72,71,72],[74,79,83,79,76,74,71,67]]
for b in range(52):
    start=b*BEAT
    chord=chords[(b//8)%4]
    # Round bass and soft four-on-the-floor drum pulse.
    if b<49:
        t=clock(.3)
        kick=np.sin(2*np.pi*(48*t+2.0*(1-np.exp(-t*50))))*np.exp(-t*20)*(1-np.exp(-t*1200))
        add(kick,start,.36)
        t=clock(.36)
        bass=(np.sin(2*np.pi*freq(chord[0]-12)*t)+.22*np.sin(2*np.pi*freq(chord[0])*t))*(1-np.exp(-t*180))*np.exp(-t*10)
        add(bass,start+.012,.24)
    if b%2==1 and 3<=b<47:
        t=clock(.15)
        noise=rng.normal(0,1,len(t))
        high=noise-np.convolve(noise,np.ones(20)/20,mode='same')
        clap=high*np.exp(-t*46)+.2*np.sin(2*np.pi*190*t)*np.exp(-t*35)
        add(clap,start,.07,.12)
    if 4<=b<47:
        for sub in [0,.5]:
            t=clock(.065)
            noise=rng.normal(0,1,len(t))
            hat=(noise-np.convolve(noise,np.ones(7)/7,mode='same'))*np.exp(-t*90)
            add(hat,start+sub*BEAT,.026,-.45 if sub else .45)
    # Light offbeat electric keys.
    if b%2==0 and b<48:
        t=clock(.48)
        keys=sum(np.sin(2*np.pi*freq(n+12)*t)+.13*np.sin(2*np.pi*freq(n+24)*t) for n in chord)/4
        keys*=np.exp(-t*8)*(1-np.exp(-t*250))
        add(keys,start+.25,.11,-.3)
    if 1<=b<47:
        melody=melodies[(b//8)%4]
        for j in [0,1]:
            note=melody[(b*2+j)%8]
            # Phrase endings leave air for instructional beats.
            if b%8==7 and j==1:
                continue
            at=start+j*.25
            sig=pluck(note)
            pan=-.3 if j else .3
            add(sig,at,.13 if j==0 else .095,pan)
            add(sig,at+.375,.025,-pan)

# Tactile clicks follow the visual taps without overpowering the music.
for at in [3.1,4.03,4.93,14.2,18.52]:
    t=clock(.085)
    sig=np.sin(2*np.pi*1100*t)*np.exp(-t*85)+.2*rng.normal(0,1,len(t))*np.exp(-t*150)
    add(sig,at,.052)
for at,notes in [(6.25,[76,79]),(14.55,[76,79,84]),(19.48,[72,76,79]),(23.2,[72,76,79,84])]:
    for idx,note in enumerate(notes):
        add(pluck(note,1.2),at+idx*.08,.11,idx*.15-.2)
for at in [2.5,8,12.5,17.5,23]:
    t=clock(.26)
    noise=np.convolve(rng.normal(0,1,len(t)),np.ones(40)/40,mode='same')
    add(noise*np.sin(np.pi*t/.26)**2,at-.13,.12,.1)

# A warm C6/9 resolution for the final brand card.
t=clock(2.65)
for i,n in enumerate([60,64,67,69,74]):
    sig=np.sin(2*np.pi*freq(n)*t)*np.exp(-t*1.7)*(1-np.exp(-t*80))
    add(sig,23.3,.065,(i-2)*.2)
mix=np.tanh(mix*1.15)
mix*=.88/np.max(np.abs(mix))
fade=np.minimum(1,np.arange(len(mix))/(RATE*.015))
fade*=np.minimum(1,np.arange(len(mix))[::-1]/(RATE*.55))
mix*=fade[:,None]
target=Path(__file__).resolve().parent/'soundtrack.wav'
with wave.open(str(target),'wb') as audio:
    audio.setnchannels(2)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes((mix*32767).astype('<i2').tobytes())
print('26-second cheerful original score, stereo 48 kHz, 120 BPM')
