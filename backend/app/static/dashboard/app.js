const API_BASE = "/api/v1";
const DEFAULT_PARAKEET_NAME = "Maracuya";

const positiveMoods = ["happy", "relaxed", "neutral"];
const negativeMoods = ["stressed", "scared", "sick"];

const state = {
  mediaRecorder: null,
  chunks: [],
  timerHandle: null,
  startedAt: null,
  parakeetId: null,
  latestResult: null,
};

const elements = {
  recordToggle: document.getElementById("record-toggle"),
  recordStateLabel: document.getElementById("record-state-label"),
  recordHint: document.getElementById("record-hint"),
  stackStatusPill: document.getElementById("stack-status-pill"),
  profileName: document.getElementById("profile-name"),
  recordingTimer: document.getElementById("recording-timer"),
  lastStatus: document.getElementById("last-status"),
  analysisCount: document.getElementById("analysis-count"),
  uploadTrigger: document.getElementById("upload-trigger"),
  audioUpload: document.getElementById("audio-upload"),
  resultCard: document.getElementById("result-card"),
  metricBinaryConfidence: document.getElementById("metric-binary-confidence"),
  metricMood: document.getElementById("metric-mood"),
  metricBirdDetected: document.getElementById("metric-bird-detected"),
  goodScoreFill: document.getElementById("good-score-fill"),
  goodScoreValue: document.getElementById("good-score-value"),
  badScoreFill: document.getElementById("bad-score-fill"),
  badScoreValue: document.getElementById("bad-score-value"),
  resultNote: document.getElementById("result-note"),
  historyList: document.getElementById("history-list"),
  historyTemplate: document.getElementById("history-item-template"),
  refreshHistory: document.getElementById("refresh-history"),
  debugRecordingId: document.getElementById("debug-recording-id"),
  debugModelVersion: document.getElementById("debug-model-version"),
  debugVocalization: document.getElementById("debug-vocalization"),
  debugBirdConfidence: document.getElementById("debug-bird-confidence"),
};

function getGuestIdentity() {
  const guestIdKey = "maracuyai_guest_id";
  const guestSecretKey = "maracuyai_guest_secret";

  let guestId = localStorage.getItem(guestIdKey);
  let guestSecret = localStorage.getItem(guestSecretKey);

  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(guestIdKey, guestId);
  }

  if (!guestSecret || guestSecret.length < 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    guestSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(guestSecretKey, guestSecret);
  }

  return { guestId, guestSecret };
}

async function apiFetch(path, options = {}) {
  const { guestId, guestSecret } = getGuestIdentity();
  const headers = new Headers(options.headers || {});
  headers.set("X-Guest-Id", guestId);
  headers.set("X-Guest-Secret", guestSecret);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function ensureDefaultParakeet() {
  const parakeets = await apiFetch("/parakeets/");
  if (parakeets.length > 0) {
    state.parakeetId = parakeets[0].id;
    elements.profileName.textContent = parakeets[0].name;
    return parakeets[0];
  }

  const created = await apiFetch("/parakeets/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: DEFAULT_PARAKEET_NAME,
      notes: "Auto-created local profile for the Mac microphone dashboard.",
    }),
  });
  state.parakeetId = created.id;
  elements.profileName.textContent = created.name;
  return created;
}

