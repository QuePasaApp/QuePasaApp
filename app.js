// =====================
// QuePasaApp - app.js
// Shared Firebase logic, Room join/leave helpers
// =====================

// --- CONFIGURE YOUR FIREBASE HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyDj9I6RI64jHqA0AIhVQtHDshz5vO3s3x8",
  authDomain: "quepasaapp-8c246.firebaseapp.com",
  databaseURL: "https://quepasaapp-8c246-default-rtdb.firebaseio.com/", // <-- ADD THIS!
  projectId: "quepasaapp-8c246",
  storageBucket: "quepasaapp-8c246.appspot.com", // <-- typo fixed: should be .appspot.com
  messagingSenderId: "578912881109",
  appId: "1:578912881109:web:a076538a2f57e869ced55c"
};
// -------------------------------------

// Initialize Firebase (only once!)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- UTILITY: Generate random 6-char room code ---
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- ROOM MANAGEMENT LOGIC ---

/**
 * Create or join a room.
 * If given a ?room=CODE param, tries to join. Otherwise, creates a new room.
 * Returns: { roomId, isCreator, userId }
 */
async function joinOrCreateRoom() {
  const url = new URL(window.location.href);
  let roomId = url.searchParams.get('room');
  let isCreator = false;
  if (!roomId) {
    // No room, create new
    roomId = generateRoomCode();
    isCreator = true;
    // Create room in DB
    await db.ref('rooms/' + roomId).set({
      created: Date.now(),
      users: {},
      messages: []
    });
  }
  // Generate a random user ID for this session
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
 * Get number of users in a room
 * @param {string} roomId
 * @param {function} cb - callback with number
 */
function listenUserCount(roomId, cb) {
  db.ref(`rooms/${roomId}/users`).on('value', snap => {
    const val = snap.val() || {};
    cb(Object.keys(val).length);
  });
}

/**
 * Listen for room deleted (redirect both users)
 * @param {string} roomId
 * @param {function} cb - callback if deleted
 */
function listenRoomDeleted(roomId, cb) {
  db.ref(`rooms/${roomId}`).on('value', snap => {
    if (!snap.exists()) cb();
  });
}

/**
 * Delete room from Firebase
 * @param {string} roomId
 */
function deleteRoom(roomId) {
  return db.ref(`rooms/${roomId}`).remove();
}

/**
 * Listen for new messages
 * @param {string} roomId
 * @param {function} cb - callback(messagesArray)
 */
function listenMessages(roomId, cb) {
  db.ref(`rooms/${roomId}/messages`).on('value', snap => {
    cb(snap.val() || []);
  });
}

/**
 * Send a message to room
 * @param {string} roomId
 * @param {string} userId
 * @param {string} text
 */
function sendMessage(roomId, userId, text) {
  const msg = {
    user: userId,
    text: text,
    ts: Date.now()
  };
  // Use transaction to append to messages array
  const msgsRef = db.ref(`rooms/${roomId}/messages`);
  msgsRef.transaction(arr => {
    if (!arr) arr = [];
    arr.push(msg);
    // Only keep last 100 messages (for sanity)
    if (arr.length > 100) arr = arr.slice(-100);
    return arr;
  });
}

// Expose helpers for chat.js
window.qpApp = {
  joinOrCreateRoom,
  listenUserCount,
  listenRoomDeleted,
  deleteRoom,
  listenMessages,
  sendMessage
};
