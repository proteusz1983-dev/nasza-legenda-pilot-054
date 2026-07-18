'use strict';

const APP_VERSION = '0.5.4-pilot-audiofix';
const EPISODE_ROOT = './episodes/signal-spoza-czasu/';
const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');

const state = {
  team: 'Nowakowie',
  participants: ['Ania', 'Michał'],
  startedAt: null,
  endedAt: null,
  item: '',
  itemTrait: 'unknown',
  taskTimedOut: false,
  taskSecondsLeft: 0,
  choice: '',
  firstChoice: '',
  finalChoice: '',
  path: '',
  lightSuccess: false,
  choices: [],
  taskResults: {},
  sound: true,
  subtitles: true,
  voiceMode: 'device',
  elevenLabsPack: false,
  voiceTested: false,
  voiceAssignments: {},
  events: []
};

const ROLE_PROFILES = {
  narrator: {
    label: 'Narrator',
    rate: 0.92,
    pitch: 0.96,
    prefer: [/marek/i, /adam/i, /male/i, /męsk/i, /polish/i]
  },
  chronicler: {
    label: 'Kronikarz',
    rate: 0.84,
    pitch: 0.82,
    prefer: [/marek/i, /adam/i, /krzysztof/i, /male/i, /męsk/i]
  },
  archivist: {
    label: 'Archiwistka',
    rate: 0.98,
    pitch: 1.04,
    prefer: [/zofia/i, /paulina/i, /agnieszka/i, /female/i, /kobiet/i]
  },
  shadow: {
    label: 'Cień',
    rate: 0.72,
    pitch: 0.56,
    prefer: [/marek/i, /adam/i, /male/i, /męsk/i]
  },
  future: {
    label: 'Głos z przyszłości',
    rate: 0.88,
    pitch: 0.93,
    prefer: [/zofia/i, /paulina/i, /female/i, /kobiet/i, /polish/i]
  }
};

let episode;
let graph;
let video;
let overlay;
let subtitle;
let stageBg;
let currentNodeId = '';
let activeTimer = null;
let activeDialogueAudio = null;
let speechToken = 0;
let voices = [];
let assetsReady = false;
const blobCache = new Map();

function log(type, data = {}) {
  state.events.push({ at: new Date().toISOString(), type, ...data });
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Nie można pobrać ${url}`);
  return response.json();
}

async function assetURL(relative) {
  const url = EPISODE_ROOT + relative;
  if (blobCache.has(url)) return blobCache.get(url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    blobCache.set(url, objectUrl);
    return objectUrl;
  } catch (error) {
    console.warn('Fallback asset URL:', url, error);
    return url;
  }
}

function allAssets() {
  const files = new Set();
  Object.values(graph.nodes).forEach(node => {
    if (node.src) files.add(node.src);
    if (node.poster) files.add(node.poster);
    if (node.dialogueAudio) files.add(node.dialogueAudio);
    for (const line of node.dialogue || []) if (line.audio) files.add(line.audio);
  });
  return [...files];
}

function spokenNodes() {
  return Object.entries(graph?.nodes || {}).filter(([, node]) => Array.isArray(node.dialogue) && node.dialogue.length);
}

function audioPackStats() {
  const spoken = spokenNodes();
  const ready = spoken.filter(([, node]) => Boolean(node.dialogueAudio));
  return { total: spoken.length, ready: ready.length, missing: spoken.length - ready.length };
}

function hasElevenLabsPack() {
  return audioPackStats().ready > 0;
}

function roughCaptionTimeline(lines = []) {
  const active = lines.filter(line => String(line.text || '').trim());
  const weights = active.map(line => Math.max(1, String(line.text || '').trim().split(/\s+/).length + 0.8));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const totalSeconds = Math.max(2.5, weights.reduce((sum, w) => sum + w * 0.42, 0));
  let cursor = 0;
  return active.map((line, index) => {
    const span = totalSeconds * weights[index] / totalWeight;
    const cue = {
      speaker: line.speaker || 'narrator',
      text: String(line.text || '').trim(),
      start: Number(cursor.toFixed(3)),
      end: Number(Math.max(cursor + 0.2, cursor + span - 0.05).toFixed(3))
    };
    cursor += span;
    return cue;
  });
}

async function attachDiscoveredDialogueAudio() {
  const entries = spokenNodes();
  let attached = 0;
  for (const [nodeId, node] of entries) {
    if (node.dialogueAudio) {
      attached += 1;
      continue;
    }
    const relative = `audio/elevenlabs/${nodeId}.mp3`;
    try {
      const response = await fetch(EPISODE_ROOT + relative + `?audiofix=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store'
      });
      if (!response.ok) continue;
      node.dialogueAudio = relative;
      if (!Array.isArray(node.captionTimeline) || !node.captionTimeline.length) {
        node.captionTimeline = roughCaptionTimeline(node.dialogue || []);
      }
      node.dialogueProvider = 'ElevenLabs v3 Dialogue';
      attached += 1;
    } catch (_) {
      // Brak pojedynczego MP3 nie blokuje pozostałych scen.
    }
  }
  graph.voicePack = graph.voicePack || {};
  graph.voicePack.ready = attached === entries.length;
  graph.voicePack.partialReady = attached > 0;
  graph.voicePack.generatedCount = attached;
  graph.voicePack.totalCount = entries.length;
  return { ready: attached, total: entries.length, missing: entries.length - attached };
}