function formatClock(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function chooseMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function classifyBinary(analysis) {
  if (analysis.details?.binary_label) {
    return {
      label: analysis.details.binary_label === "feliz" ? "good" : "bad",
      goodScore: analysis.details.prob_feliz ?? 0,
      badScore: analysis.details.prob_estres ?? 0,
      confidence: Math.max(
        analysis.details.prob_feliz ?? 0,
        analysis.details.prob_estres ?? 0,
        analysis.confidence || 0,
      ),
    };
  }

  const probabilities = analysis.details?.mood_probabilities || {};
  const goodScore = positiveMoods.reduce((sum, label) => sum + (probabilities[label] || 0), 0);
  const badScore = negativeMoods.reduce((sum, label) => sum + (probabilities[label] || 0), 0);

  if (goodScore === 0 && badScore === 0) {
    const fallbackIsBad = negativeMoods.includes(analysis.mood);
    return {
      label: fallbackIsBad ? "bad" : "good",
      goodScore: fallbackIsBad ? 0.35 : 0.65,
      badScore: fallbackIsBad ? 0.65 : 0.35,
      confidence: analysis.confidence || 0,
    };
  }

  const label = badScore > goodScore ? "bad" : "good";
  return {
    label,
    goodScore,
    badScore,
    confidence: Math.max(goodScore, badScore),
  };
}

function updateStatusCard(resultPayload) {
  const { analysis, binary, recording } = resultPayload;
  state.latestResult = resultPayload;

  elements.resultCard.classList.remove("result-card-idle", "result-card-good", "result-card-bad");
  elements.resultCard.classList.add(binary.label === "good" ? "result-card-good" : "result-card-bad");

  const resultLabel = elements.resultCard.querySelector(".result-label");
  const resultTitle = elements.resultCard.querySelector(".result-title");
  const resultCopy = elements.resultCard.querySelector(".result-copy");

  resultLabel.textContent = binary.label.toUpperCase();
  resultTitle.textContent = binary.label === "good" ? "Good" : "Bad";

  const retryNote = analysis.details?.bird_detected === false
    ? " Bird was not detected clearly, so a retry is recommended."
    : "";
  const modelSource = analysis.details?.active_model_backend || analysis.details?.model_version;
  if (analysis.details?.binary_label) {
    resultCopy.textContent = `Binary model: ${analysis.details.binary_label}. Backend mood: ${analysis.mood}.${retryNote}`;
  } else {
    resultCopy.textContent = `Backend mood: ${analysis.mood}. Vocalization: ${analysis.vocalization_type}.${retryNote}`;
  }

  elements.metricBinaryConfidence.textContent = `${Math.round(binary.confidence * 100)}%`;
  elements.metricMood.textContent = analysis.mood;
  elements.metricBirdDetected.textContent = analysis.details?.bird_detected ? "Yes" : "No";

  elements.goodScoreFill.style.width = `${Math.round(binary.goodScore * 100)}%`;
  elements.badScoreFill.style.width = `${Math.round(binary.badScore * 100)}%`;
  elements.goodScoreValue.textContent = `${Math.round(binary.goodScore * 100)}%`;
  elements.badScoreValue.textContent = `${Math.round(binary.badScore * 100)}%`;
  elements.resultNote.textContent = analysis.details?.bird_detected === false
    ? "The model produced a binary answer, but the backend did not clearly detect bird audio. Try moving the phone closer to your Mac microphone."
    : analysis.details?.binary_label
      ? "This result comes from the Maracuya binary CNN provided for the project."
      : "This binary board is derived from the current backend output and is ready for local testing on your Mac.";

  elements.debugRecordingId.textContent = recording.id;
  elements.debugModelVersion.textContent = modelSource || "--";
  elements.debugVocalization.textContent = analysis.vocalization_type;
  elements.debugBirdConfidence.textContent = `${Math.round((analysis.details?.bird_confidence || 0) * 100)}%`;
  elements.lastStatus.textContent = binary.label === "good" ? "Good" : "Bad";
}

async function refreshHistory() {
  if (!state.parakeetId) {
    return;
  }

  const history = await apiFetch(`/analysis/history/${state.parakeetId}?limit=8`);
  elements.analysisCount.textContent = String(history.length);
  elements.historyList.innerHTML = "";

  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">No history yet.</div>';
    return;
  }

  for (const item of history) {
    const binary = classifyBinary(item);
    const fragment = elements.historyTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".history-item");
    const title = fragment.querySelector(".history-title");
    const subtitle = fragment.querySelector(".history-subtitle");
    const meta = fragment.querySelector(".history-meta");

    card.classList.add(binary.label === "good" ? "history-item-good" : "history-item-bad");
    title.textContent = binary.label === "good" ? "Good" : "Bad";
    subtitle.textContent = `${item.mood} · ${item.vocalization_type}`;
    meta.textContent = `${Math.round(binary.confidence * 100)}%`;
    elements.historyList.appendChild(fragment);
  }
}

