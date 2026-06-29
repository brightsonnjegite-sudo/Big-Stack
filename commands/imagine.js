const axios = require('axios');
const { fetchBuffer } = require('../lib/myfunc');

async function imagineCommand(sock, chatId, message) {
    try {
        // Get the prompt from the message
        const prompt = message.message?.conversation?.trim() || 
                      message.message?.extendedTextMessage?.text?.trim() || '';
        
        // Remove the command prefix and trim
        const imagePrompt = prompt.slice(8).trim();
        
        if (!imagePrompt) {
            const usageMessage = 
`└── ▢ 🎨 *IMAGE GENERATION*

└── ▢ Status  : ❌ Missing Prompt
└── ▢ Usage   : .imagine <prompt>

📌 Example: .imagine a beautiful sunset over mountains

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: usageMessage }, { quoted: message });
            return;
        }

        // Send processing message with style
        const processingMessage = 
`└── ▢ 🎨 *IMAGE GENERATION*

└── ▢ Status  : ⏳ Generating...
└── ▢ Prompt  : ${imagePrompt}
└── ▢ Quality : High (Enhanced)

📌 Please wait, this may take a few seconds.

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: processingMessage }, { quoted: message });

        // Enhance the prompt with quality keywords
        const enhancedPrompt = enhancePrompt(imagePrompt);

        // Make API request
        const response = await axios.get(`https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`, {
            responseType: 'arraybuffer'
        });

        // Convert response to buffer
        const imageBuffer = Buffer.from(response.data);

        // Prepare styled caption with lines and footer
        const caption = 
`└── ▢ 🎨 *IMAGE GENERATED*

└── ▢ Prompt  : ${imagePrompt}
└── ▢ Status  : ✅ Success
└── ▢ Quality : Enhanced

📌 Here is your generated image.

© bigmanj tech ™ with ♥︎`;

        // Send the generated image with styled caption
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption
        }, { quoted: message });

    } catch (error) {
        console.error('Error in imagine command:', error);
        const errorMessage = 
`└── ▢ 🎨 *IMAGE GENERATION*

└── ▢ Status  : ❌ Error
└── ▢ Details : ${error.message || 'Please try again later.'}

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
    }
}

// Function to enhance the prompt
function enhancePrompt(prompt) {
    // Quality enhancing keywords
    const qualityEnhancers = [
        'high quality',
        'detailed',
        'masterpiece',
        'best quality',
        'ultra realistic',
        '4k',
        'highly detailed',
        'professional photography',
        'cinematic lighting',
        'sharp focus'
    ];

    // Randomly select 3-4 enhancers
    const numEnhancers = Math.floor(Math.random() * 2) + 3; // Random number between 3-4
    const selectedEnhancers = qualityEnhancers
        .sort(() => Math.random() - 0.5)
        .slice(0, numEnhancers);

    // Combine original prompt with enhancers
    return `${prompt}, ${selectedEnhancers.join(', ')}`;
}

module.exports = imagineCommand;