async function preloadAll(onProgress) {
  const files = allAssets();
  const total = files.length;
  let done = 0;
  const workers = Array.from({ length: Math.min(3, Math.max(1, total)) }, async () => {
    while (files.length) {
      const file = files.shift();
      await assetURL(file);
      done += 1;
      onProgress?.(done, total);
    }
  });
  await Promise.all(workers);
}

function participantFields(count, existing = []) {
  return Array.from({ length: count }, (_, index) => {
    const value = existing[index] || ['Ania', 'Michał', 'Ola', 'Tomek', 'Ewa', 'Szymon'][index] || '';
    return `<div class="field"><label for="p${index}">Osoba ${index + 1}</label><input id="p${index}" maxlength="24" value="${escapeHTML(value)}" required></div>`;
  }).join('');
}

function polishVoices() {
  return voices.filter(v => /^pl([_-]|$)/i.test(v.lang || ''));
}

function voiceScore(voice, role) {
  const profile = ROLE_PROFILES[role];
  let score = 0;
  if (/^pl([_-]|$)/i.test(voice.lang || '')) score += 100;
  if (/natural|neural|online|google|microsoft/i.test(voice.name || '')) score += 18;
  profile.prefer.forEach((pattern, index) => {
    if (pattern.test(voice.name || '')) score += 16 - index;
  });
  if (voice.localService === false) score += 4;
  return score;
}

function chooseVoice(role, excluded = []) {
  const polish = polishVoices();
  const pool = polish.filter(v => !excluded.includes(v.voiceURI));
  const candidates = pool.length ? pool : polish;
  return [...candidates].sort((a, b) => voiceScore(b, role) - voiceScore(a, role))[0] || null;
}

function assignDefaultVoices() {
  const used = [];
  for (const role of ['chronicler', 'archivist', 'shadow', 'future', 'narrator']) {
    const selected = chooseVoice(role, used);
    if (selected) {
      state.voiceAssignments[role] = selected.voiceURI;
      if (polishVoices().length >= 3 && role !== 'shadow') used.push(selected.voiceURI);
    }
  }
}

function selectedVoice(role) {
  const uri = state.voiceAssignments[role];
  return voices.find(v => v.voiceURI === uri) || chooseVoice(role);
}

function voiceOptions(selectedUri) {
  const list = polishVoices();
  if (!list.length) return '<option value="">Brak głosów urządzenia</option>';
  return list.map(v => `<option value="${escapeHTML(v.voiceURI)}" ${v.voiceURI === selectedUri ? 'selected' : ''}>${escapeHTML(v.name)} · ${escapeHTML(v.lang || '')}</option>`).join('');
}

async function loadVoices(timeoutMs = 3000) {
  if (!('speechSynthesis' in window)) return [];
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    voices = speechSynthesis.getVoices();
    if (voices.length) break;
    await wait(120);
  }
  if (!voices.length) voices = speechSynthesis.getVoices();
  return voices;
}

function renderVoiceCast() {
  const host = document.querySelector('#voiceCast');
  if (!host) return;

  if (hasElevenLabsPack()) {
    state.voiceMode = 'elevenlabs-v3-dialogue-partial';
    state.voiceTested = true;
    state.elevenLabsPack = true;
    const stats = audioPackStats();
    const cast = graph.voicePack?.cast || {};
    const castList = Object.entries(cast).map(([role, name]) => `<li><strong>${escapeHTML(ROLE_PROFILES[role]?.label || role)}:</strong> ${escapeHTML(name)}</li>`).join('');
    host.innerHTML = `
      <div class="voice-ready">
        <div class="voice-ready-title">ELEVENLABS AKTYWNY · ${stats.ready}/${stats.total} SCEN</div>
        <p>${stats.missing ? `Jedna scena nie ma nagrania. Zostanie pokazana z napisami bez robotycznego lektora. Pozostałe ${stats.ready} scen użyją ElevenLabs.` : 'Wszystkie dialogi użyją naturalnych nagrań ElevenLabs.'}</p>
        ${castList ? `<ul class="cast-list">${castList}</ul>` : ''}
        <button id="testPack" class="voice-test">ODSŁUCHAJ FRAGMENT OBSADY</button>
        <div id="voiceStatus" class="voice-status">Nagrania są wykrywane bezpośrednio z folderu audio.</div>
      </div>`;
    document.querySelector('#testPack').addEventListener('click', previewElevenLabsPack);
    updateStartAvailability();
    return;
  }

  state.elevenLabsPack = false;
  const supported = 'speechSynthesis' in window && polishVoices().length > 0;
  if (!supported) {
    host.innerHTML = `
      <div class="voice-warning">
        Na tym urządzeniu nie znaleziono polskiego głosu. Możesz uruchomić wersję z napisami, ale przed testem jakości głosu użyj Chrome na telefonie lub komputerze z zainstalowanym polskim głosem.
      </div>
      <button id="textMode" class="secondary full">URUCHOM TRYB Z NAPISAMI</button>`;
    document.querySelector('#textMode').addEventListener('click', () => {
      state.voiceMode = 'text';
      state.voiceTested = true;
      updateStartAvailability();
      const status = document.querySelector('#voiceStatus');
      if (status) status.textContent = 'Tryb z napisami — bez syntezy głosu.';
    });
    return;
  }

  host.innerHTML = `
    <details class="voice-details" open>
      <summary>Obsada głosowa urządzenia</summary>
      <p class="voice-help">Wybierz głosy. Różne role mają również inne tempo i wysokość, aby dialog był czytelny.</p>
      <div class="voice-grid">
        ${['chronicler','archivist','shadow','future'].map(role => `
          <div class="voice-field">
            <label for="voice-${role}">${ROLE_PROFILES[role].label}</label>
            <select id="voice-${role}" data-role="${role}">${voiceOptions(state.voiceAssignments[role])}</select>
          </div>`).join('')}
      </div>
      <div class="voice-actions">
        <button id="testCast" class="voice-test">ODSŁUCHAJ OBSADĘ</button>
        <button id="autoCast" class="secondary">DOBIERZ AUTOMATYCZNIE</button>
      </div>
      <div id="voiceStatus" class="voice-status">Przed startem odsłuchaj próbkę. To odblokuje dźwięk na telefonie.</div>
    </details>`;

  host.querySelectorAll('[data-role]').forEach(select => {
    select.addEventListener('change', () => {
      state.voiceAssignments[select.dataset.role] = select.value;
      state.voiceTested = false;
      updateStartAvailability();
      document.querySelector('#voiceStatus').textContent = 'Zmieniono obsadę — odsłuchaj próbkę ponownie.';
    });
  });

  document.querySelector('#autoCast').addEventListener('click', () => {
    assignDefaultVoices();
    renderVoiceCast();
    state.voiceTested = false;
    updateStartAvailability();
  });

  document.querySelector('#testCast').addEventListener('click', testVoiceCast);
}

