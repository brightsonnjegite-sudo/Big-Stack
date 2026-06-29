const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const sharp = require('sharp');

async function blurCommand(sock, chatId, message, quotedMessage) {
    try {
        // Get the image to blur
        let imageBuffer;
        
        if (quotedMessage) {
            // If replying to a message
            if (!quotedMessage.imageMessage) {
                const errorMsg = 
`└── ▢ 🖼️ *BLUR EFFECT*

└── ▢ Status  : ❌ Error
└── ▢ Details : Please reply to an image message

© bigmanj tech ™ with ♥︎`;
                await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
                return;
            }
            
            const quoted = {
                message: {
                    imageMessage: quotedMessage.imageMessage
                }
            };
            
            imageBuffer = await downloadMediaMessage(
                quoted,
                'buffer',
                { },
                { }
            );
        } else if (message.message?.imageMessage) {
            // If image is in current message
            imageBuffer = await downloadMediaMessage(
                message,
                'buffer',
                { },
                { }
            );
        } else {
            const usageMsg = 
`└── ▢ 🖼️ *BLUR EFFECT*

└── ▢ Status  : ❌ Missing Image
└── ▢ Usage   : Reply to an image with .blur
└── ▢ Example : Send image with caption .blur

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: usageMsg }, { quoted: message });
            return;
        }

        // Resize and optimize image
        const resizedImage = await sharp(imageBuffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Apply blur effect directly using sharp
        const blurredImage = await sharp(resizedImage)
            .blur(10)
            .toBuffer();

        // Send the blurred image with styled caption
        const caption = 
`└── ▢ 🖼️ *BLUR EFFECT*

└── ▢ Status  : ✅ Success
└── ▢ Effect  : Blur (radius 10)

© bigmanj tech ™ with ♥︎`;

        await sock.sendMessage(chatId, {
            image: blurredImage,
            caption: caption
        }, { quoted: message });

    } catch (error) {
        console.error('Error in blur command:', error);
        const errorMsg = 
`└── ▢ 🖼️ *BLUR EFFECT*

└── ▢ Status  : ❌ Error
└── ▢ Details : ${error.message || 'Please try again later.'}

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = blurCommand;
