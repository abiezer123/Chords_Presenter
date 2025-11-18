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
    const text = currentDegree ? `${currentDegree}${accidental} → ${currentChord}` : ""; // <-- empty when 0
    chordDisplay.textContent = text;

    socket.emit("chord-change", {
      degree: currentDegree ? `${currentDegree}${accidental}` : "",
      chord: currentChord,
      key: key
    });
  }

  // --- Mouse button clicks (0–7) ---
  document.querySelectorAll("button[data-num]").forEach(btn => {
    btn.addEventListener("click", () => {
      const num = parseInt(btn.dataset.num);
      if (num === 0) {
        // Clear display completely
        currentDegree = "";
        currentChord = "";
        semitoneOffset = 0;
        accidental = "";
        updateDisplay();
        return;
      }

      const key = keySelect.value;
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
      accidental = "♯".repeat(semitoneOffset);
      updateDisplay();
    }
  }

  function applyFlat() {
    if (currentChord) {
      currentChord = transposeChord(currentChord, -1);
      semitoneOffset -= 1;
      accidental = "♭".repeat(Math.abs(semitoneOffset));
      updateDisplay();
    }
  }

  // --- Handle key change ---
  keySelect.addEventListener("change", () => {
    const newKey = keySelect.value;

    if (currentDegree) {
      const num = parseInt(currentDegree);
      currentChord = keyChords[newKey][num - 1];
      if (semitoneOffset !== 0) {
        currentChord = transposeChord(currentChord, semitoneOffset);
      }
      updateDisplay();
    } else {
      socket.emit("chord-change", { key: newKey });
    }
  });

  // --- Keyboard shortcuts ---
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    // Numbers 1–7
    if (key >= "1" && key <= "7") {
      const num = parseInt(key);
      currentDegree = num;
      semitoneOffset = 0;
      accidental = "";
      currentChord = keyChords[keySelect.value][num - 1];
      updateDisplay();
      return;
    }

    // Space, Enter, or 0 to clear
    if (key === " " || key === "enter" || key === "0") {
      currentDegree = "";
      currentChord = "";
      semitoneOffset = 0;
      accidental = "";
      updateDisplay();
      return;
    }

    if (key === "q") applyFlat();
    if (key === "w") applySharp();
  });


}

// ---------------- Audience ----------------
function setupAudience() {
  const audienceChord = document.getElementById("audienceChord");
  const audienceKey = document.getElementById("audienceKey");

  socket.on("update-chord", (data) => {
    if (data.key) audienceKey.textContent = `Key: ${data.key}`;
    if (!data.chord && !data.degree) {
      audienceChord.textContent = ""; // <-- empty if 0
    } else {
      audienceChord.textContent = `${data.degree} → ${data.chord}`;
    }
  });
}

// ---------------- Initialize ----------------
setupPresenter();
setupAudience();