async function previewElevenLabsPack() {
  const previewEntry = spokenNodes().find(([, node]) => node.dialogueAudio);
  const intro = previewEntry?.[1];
  if (!intro?.dialogueAudio) return toast('Nie znaleziono żadnego nagrania ElevenLabs.');
  const button = document.querySelector('#testPack');
  const status = document.querySelector('#voiceStatus');
  if (button) button.disabled = true;
  if (status) status.textContent = 'Odtwarzam fragment dialogu…';
  stopSpeech();
  try {
    const src = await assetURL(intro.dialogueAudio);
    const audio = new Audio(src);
    activeDialogueAudio = audio;
    audio.volume = 1;
    await audio.play();
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 15000);
      audio.onended = () => { clearTimeout(timer); resolve(); };
      audio.onerror = () => { clearTimeout(timer); resolve(); };
    });
  } catch (error) {
    console.warn(error);
    toast('Nie udało się odtworzyć próbki.');
  } finally {
    if (activeDialogueAudio) {
      activeDialogueAudio.pause();
      activeDialogueAudio = null;
    }
    if (button) button.disabled = false;
    if (status) status.textContent = 'Pakiet ElevenLabs v3 jest aktywny.';
  }
}

async function testVoiceCast() {
  const button = document.querySelector('#testCast');
  const status = document.querySelector('#voiceStatus');
  if (button) button.disabled = true;
  if (status) status.textContent = 'Odtwarzam cztery krótkie próbki…';
  state.voiceMode = 'device';
  stopSpeech();
  const samples = [
    { speaker: 'chronicler', text: 'Słyszycie mnie? Tu Kronikarz. Sygnał dotarł.' },
    { speaker: 'archivist', text: 'Połączenie stabilne. Rozpoznaję waszą drużynę.' },
    { speaker: 'shadow', text: 'Nie wszystko, co mówi Kronikarz, jest prawdą.' },
    { speaker: 'future', text: 'Jestem po drugiej stronie. Nie zostało wiele czasu.' }
  ];
  for (const line of samples) {
    await speakLine(line, { preview: true });
    await wait(180);
  }
  state.voiceTested = true;
  if (button) button.disabled = false;
  if (status) status.textContent = 'Obsada sprawdzona. Głos zostanie uruchomiony od pierwszej sceny.';
  updateStartAvailability();
}

