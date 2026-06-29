const isOwnerOrSudo = require('../lib/isOwner');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const REMINDER_FILE = path.join(__dirname, '../data/updateReminder.json');
const VERSION_FILE = path.join(__dirname, '../data/currentVersion.json');
const LOCAL_MANIFEST_FILE = path.join(__dirname, '../data/localManifest.json');
const REPO_OWNER = 'brightsonnjegite-sudo';
const REPO_NAME = 'Mickey-Glitch';

let reminderCache = null;

async function loadReminder() {
    if (reminderCache) return reminderCache;
    try {
        const data = await fs.readFile(REMINDER_FILE, 'utf8');
        reminderCache = JSON.parse(data);
    } catch {
        reminderCache = { lastCheck: null, updateFound: false, updateHash: null, autoReminder: false };
        await saveReminder();
    }
    return reminderCache;
}

async function saveReminder() {
    try {
        await fs.mkdir(path.dirname(REMINDER_FILE), { recursive: true });
        await fs.writeFile(REMINDER_FILE, JSON.stringify(reminderCache, null, 2));
    } catch (err) {
        console.error('[UpdateReminder] Save failed:', err.message);
    }
}

// ========== SCAN ALL FILES & FOLDERS ==========
async function scanAllFiles(rootDir) {
    const ignoreDirs = new Set([
        'node_modules', '.git', 'data', 'auth_info', 'tmp', 'logs',
        'session', 'cache', 'uploads', 'temp', 'assets', 'public'
    ]);
    const ignoreFiles = new Set([
        '.env', '.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'thumbs.db', 'desktop.ini', '.gitignore', '.gitattributes', '.editorconfig'
    ]);
    const includeExtensions = new Set([
        '.js', '.json', '.md', '.txt', '.example', '.yml', '.yaml',
        '.html', '.css', '.xml', '.svg', '.ico', '.png', '.jpg', '.jpeg',
        '.gif', '.webp', '.ttf', '.otf', '.woff', '.woff2', '.eot',
        '.sh', '.bat', '.cmd', '.ps1', '.py', '.rb', '.go', '.java', '.c', '.cpp'
    ]);
    // Always include these specific files even if extension not in list
    const alwaysInclude = new Set([
        'Procfile', '.env.example', 'Dockerfile', 'config', 'settings',
        'package.json', 'tsconfig.json', 'webpack.config.js', 'rollup.config.js'
    ]);

    const fileList = [];

    async function walk(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (ignoreDirs.has(entry.name)) continue;
            if (ignoreFiles.has(entry.name)) continue;
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                const shouldInclude = includeExtensions.has(ext) || alwaysInclude.has(entry.name);
                if (shouldInclude) {
                    fileList.push(fullPath);
                }
            }
        }
    }

    await walk(rootDir);
    return fileList;
}

// ========== COMPUTE MANIFEST (hash, size, mtime) ==========
async function computeManifest(files) {
    const manifest = {};
    for (const file of files) {
        try {
            const stat = await fs.stat(file);
            // Read file content to compute hash
            const content = await fs.readFile(file);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            manifest[file] = {
                hash,
                size: stat.size,
                mtime: stat.mtimeMs
            };
        } catch {
            // skip
        }
    }
    return manifest;
}

