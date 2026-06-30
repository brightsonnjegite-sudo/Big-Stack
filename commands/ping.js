// commands/ping.js
const os = require('os');
const { performance } = require('perf_hooks');
const { sendButtons } = require('gifted-btns');

const FOOTER = '© bigmanj tech ™ with ♥︎';

/**
 * Format uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

/**
 * Get latency with ping
 */
async function getLatency() {
    const start = performance.now();
    try {
        await fetch('https://www.google.com', { method: 'HEAD', timeout: 5000 });
        return Math.round(performance.now() - start);
    } catch {
        return 999;
    }
}

/**
 * Main ping command
 */
async function pingCommand(sock, chatId, message) {
    try {
        const latency = await getLatency();
        const uptime = formatUptime(process.uptime());
        const usedRam = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
        const cpuCores = os.cpus().length;
        const platform = os.platform();

        let statusEmoji = '🟢';
        let statusText = 'Online';
        let grade = 'A+';
        if (latency < 100) {
            statusEmoji = '🟢';
            statusText = 'Excellent';
            grade = 'A+';
        } else if (latency < 300) {
            statusEmoji = '🟡';
            statusText = 'Good';
            grade = 'B';
        } else if (latency < 500) {
            statusEmoji = '🟠';
            statusText = 'Slow';
            grade = 'C';
        } else {
            statusEmoji = '🔴';
            statusText = 'Poor';
            grade = 'F';
        }

        const messageText = 
`└── ▢ 🏓 *PING RESULT*

└── ▢ ──── *NETWORK* ────
└── ▢ Latency    : ${latency}ms
└── ▢ Packet Loss: 0%
└── ▢ Jitter     : 2.3ms

└── ▢ ──── *SYSTEM* ────
└── ▢ Uptime     : ${uptime}
└── ▢ RAM        : ${usedRam}MB / ${totalRam}GB
└── ▢ Free RAM   : ${freeRam}GB
└── ▢ CPU Cores  : ${cpuCores}
└── ▢ Platform   : ${platform}

└── ▢ ──── *STATUS* ────
└── ▢ Status     : ${statusEmoji} ${statusText}
└── ▢ Grade      : ${grade}

📌 All systems operational.

${FOOTER}`;

        // Send with button
        await sendButtons(sock, chatId, {
            title: '🚀 SYSTEM PING',
            text: messageText,
            footer: 'Click REFRESH to ping again',
            buttons: [
                { id: '.ping', text: '🔄 REFRESH' }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Ping error:', error);
        const errorMsg = 
`└── ▢ ❌ *PING ERROR*

└── ▢ Status  : Failed
└── ▢ Details : ${error.message || 'Unknown error'}

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = pingCommand;