function renderSetup() {
  app.innerHTML = `
    <section class="setup">
      <div class="setup-card">
        <div class="brand">
          <img src="./logo.svg" alt="">
          <div><div class="brand-kicker">Interaktywny serial · etap ${APP_VERSION}</div><h1>Nasza Legenda</h1></div>
        </div>
        <p class="setup-copy">Pilot odcinka <strong>„Sygnał spoza czasu”</strong>: dwie próby, dwie decyzje i różne zakończenia. Dialogi ElevenLabs v3 oraz napisy można włączać i wyłączać.</p>
        <div class="field"><label for="team">Nazwa grupy lub rodziny</label><input id="team" maxlength="40" value="${escapeHTML(state.team)}"></div>
        <div class="field"><label for="count">Liczba uczestników</label><select id="count">${[2,3,4,5,6].map(n => `<option value="${n}" ${n===state.participants.length?'selected':''}>${n} ${n===2?'osoby':'osób'}</option>`).join('')}</select></div>
        <div id="people" class="people">${participantFields(state.participants.length, state.participants)}</div>
        <div id="voiceCast" class="voice-cast"></div>
        <button id="start" class="primary" disabled>PRZYGOTOWUJĘ ODCINEK…</button>
        <div id="loadState" class="load-state">Pobieranie scen filmowych 0%</div>
        <div class="version">PILOT DO TESTÓW · ${APP_VERSION}</div>
      </div>
    </section>`;

  const count = document.querySelector('#count');
  const people = document.querySelector('#people');
  count.addEventListener('change', () => {
    const old = [...people.querySelectorAll('input')].map(i => i.value);
    people.innerHTML = participantFields(Number(count.value), old);
  });

  document.querySelector('#start').addEventListener('click', startEpisode);
  renderVoiceCast();

  preloadAll((done, total) => {
    const pct = total ? Math.round(done / total * 100) : 100;
    const el = document.querySelector('#loadState');
    if (el) el.textContent = `Pobieranie scen filmowych ${pct}%`;
  }).then(() => {
    assetsReady = true;
    const el = document.querySelector('#loadState');
    if (el) el.textContent = 'Odcinek gotowy — wszystkie dalsze klipy są już w pamięci.';
    updateStartAvailability();
  }).catch(error => {
    console.error(error);
    assetsReady = true;
    const el = document.querySelector('#loadState');
    if (el) el.textContent = 'Nie wszystkie sceny pobrano. Możesz uruchomić, ale sprawdź połączenie.';
    updateStartAvailability();
  });
}

function updateStartAvailability() {
  const start = document.querySelector('#start');
  if (!start) return;
  const ready = assetsReady && state.voiceTested;
  start.disabled = !ready;
  if (!assetsReady) start.textContent = 'PRZYGOTOWUJĘ ODCINEK…';
  else if (!state.voiceTested) start.textContent = 'NAJPIERW ODSŁUCHAJ GŁOSY';
  else start.textContent = 'WEJDŹ DO KRONIKI';
}

async function startEpisode() {
  const names = [...document.querySelectorAll('#people input')].map(i => i.value.trim()).filter(Boolean);
  if (names.length < 2) return toast('Wpisz imiona minimum dwóch osób.');
  state.team = document.querySelector('#team').value.trim() || 'Drużyna';
  state.participants = names;
  state.startedAt = new Date().toISOString();
  state.events = [];
  log('episode_start', {
    team: state.team,
    participants: state.participants,
    voiceMode: state.voiceMode,
    voices: state.elevenLabsPack
      ? (graph.voicePack?.cast || {})
      : Object.fromEntries(Object.entries(state.voiceAssignments).map(([role, uri]) => [role, voices.find(v => v.voiceURI === uri)?.name || uri]))
  });
  renderPlayer();
  try { await document.documentElement.requestFullscreen?.(); } catch (_) {}
  playNode(graph.start);
}

function renderPlayer() {
  app.innerHTML = `
    <section class="player">
      <div id="stageBg" class="stage-bg"></div>
      <video id="stageVideo" class="stage-video" playsinline preload="auto" loop></video>
      <div class="cinema-shade"></div>
      <div class="topbar">
        <div class="mark"><img src="./logo.svg" alt=""><div><b>NASZA LEGENDA</b><small>${escapeHTML(state.team)} · ${state.participants.map(escapeHTML).join(', ')}</small></div></div>
        <div class="player-controls"><button id="replayScene" class="sound" aria-label="Powtórz scenę">↻</button><button id="captions" class="sound active" aria-label="Włącz lub wyłącz napisy">CC</button><button id="sound" class="sound" aria-label="Wycisz lub włącz dźwięk">🔊</button></div>
      </div>
      <div id="subtitle" class="subtitle"></div>
      <div id="overlay" class="overlay hidden"></div>
    </section>`;
  video = document.querySelector('#stageVideo');
  overlay = document.querySelector('#overlay');
  subtitle = document.querySelector('#subtitle');
  stageBg = document.querySelector('#stageBg');
  document.querySelector('#sound').addEventListener('click', event => {
    state.sound = !state.sound;
    video.muted = !state.sound;
    if (!state.sound) stopSpeech();
    event.currentTarget.textContent = state.sound ? '🔊' : '🔇';
  });
  document.querySelector('#captions').addEventListener('click', event => {
    state.subtitles = !state.subtitles;
    event.currentTarget.classList.toggle('active', state.subtitles);
    event.currentTarget.textContent = state.subtitles ? 'CC' : 'CC̸';
    if (!state.subtitles && subtitle) subtitle.innerHTML = '';
    log('subtitles_toggle', { enabled: state.subtitles });
  });
  document.querySelector('#replayScene').addEventListener('click', () => playNode(currentNodeId));
  video.addEventListener('error', () => toast('Błąd odtwarzania sceny. Spróbuj ponownie.'));
}

function clearRuntime() {
  if (activeTimer) clearInterval(activeTimer);
  activeTimer = null;
  stopSpeech();
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }
  if (subtitle) subtitle.innerHTML = '';
}

