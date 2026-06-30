// commands/warn.js
const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// Define paths
const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

// Initialize warnings file if it doesn't exist
function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }
    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        // ─── GROUP CHECK ───
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ This command can only be used in groups!\n\n${FOOTER}` 
            });
            return;
        }

        // ─── ADMIN PERMISSIONS ───
        try {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Please make the bot an admin first to use this command.\n\n${FOOTER}` 
                });
                return;
            }

            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only group admins can use the warn command.\n\n${FOOTER}` 
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please make sure the bot is an admin of this group.\n\n${FOOTER}` 
            });
            return;
        }

        // ─── FIND TARGET USER ───
        let userToWarn;
        if (mentionedJids && mentionedJids.length > 0) {
            userToWarn = mentionedJids[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWarn = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToWarn) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please mention the user or reply to their message to warn!\n\n${FOOTER}` 
            });
            return;
        }

        // ─── DELAY ───
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ─── READ / UPDATE WARNINGS ───
        let warnings = {};
        try {
            warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
        } catch (error) {
            warnings = {};
        }

        if (!warnings[chatId]) warnings[chatId] = {};
        if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;
        
        warnings[chatId][userToWarn]++;
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

        const warnCount = warnings[chatId][userToWarn];
        const userNum = userToWarn.split('@')[0];
        const senderNum = senderId.split('@')[0];

        // ─── SEND WARNING MESSAGE ───
        const warningMessage = 
`└── ▢ ⚠️ *WARNING ALERT*

└── ▢ ──── *DETAILS* ────
└── ▢ User    : @${userNum}
└── ▢ Warned  : ${warnCount}/3
└── ▢ By      : @${senderNum}
└── ▢ Date    : ${new Date().toLocaleString()}

📌 This is warning ${warnCount} out of 3.

${FOOTER}`;

        await sock.sendMessage(chatId, { 
            text: warningMessage,
            mentions: [userToWarn, senderId]
        });

        // ─── AUTO-KICK AFTER 3 WARNINGS ───
        if (warnCount >= 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            await sock.groupParticipantsUpdate(chatId, [userToWarn], "remove");
            delete warnings[chatId][userToWarn];
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
            
            const kickMessage = 
`└── ▢ 🚫 *AUTO-KICK*

└── ▢ ──── *ACTION* ────
└── ▢ User    : @${userNum}
└── ▢ Reason  : Received 3 warnings
└── ▢ Status  : ✅ Removed from group

📌 User has been automatically kicked.

${FOOTER}`;

            await sock.sendMessage(chatId, { 
                text: kickMessage,
                mentions: [userToWarn]
            });
        }

    } catch (error) {
        console.error('Error in warn command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *RATE LIMIT*\n\n└── ▢ Please try again in a few seconds.\n\n${FOOTER}` 
            }).catch(() => {});
        } else {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to warn user. Make sure the bot is admin and has sufficient permissions.\n\n${FOOTER}` 
            }).catch(() => {});
        }
    }
}

module.exports = warnCommand;
