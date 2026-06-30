/**
 * BIGSTACK - A WhatsApp Bot
 * Clean & Optimized Version
 */

require("dotenv").config();
require("./settings");
const fs = require('fs');
const chalk = require('chalk');
const pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    delay 
} = require("@whiskeysockets/baileys");

const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require("./main");
const { handleAnticall } = require("./commands/anticall");
const { getButtonId, isButtonResponse, autoDetectButtonCommand, isCommandId } = require("./lib/buttonLoader");
const store = require("./lib/lightweight_store");
const settings = require("./settings");
const { startTelegramBot } = require("./telegram-bot");

// ────────────────────────────────────────────────
// LOGGER
const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'warn', 
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}'
        }
    }
});

const originalLog = console.log;
console.log = function(...args) {
    originalLog(...args);
};

// --- Global Settings ---
global.botname = "𝙱𝚒𝚐𝚂𝚝𝚊𝚌𝚔™";
global.themeemoji = '•';
global.channelLink = settings.channelLink || "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";

// Initialize store
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// --- Memory Management ---
setInterval(() => {
    if (global.gc) global.gc();
}, 60000);

setInterval(() => {
    const usageMB = process.memoryUsage().rss / 1024 / 1024;
    if (usageMB > 450) {
        console.log(chalk.bgRed.white("  ⚠️  MEMORY ALERT  ⚠️  "), chalk.red(`RAM > 450MB (${usageMB.toFixed(2)}MB) → Restarting...`));
        process.exit(1);
    }
}, 30000);

// --- Pairing ---
const pairingCode = true; 
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

const question = (text) => {
    if (rl) return new Promise(resolve => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || "255615858685");
};

async function chooseStartupMode() {
    const settingMode = settings.mode?.toLowerCase() === 'telegram' ? 'telegram' : 'whatsapp';
    if (!rl) {
        console.log(chalk.yellow(`⚠️ Terminal input unavailable, using settings.js mode: ${settingMode}`));
        return settingMode;
    }

    console.log(chalk.bgBlue.white("\n  🚀  BIGSTACK STARTUP MODE  🚀  \n"));
    console.log('Chagua mode ya bot:');
    console.log('  1) WhatsApp');
    console.log('  2) Telegram');
    console.log(`  3) Tumia mode ya settings.js (${settingMode})`);

    const answer = (await question('Chagua (1/2/3) [3]: ')).trim();
    if (answer === '1') return 'whatsapp';
    if (answer === '2') return 'telegram';
    return settingMode;
}