function stopSpeech() {
  speechToken += 1;
  if (activeDialogueAudio) {
    activeDialogueAudio.pause();
    activeDialogueAudio.src = '';
    activeDialogueAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch (_) {}
}

async function playNode(nodeId) {
  clearRuntime();
  currentNodeId = nodeId;
  const node = graph.nodes[nodeId];
  if (!node) throw new Error(`Brak węzła ${nodeId}`);
  log('node_enter', { nodeId, nodeType: node.type });

  if (node.effect) Object.assign(state, node.effect);
  if (node.type === 'video') return playVideoNode(nodeId, node);
  if (node.type === 'task') return playTaskNode(nodeId, node);
  if (node.type === 'choice') return playChoiceNode(nodeId, node);
  if (node.type === 'end') return renderEnd();
}

async function setVideo(node, loop = true) {
  const src = await assetURL(node.src);
  const poster = node.poster ? EPISODE_ROOT + node.poster : '';
  stageBg.style.backgroundImage = poster ? `url('${poster}')` : '';
  video.poster = poster;
  video.loop = loop;
  video.muted = !state.sound;
  video.volume = 0.34;
  if (video.src !== src) {
    video.src = src;
    video.currentTime = 0;
    video.load();
  }
  try { await video.play(); }
  catch (error) {
    console.warn(error);
    showTapToPlay(() => video.play());
  }
}

function showTapToPlay(action) {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="panel"><div class="eyebrow">TELEFON WSTRZYMAŁ ODTWARZANIE</div><h2>Dotknij, aby kontynuować</h2><button class="task-button" id="tapPlay">ODTWÓRZ SCENĘ</button></div>`;
  document.querySelector('#tapPlay').addEventListener('click', async () => {
    overlay.classList.add('hidden');
    await action();
  }, { once: true });
}

function setSubtitle(speaker, text) {
  if (!subtitle || !state.subtitles) return;
  if (!text) {
    subtitle.innerHTML = '';
    return;
  }
  const role = ROLE_PROFILES[speaker] || { label: speaker || '' };
  subtitle.innerHTML = `<span class="speaker">${escapeHTML(role.label)}</span><span>${escapeHTML(personalize(text))}</span>`;
}

async function playDialogueAudio(relative, text, speaker, token) {
  const src = await assetURL(relative);
  if (token !== speechToken) return;
  return new Promise(resolve => {
    const audio = new Audio(src);
    activeDialogueAudio = audio;
    audio.volume = state.sound ? 1 : 0;
    audio.onended = resolve;
    audio.onerror = resolve;
    setSubtitle(speaker, text);
    audio.play().catch(resolve);
  });
}

async function speakLine(line, options = {}) {
  const token = speechToken;
  const text = personalize(line.text || '');
  const speaker = line.speaker || 'narrator';
  const profile = ROLE_PROFILES[speaker] || ROLE_PROFILES.narrator;
  if (!options.preview) setSubtitle(speaker, text);
  if (line.audio && state.sound) return playDialogueAudio(line.audio, text, speaker, token);

  const fallbackMs = Math.max(1200, Math.min(8500, 500 + text.split(/\s+/).length * 360));
  if (!state.sound || state.voiceMode === 'text' || !('speechSynthesis' in window)) {
    await wait(fallbackMs);
    return;
  }

  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectedVoice(speaker);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'pl-PL';
    utterance.rate = line.rate || profile.rate;
    utterance.pitch = line.pitch || profile.pitch;
    utterance.volume = line.volume || 1;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(heartbeat);
      clearTimeout(watchdog);
      if (video) video.volume = 0.34;
      resolve();
    };

    utterance.onstart = () => {
      if (video) video.volume = 0.16;
      log('voice_line_start', { speaker, voice: voice?.name || 'fallback', text });
    };
    utterance.onend = finish;
    utterance.onerror = event => {
      log('voice_line_error', { speaker, error: event.error || 'unknown' });
      finish();
    };

    const heartbeat = setInterval(() => {
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (_) {}
    }, 1200);
    const watchdog = setTimeout(finish, Math.max(6500, fallbackMs * 2.4));

    try {
      speechSynthesis.speak(utterance);
    } catch (_) {
      finish();
    }
  });
}

async function playDialoguePack(node) {
  const token = speechToken;
  const src = await assetURL(node.dialogueAudio);
  if (token !== speechToken) return;

  return new Promise(resolve => {
    const audio = new Audio(src);
    activeDialogueAudio = audio;
    audio.volume = state.sound ? 1 : 0;
    const timeline = node.captionTimeline || [];
    let activeCaptionIndex = -1;
    let finished = false;

    const updateCaption = () => {
      if (token !== speechToken) return finish(true);
      const now = audio.currentTime;
      const index = timeline.findIndex(cue => now >= cue.start && now < cue.end);
      if (index !== activeCaptionIndex) {
        activeCaptionIndex = index;
        if (index >= 0) {
          const cue = timeline[index];
          setSubtitle(cue.speaker, cue.text);
        } else {
          setSubtitle('', '');
        }
      }
    };

    const finish = (ok = true) => {
      if (finished) return;
      finished = true;
      audio.removeEventListener('timeupdate', updateCaption);
      clearInterval(audio._captionTimer);
      if (activeDialogueAudio === audio) activeDialogueAudio = null;
      if (video) video.volume = 0.34;
      setSubtitle('', '');
      resolve(ok);
    };

    audio.addEventListener('timeupdate', updateCaption);
    audio._captionTimer = setInterval(updateCaption, 80);
    audio.onended = finish;
    audio.onerror = () => {
      log('elevenlabs_audio_error', { nodeId: currentNodeId, src: node.dialogueAudio });
      finish(false);
    };
    if (video) video.volume = 0.10;
    log('elevenlabs_dialogue_start', { nodeId: currentNodeId, src: node.dialogueAudio });
    audio.play().catch(error => {
      console.warn(error);
      finish(false);
    });
  });
}

async function runNodeDialogue(node) {
  if (node.dialogueAudio && state.sound) {
    const ok = await playDialoguePack(node);
    if (ok) return;
    toast('Nagranie ElevenLabs nie zadziałało — scena przejdzie z napisami.');
  }
  if (state.elevenLabsPack) return runDialogueAsSubtitles(node.dialogue || []);
  return runDialogue(node.dialogue || []);
}

async function runDialogueAsSubtitles(lines = []) {
  if (!lines.length) return;
  const token = speechToken;
  for (const line of lines) {
    if (token !== speechToken) return;
    const text = personalize(line.text || '');
    setSubtitle(line.speaker || 'narrator', text);
    const ms = Math.max(1200, Math.min(7000, 450 + text.split(/\s+/).length * 300));
    await wait(ms);
  }
  if (token === speechToken) setSubtitle('', '');
}

async function runDialogue(lines = []) {
  if (!lines.length) return;
  const token = speechToken;
  for (const line of lines) {
    if (token !== speechToken) return;
    if (line.delay) await wait(line.delay);
    if (token !== speechToken) return;
    await speakLine(line);
    if (line.pauseAfter) await wait(line.pauseAfter);
  }
  if (token === speechToken) setSubtitle('', '');
}

async function playVideoNode(nodeId, node) {
  await setVideo(node, true);
  await runNodeDialogue(node);
  if (node.holdAfter) await wait(node.holdAfter);
  if (currentNodeId === nodeId) playNode(node.next);
}

async function playTaskNode(nodeId, node) {
  await setVideo(node, true);
  showTask(nodeId, node);
}

function showTask(nodeId, node) {
  let left = node.timeLimit;
  state.taskSecondsLeft = left;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="panel">
      <div class="eyebrow">${escapeHTML(node.title)}</div>
      <h2>${escapeHTML(node.heading || 'Drużyna musi działać')}</h2>
      <p>${escapeHTML(node.prompt)}</p>
      <div id="timer" class="timer">00:${String(left).padStart(2,'0')}</div>
      <button id="found" class="task-button">${escapeHTML(node.completeLabel)}</button>
      <div class="hint">${escapeHTML(node.hint || 'Wynik tej próby zmieni dalszą scenę.')}</div>
    </div>`;

  activeTimer = setInterval(() => {
    left -= 1;
    state.taskSecondsLeft = Math.max(0, left);
    const timer = document.querySelector('#timer');
    if (timer) timer.textContent = `00:${String(Math.max(0,left)).padStart(2,'0')}`;
    if (left <= 0) {
      clearInterval(activeTimer); activeTimer = null;
      if (nodeId === 'receiverTask') state.taskTimedOut = true;
      if (nodeId === 'lightTask') state.lightSuccess = false;
      state.taskResults[nodeId] = { success: false, secondsLeft: 0 };
      log('task_timeout', { nodeId });
      playNode(node.onTimeout);
    }
  }, 1000);

  document.querySelector('#found').addEventListener('click', () => {
    clearInterval(activeTimer); activeTimer = null;
    state.taskResults[nodeId] = { success: true, secondsLeft: state.taskSecondsLeft };
    if (node.captureItem !== false) return showItemCapture(nodeId, node);
    if (nodeId === 'lightTask') state.lightSuccess = true;
    log('task_complete', { nodeId, secondsLeft: state.taskSecondsLeft });
    playNode(node.onComplete);
  });
}

function showItemCapture(nodeId, node) {
  overlay.innerHTML = `
    <div class="panel">
      <div class="eyebrow">PRZEDMIOT ODNALEZIONY</div>
      <h2>Co znaleźliście?</h2>
      <p>Nazwa przedmiotu zostanie zapisana i wróci w konsekwencji wyboru.</p>
      <div class="capture">
        <div class="capture-row"><input id="itemName" maxlength="40" autocomplete="off" placeholder="np. pilot, telefon, klucze"><button id="mic" title="Powiedz nazwę">🎙️</button></div>
        <button id="confirmItem" class="confirm">POTWIERDŹ PRZEDMIOT</button>
      </div>
    </div>`;
  const input = document.querySelector('#itemName');
  input.focus();
  document.querySelector('#confirmItem').addEventListener('click', () => {
    const item = input.value.trim();
    if (!item) return toast('Wpisz nazwę przedmiotu.');
    state.item = item;
    state.itemTrait = classifyItem(item);
    log('task_complete', { nodeId, item, itemTrait: state.itemTrait, secondsLeft: state.taskSecondsLeft });
    playNode(node.onComplete);
  });
  document.querySelector('#mic').addEventListener('click', () => startRecognition(input));
}

function startRecognition(input) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return toast('Na tym urządzeniu wpisz nazwę ręcznie.');
  const recognition = new Recognition();
  recognition.lang = 'pl-PL';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => { input.value = event.results[0][0].transcript; };
  recognition.onerror = () => toast('Nie udało się rozpoznać głosu.');
  recognition.start();
}

