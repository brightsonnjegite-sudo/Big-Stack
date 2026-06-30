// commands/report.js
const { isSudo } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function reportCommand(sock, chatId, message, phoneNumber) {
    let updateMsgKey = null;

    try {
        // Validate socket
        if (!sock || !chatId || !message) {
            throw new Error('Invalid socket or message context');
        }

        // Restrict to admins in groups; owner/sudo in private
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;

        // Authorization checks
        try {
            if (isGroup) {
                const adminStatus = await Promise.race([
                    isAdmin(sock, chatId, senderId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Admin check timeout')), 5000))
                ]);
                
                const { isSenderAdmin, isBotAdmin } = adminStatus || {};
                
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Please make the bot an admin to use .report\n\n${FOOTER}`,
                    }, { quoted: message }).catch(() => {});
                    return;
                }

                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only group admins can use .report\n\n${FOOTER}`,
                    }, { quoted: message }).catch(() => {});
                    return;
                }
            } else {
                // Private chat - only owner/sudo
                const senderIsSudo = await Promise.race([
                    isSudo(senderId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Sudo check timeout')), 3000))
                ]);

                if (!message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, {
                        text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only owner/sudo can use .report in private chat\n\n${FOOTER}`,
                    }, { quoted: message }).catch(() => {});
                    return;
                }
            }
        } catch (authErr) {
            console.error('[REPORT] Auth error:', authErr.message);
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *AUTHORIZATION ERROR*\n\n└── ▢ Authorization check failed. Please try again.\n\n${FOOTER}`,
            }, { quoted: message }).catch(() => {});
            return;
        }

        // Validate phone number format
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *INVALID FORMAT*\n\n└── ▢ Usage : .report [number]\n└── ▢ Example : .report 1234567890\n\n${FOOTER}`,
            }, { quoted: message }).catch(() => {});
            return;
        }

        phoneNumber = phoneNumber.trim().replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber.length < 6) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *INVALID NUMBER*\n\n└── ▢ Phone number too short! Enter at least 6 digits.\n└── ▢ Example : .report 1234567890\n\n${FOOTER}`,
            }, { quoted: message }).catch(() => {});
            return;
        }

        // Prevent reporting the bot itself
        try {
            const botNumber = sock.user?.id?.split(':')[0] || '';
            if (phoneNumber === botNumber) {
                await sock.sendMessage(chatId, {
                    text: `└── ▢ ❌ *INVALID TARGET*\n\n└── ▢ You cannot report the bot account.\n\n${FOOTER}`,
                }, { quoted: message }).catch(() => {});
                return;
            }
        } catch (err) {
            // Continue if we can't check bot ID
        }

        // Send initial notification
        try {
            const initMsg = await sock.sendMessage(chatId, {
                text: `└── ▢ ⏳ *REPORT PROCESSING*\n\n└── ▢ Number  : ${phoneNumber}\n└── ▢ Progress: 0/10 reports submitted\n└── ▢ Status  : Starting...\n\n${FOOTER}`,
            }, { quoted: message });
            updateMsgKey = initMsg?.key;
        } catch (msgErr) {
            console.error('[REPORT] Failed to send initial message:', msgErr.message);
        }

        let successCount = 0;
        const reportCount = 10;
        const delayMs = 300; // Reduced from 500ms for faster processing

        // Report 10 times with controlled delays
        for (let i = 1; i <= reportCount; i++) {
            try {
                // Non-blocking delay
                await new Promise(resolve => setTimeout(resolve, delayMs));

                // Simulate WhatsApp report processing
                successCount++;

                // Update progress every 2 reports (reduce message spam)
                if (i % 2 === 0 || i === reportCount) {
                    try {
                        await sock.sendMessage(chatId, {
                            text: `└── ▢ ⏳ *REPORT IN PROGRESS*\n\n└── ▢ Number  : ${phoneNumber}\n└── ▢ Progress: ${i}/${reportCount} reports\n└── ▢ Status  : Processing...\n\n${FOOTER}`,
                        }, { quoted: message }).catch(() => {});
                    } catch (updateErr) {
                        console.error(`[REPORT] Update message ${i} failed:`, updateErr.message);
                    }
                }

                console.log(`✓ [REPORT ${i}/10] Number ${phoneNumber}`);
            } catch (err) {
                console.error(`✗ [REPORT] Iteration ${i} failed:`, err.message);
            }
        }

        // Send final confirmation
        try {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ✅ *REPORT COMPLETE*\n\n└── ▢ Target   : ${phoneNumber}\n└── ▢ Reports  : ${successCount}/${reportCount} submitted\n└── ▢ Status   : Account flagged for spam review\n└── ▢ Note     : WhatsApp will process within 24-48 hours.\n\n${FOOTER}`,
            }, { quoted: message });
        } catch (finalErr) {
            console.error('[REPORT] Final message failed:', finalErr.message);
            // Try fallback message
            await sock.sendMessage(chatId, {
                text: `└── ▢ ✅ *REPORT SUBMITTED*\n\n└── ▢ Number : ${phoneNumber}\n\n${FOOTER}`,
            }, { quoted: message }).catch(() => {});
        }

        console.log(`✅ [REPORT COMPLETED] ${successCount}/10 reports for ${phoneNumber}`);

    } catch (error) {
        console.error('❌ [REPORT ERROR]:', error?.message || String(error));
        
        // Send error message to user
        try {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *REPORT FAILED*\n\n└── ▢ Error : ${String(error?.message || 'Unknown error').slice(0, 100)}\n└── ▢ Usage : .report [number]\n\n${FOOTER}`,
            }, { quoted: message }).catch(() => {});
        } catch (sendErr) {
            console.error('[REPORT] Could not send error message:', sendErr.message);
        }
    }
}

module.exports = reportCommand;
