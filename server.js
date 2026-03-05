// ============================================================
// Pulse Launch — Real-Time Tech Fest Inauguration Server
// ============================================================
// A lightweight Node.js + Express + Socket.io server that:
//   1. Serves static files from /public
//   2. Tracks connected device count in real-time
//   3. Broadcasts a launch event to all connected audience devices
// Optimized for 1000+ concurrent WebSocket connections.
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- App setup ---
const app = express();
const server = http.createServer(app);

// Socket.io with performance tuning for high concurrency
const io = new Server(server, {
  cors: { origin: '*' },
  // Performance: use WebSocket transport only (skip long-polling overhead)
  transports: ['websocket', 'polling'],
  // Increase ping timeout for mobile devices on flaky networks
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// --- State ---
let connectedDevices = 0;
let launched = false; // Track if the event has already been launched

// --- Socket.io event handling ---
io.on('connection', (socket) => {
  connectedDevices++;
  console.log(`[+] Device connected — Total: ${connectedDevices} (id: ${socket.id})`);

  // Broadcast updated count to ALL clients (audience + admin)
  io.emit('device_count', connectedDevices);

  // If already launched, notify the new joiner immediately
  if (launched) {
    socket.emit('launch_event');
  }

  // --- Admin triggers launch ---
  socket.on('launch', (pin) => {
    // Basic PIN security
    const adminPin = process.env.ADMIN_PIN || '1234';
    if (pin !== adminPin) {
      socket.emit('error_msg', 'Invalid Admin PIN');
      return;
    }

    if (!launched) {
      launched = true;
      console.log('🚀 LAUNCH EVENT TRIGGERED — Broadcasting to all devices!');
      io.emit('launch_event');
    }
  });

  // --- Admin resets launch (optional, for testing) ---
  socket.on('reset', (pin) => {
    const adminPin = process.env.ADMIN_PIN || '1234';
    if (pin !== adminPin) {
      socket.emit('error_msg', 'Invalid Admin PIN');
      return;
    }

    launched = false;
    console.log('🔄 Launch has been reset.');
    io.emit('reset_event');
  });

  // --- Client disconnects ---
  socket.on('disconnect', () => {
    connectedDevices--;
    console.log(`[-] Device disconnected — Total: ${connectedDevices} (id: ${socket.id})`);
    io.emit('device_count', connectedDevices);
  });
});

// --- Start the server ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  ⚡ PULSE LAUNCH SERVER IS RUNNING ⚡');
  console.log('============================================');
  console.log(`  Audience page : http://localhost:${PORT}`);
  console.log(`  Admin page    : http://localhost:${PORT}/admin.html`);
  console.log('============================================');
  console.log('');
});
