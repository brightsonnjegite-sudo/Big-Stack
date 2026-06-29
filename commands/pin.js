const fs = require('fs/promises');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// PIN Configuration
const CONFIG_FILE = path.join(__dirname, '../data/pinConfig.json');
const DEFAULT_PIN = '0000';
const VERIFICATION_DURATION = 60 * 60 * 1000; // 1 hour

let verifiedSessions = new Map(); // Store verified users with expiry time

// ────────────────────────────────────────────
// Load/Save PIN Configuration
async function loadPinConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        const defaultConfig = { pin: DEFAULT_PIN, enabled: false };
        await savePinConfig(defaultConfig);
        return defaultConfig;
    }
}

async function savePinConfig(config) {
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('[PIN] Save failed:', err.message);
    }
}

// ────────────────────────────────────────────
// Verify PIN - Check if PIN matches
async function verifyPin(inputPin) {
    const config = await loadPinConfig();
    if (!config.enabled) return true; // No PIN required if disabled
    return inputPin === config.pin;
}

// ────────────────────────────────────────────
// Check if user is currently verified
function isUserVerified(userId) {
    if (!verifiedSessions.has(userId)) return false;
    
    const expiryTime = verifiedSessions.get(userId);
    if (Date.now() > expiryTime) {
        verifiedSessions.delete(userId);
        return false;
    }
    return true;
}

// ────────────────────────────────────────────
// Set user as verified (valid for 1 hour)
function setUserVerified(userId) {
    const expiryTime = Date.now() + VERIFICATION_DURATION;
    verifiedSessions.set(userId, expiryTime);
}

// ────────────────────────────────────────────
// PIN Command Handler
async function pinCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const config = await loadPinConfig();

    // Only owner can configure PIN
    const isOwner = message.key.fromMe;
    if (!isOwner) {
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ⛔ *ACCESS DENIED*\n\n└── ▢ Only bot owner can configure PIN\n\n${FOOTER}` 
        }, { quoted: message });
        return;
    }

    const cmd = (args[0] || '').toLowerCase();

    // .pin on - Enable PIN protection
    if (cmd === 'on') {
        await savePinConfig({ ...config, enabled: true });
        await sock.sendMessage(chatId, { 
            text: `└── ▢ 🔒 *PIN PROTECTION ENABLED*\n\n└── ▢ Status : 🔒 ENABLED\n└── ▢ PIN     : ${config.pin}\n└── ▢ Note    : All commands now require PIN verification\n\n└── ▢ 📌 Use: .pin <your_pin> to verify\n\n${FOOTER}` 
        }, { quoted: message });
        return;
    }

    // .pin off - Disable PIN protection
    if (cmd === 'off') {
        await savePinConfig({ ...config, enabled: false });
        verifiedSessions.clear(); // Clear all sessions
        await sock.sendMessage(chatId, { 
            text: `└── ▢ 🔓 *PIN PROTECTION DISABLED*\n\n└── ▢ Status : 🔓 DISABLED\n└── ▢ Note    : All commands are now accessible without PIN\n\n${FOOTER}` 
        }, { quoted: message });
        return;
    }

    // .pin set <new_pin> - Set custom PIN
    if (cmd === 'set') {
        if (!args[1]) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ⚠️ *USAGE ERROR*\n\n└── ▢ Usage : .pin set <new_pin>\n└── ▢ Example : .pin set 1234\n\n${FOOTER}` 
            }, { quoted: message });
        }
        const newPin = args[1];
        if (newPin.length < 4) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ⚠️ *PIN TOO SHORT*\n\n└── ▢ PIN must be at least 4 characters\n\n${FOOTER}` 
            }, { quoted: message });
        }
        await savePinConfig({ ...config, pin: newPin });
        await sock.sendMessage(chatId, {
            text: `└── ▢ ✅ *PIN UPDATED*\n\n└── ▢ New PIN : ${newPin}\n└── ▢ Status : ✅ Success\n\n${FOOTER}`
        }, { quoted: message });
        return;
    }

    // .pin status - Show PIN status
    if (cmd === 'status') {
        const status = config.enabled ? '🔒 ENABLED' : '🔓 DISABLED';
        await sock.sendMessage(chatId, {
            text: `└── ▢ 🔐 *PIN SECURITY STATUS*\n\n└── ▢ Protection : ${status}\n└── ▢ PIN        : ${config.pin}\n\n${FOOTER}`
        }, { quoted: message });
        return;
    }

    // Show help if no args
    if (!cmd) {
        await sock.sendMessage(chatId, {
            text: `└── ▢ 🔐 *PIN SECURITY SYSTEM*\n\n└── ▢ Status : ${config.enabled ? '🔒 ENABLED' : '🔓 DISABLED'}\n└── ▢ PIN    : ${config.pin}\n\n└── ▢ *Commands:*\n└── ▢   .pin on        - Enable PIN protection\n└── ▢   .pin off       - Disable PIN protection\n└── ▢   .pin set <pin> - Set custom PIN\n└── ▢   .pin status    - Show PIN status\n\n${FOOTER}`
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { 
        text: `└── ▢ ❓ *UNKNOWN COMMAND*\n\n└── ▢ Use .pin for help\n\n${FOOTER}` 
    }, { quoted: message });
}

// ────────────────────────────────────────────
// Verify PIN Command - User enters PIN
async function verifyPinCommand(sock, chatId, message, pinInput) {
    const senderId = message.key.participant || message.key.remoteJid;
    const config = await loadPinConfig();

    // If PIN disabled, allow access
    if (!config.enabled) {
        setUserVerified(senderId);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ✅ *ACCESS GRANTED*\n\n└── ▢ Status : 🔓 PIN Disabled\n└── ▢ Access : ✅ Granted\n\n${FOOTER}` 
        }, { quoted: message });
        return true;
    }

    // Verify PIN
    const isValid = pinInput === config.pin;
    if (isValid) {
        setUserVerified(senderId);
        const expiryTime = new Date(Date.now() + VERIFICATION_DURATION).toLocaleTimeString();
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ✅ *PIN VERIFIED*\n\n└── ▢ Status : ✅ ACCESS GRANTED\n└── ▢ Valid  : Until ${expiryTime}\n└── ▢ Note   : Session valid for 1 hour\n\n${FOOTER}` 
        }, { quoted: message });
        return true;
    } else {
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *WRONG PIN*\n\n└── ▢ Status : 🔴 ACCESS DENIED\n└── ▢ Note   : Try again with correct PIN\n\n${FOOTER}` 
        }, { quoted: message });
        return false;
    }
}

// ────────────────────────────────────────────
// Check if user needs PIN verification for commands
async function checkPinVerification(userId) {
    const config = await loadPinConfig();
    if (!config.enabled) return true; // No verification needed
    return isUserVerified(userId);
}

module.exports = {
    pinCommand,
    verifyPinCommand,
    checkPinVerification,
    isUserVerified,
    loadPinConfig,
    DEFAULT_PIN
};
