// commands/toimg.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function toimgCommand(sock, chatId, message) {
    try {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMessage = quotedMessage?.stickerMessage || message.message?.stickerMessage;

        if (!stickerMessage) {
            const errorMsg = `└── ▢ ❌ *ERROR*\n\n└── ▢ Please reply to a sticker with .toimg\n\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            return;
        }

        const processingMsg = `└── ▢ ⏳ *PROCESSING*\n\n└── ▢ Converting sticker to image...\n└── ▢ Please wait.\n\n${FOOTER}`;
        await sock.sendMessage(chatId, { text: processingMsg }, { quoted: message });

        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (!buffer || buffer.length === 0) {
            throw new Error('Empty sticker data');
        }

        let outputBuffer;
        try {
            outputBuffer = await sharp(buffer).png().toBuffer();
        } catch (sharpErr) {
            console.error('Sharp conversion error, trying fallback...', sharpErr.message);
            try {
                outputBuffer = await sharp(buffer, { pages: -1 }).png().toBuffer();
            } catch (fallbackErr) {
                throw new Error('Failed to convert sticker. It might be corrupted.');
            }
        }

        const successMsg = `└── ▢ ✅ *CONVERSION SUCCESSFUL*\n\n└── ▢ ──── *INFO* ────\n└── ▢ Type  : Sticker → Image\n└── ▢ Format: PNG\n\n📌 Your sticker has been converted to image.\n\n${FOOTER}`;

        await sock.sendMessage(chatId, {
            image: outputBuffer,
            caption: successMsg
        }, { quoted: message });

    } catch (error) {
        console.error('Toimg error:', error);
        const errorMsg = `└── ▢ ❌ *ERROR*\n\n└── ▢ ${error.message || 'Failed to convert sticker.'}\n\n📌 Make sure the sticker is valid.\n\n${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = toimgCommand;