function classifyItem(value) {
  const v = value.toLocaleLowerCase('pl');
  if (/pilot|telefon|głośnik|radio|słuchawk|zegarek|tablet|komputer|laptop/.test(v)) return 'signal';
  if (/klucz|zamek|kłódk|łańcuch|pasek|sznur/.test(v)) return 'secure';
  if (/latark|lamp|światł|świec/.test(v)) return 'light';
  return 'unknown';
}

async function playChoiceNode(nodeId, node) {
  await setVideo(node, true);
  await runNodeDialogue(node);
  if (currentNodeId !== nodeId) return;
  showChoice(nodeId, node);
}

function showChoice(nodeId, node) {
  let left = node.timeLimit;
  let recommended = '';
  if (nodeId === 'messageChoice') {
    recommended = state.itemTrait === 'signal' ? 'listen' : (['secure','light'].includes(state.itemTrait) ? 'secure' : '');
  } else if (nodeId === 'finalChoice') {
    recommended = state.lightSuccess ? (state.firstChoice === 'listen' ? 'send' : 'close') : 'close';
  }
  const itemLine = nodeId === 'messageChoice'
    ? (state.item ? `<p><strong>${escapeHTML(state.item)}</strong> reaguje na sygnał. Wybierzcie wspólnie.</p>` : '<p>Cień przejął część sygnału. Wybierzcie wspólnie.</p>')
    : `<p>${state.lightSuccess ? 'Próba światła ustabilizowała sygnał.' : 'Sygnał jest niestabilny.'} Ostatnia decyzja należy do całej drużyny.</p>`;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="panel">
      <div class="eyebrow">DECYZJA DRUŻYNY · <span id="choiceTimer">${left}</span> S</div>
      <h2>${escapeHTML(node.title)}</h2>
      ${itemLine}
      <div class="choice-grid">
        ${node.options.map(option => `<button class="choice ${option.id==='secure'||option.id==='close'?'secure':''} ${recommended===option.id?'recommended':''}" data-option="${option.id}">${escapeHTML(option.label)}<span class="choice-caption">${escapeHTML(option.caption || choiceCaption(nodeId, option.id))}</span></button>`).join('')}
      </div>
    </div>`;

  const choose = (id, automatic = false) => {
    const option = node.options.find(o => o.id === id);
    if (!option) return;
    clearInterval(activeTimer); activeTimer = null;
    state.choice = id;
    state.choices.push({ nodeId, choice: id, automatic, at: new Date().toISOString() });
    if (nodeId === 'messageChoice') state.firstChoice = id;
    if (nodeId === 'finalChoice') {
      state.finalChoice = id;
      state.path = id;
    }
    log('choice', { nodeId, choice: id, itemTrait: state.itemTrait, automatic, lightSuccess: state.lightSuccess });
    const nextNode = (nodeId === 'finalChoice' && !state.lightSuccess && option.nextOnFailure) ? option.nextOnFailure : option.next;
    playNode(nextNode);
  };
  overlay.querySelectorAll('[data-option]').forEach(btn => btn.addEventListener('click', () => choose(btn.dataset.option, false)));
  activeTimer = setInterval(() => {
    left -= 1;
    const el = document.querySelector('#choiceTimer'); if (el) el.textContent = Math.max(0,left);
    if (left <= 0) {
      clearInterval(activeTimer); activeTimer = null;
      const auto = recommended || node.options[0].id;
      choose(auto, true);
    }
  }, 1000);
}

function choiceCaption(nodeId, id) {
  if (nodeId === 'messageChoice') {
    if (id === 'listen') return state.itemTrait === 'signal' ? 'Wasz przedmiot wzmacnia ten wybór' : 'Poznacie treść, ale otworzycie drogę Cieniowi';
    return ['secure','light'].includes(state.itemTrait) ? 'Wasz przedmiot wzmacnia zabezpieczenie' : 'Zamkniecie drogę, ale utracicie część wiadomości';
  }
  if (id === 'send') return 'Ostrzeżecie samych siebie, ale podtrzymacie pętlę';
  return 'Przerwiecie połączenie, nie wiedząc, kto został po drugiej stronie';
}

function renderEnd() {
  clearRuntime();
  state.endedAt = new Date().toISOString();
  log('episode_end', { path: state.path, firstChoice: state.firstChoice, finalChoice: state.finalChoice });
  video?.pause();
  const endings = {
    send: {
      title: 'Wiadomość została wysłana',
      text: 'Ostrzeżenie dotarło do jutra. Odpowiedź potwierdziła jednak, że w przyszłości brakuje jednej osoby z waszej drużyny.'
    },
    close: {
      title: 'Pętla została zamknięta',
      text: 'Portal zgasł, ale Cień zdążył przejść na waszą stronę. Teraz nie wiadomo, w którym przedmiocie się ukrył.'
    },
    shadow: {
      title: 'Cień wybrał za was',
      text: 'Druga próba zakończyła się za późno. Cień przejął sygnał i zapisał nazwę waszej drużyny w swojej części Kroniki.'
    },
    closeDamaged: {
      title: 'Pętla została zamknięta tylko częściowo',
      text: 'Połączenie zgasło, ale Cień pozostał wewnątrz znalezionego odbiornika.'
    }
  };
  const ending = endings[state.path] || endings.shadow;
  app.innerHTML = `
    <section class="end"><div class="end-card">
      <div class="eyebrow">KONIEC PILOTA ${APP_VERSION}</div>
      <h2>${escapeHTML(ending.title)}</h2>
      <p>${escapeHTML(ending.text)}</p>
      <div class="summary">
        <strong>Drużyna:</strong> ${escapeHTML(state.team)}<br>
        <strong>Uczestnicy:</strong> ${state.participants.map(escapeHTML).join(', ')}<br>
        <strong>Odbiornik:</strong> ${escapeHTML(state.item || 'nie odnaleziono')}<br>
        <strong>Pierwsza decyzja:</strong> ${escapeHTML(state.firstChoice || 'brak')}<br>
        <strong>Próba światła:</strong> ${state.lightSuccess ? 'sukces' : 'niepowodzenie'}<br>
        <strong>Finał:</strong> ${escapeHTML(state.path || 'shadow')}
      </div>
      <div class="pilot-feedback">
        <label>Czy czułeś, że oglądasz interaktywny serial?<select id="serialFeeling"><option value="">Wybierz</option><option value="tak">Tak</option><option value="troche">Trochę</option><option value="nie">Nie</option></select></label>
        <label>Czy historia była zrozumiała?<select id="understood"><option value="">Wybierz</option><option value="tak">Tak</option><option value="czesciowo">Częściowo</option><option value="nie">Nie</option></select></label>
        <label>Czy zagrasz w następny odcinek?<select id="wantNext"><option value="">Wybierz</option><option value="tak">Tak</option><option value="moze">Może</option><option value="nie">Nie</option></select></label>
        <label>Największy problem lub najlepszy moment<textarea id="comment" maxlength="300" placeholder="Jedno szczere zdanie"></textarea></label>
      </div>
      <div class="end-actions"><button id="replay" class="secondary">ZAGRAJ PONOWNIE</button><button id="download" class="primary">POBIERZ WYNIK TESTU</button></div>
    </div></section>`;
  document.querySelector('#replay').addEventListener('click', () => location.reload());
  document.querySelector('#download').addEventListener('click', downloadResult);
}

function personalize(text) {
  const first = state.participants[0] || 'pierwsza osoba';
  const last = state.participants[state.participants.length - 1] || first;
  return String(text)
    .replaceAll('{team}', state.team)
    .replaceAll('{names}', state.participants.join(', '))
    .replaceAll('{first}', first)
    .replaceAll('{last}', last)
    .replaceAll('{item}', state.item || 'przedmiot');
}

function downloadResult() {
  const feedback = {
    serialFeeling: document.querySelector('#serialFeeling')?.value || '',
    understood: document.querySelector('#understood')?.value || '',
    wantNext: document.querySelector('#wantNext')?.value || '',
    comment: document.querySelector('#comment')?.value.trim() || ''
  };
  const data = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    episode: episode.id,
    team: state.team,
    participants: state.participants,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    item: state.item,
    itemTrait: state.itemTrait,
    firstChoice: state.firstChoice,
    finalChoice: state.finalChoice,
    ending: state.path,
    lightSuccess: state.lightSuccess,
    choices: state.choices,
    taskResults: state.taskResults,
    subtitlesEnabledAtEnd: state.subtitles,
    voiceMode: state.voiceMode,
    voiceAssignments: state.elevenLabsPack
      ? (graph.voicePack?.cast || {})
      : Object.fromEntries(Object.entries(state.voiceAssignments).map(([role, uri]) => [role, voices.find(v => v.voiceURI === uri)?.name || uri])),
    feedback,
    events: state.events
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wynik-pilot-nasza-legenda-054-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

async function prepareLocalFreshStart() {
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!isLocal) return false;
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Nie udało się wyczyścić lokalnego cache:', error);
  }
  return true;
}

async function boot() {
  try {
    const isLocal = await prepareLocalFreshStart();
    episode = await fetchJSON(EPISODE_ROOT + 'manifest.json');
    graph = await fetchJSON(EPISODE_ROOT + episode.graph);
    const requiredPilotNodes = ['lightTask','finalChoice','sendEnding','closeEnding','shadowEnding','closeDamagedEnding'];
    const missingPilotNodes = requiredPilotNodes.filter(id => !graph?.nodes?.[id]);
    if (missingPilotNodes.length) {
      throw new Error('URUCHOMIONO STARY GRAF. Brakuje: ' + missingPilotNodes.join(', '));
    }
    await attachDiscoveredDialogueAudio();
    if (!hasElevenLabsPack()) {
      await loadVoices();
      assignDefaultVoices();
    }
    renderSetup();
    if (!hasElevenLabsPack() && 'speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = () => {
        const refreshed = speechSynthesis.getVoices();
        if (!refreshed.length) return;
        voices = refreshed;
        if (!state.voiceTested && document.querySelector('#voiceCast')) {
          assignDefaultVoices();
          renderVoiceCast();
          updateStartAvailability();
        }
      };
    }
    if (!isLocal && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(console.warn);
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="setup"><div class="setup-card"><h1>Nie uruchomiono pilota 0.5.4</h1><p class="setup-copy">${escapeHTML(error.message || String(error))}</p><p class="setup-copy">Zamknij stary localhost i uruchom plik NAPRAW_I_URUCHOM_PILOTA_054.bat z folderu, w którym są nagrania MP3.</p></div></section>`;
  }
}

boot();
