// =====================
// QuePasaApp - chat.js
// Chat UI, message handling, QR code, flash & theme logic
// =====================

const { 
  joinOrCreateRoom, 
  listenUserCount, 
  listenRoomDeleted, 
  deleteRoom, 
  listenMessages, 
  sendMessage 
} = window.qpApp;

let myUserId = null;
let roomId = null;
let isCreator = false;
let otherUserId = null;
let themeIdx = 0;

// High contrast color pairs for theme switching
const THEMES = [
  { bg: "#fff",        bubbleYou: "#2ecc71",  bubbleThem: "#fff",    textYou: "#fff",   textThem: "#2ecc71", borderThem: "#2ecc71" },
  { bg: "#22223b",     bubbleYou: "#c9184a",  bubbleThem: "#fff",    textYou: "#fff",   textThem: "#c9184a", borderThem: "#c9184a" },
  { bg: "#f7f7f7",     bubbleYou: "#3a86ff",  bubbleThem: "#fff",    textYou: "#fff",   textThem: "#3a86ff", borderThem: "#3a86ff" },
  { bg: "#232946",     bubbleYou: "#eebbc3",  bubbleThem: "#232946", textYou: "#232946",textThem: "#eebbc3", borderThem: "#eebbc3" },
  { bg: "#222",        bubbleYou: "#ffbe0b",  bubbleThem: "#fff",    textYou: "#222",   textThem: "#ffbe0b", borderThem: "#ffbe0b" },
  { bg: "#e0fbfc",     bubbleYou: "#293241",  bubbleThem: "#fff",    textYou: "#fff",   textThem: "#293241", borderThem: "#293241" }
];

// DOM elements
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const roomCodeEl = document.getElementById("roomCode");
const qrContainer = document.getElementById("qrContainer");
const exitBtn = document.getElementById("exitBtn");
const flashBtn = document.getElementById("flashBtn");
const themeBtn = document.getElementById("themeBtn");
const flashOverlay = document.getElementById("flashOverlay");

// --- 1. Join/Create Room and initialize ---
(async function() {
  // Join or create a room (from URL or new)
  const join = await joinOrCreateRoom();
  myUserId = join.userId;
  roomId = join.roomId;
  isCreator = join.isCreator;

  // Show room code
  roomCodeEl.textContent = roomId;

  // Show QR code for this room link
  const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: roomUrl,
    width: 98,
    height: 98
  });

  // Show code as text under QR (for easy typing)
  // (already handled in HTML, but could add a <div> if wanted)

  // Listen for room deletion (if other user leaves)
  listenRoomDeleted(roomId, () => {
    // Redirect to exit page
    window.location.href = "exit.html";
  });

  // Listen for users in room
  listenUserCount(roomId, n => {
    // If 0 or >2, or someone leaves, kill room and redirect
    if (n > 2) {
      alert("Room is full. Only 2 people allowed.");
      // Clean up: remove yourself and redirect to exit
      deleteRoom(roomId);
      window.location.href = "exit.html";
    } else if (n === 0) {
      // Room is deleted
      window.location.href = "exit.html";
    }
    // No further action needed for n==1 or n==2
  });

  // Listen for messages
  listenMessages(roomId, msgs => {
    renderMessages(msgs);
  });
})();

// --- 2. Send message on Enter ---
messageInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text.length > 0) {
      sendMessage(roomId, myUserId, text);
      messageInput.value = "";
    }
  }
});

// --- 3. Render messages ---
function renderMessages(msgs) {
  chatArea.innerHTML = "";
  // Determine who "Them" is
  let otherId = null;
  for (const msg of msgs) {
    if (msg.user !== myUserId) {
      otherId = msg.user;
      break;
    }
  }
  otherUserId = otherId;

  msgs.forEach(msg => {
    const isYou = msg.user === myUserId;
    const bubble = document.createElement("div");
    bubble.className = "bubble " + (isYou ? "you" : "them");
    // For accessibility, show "You:" or "Them:" on mobile
    // bubble.textContent = (isYou ? "You: " : "Them: ") + msg.text; // (optional label)
    bubble.textContent = msg.text;

    // Apply dynamic theme styles
    const theme = THEMES[themeIdx];
    if (isYou) {
      bubble.style.background = theme.bubbleYou;
      bubble.style.color = theme.textYou;
    } else {
      bubble.style.background = theme.bubbleThem;
      bubble.style.color = theme.textThem;
      bubble.style.border = `1.5px solid ${theme.borderThem}`;
    }
    chatArea.appendChild(bubble);
  });
  // Scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// --- 4. Exit Button Logic ---
exitBtn.addEventListener("click", function() {
  // Delete room (will kick both users)
  if (roomId) {
    deleteRoom(roomId);
  }
  window.location.href = "exit.html";
});

// --- 5. Flash Mode Logic ---
flashBtn.addEventListener("click", async function() {
  // Sequence: "K PASA" (2s per letter) then room code (2s per char)
  const letters = "K PASA".split("");
  const code = roomId.split("");
  flashOverlay.classList.remove("hide");
  for (let l of letters) {
    flashOverlay.textContent = l;
    await delay(2000);
  }
  await delay(500); // slight pause
  for (let c of code) {
    flashOverlay.textContent = c;
    await delay(2000);
  }
  flashOverlay.classList.add("hide");
  flashOverlay.textContent = "";
});

// Helper: Promise-based delay
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// --- 6. Theme Switcher ---
themeBtn.addEventListener("click", function() {
  themeIdx = (themeIdx + 1) % THEMES.length;
  applyTheme();
  // Re-render chat bubbles to update their colors
  listenMessages(roomId, renderMessages);
});

function applyTheme() {
  const theme = THEMES[themeIdx];
  // Set background
  document.body.style.background = theme.bg + " url('QuePasaLogo.png')";
  document.body.style.backgroundRepeat = "repeat";
  document.body.style.backgroundSize = "160px 160px";
  // Update input border color
  messageInput.style.borderColor = theme.bubbleYou;
  // Update buttons
  flashBtn.style.background = theme.bubbleYou;
  flashBtn.style.color = theme.textYou;
  themeBtn.style.background = theme.bubbleYou;
  themeBtn.style.color = theme.textYou;
  // Exit button (keep red)
}

// --- 7. Prevent accidental leave (optional, for mobile) ---
window.addEventListener("beforeunload", function(e) {
  // Comment this out if you want instant leave with no warning
  e.preventDefault();
  e.returnValue = '';
  // On leave, clean up room
  if (roomId) deleteRoom(roomId);
});
