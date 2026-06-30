/**
 * .stats command - Show system statistics
 * Usage: .stats
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ─── Helper: Format uptime ───
function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return { days: d, hours: h, minutes: m, seconds: s };
}

// ─── Helper: Progress bar ───
function makeBar(percent, length = 10) {
    const filled = Math.round((Math.min(100, percent) / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

// ─── Helper: Count commands ───
function countCommands() {
    try {
        const cmdDir = path.join(process.cwd(), 'commands');
        if (!fs.existsSync(cmdDir)) return 0;
        const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'));
        return files.length;
    } catch {
        return 0;
    }
}

// ─── Helper: Count libraries from package.json ───
function countLibraries() {
    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(pkgPath)) return 0;
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = pkg.dependencies || {};
        return Object.keys(deps).length;
    } catch {
        return 0;
    }
}

// ─── Helper: Count data files ───
function countDataFiles() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) return 0;
        return fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).length;
    } catch {
        return 0;
    }
}

module.exports = async (sock, chatId, senderId, args, m) => {
    try {
        // ─── System Info ───
        const memUsage = process.memoryUsage();
        const totalRam = (memUsage.rss / 1024 / 1024).toFixed(2);
        const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024).toFixed(2);
        const totalSystemRam = (os.totalmem() / 1024 / 1024).toFixed(2);
        const ramPercent = ((parseFloat(totalRam) / parseFloat(totalSystemRam)) * 100).toFixed(1);

        const uptime = formatUptime(process.uptime());
        const nodeVer = process.version;
        const platform = os.platform();
        const cores = os.cpus().length;

        // ─── Registry Stats ───
        const commands = countCommands();
        const libraries = countLibraries();
        const dataFiles = countDataFiles();
        const handlers = 6; // approximate, can be made dynamic

        // ─── Build Message ───
        const msg = 
`└── ▢ 📊 *SYSTEM STATS*

└── ▢ ──── *📁 REGISTRY* ────
└── ▢ 📦 Commands  : ${commands}
└── ▢ 📚 Libraries : ${libraries}
└── ▢ 📄 Data Files: ${dataFiles}
└── ▢ ⚙️ Handlers   : ${handlers}

└── ▢ ──── *💾 MEMORY* ────
└── ▢ 🧠 Total RAM : ${totalRam} MB
└── ▢ 🔥 Heap Used : ${heapUsed} MB
└── ▢ 🆓 Free RAM  : ${freeRam} MB
└── ▢ 📊 Usage     : ${makeBar(parseFloat(ramPercent))} ${ramPercent}%

└── ▢ ──── *⏱️ UPTIME* ────
└── ▢ 🕐 ${uptime.days}d ${uptime.hours}h ${uptime.minutes}m ${uptime.seconds}s

└── ▢ ──── *🔧 SYSTEM* ────
└── ▢ 🟢 Node      : ${nodeVer}
└── ▢ 💻 Platform  : ${platform}
└── ▢ 🖥️ Cores     : ${cores}
└── ▢ ✅ Status    : 🟢 Operational

📌 Last updated: ${new Date().toLocaleTimeString()}

${FOOTER}`;

        await sock.sendMessage(chatId, { text: msg });

    } catch (e) {
        console.error('Stats error:', e);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ ${e.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
};
