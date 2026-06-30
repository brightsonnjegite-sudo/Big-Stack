// commands/topmembers.js
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';
const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

function loadMessageCounts() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        return JSON.parse(data);
    }
    return {};
}

function saveMessageCounts(messageCounts) {
    fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;

    saveMessageCounts(messageCounts);
}

function topMembers(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ This command is only available in group chats.\n\n${FOOTER}` 
        });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20); // Get top 20 members

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { 
            text: `└── ▢ 📊 *TOP MEMBERS*\n\n└── ▢ No message activity recorded yet.\n\n${FOOTER}` 
        });
        return;
    }

    let message = `└── ▢ 🏆 *TOP ${sortedMembers.length} MEMBERS*\n\n`;
    sortedMembers.forEach(([userId, count], index) => {
        const num = userId.split('@')[0];
        message += `└── ▢ ${index + 1}. @${num} - ${count} messages\n`;
    });
    message += `\n${FOOTER}`;

    sock.sendMessage(chatId, { 
        text: message, 
        mentions: sortedMembers.map(([userId]) => userId) 
    });
}

module.exports = { incrementMessageCount, topMembers };
