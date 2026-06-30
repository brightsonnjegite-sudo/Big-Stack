// commands/update.js
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// Load settings
let settings = {};
try {
    settings = require('./settings');
} catch (e) {
    console.log('⚠️ settings.js not found');
}
const OWNER_NUMBER = (settings.ownerNumber || '255777580820').toString().replace(/\D/g, '');
console.log(`✅ Owner number from settings: ${OWNER_NUMBER}`);

function extractPhoneNumber(jid) {
    if (!jid) return null;
    let localPart = jid.split('@')[0];
    if (/^\d+$/.test(localPart) && localPart.length >= 10) {
        return localPart;
    }
    return null;
}

async function cycleReactions(sock, messageKey, reactions, delayMs = 2000) {
    for (const emoji of reactions) {
        await sock.sendMessage(messageKey.remoteJid, { react: { text: emoji, key: messageKey } });
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

async function updateCommand(sock, chatId, message, customUrl = null) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const senderNumber = extractPhoneNumber(senderId);
        
        let isOwner = false;
        if (senderNumber && senderNumber === OWNER_NUMBER) isOwner = true;
        else if (senderId === `${OWNER_NUMBER}@s.whatsapp.net`) isOwner = true;
        else if (senderId === OWNER_NUMBER) isOwner = true;
        if (message.key.fromMe) isOwner = true;

        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Samahani, ni owner pekee anayeruhusiwa kutumia hii command!\n\n${FOOTER}` 
            });
            return;
        }

        const mainRepo = 'https://github.com/brightsonnjegite-sudo/Big-Stack';
        let updateZipUrl;
        if (customUrl && customUrl.startsWith('http')) {
            updateZipUrl = customUrl.trim();
        } else if (customUrl === 'branch' && customUrl.split(' ')[1]) {
            const branch = customUrl.split(' ')[1] || 'main';
            updateZipUrl = `${mainRepo}/archive/refs/heads/${branch}.zip`;
        } else {
            updateZipUrl = `${mainRepo}/archive/refs/heads/main.zip`;
        }

        console.log(chalk.blue(`[BIGMANJ Update] Downloading from: ${updateZipUrl}`));

        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bigmanj_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // ─── SEND INITIAL MESSAGE ───
        const initialMsg = 
`└── ▢ 🚀 *BigStack UPDATE*

└── ▢ ──── *STATUS* ────
└── ▢ Action   : Update Started
└── ▢ Source   : ${updateZipUrl.substring(0, 40)}...
└── ▢ Status   : ⏳ Downloading...
└── ▢ Progress : [███████████████] 100%

📌 Fetching latest version...

${FOOTER}`;
        const sentMsg1 = await sock.sendMessage(chatId, { text: initialMsg });
        cycleReactions(sock, sentMsg1, ['🔄', '♻️'], 2000).catch(console.error);

        const response = await axios({
            method: 'get',
            url: updateZipUrl,
            responseType: 'stream',
            timeout: 90000,
            headers: { 'User-Agent': 'BIGMANJ-Bot/3.0' }
        }).catch(err => { throw new Error(`Download failed: ${err.message}`); });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        exec(`unzip -o ${zipPath} -d ${extractPath}`, async (err, stdout, stderr) => {
            if (err) {
                console.log(chalk.red("Extraction failed:"), stderr);
                const extractMsg = 
`└── ▢ ⚠️ *EXTRACTION WARNING*

└── ▢ Status : ⏳ Trying alternative method...
└── ▢ Method : Using AdmZip

📌 Please wait...`;
                await sock.sendMessage(chatId, { text: extractMsg });
                const AdmZip = require('adm-zip');
                try {
                    const zip = new AdmZip(zipPath);
                    zip.extractAllTo(extractPath, true);
                } catch (zipErr) {
                    const errorMsg = 
`└── ▢ ❌ *EXTRACTION FAILED*

└── ▢ Error : ${zipErr.message || 'Unknown error'}
└── ▢ Solution : apt install unzip -y

📌 Please install unzip and try again.

${FOOTER}`;
                    await sock.sendMessage(chatId, { text: errorMsg });
                    fs.removeSync(tmpDir);
                    return;
                }
            }

            try {
                const folders = fs.readdirSync(extractPath);
                if (folders.length === 0) throw new Error("No files extracted");
                let rootFolder = path.join(extractPath, folders[0]);
                while (fs.readdirSync(rootFolder).length === 1 && 
                       fs.statSync(path.join(rootFolder, fs.readdirSync(rootFolder)[0])).isDirectory()) {
                    rootFolder = path.join(rootFolder, fs.readdirSync(rootFolder)[0]);
                }

                const protectedItems = [
                    'node_modules', 'session', 'auth_info_baileys', 'sessions', '.git', '.env',
                    'config.js', 'settings.json', 'database.json', 'data/chatbot.json',
                    'data/chatbot_memory.json', 'data/user_prefs.json', 'data/stats.json',
                    'data/custom_responses.json', 'data/reminders.json'
                ];

                const files = fs.readdirSync(rootFolder);
                let copiedCount = 0, skippedCount = 0;

                for (const file of files) {
                    const shouldProtect = protectedItems.some(protected => 
                        file === protected || file.startsWith(protected + '/')
                    );
                    if (!shouldProtect && file !== 'BIGMANJ-XMD-main') {
                        const source = path.join(rootFolder, file);
                        const dest = path.join(process.cwd(), file);
                        if (fs.existsSync(source)) {
                            fs.copySync(source, dest, { overwrite: true });
                            copiedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                }

                const newPackagePath = path.join(rootFolder, 'package.json');
                const currentPackagePath = path.join(process.cwd(), 'package.json');
                if (fs.existsSync(newPackagePath)) {
                    const newPackage = require(newPackagePath);
                    const currentPackage = require(currentPackagePath);
                    if (newPackage.scripts && !currentPackage.scripts) {
                        currentPackage.scripts = newPackage.scripts;
                        fs.writeFileSync(currentPackagePath, JSON.stringify(currentPackage, null, 2));
                    }
                }

                fs.removeSync(tmpDir);

                // ─── SEND SUCCESS MESSAGE ───
                const successMsg = 
`└── ▢ ✅ *UPDATE SUCCESSFUL*

└── ▢ ──── *SUMMARY* ────
└── ▢ Files Copied   : ${copiedCount}
└── ▢ Files Protected: ${skippedCount}
└── ▢ Status         : ✅ Complete

└── ▢ ──── *RESTARTING* ────
└── ▢ Action : ⏳ Restarting...
└── ▢ Time   : In 5 seconds

📌 Bot will restart automatically.

${FOOTER}`;
                const sentMsg2 = await sock.sendMessage(chatId, { text: successMsg });
                cycleReactions(sock, sentMsg2, ['📡', '⌛', '⏳', '✅'], 2000).catch(console.error);

                console.log(chalk.green.bold('✅ BIGMANJ BOT V3 UPDATE SUCCESSFUL!'));
                console.log(chalk.yellow(`📁 ${copiedCount} files updated, ${skippedCount} files protected`));

                const flagFile = path.join(process.cwd(), 'data', 'update_just_done.flag');
                fs.ensureDirSync(path.dirname(flagFile));
                fs.writeFileSync(flagFile, JSON.stringify({
                    timestamp: Date.now(),
                    chatId: chatId
                }));

                setTimeout(() => {
                    console.log(chalk.yellow('🔄 Restarting BIGMANJ Bot...'));
                    process.exit(0);
                }, 5000);

            } catch (copyErr) {
                console.error(chalk.red("Copy error:"), copyErr);
                const errorMsg = 
`└── ▢ ❌ *UPDATE FAILED*

└── ▢ Error : ${copyErr.message || 'Unknown error'}
└── ▢ Solution : Contact bot owner.

📌 Please try again later.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: errorMsg });
                fs.removeSync(tmpDir);
            }
        });

    } catch (err) {
        console.error(chalk.red("Update Error:"), err.message);
        const errorMsg = 
`└── ▢ ❌ *UPDATE FAILED*

└── ▢ Error : ${err.message || 'Unknown error'}
└── ▢ Possible Issues:
└── ▢   • Repo is private or unavailable
└── ▢   • Connection timeout
└── ▢   • Missing unzip on server

📌 Try again later.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }).catch(() => {});
    }
}

async function checkVersion(sock, chatId, message) {
    try {
        const packageJson = require(path.join(process.cwd(), 'package.json'));
        const currentVersion = packageJson.version || '3.0.0';
        
        try {
            const apiUrl = 'https://api.github.com/repos/brightsonnjegite-sudo/BIGMANJ-XMD/commits/main';
            const response = await axios.get(apiUrl, { timeout: 5000 });
            const latestCommit = response.data;
            const lastUpdate = new Date(latestCommit.commit.author.date).toLocaleString();
            
            const versionMsg = 
`└── ▢ 🤖 *BigStack version info*

└── ▢ ──── *VERSION INFO* ────
└── ▢ Current     : ${currentVersion}
└── ▢ Repository  : bigStacK
└── ▢ Latest      : ${lastUpdate}
└── ▢ Commit      : ${latestCommit.commit.message.slice(0, 40)}...

└── ▢ ──── *COMMANDS* ────
└── ▢ .update              - Update to latest
└── ▢ .update branch [name] - Update from branch
└── ▢ .version             - Check status
└── ▢ .update [url]        - Custom URL

📌 Bot is running smoothly! 🚀

${FOOTER}`;
            await sock.sendMessage(chatId, { text: versionMsg });
        } catch (err) {
            const versionMsg = 
`└── ▢ 🤖 *BigStack Version*

└── ▢ Version    : ${currentVersion}
└── ▢ Status     : ⚠️ Unable to check remote updates

📌 Bot is running locally.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: versionMsg });
        }
    } catch (err) {
        console.error("Version check error:", err);
    }
}

module.exports = { updateCommand, checkVersion };