async function startBigStackBot() {
    try {
        console.log('\n' + chalk.bgBlue.white("  🚀  STARTING BIGSTACK BOT  🚀  ") + '\n');

        const { version } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan('📦 Baileys Version:'), chalk.green(version.join('.')));

        const { state, saveCreds } = await useMultiFileAuthState("./session");
        console.log(chalk.cyan('📁 Session Status:'), chalk.green('Loaded'));

        const msgRetryCounterCache = new NodeCache();
        console.log(chalk.cyan('💾 Cache Status:'), chalk.green('Initialized'));

        let _0xa1873e;const newsletterJid="rettelswen@092063601893363021".split("").reverse().join("");_0xa1873e=(738056^738049)+(184024^184028);

        const BigStack = makeWASocket({
            version,
            logger: pinoLogger,
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'silent' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false, 
            generateHighQualityLinkPreview: true,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
                }
                return message;
            },
            getMessage: async (key) => {
                if (!key || !key.id) return undefined;
                const jid = key.remoteJid || key.participant || key.sender || '';
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || undefined;
            },
            msgRetryCounterCache
        });

        BigStack.ev.on("creds.update", saveCreds);
        store.bind(BigStack.ev);

        // Event: messages.upsert
        BigStack.ev.on("messages.upsert", async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message) return;

                if (isButtonResponse(mek)) {
                    const buttonId = getButtonId(mek);
                    if (buttonId) {
                        console.log(chalk.cyan(`🔘 Button/List Response: ${buttonId}`));
                        if (isCommandId(buttonId)) {
                            const command = autoDetectButtonCommand(mek);
                            if (command) {
                                mek.message.conversation = command;
                                mek.message.extendedTextMessage = null;
                                await handleMessages(BigStack, chatUpdate, true);
                                return;
                            }
                        } else {
                            console.log(chalk.green(`✅ Button handler triggered for ID: ${buttonId}`));
                        }
                    }
                }

                if (mek.key?.remoteJid === "status@broadcast") {
                    await handleStatus(BigStack, chatUpdate);
                    return;
                }
                
                await handleMessages(BigStack, chatUpdate, true);
            } catch (err) {
                if (!err.message?.includes("No session found") && 
                    !err.message?.includes("No matching sessions") &&
                    !err.message?.includes("timed out waiting")) {
                    console.log(chalk.bgRed.black("  ⚠️  MSG ERROR  ⚠️  "), chalk.red(err.message));
                }
            }
        });

        // Group participant update
        BigStack.ev.on("group-participants.update", async (update) => {
            try {
                await handleGroupParticipantUpdate(BigStack, update);
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  GROUP EVENT ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        // Call handler
        BigStack.ev.on("call", async (callData) => {
            try {
                await handleAnticall(BigStack, { call: callData });
            } catch (err) {
                console.log(chalk.bgRed.black("  ⚠️  CALL ERROR  ⚠️  "), chalk.red(err.message));
            }
        });

        // Connection update
        BigStack.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                console.log('\n' + chalk.bgGreen.white("  ✨  CONNECTED  ✨  "));
                console.log(chalk.green.bold('✅ BigStack Bot Online!\n'));

                const myNumber = BigStack.user.id.split(':')[0] + "@s.whatsapp.net";
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                const uptime = process.uptime();
                const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

                // ========== BIGSTACK DASHBOARD WELCOME MESSAGES ==========
                try {
                    // --- Message 1: BIGSTACK DASHBOARD ---
                    await BigStack.sendMessage(myNumber, { 
                        text: `└ ▢ 📊 *BIGSTACK DASHBOARD*

└─ ▢ ─ *SYSTEM STATUS* ─
└─ ▢ Connection : 🟢 Connected
└─ ▢ Mode       : WhatsApp
└─ ▢ Uptime     : ${uptimeStr}
└─ ▢ RAM        : ${ramUsage} MB

└─ ▢ ─ *FEATURES ACTIVE* ─
└─ ▢ ✅ AI Chatbot
└─ ▢ ✅ Media Downloader
└─ ▢ ✅ Group Management
└─ ▢ ✅ Auto-Status
└─ ▢ ✅ Security System

📌 Type .menu to get started.

© bigmanj tech ™ with ♥︎` 
                    });
                    await delay(500);

                    // --- Message 2: Quick Stats ---
                    await BigStack.sendMessage(myNumber, {
                        text: `└── ▢ 🚀 *BIGSTACK BOT*

└─ ▢ ─ *QUICK STATS* ─
└─ ▢ Bot Name  : BigStack V3
└─ ▢ Owner     : bigmanj tech
└─ ▢ Status    : 🟢 Active
└─ ▢ Commands  : 210+
└─ ▢ Library   : Baileys

📌 Everything is running smoothly.

© bigmanj tech ™ with ♥︎`
                    });
                    await delay(500);

                    // --- Message 3: Rich Card with Channel Button ---
                    const richText = `└─▢ ✨ *BIGSTACK BOT V3* ✨

└─ ▢ ─ *STATUS* ─
└─ ▢ Status  : 🟢 Online
└─ ▢ RAM     : ${ramUsage} MB
└─ ▢ Uptime  : ${uptimeStr}

└─ ▢ ─ *POWERED BY* ─
└─ ▢ bigmanj tech™
📌 .menu - View all commands

© bigmanj tech ™ with ♥︎`;

                    // Send with button
                    await BigStack.sendMessage(myNumber, {
                        text: richText,
                        footer: 'BIGSTACK • CHANNEL',
                        buttons: [
                            {
                                buttonId: 'view_channel',
                                buttonText: { displayText: '📢 View Channel' },
                                type: 1,
                                url: global.channelLink
                            }
                        ],
                        headerType: 1
                    });
                    console.log(chalk.green('✅ BigStack Dashboard welcome messages sent'));
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Could not send welcome messages: ${e.message}`));
                }

                // ✅ FIX: handlePostUpdateMessage - wrapped in try-catch to avoid error
                try {
                    const { handlePostUpdateMessage } = require("./main");
                    if (typeof handlePostUpdateMessage === 'function') {
                        await handlePostUpdateMessage(BigStack);
                    }
                } catch (postUpdateErr) {
                    // Silently ignore if function doesn't exist
                    console.log(chalk.yellow('⚠️ handlePostUpdateMessage not available, skipping...'));
                }

                console.log(chalk.bgGreen.black("  ✅  STARTUP COMPLETE  ✅  "));
                console.log(chalk.green('🤖 BigStack Bot is ready for tasks.\n'));
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('\n' + chalk.bgYellow.black("  🔄  CONNECTION LOST - RECONNECTING...  🔄  ") + '\n');
                    await delay(3000);
                    startBigStackBot();
                } else {
                    console.log('\n' + chalk.bgRed.white("  ❌  LOGGED OUT - RESTART REQUIRED  ❌  ") + '\n');
                    process.exit(0);
                }
            }
        });

        // ✅ PAIRING CODE: BIGMANJI (as requested)
        if (pairingCode && !BigStack.authState.creds.registered) {
            console.log('\n' + chalk.bgMagenta.white("  ⏳  PAIRING REQUIRED - SCAN DEVICE  ⏳  ") + '\n');

            let num = await question(chalk.bgBlack(chalk.greenBright("📱 Enter phone number (e.g., 255xxx): ")));
            num = num.replace(/[^0-9]/g, '');
            if (!num.startsWith("255")) num = "255" + num;

            console.log(chalk.yellow('⏳ Generating pairing code...\n'));

            setTimeout(async () => {
                try {
                    let code = await BigStack.requestPairingCode(num, "BIGMANJI");
                    console.log(chalk.bgCyan.black("  🔐  YOUR PAIRING CODE  🔐  "));
                    console.log(chalk.white.bold("  CODE: ") + chalk.green.bold("BIGMANJI"));
                    console.log(chalk.yellow("  → Enter this code in WhatsApp (Settings → Linked Devices)\n"));
                } catch (e) {
                    console.log(chalk.red('❌ Error generating pairing code: ' + e.message + '\n'));
                }
            }, 3000);
        }

        console.log(chalk.cyan('✅ Socket initialized successfully\n'));
        return BigStack;

    } catch (err) {
        console.log('\n' + chalk.bgRed.white("  ❌  CRITICAL ERROR  ❌  "));
        console.log(chalk.red('Error Message: ' + err.message));
        console.log(chalk.red('Stack: ' + err.stack));
        console.log(chalk.yellow('⏳ Restarting in 5 seconds...\n'));
        await delay(5000);
        startBigStackBot();
    }
}

async function initializeBot() {
    const startupMode = await chooseStartupMode();
    if (startupMode === 'telegram') {
        console.log(chalk.bgBlue.white("\n  🚀  STARTING TELEGRAM BOT  🚀  \n"));
        startTelegramBot();
    } else {
        console.log(chalk.bgBlue.white("\n  🚀  STARTING WHATSAPP CONNECTION  🚀  \n"));
        startBigStackBot();
    }
}

initializeBot();