// ========== LOAD STORED MANIFEST ==========
async function loadStoredManifest() {
    try {
        const data = await fs.readFile(LOCAL_MANIFEST_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function saveManifest(manifest) {
    await fs.mkdir(path.dirname(LOCAL_MANIFEST_FILE), { recursive: true });
    await fs.writeFile(LOCAL_MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

// ========== CHECK LOCAL CHANGES (LIST CHANGED FILES) ==========
async function checkLocalChanges() {
    const rootDir = path.join(__dirname, '..');
    const files = await scanAllFiles(rootDir);
    const currentManifest = await computeManifest(files);
    const storedManifest = await loadStoredManifest();

    if (!storedManifest) {
        // First run: save and return no changes
        await saveManifest(currentManifest);
        return { changed: false, changedFiles: [], currentManifest };
    }

    const changedFiles = [];
    const allKeys = new Set([...Object.keys(currentManifest), ...Object.keys(storedManifest)]);
    for (const key of allKeys) {
        const current = currentManifest[key];
        const stored = storedManifest[key];
        if (!current || !stored || current.hash !== stored.hash) {
            changedFiles.push(key);
        }
    }

    return {
        changed: changedFiles.length > 0,
        changedFiles,
        currentManifest
    };
}

// ========== REMOTE CHECK (GITHUB) ==========
async function getLatestCommit() {
    const repoInfo = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: { 'User-Agent': 'MickeyBot' },
        timeout: 5000
    });
    const defaultBranch = repoInfo.data.default_branch;
    const commitRes = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${defaultBranch}`, {
        headers: { 'User-Agent': 'MickeyBot' },
        timeout: 5000
    });
    return { sha: commitRes.data.sha, branch: defaultBranch };
}

async function getStoredVersion() {
    try {
        const data = await fs.readFile(VERSION_FILE, 'utf8');
        return JSON.parse(data).sha;
    } catch {
        return null;
    }
}

async function saveVersion(sha) {
    await fs.mkdir(path.dirname(VERSION_FILE), { recursive: true });
    await fs.writeFile(VERSION_FILE, JSON.stringify({ sha, updatedAt: new Date().toISOString() }, null, 2));
}

async function checkRemoteUpdates() {
    try {
        const { sha: latestSha, branch } = await getLatestCommit();
        let currentSha = await getStoredVersion();
        if (!currentSha) {
            await saveVersion(latestSha);
            return { available: false, latestSha, currentSha, branch };
        }
        const available = currentSha !== latestSha;
        let changedFiles = [];
        if (available) {
            const compareRes = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/${currentSha}...${latestSha}`, {
                headers: { 'User-Agent': 'MickeyBot' },
                timeout: 5000
            });
            changedFiles = compareRes.data.files.map(f => f.filename);
        }
        return { available, latestSha, currentSha, branch, changedFiles };
    } catch (err) {
        console.error('Remote check error:', err);
        return { available: false, error: err.message };
    }
}

// ========== FORMAT OUTPUT ==========
function formatUpdateInfo(localResult, remoteResult) {
    let output = '';

    // Local changes
    if (localResult.changed) {
        output += `📁 *MABADILIKO YA NDANI (LOCAL)*\n`;
        output += `Faili zilizobadilika: ${localResult.changedFiles.length}\n`;
        const maxShow = 20;
        const showFiles = localResult.changedFiles.slice(0, maxShow);
        for (const file of showFiles) {
            const relative = path.relative(path.join(__dirname, '..'), file);
            output += `  • ${relative}\n`;
        }
        if (localResult.changedFiles.length > maxShow) {
            output += `  ... na ${localResult.changedFiles.length - maxShow} zingine\n`;
        }
        output += `\n💡 *Suluhisho:* Tumia \`.checkupdates resetlocal\` baada ya kuhakiki.\n\n`;
    } else {
        output += `✅ *Hakuna mabadiliko ya ndani (local)*\n\n`;
    }

    // Remote updates
    if (remoteResult.error) {
        output += `❌ *Imeshindwa kuangalia GitHub:* ${remoteResult.error}\n\n`;
    } else if (remoteResult.available) {
        output += `🔄 *UPDATE INAPATIKANA KUTOKA GITHUB!*\n`;
        output += `Toleo lako: \`${remoteResult.currentSha?.slice(0,7) || 'unknown'}\`\n`;
        output += `Toleo jipya: \`${remoteResult.latestSha.slice(0,7)}\`\n`;
        output += `Tawi: ${remoteResult.branch}\n`;
        if (remoteResult.changedFiles && remoteResult.changedFiles.length) {
            output += `\n📝 Faili zilizobadilika:\n`;
            const maxShow = 20;
            const showFiles = remoteResult.changedFiles.slice(0, maxShow);
            for (const file of showFiles) {
                output += `  • ${file}\n`;
            }
            if (remoteResult.changedFiles.length > maxShow) {
                output += `  ... na ${remoteResult.changedFiles.length - maxShow} zingine\n`;
            }
        }
        output += `\n💡 Baada ya kupakua, tumia \`.checkupdates resetlocal\`\n`;
    } else {
        output += `✅ *Bot iko updated (remote)!*\nToleo: \`${remoteResult.currentSha?.slice(0,7) || 'unknown'}\``;
    }

    return output;
}

