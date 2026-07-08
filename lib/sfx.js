// Synthesized WebAudio SFX (no audio assets) — HUD power-on, hover blip, click,
// and an ambient hum for the walkthrough modal. Ported 1:1 from the mockup's
// componentDidMount audio block. Returns a controller; call destroy() to unwind.

export function createSfx() {
  let audio = null;
  let hum = null;

  const ensure = () => {
    if (!audio) {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (AC) audio = new AC();
    }
    if (audio && audio.state === "suspended") audio.resume();
    return audio;
  };

  const play = (type) => {
    const ac = ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const master = ac.createGain();
    master.connect(ac.destination);
    const tone = (freq, t0, dur, gain, wave) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = wave || "sine";
      o.frequency.setValueAtTime(freq, now + t0);
      g.gain.setValueAtTime(0, now + t0);
      g.gain.linearRampToValueAtTime(gain, now + t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(now + t0);
      o.stop(now + t0 + dur + 0.02);
    };
    if (type === "open") {
      master.gain.value = 0.28;
      tone(220, 0, 0.5, 0.5, "sine");
      tone(330, 0.06, 0.5, 0.4, "triangle");
      tone(660, 0.12, 0.42, 0.22, "sine");
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(120, now);
      o.frequency.exponentialRampToValueAtTime(880, now + 0.32);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + 0.42);
    } else if (type === "hover") {
      master.gain.value = 0.12;
      tone(880, 0, 0.09, 0.5, "sine");
    } else if (type === "click") {
      master.gain.value = 0.2;
      tone(520, 0, 0.08, 0.5, "square");
      tone(780, 0.05, 0.14, 0.4, "triangle");
    } else if (type === "land") {
      // low thump + noise burst — Spidey touching down on the tracker radar
      master.gain.value = 0.32;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(180, now);
      o.frequency.exponentialRampToValueAtTime(46, now + 0.18);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.6, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + 0.36);
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.22), ac.sampleRate);
      const chd = buf.getChannelData(0);
      for (let i = 0; i < chd.length; i++) chd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / chd.length, 2.5);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const ng = ac.createGain();
      ng.gain.value = 0.18;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1400;
      src.connect(hp);
      hp.connect(ng);
      ng.connect(master);
      src.start(now + 0.02);
    }
  };

  const startHum = () => {
    const ac = ensure();
    if (!ac || hum) return;
    const master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    const now = ac.currentTime;
    master.gain.linearRampToValueAtTime(0.05, now + 0.9);

    const oscs = [];
    [55, 55.4, 110].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = i === 2 ? "sine" : "sawtooth";
      o.frequency.value = f;
      g.gain.value = i === 2 ? 0.35 : 0.6;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 320;
      lp.Q.value = 0.6;
      o.connect(g);
      g.connect(lp);
      lp.connect(master);
      o.start(now);
      oscs.push(o);
    });
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start(now);
    hum = { master, oscs, lfo };
  };

  const stopHum = () => {
    if (!hum || !audio) return;
    const ac = audio;
    const now = ac.currentTime;
    const { master, oscs, lfo } = hum;
    hum = null;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      oscs.forEach((o) => {
        try { o.stop(now + 0.3); } catch (e) {}
      });
      try { lfo.stop(now + 0.3); } catch (e) {}
      setTimeout(() => {
        try { master.disconnect(); } catch (e) {}
      }, 420);
    } catch (_) {}
  };

  const destroy = () => {
    stopHum();
    try { audio && audio.close && audio.close(); } catch (_) {}
    audio = null;
  };

  return { ensure, play, startHum, stopHum, destroy };
}
