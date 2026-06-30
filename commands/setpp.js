// commands/setpp.js
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

const FOOTER = '© bigmanj tech ™ with ♥︎';

/**
 * Set bot profile picture
 * .setpp - Reply to an image message to set as bot profile picture
 * Only owner/sudo can use this command
 */
async function setProfilePicture(sock, chatId, msg) {
    try {
        // 1. Check permissions
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ This command is only available for the owner!\n\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // 2. Check if replying to a message
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ⚠️ *USAGE ERROR*\n\n└── ▢ Please reply to an image with the .setpp command.\n└── ▢ Example: Reply to an image and type .setpp\n\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // 3. Check if the replied message is an image
        const imageMessage = quotedMessage.imageMessage;
        if (!imageMessage) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *INVALID MEDIA*\n\n└── ▢ The replied message must contain an image!\n└── ▢ Supported: JPEG, PNG, WebP images\n\n${FOOTER}`
            }, { quoted: msg });
            return;
        }

        // 4. Create temporary directory if needed
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // 5. Notify user that we are processing
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: msg.key }
        });

        await sock.sendMessage(chatId, {
            text: `└── ▢ ⏳ *PROCESSING*\n\n└── ▢ Downloading image...\n└── ▢ Please wait.\n\n${FOOTER}`
        }, { quoted: msg });

        // 6. Download the image
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (buffer.length === 0) {
            throw new Error('Downloaded image is empty');
        }

        // 7. Save to temporary file
        const imagePath = path.join(tmpDir, `profile_${Date.now()}.jpg`);
        fs.writeFileSync(imagePath, buffer);

        // 8. Update profile picture
        await sock.updateProfilePicture(sock.user.id, { url: imagePath });

        // 9. Clean up temporary file
        fs.unlinkSync(imagePath);

        // 10. Success message
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

        await sock.sendMessage(chatId, {
            text: `└── ▢ ✅ *PROFILE PICTURE UPDATED*\n\n└── ▢ Status  : ✅ Success\n└── ▢ Note    : Bot profile picture has been changed.\n└── ▢ Image   : ${imageMessage.fileLength ? (imageMessage.fileLength / 1024 / 1024).toFixed(1) + 'MB' : 'Unknown size'}\n\n📌 New profile picture is now active.\n\n${FOOTER}`
        }, { quoted: msg });

    } catch (error) {
        console.error('Setpp error:', error);

        // Clean up temporary file if it exists
        try {
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (fs.existsSync(tmpDir)) {
                const files = fs.readdirSync(tmpDir);
                for (const file of files) {
                    if (file.startsWith('profile_')) {
                        fs.unlinkSync(path.join(tmpDir, file));
                    }
                }
            }
        } catch (cleanErr) {}

        // Send error message
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: msg.key }
        });

        const errorMsg = 
`└── ▢ ❌ *PROFILE UPDATE FAILED*

└── ▢ Error : ${error.message || 'Unknown error'}
└── ▢ Tip   : Make sure the image is valid (JPEG/PNG) and not too large.

${FOOTER}`;

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: msg });
    }
}

module.exports = setProfilePicture;
