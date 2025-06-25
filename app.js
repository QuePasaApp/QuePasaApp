// =====================
// QuePasaApp - app.js (Enhanced)
// Shared Firebase logic, Room join/leave helpers, Spam Protection, Activity Tracking
// =====================

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDj9I6RI64jHqA0AIhVQtHDshz5vO3s3x8",
  authDomain: "quepasaapp-8c246.firebaseapp.com",
  databaseURL: "https://quepasaapp-8c246-default-rtdb.firebaseio.com/",
  projectId: "quepasaapp-8c246",
  storageBucket: "quepasaapp-8c246.appspot.com",
  messagingSenderId: "578912881109",
  appId: "1:578912881109:web:a076538a2f57e869ced55c"
};

// Initialize Firebase (only once)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- UTILITY: Generate random 6-character room code ---
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- ROOM MANAGEMENT ---

/**
 * Join or create a chat room.
 * - If ?room=CODE is in URL, try to join. Otherwise, create a new room.
 * - Returns: { roomId, isCreator, userId }
 */
async function joinOrCreateRoom() {
  const url = new URL(window.location.href);
  let roomId = url.searchParams.get('room');
  let isCreator = false;

  if (!roomId) {
    // No room specified, create new
    roomId = generateRoomCode();
    isCreator = true;
    await db.ref('rooms/' + roomId).set({
      created: Date.now(),
      lastActive: Date.now(),
      users: {},
      messages: {}
    });
  }

  // Get or generate a unique user ID for the session
  let userId = sessionStorage.getItem('qp_userId');
  if (!userId) {
    userId = 'u_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('qp_userId', userId);
  }

  // Register user in room
  await db.ref(`rooms/${roomId}/users/${userId}`).set({
    joined: Date.now()
  });

  // Remove user from room on disconnect
  db.ref(`rooms/${roomId}/users/${userId}`).onDisconnect().remove();

  return { roomId, isCreator, userId };
}

/**
 * Listen for the number of users in a room
 * @param {string} roomId
 * @param {function} cb - Callback with user count
 */
function listenUserCount(roomId, cb) {
  db.ref(`rooms/${roomId}/users`).on('value', snap => {
    const val = snap.val() || {};
    cb(Object.keys(val).length);
  });
}

/**
 * Listen for room deletion (e.g. to redirect users)
 * @param {string} roomId
 * @param {function} cb - Callback if room is deleted
 */
function listenRoomDeleted(roomId, cb) {
  db.ref(`rooms/${roomId}`).on('value', snap => {
    if (!snap.exists()) cb();
  });
}

/**
 * Remove a room from Firebase
 * @param {string} roomId
 * @returns {Promise}
 */
function deleteRoom(roomId) {
  return db.ref(`rooms/${roomId}`).remove();
}

/**
 * Listen for messages in a room
 * @param {string} roomId
 * @param {function} cb - Callback with messages object
 */
function listenMessages(roomId, cb) {
  db.ref(`rooms/${roomId}/messages`).on('value', snap => {
    cb(snap.val() || {});
  });
}

// --- SPAM PROTECTION: 2 SECOND RATE LIMIT ---
let lastMessageTimes = {}; // Tracks last message timestamp per user

/**
 * Send a message to a room, with spam protection
 * @param {string} roomId
 * @param {string} userId
 * @param {string} text
 */
function sendMessage(roomId, userId, text) {
  const now = Date.now();

  // Limit: 1 message per 2 seconds per user
  if (lastMessageTimes[userId] && now - lastMessageTimes[userId] < 2000) {
    alert("You're sending messages too fast. Please wait 2 seconds between messages.");
    return;
  }

  const messageId = db.ref().push().key;
  const msg = {
    user: userId,
    text: text,
    ts: now
  };

  // Save message as an object (keyed by messageId)
  db.ref(`rooms/${roomId}/messages/${messageId}`).set(msg);

  // Update room activity and rate-limit timestamp
  db.ref(`rooms/${roomId}/lastActive`).set(now);
  lastMessageTimes[userId] = now;
}

// --- EXPOSE HELPERS FOR UI (e.g. chat.js) ---
window.qpApp = {
  joinOrCreateRoom,
  listenUserCount,
  listenRoomDeleted,
  deleteRoom,
  listenMessages,
  sendMessage
};