// ========== MAIN COMMAND ==========
async function checkUpdatesCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: 'Owner pekee ndiye anaweza kutumia .checkupdates' }, { quoted: message });
        return;
    }

    const reminder = await loadReminder();
    const cmd = (args[0] || '').toLowerCase();

    if (cmd === 'auto') {
        reminder.autoReminder = !reminder.autoReminder;
        await saveReminder();
        await sock.sendMessage(chatId, {
            text: `✅ Kumbusho la kiotomatiki ${reminder.autoReminder ? 'LIMEWASHWA' : 'IMEZIMWA'}`
        }, { quoted: message });
        return;
    }

    if (cmd === 'status') {
        const status = reminder.autoReminder ? '✅ LIMEWASHWA' : '❌ IMEZIMWA';
        await sock.sendMessage(chatId, {
            text: `📢 *Hali ya kumbusho:* ${status}\n\nTumia .checkupdates auto kugeuza.`
        }, { quoted: message });
        return;
    }

    if (cmd === 'reset') {
        try {
            const { sha, branch } = await getLatestCommit();
            await saveVersion(sha);
            await sock.sendMessage(chatId, {
                text: `✅ *Toleo limewekwa upya (remote)*\nToleo jipya: \`${sha.slice(0,7)}\` (tawi: ${branch})`
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `❌ Imeshindwa kuweka upya: ${err.message}` }, { quoted: message });
        }
        return;
    }

    if (cmd === 'resetlocal') {
        try {
            // Re-scan and save new manifest
            const rootDir = path.join(__dirname, '..');
            const files = await scanAllFiles(rootDir);
            const manifest = await computeManifest(files);
            await saveManifest(manifest);
            await sock.sendMessage(chatId, {
                text: `✅ *Hali ya ndani imewekwa upya* (manifest imeboreshwa)`
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `❌ Imeshindwa: ${err.message}` }, { quoted: message });
        }
        return;
    }

    try {
        // Run both checks in parallel
        const [localResult, remoteResult] = await Promise.all([
            checkLocalChanges(),
            checkRemoteUpdates()
        ]);

        const updateMsg = formatUpdateInfo(localResult, remoteResult);
        await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });

        // Handle auto-reminder
        if (remoteResult.available && reminder.autoReminder) {
            const hash = remoteResult.latestSha.slice(0, 10);
            if (hash !== reminder.updateHash) {
                reminder.updateHash = hash;
                reminder.updateFound = true;
                reminder.lastCheck = new Date().toISOString();
                await saveReminder();
                await sock.sendMessage(chatId, {
                    text: `🔔 *KUMBUKA:* Kuna update ya GitHub. Tumia .checkupdates reset baada ya kupakua.`
                });
            }
        } else if (!remoteResult.available && !remoteResult.error) {
            reminder.updateFound = false;
            reminder.updateHash = null;
            await saveReminder();
        }
    } catch (err) {
        console.error('CheckUpdates failed:', err);
        await sock.sendMessage(chatId, {
            text: `❌ *Imeshindwa kuangalia updates*\n\nHitilafu: ${err.message || err}`
        }, { quoted: message });
    }
}

module.exports = checkUpdatesCommand;
