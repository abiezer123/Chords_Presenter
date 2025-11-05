const keyChords = {
  "C": ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
  "C#": ["C#", "D#m", "Fm", "F#", "G#", "A#m", "Cdim"],
  "D": ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
  "D#": ["D#", "Fm", "Gm", "G#", "A#", "Cm", "Ddim"],
  "E": ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
  "F": ["F", "Gm", "Am", "A#", "C", "Dm", "Edim"],
  "F#": ["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"],
  "G": ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
  "G#": ["G#", "A#m", "Cm", "C#", "D#", "Fm", "Gdim"],
  "A": ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
  "A#": ["A#", "Cm", "Dm", "D#", "F", "Gm", "Adim"],
  "B": ["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"]
};

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const socket = io();

// Helper: transpose chord up/down by semitones
function transposeChord(chord, semitoneChange) {
  const match = chord.match(/^([A-G]#?)(.*)$/);
  if (!match) return chord;
  const root = match[1];
  const suffix = match[2];
  const index = notes.indexOf(root);
  if (index === -1) return chord;
  const newIndex = (index + semitoneChange + notes.length) % notes.length;
  return notes[newIndex] + suffix;
}

// ---------------- Presenter ----------------
function setupPresenter() {
  const chordDisplay = document.getElementById("chordDisplay");
  const keySelect = document.getElementById("keySelect");

  let currentChord = "";
  let currentDegree = "";
  let semitoneOffset = 0;
  let accidental = "";

  function updateDisplay() {
    const key = keySelect.value;
    const text = `${currentDegree}${accidental ? accidental : ""} → ${currentChord}`;
    chordDisplay.textContent = text;

    socket.emit("chord-change", {
      degree: `${currentDegree}${accidental}`,
      chord: currentChord,
      key: key
    });
  }

  // --- Mouse button clicks (1–7 buttons) ---
  document.querySelectorAll("button[data-num]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = keySelect.value;
      const num = parseInt(btn.dataset.num);
      currentDegree = num;
      semitoneOffset = 0;
      accidental = "";
      currentChord = keyChords[key][num - 1];
      updateDisplay();
    });
  });

  // --- Sharp and flat buttons ---
  document.getElementById("sharp").addEventListener("click", applySharp);
  document.getElementById("flat").addEventListener("click", applyFlat);

  function applySharp() {
    if (currentChord) {
      currentChord = transposeChord(currentChord, +1);
      semitoneOffset += 1;
      accidental = semitoneOffset > 0 ? "♯".repeat(semitoneOffset) : "";
      updateDisplay();
    }
  }

  function applyFlat() {
    if (currentChord) {
      currentChord = transposeChord(currentChord, -1);
      semitoneOffset -= 1;
      accidental = semitoneOffset < 0 ? "♭".repeat(Math.abs(semitoneOffset)) : "";
      updateDisplay();
    }
  }

  // --- Handle key change ---
  keySelect.addEventListener("change", () => {
    const newKey = keySelect.value;

    // If we already have a selected degree (1–7)
    if (currentDegree) {
      const num = parseInt(currentDegree);
      currentChord = keyChords[newKey][num - 1];

      // Apply previous accidental transposition
      if (semitoneOffset !== 0) {
        currentChord = transposeChord(currentChord, semitoneOffset);
      }
      updateDisplay();
    } else {
      // Just update the key for audience if no chord is selected
      socket.emit("chord-change", { key: newKey });
    }
  });

  // --- 🎹 Keyboard shortcuts ---
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    // Numbers 1–7 select chord degrees
    if (key >= "1" && key <= "7") {
      const num = parseInt(key);
      const scaleKey = keySelect.value;
      currentDegree = num;
      semitoneOffset = 0;
      accidental = "";
      currentChord = keyChords[scaleKey][num - 1];
      updateDisplay();
    }

    // Q for flat (♭)
    if (key === "q") {
      applyFlat();
    }

    // W for sharp (♯)
    if (key === "w") {
      applySharp();
    }
  });
}


// ---------------- Audience ----------------
function setupAudience() {
  const audienceChord = document.getElementById("audienceChord");
  const audienceKey = document.getElementById("audienceKey");

  socket.on("update-chord", (data) => {
    if (data.key) audienceKey.textContent = `Key: ${data.key}`;
    if (data.chord && data.degree)
      audienceChord.textContent = `${data.degree} → ${data.chord}`;
  });
}
