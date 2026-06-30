// commands/warnings.js
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

function loadWarnings() {
    if (!fs.existsSync(warningsFilePath)) {
        fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(data);
}

async function warningsCommand(sock, chatId, mentionedJidList) {
    try {
        const warnings = loadWarnings();

        if (!mentionedJidList || mentionedJidList.length === 0) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please mention a user to check warnings.\n\n${FOOTER}` 
            });
            return;
        }

        const userToCheck = mentionedJidList[0];
        const userNum = userToCheck.split('@')[0];
        const warningCount = warnings[userToCheck] || 0;

        const msg = 
`└── ▢ ⚠️ *WARNINGS CHECK*

└── ▢ ──── *RESULT* ────
└── ▢ User    : @${userNum}
└── ▢ Warnings: ${warningCount}

📌 ${warningCount === 0 ? 'User has no warnings.' : `User has ${warningCount} warning(s).`}

${FOOTER}`;

        await sock.sendMessage(chatId, { 
            text: msg,
            mentions: [userToCheck] 
        });

    } catch (error) {
        console.error('Error in warnings command:', error);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to retrieve warnings.\n\n${FOOTER}` 
        });
    }
}

module.exports = warningsCommand;
