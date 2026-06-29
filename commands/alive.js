const os = require('os');
const { performance } = require('perf_hooks');
const { sendButtons } = require('gifted-btns'); // Make sure this package is installed

/**
 * Formats seconds into human-readable string (e.g., "6h 47m 15s")
 */
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
};

/**
 * Creates a progress bar of given length (10 by default)
 */
const makeBar = (percent, length = 10) => {
    const filled = Math.round((Math.min(100, percent) / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
};

/**
 * Main alive command
 */
const aliveCommand = async (sock, chatId, msg) => {
    if (!sock?.sendMessage) return;

    const startTime = performance.now();

    try {
        // -------- System Info --------
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            timeZone: 'Africa/Dar_es_Salaam',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const latency = (performance.now() - startTime).toFixed(0);
        const totalRam = os.totalmem() / Math.pow(1024, 3);
        const usedRam = process.memoryUsage().heapUsed / Math.pow(1024, 3);
        const ramPercent = (usedRam / totalRam) * 100;
        const ramBar = makeBar(ramPercent);
        const formattedRam = `${ramBar}  ${Math.round(ramPercent)}% (${usedRam.toFixed(2)}GB / ${totalRam.toFixed(1)}GB)`;

        // Hardcoded hostname
        const hostname = 'bighost';
        const platform = os.platform();
        const nodeVersion = process.version;
        const cpuModel = os.cpus()[0]?.model.trim() || 'Generic CPU';

        // Custom values
        const library = 'Baileys';
        const totalCommands = 210;
        const prefix = '.';

        // -------- Build Message (footer included) --------
        const statusMessage = `
🖥️  *BIGSTACK ENGINE STATUS*
Hey, I'm alive! 🟢

└── ▢ DATE      : ${dateStr}
└── ▢ TIME      : ${timeStr} EAT
└── ▢ UPTIME    : ${formatUptime(process.uptime())}
└── ▢ HOSTNAME  : ${hostname}
└── ▢ PLATFORM  : ${platform} 💻
└── ▢ RAM       : ${formattedRam}
└── ▢ NODE      : ${nodeVersion}
└── ▢ LIBRARY   : ${library}
└── ▢ COMMANDS  : ${totalCommands}
└── ▢ PREFIX    : ${prefix}
└── ▢ LATENCY   : ${latency}ms
└── ▢ CPU       : ${cpuModel}  [OK]

© bigmanj tech ™ with ♥︎`.trim();

        // -------- Send as interactive buttons (NO IMAGE) --------
        await sendButtons(sock, chatId, {
            title: '🟢 BIGSTACK ONLINE',
            text: statusMessage,
            footer: 'Powered by bigmanj tech',
            buttons: [
                { id: '.menu', text: '🆘 Menu' },
                { id: '.ping', text: '📡 Speed' },
                { id: '.owner', text: '👑 Support' }
            ]
        }, { quoted: msg });

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
        // Fallback: send plain text if buttons fail
        try {
            await sock.sendMessage(chatId, { text: '❌ Error occurred. Please try again later.' }, { quoted: msg });
        } catch (e) {}
    }
};

module.exports = aliveCommand;
module.exports.buttonHandlers = {
    // Buttons .menu, .ping, .owner are handled by your command prefix system
};
