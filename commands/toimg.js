// commands/toimg.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function toimgCommand(sock, chatId, message) {
    try {
        // 1. Check if user replied to a sticker
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMessage = quotedMessage?.stickerMessage || message.message?.stickerMessage;

        if (!stickerMessage) {
            const errorMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ Please reply to a sticker with .toimg

${FOOTER}`;
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            return;
        }

        // 2. Send "processing" message
        const processingMsg = 
`└─ ▢ ⏳ *PROCESSING*

└─ ▢ Converting sticker to image...
└─ ▢ Please wait.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: processingMsg }, { quoted: message });

        // 3. Download the sticker
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (!buffer || buffer.length === 0) {
            throw new Error('Empty sticker data');
        }

        // 4. Convert using sharp (webp → png)
        let outputBuffer;
        try {
            outputBuffer = await sharp(buffer)
                .png()
                .toBuffer();
        } catch (sharpErr) {
            // If sharp fails, try to handle as animated webp by extracting first frame
            console.error('Sharp conversion error, trying fallback...', sharpErr.message);
            // Attempt to convert using sharp with first frame
            try {
                outputBuffer = await sharp(buffer, { pages: -1 })
                    .png()
                    .toBuffer();
            } catch (fallbackErr) {
                throw new Error('Failed to convert sticker. It might be corrupted.');
            }
        }

        // 5. Send the converted image
        const successMsg = 
`└─ ▢ ✅ *CONVERSION SUCCESSFUL*

└─ ▢ ──── *INFO* ────
└─ ▢ Type  : Sticker → Image
└─ ▢ Format: PNG

📌 Your sticker has been converted to image.

${FOOTER}`;

        await sock.sendMessage(chatId, {
            image: outputBuffer,
            caption: successMsg
        }, { quoted: message });

    } catch (error) {
        console.error('Toimg error:', error);
        const errorMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ ${error.message || 'Failed to convert sticker.'}

📌 Make sure the sticker is valid.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = toimgCommand;
