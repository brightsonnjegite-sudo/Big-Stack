const { exec } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');

async function updateCommand(sock, chatId, message, zipUrl) {
    try {
        // Fix ya participant error: Angalia kama ni owner kwa usalama
        const isOwner = message.key.fromMe;
        if (!isOwner) return await sock.sendMessage(chatId, { text: "❌ *ACCESS DENIED*" });

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const repoUrl = "https://github.com/Mickeydeveloper/Mickey-Glitch";
        const updateZipUrl = zipUrl || `${repoUrl}/archive/refs/heads/main.zip`;
        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        // --- FIXED DOWNLOAD LOGIC ---
        console.log(chalk.blue(`[Update] Downloading from: ${updateZipUrl}`));
        
        const response = await axios({ 
            method: 'get', 
            url: updateZipUrl, 
            responseType: 'stream',
            timeout: 60000 // Ongeza muda wa kusubiri download
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                console.error(chalk.red("Download error:"), err.message);
                reject(err);
            });
        });

        // Extraction
        await sock.sendMessage(chatId, { text: "📦 *Extracting & Overwriting...*" });

        exec(`unzip -o ${zipPath} -d ${extractPath}`, (err) => {
            if (err) {
                console.log(chalk.red("Unzip failed, trying manual copy..."));
                // Unaweza kuongeza fallback hapa kama unzip haipo kwenye panel
            }

            if (!fs.existsSync(extractPath)) {
                throw new Error("Folder la extraction halikupatikana.");
            }

            const folders = fs.readdirSync(extractPath);
            const rootFolder = path.join(extractPath, folders[0]); 
            const ignore = ['node_modules', 'session', 'auth_info_baileys', '.git', 'settings.js', 'config.js', '.env'];

            const files = fs.readdirSync(rootFolder);
            for (const file of files) {
                if (!ignore.includes(file)) {
                    fs.copySync(path.join(rootFolder, file), path.join(process.cwd(), file), { overwrite: true });
                }
            }

            fs.removeSync(tmpDir);

            sock.sendMessage(chatId, { text: "✅ *Update Imekamilika!*\n\nBot itajizima na kuwaka upya sasa hivi." });
            console.log(chalk.green.bold('📢 UPDATE SUCCESSFUL! RESTARTING...'));

            setTimeout(() => {
                process.exit(1); 
            }, 3000);
        });

    } catch (err) {
        console.error(chalk.red("Update Error:"), err);
        // Hapa tunazuia bot isi-crash kama URL ni mbaya
        const errorMsg = err.code === 'ERR_INVALID_URL' ? "URL ya update siyo sahihi." : err.message;
        await sock.sendMessage(chatId, { text: `❌ *Update Failed:* ${errorMsg}` }).catch(() => {});
    }
}

module.exports = updateCommand;