async function analyzeAudioBlob(blob, filename) {
  elements.stackStatusPill.textContent = "Uploading and analyzing...";
  elements.stackStatusPill.className = "status-pill";

  const formData = new FormData();
  formData.append("file", blob, filename);
  const recording = await apiFetch("/recordings/upload", {
    method: "POST",
    body: formData,
  });

  const analyses = await apiFetch("/analysis/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recording_id: recording.id,
      parakeet_ids: state.parakeetId ? [state.parakeetId] : undefined,
    }),
  });

  const analysis = analyses[0];
  const binary = classifyBinary(analysis);
  updateStatusCard({ analysis, binary, recording });
  await refreshHistory();

  elements.stackStatusPill.textContent = "Local stack ready";
  elements.stackStatusPill.className = "status-pill is-ok";
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = chooseMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  state.mediaRecorder = recorder;
  state.chunks = [];
  state.startedAt = Date.now();
  elements.recordToggle.classList.add("is-recording");
  elements.recordStateLabel.textContent = "Recording now";
  elements.recordHint.textContent = "Play the bird sample near the Mac microphone, then stop.";

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      state.chunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", async () => {
    clearInterval(state.timerHandle);
    elements.recordingTimer.textContent = "00:00";
    elements.recordToggle.classList.remove("is-recording");
    elements.recordStateLabel.textContent = "Processing recording";
    elements.recordHint.textContent = "The local backend is analyzing the audio.";

    const extension = mimeType.includes("mp4") ? "m4a" : "webm";
    const blob = new Blob(state.chunks, { type: mimeType || "audio/webm" });
    stream.getTracks().forEach((track) => track.stop());

    try {
      await analyzeAudioBlob(blob, `maracuya-session.${extension}`);
      elements.recordStateLabel.textContent = "Ready to record";
      elements.recordHint.textContent = "Press again whenever you want another sample run.";
    } catch (error) {
      console.error(error);
      elements.stackStatusPill.textContent = "Analysis failed";
      elements.stackStatusPill.className = "status-pill is-warn";
      elements.resultNote.textContent = error.message || "Analysis failed.";
      elements.recordStateLabel.textContent = "Ready to record";
      elements.recordHint.textContent = "Fix the backend or try again.";
    }
  });

  recorder.start();
  state.timerHandle = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    elements.recordingTimer.textContent = formatClock(elapsed);
  }, 250);
}

function stopRecording() {
  if (!state.mediaRecorder) {
    return;
  }
  state.mediaRecorder.stop();
  state.mediaRecorder = null;
}

async function handleRecordToggle() {
  try {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
      stopRecording();
    } else {
      await startRecording();
    }
  } catch (error) {
    console.error(error);
    elements.stackStatusPill.textContent = "Microphone access failed";
    elements.stackStatusPill.className = "status-pill is-warn";
    elements.resultNote.textContent = error.message || "Unable to access the microphone.";
  }
}

async function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    await analyzeAudioBlob(file, file.name);
  } catch (error) {
    console.error(error);
    elements.stackStatusPill.textContent = "Upload failed";
    elements.stackStatusPill.className = "status-pill is-warn";
    elements.resultNote.textContent = error.message || "Unable to upload the audio file.";
  } finally {
    event.target.value = "";
  }
}

async function bootstrap() {
  try {
    await ensureDefaultParakeet();
    await refreshHistory();
    elements.stackStatusPill.textContent = "Local stack ready";
    elements.stackStatusPill.className = "status-pill is-ok";
  } catch (error) {
    console.error(error);
    elements.stackStatusPill.textContent = "Backend unavailable";
    elements.stackStatusPill.className = "status-pill is-warn";
    elements.resultNote.textContent = "Could not reach the backend. Start the local stack and reload.";
  }
}

elements.recordToggle.addEventListener("click", () => {
  void handleRecordToggle();
});

elements.uploadTrigger.addEventListener("click", () => {
  elements.audioUpload.click();
});

elements.audioUpload.addEventListener("change", (event) => {
  void handleUpload(event);
});

elements.refreshHistory.addEventListener("click", () => {
  void refreshHistory();
});

void bootstrap();
