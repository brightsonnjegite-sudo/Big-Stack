/**
 * 🤖 BigStack - MAIN HANDLER WITH MANUAL IMPORTS ONLY
 * Clean & Optimized Version - No Auto-Loading
 */

// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
const customTmp = path.join(process.cwd(), 'tmp');

// Create folders if they don't exist
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
if (!fs.existsSync(customTmp)) fs.mkdirSync(customTmp, { recursive: true });

process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// 🧹 AGGRESSIVE temp cleanup - Every 2 minutes - DELETE ALL FILES
setInterval(() => {
  const foldersToClean = [customTemp, customTmp];

  foldersToClean.forEach(folder => {
    fs.readdir(folder, (err, files) => {
      if (err) return;

      files.forEach(file => {
        const filePath = path.join(folder, file);
        try {
          fs.rmSync(filePath, { recursive: true, force: true });
        } catch (e) {
          // Silent fail
        }
      });
    });
  });
}, 2 * 60 * 1000); // 2 minutes

const settings = require('./settings');
require('./config.js');

// MANUAL IMPORTS ONLY - No auto-loading
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { autoBioCommand } = require('./commands/autobio');

// Command imports
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/menu');
const banCommand = require('./commands/ban');
const addCommand = require('./commands/add');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const gpstatusCommand = require('./commands/gpstatus');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
// tictactoe command removed
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');

// (removed antileft feature) in-memory set no longer used
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand, groupMentionToggleCommand } = require('./commands/mention');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const weatherCommand = require('./commands/weather');
const reportCommand = require('./commands/report');
const halotelCommand = require('./commands/halotel');
const kickCommand = require('./commands/kick');
// quote command removed
const { complimentCommand } = require('./commands/compliment');
// insult command removed
const { lyricsCommand } = require('./commands/lyrics');
// truth command removed
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
// Welcome command removed. Previously: ./commands/welcome
// github command removed
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');

// antileft command removed

const takeCommand = require('./commands/take');
// flirt command removed
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
// simp command removed
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const aiCommand = require('./commands/ai');
const aiVoiceCommand = require('./commands/ai');
const { handleChatbotMessage, groupChatbotToggleCommand } = require('./commands/chatbot');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');

const stickercropCommand = require('./commands/stickercrop');
const mickeyCommand = require('./commands/Mickey');
const { updateCommand } = require('./commands/update');
const checkUpdatesCommand = require('./commands/checkupdates');
const { igsCommand } = require('./commands/igs');
const { anticallCommand, readState: readAnticallState } = require('./commands/anticall');
const { pinCommand, verifyPinCommand, checkPinVerification } = require('./commands/pin');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const newgroupCommand = require('./commands/newgroup');
const gdriveCommand = require('./commands/gdrive');
const getcodeCommand = require('./commands/getcode');
const getlinkCommand = require('./commands/getlink');
const shazamCommand = require('./commands/shazam');
const repoCommand = require('./commands/repo');
const statsCommand = require('./commands/stats');
const stickerAltCommand = require('./commands/sticker-alt');

// ========== MINI-MENU IMPORTS ==========
const menuGeneral = require('./commands/menu-general');
const menuGroup = require('./commands/menu-group');
const menuModeration = require('./commands/menu-moderation');
const menuMedia = require('./commands/menu-media');
const menuAI = require('./commands/menu-ai');
const menuOwner = require('./commands/menu-owner');
const menuOther = require('./commands/menu-other');
const menuAll = require('./commands/menu-all');

// ========== BUY COMMANDS IMPORTS (Destructuring) ==========
const { buyCommand, buyNowCommand, contactOwnerCommand, buttonHandlers: buyButtonHandlers } = require('./commands/buy');

// ========== OTHER NEW COMMANDS IMPORTS ==========
const supportCommand = require('./commands/support');
const getppCommand = require('./commands/getpp');
const toimgCommand = require('./commands/toimg');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
global.ytch = "MICKEY";

// Load special handlers for background processing
global.autostatusHandler = require(path.join(process.cwd(), 'commands', 'autostatus.js'));

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Handle autoread functionality
        await handleAutoread(sock, message);

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Handle all button responses (static + command buttons)
        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            console.log(`🔘 Button pressed: ${buttonId}`);

            // Predefined button handlers
            const buttonHandlers = {
                'channel': async () => {
                    await sock.sendMessage(chatId, {
                        text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A'
                    }, { quoted: message });
                },
                'owner': async () => {
                    const ownerCommand = require('./commands/owner');
                    await ownerCommand(sock, chatId, message);
                },
                'support': async () => {
                    await sock.sendMessage(chatId, {
                        text: `🔗 *Support Group*\n\nJoin our support community:\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7`
                    }, { quoted: message });
                },
                // ✅ BUY BUTTON HANDLERS
                'buynow': async () => {
                    try {
                        if (buyButtonHandlers && buyButtonHandlers.buynow) {
                            await buyButtonHandlers.buynow(sock, chatId, message);
                        } else {
                            await buyNowCommand(sock, chatId, message);
                        }
                    } catch (e) {
                        console.error('Buynow handler error:', e);
                        await sock.sendMessage(chatId, { text: '💰 Buy Now\n\nContact owner: wa.me/255636756591' }, { quoted: message });
                    }
                },
                'contactowner': async () => {
                    try {
                        if (buyButtonHandlers && buyButtonHandlers.contactowner) {
                            await buyButtonHandlers.contactowner(sock, chatId, message);
                        } else {
                            await contactOwnerCommand(sock, chatId, message);
                        }
                    } catch (e) {
                        console.error('Contactowner handler error:', e);
                        await sock.sendMessage(chatId, { text: '📲 Contact Owner\n\nwa.me/255636756591' }, { quoted: message });
                    }
                },
                // ✅ TEAM SUPPORT (from menu)
                'team_support': async () => {
                    try {
                        const menuModule = require('./commands/menu');
                        if (menuModule.buttonHandlers && menuModule.buttonHandlers.team_support) {
                            await menuModule.buttonHandlers.team_support(sock, chatId, message);
                        } else {
                            await sock.sendMessage(chatId, {
                                text: `👥 *Team Support*\n\nJoin our support community:\n🔗 https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7\n\n📌 Contact Owner:\n📱 wa.me/255777580820`
                            }, { quoted: message });
                        }
                    } catch (e) {
                        console.error('Team support handler error:', e);
                        await sock.sendMessage(chatId, {
                            text: `👥 *Team Support*\n\nJoin our support community:\n🔗 https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7`
                        }, { quoted: message });
                    }
                },
                'buy_bot': async () => {
                    try {
                        const menuModule = require('./commands/menu');
                        if (menuModule.buttonHandlers && menuModule.buttonHandlers.buy_bot) {
                            await menuModule.buttonHandlers.buy_bot(sock, chatId, message);
                        } else {
                            await buyCommand(sock, chatId, message);
                        }
                    } catch (e) {
                        console.error('Buy bot handler error:', e);
                        await sock.sendMessage(chatId, {
                            text: `💎 *Buy Bot Script*\n\nContact owner: wa.me/255636756591`
                        }, { quoted: message });
                    }
                }
            };

            // Try predefined handlers first
            if (buttonHandlers[buttonId]) {
                try {
                    await buttonHandlers[buttonId]();
                    return;
                } catch (e) {
                    console.error(`Error handling button ${buttonId}:`, e);
                }
            }

            // Handle quick-reply buttons that start with . (commands)
            if (buttonId && (buttonId.startsWith('.') || buttonId === 'msgowner' || buttonId === '.msgowner')) {
                try {
                    if (buttonId === '.msgowner' || buttonId === 'msgowner') {
                        const settings = require('./settings');
                        const ownerNumber = settings.ownerNumber || '';
                        if (ownerNumber) {
                            await sock.sendMessage(chatId, {
                                text: `💬 You can message the owner here:\nhttps://wa.me/${ownerNumber}`
                            }, { quoted: message });
                        } else {
                            await sock.sendMessage(chatId, {
                                text: '💬 Owner number is not configured.'
                            }, { quoted: message });
                        }
                        return;
                    }

                    console.log(`🔄 Button command intercepted: ${buttonId}`);
                    userMessage = buttonId.toLowerCase();
                } catch (e) {
                    console.error(`Error handling command button ${buttonId}:`, e);
                    return;
                }
            } else {
                console.log(`⚠️ Unhandled button: ${buttonId}`);
                return;
            }
        }

        let userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Only log command usage
        if (userMessage.startsWith('.')) {
            console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }

        // Read bot mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
        }
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // Check if user is banned
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.'
                });
            }
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Check for bad words and antilink FIRST
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            await Antilink(message, sock);
        }

        // PM blocker
        if (!isGroup && !message.key.fromMe && !senderIsOwnerOrSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        // Then check for command prefix
        if (!userMessage.startsWith('.')) {
            // Allow running commands without '.' prefix
            try {
                const firstToken = (userMessage.split(' ')[0] || '').replace(/[^a-z0-9\-_]/gi, '').toLowerCase();
                const knownCommands = helpCommand.getAllCommands ? helpCommand.getAllCommands() : [];
                if (firstToken && knownCommands.includes(firstToken)) {
                    userMessage = '.' + userMessage;
                }
            } catch (e) { }

            // If userMessage is still not a command
            if (!userMessage.startsWith('.')) {
                await handleAutotypingForMessage(sock, chatId, userMessage);

                if (isGroup) {
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }

                try {
                    if (typeof handleChatbotMessage === 'function') {
                        await handleChatbotMessage(sock, chatId, message, userMessage);
                    }
                } catch (e) {
                    console.error('handleChatbotMessage error:', e?.message || e);
                }
                return;
            }
        }

        // In private mode, only owner/sudo can run commands
        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

        // List of admin commands
        const adminCommands = ['.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick', '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag', '.setgdesc', '.setgname', '.setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = ['.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp', '.pp', '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.' }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('.mute') ||
                userMessage === '.unmute' ||
                userMessage.startsWith('.ban') ||
                userMessage.startsWith('.unban') ||
                userMessage.startsWith('.promote') ||
                userMessage.startsWith('.demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Sorry, only group admins can use this command.'
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
                return;
            }
        }

        let commandExecuted = false;

        // PIN Security Check
        const allowWithoutPin = userMessage.startsWith('.pin');
        if (!allowWithoutPin) {
            try {
                const pinVerified = await checkPinVerification(senderId);
                if (!pinVerified) {
                    await sock.sendMessage(chatId, {
                        text: `🔐 *PIN REQUIRED*\n\nThis bot requires PIN authorization.\n\n📌 Command: .pin <pincode>`
                    }, { quoted: message });
                    return;
                }
            } catch (pinError) {
                console.error('PIN verification error:', pinError);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // SWITCH CASE - ALL COMMANDS
        // ═══════════════════════════════════════════════════════════
        switch (true) {
            case userMessage.startsWith('.add'):
                const addArgs = userMessage.trim().split(/\s+/);
                const phoneNumber = addArgs.slice(1).join(' ').trim();
                await addCommand(sock, chatId, senderId, phoneNumber, message);
                break;
            case userMessage.startsWith('.kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
                break;
            case userMessage.startsWith('.mute'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const muteArg = parts[1];
                    const muteDuration = muteArg !== undefined ? parseInt(muteArg, 10) : undefined;
                    if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid number of minutes or use .mute with no number to mute immediately.' }, { quoted: message });
                    } else {
                        await muteCommand(sock, chatId, senderId, message, muteDuration);
                    }
                }
                break;
            case userMessage === '.unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('.ban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.unban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .unban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '.ping':
                await pingCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.pin'):
                {
                    const pinArgs = userMessage.split(' ').slice(1);
                    if (pinArgs[0] && /^\d+$/.test(pinArgs[0])) {
                        await verifyPinCommand(sock, chatId, message, pinArgs[0]);
                    } else {
                        await pinCommand(sock, chatId, message, pinArgs);
                    }
                }
                commandExecuted = true;
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list' || userMessage === '.cmd' || userMessage === '.commands':
                await helpCommand(sock, chatId, message, userMessage);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.gpstatus':
                await gpstatusCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                break;
            case userMessage.startsWith('.warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                break;
            case userMessage.startsWith('.tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                break;
            case userMessage.startsWith('.delete') || userMessage.startsWith('.del'):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage === '.settings':
                await settingsCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mode'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only bot owner can use this command!' }, { quoted: message });
                    return;
                }
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error reading access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to read bot mode status' });
                    return;
                }
                const action = userMessage.split(' ')[1]?.toLowerCase();
                if (!action) {
                    const currentMode = data.isPublic ? 'public' : 'private';
                    await sock.sendMessage(chatId, {
                        text: `Current bot mode: *${currentMode}*\n\nUsage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only`
                    }, { quoted: message });
                    return;
                }
                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: 'Usage: .mode public/private\n\nExample:\n.mode public - Allow everyone to use bot\n.mode private - Restrict to owner only'
                    }, { quoted: message });
                    return;
                }
                try {
                    data.isPublic = action === 'public';
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
                    await sock.sendMessage(chatId, { text: `Bot is now in *${action}* mode` });
                } catch (error) {
                    console.error('Error updating access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to update bot access mode' });
                }
                break;
            case userMessage.startsWith('.anticall'):
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Only owner/sudo can use anticall.' }, { quoted: message });
                    break;
                }
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await anticallCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.pmblocker'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.bigmanj'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await groupChatbotToggleCommand(sock, chatId, message, args);
                }
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                break;
            case userMessage === '.tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                try {
                    if (message?.key?.remoteJid && message?.key?.id) {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: message.key.id,
                                participant: senderId
                            }
                        });
                    }
                } catch (err) { }
                break;
            case userMessage === '.tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.hidetag'):
                {
                    const messageText = rawText.slice(8).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                break;
            case userMessage.startsWith('.tag'):
                const messageText = rawText.slice(4).trim();
                const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                await tagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                break;
            case userMessage.startsWith('.antilink'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
                    return;
                }
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('.antitag'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('.weather'):
                const city = userMessage.slice(9).trim();
                if (city) {
                    await weatherCommand(sock, chatId, message, city);
                } else {
                    await sock.sendMessage(chatId, { text: 'Please specify a city, e.g., .weather London' }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.report'):
                {
                    const reportArgs = userMessage.slice(7).trim();
                    await reportCommand(sock, chatId, message, reportArgs);
                }
                break;
            case userMessage.startsWith('.halotel'):
                await halotelCommand(sock, chatId, message, userMessage);
                break;
            case userMessage === '.topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case userMessage.startsWith('.compliment'):
                await complimentCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.lyrics'):
                const songTitle = userMessage.split(' ').slice(1).join(' ');
                await lyricsCommand(sock, chatId, songTitle, message);
                break;
            case userMessage === '.clear':
                if (isGroup) await clearCommand(sock, chatId);
                break;
            case userMessage.startsWith('.promote'):
                const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await promoteCommand(sock, chatId, mentionedJidListPromote, message);
                break;
            case userMessage.startsWith('.demote'):
                const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await demoteCommand(sock, chatId, mentionedJidListDemote, message);
                break;
            case userMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.mention '):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await mentionToggleCommand(sock, chatId, message, args, isOwner);
                }
                break;
            case userMessage.startsWith('.autobio'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await autoBioCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.gmention '):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await groupMentionToggleCommand(sock, chatId, message, args);
                }
                break;
            case userMessage === '.setmention':
                {
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await setMentionCommand(sock, chatId, message, isOwner);
                }
                break;
            case userMessage.startsWith('.blur'):
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                await blurCommand(sock, chatId, message, quotedMessage);
                break;
            case userMessage.startsWith('.welcome'):
                if (isGroup) {
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }
                    if (isSenderAdmin || message.key.fromMe) {
                        await sock.sendMessage(chatId, { text: '⚠️ The welcome command is currently disabled.' }, { quoted: message });
                    } else {
                        await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.' }, { quoted: message });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' }, { quoted: message });
                    return;
                }
                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*' }, { quoted: message });
                    return;
                }
                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
                {
                    const isSteal = userMessage.startsWith('.steal');
                    const sliceLen = isSteal ? 6 : 5;
                    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
                    await takeCommand(sock, chatId, message, takeArgs);
                }
                break;
            case userMessage.startsWith('.character'):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.waste'):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' }, { quoted: message });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' }, { quoted: message });
                    return;
                }
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tourl') || userMessage.startsWith('.url'):
                await urlCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.emojimix') || userMessage.startsWith('.emix'):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tg') || userMessage.startsWith('.stickertelegram') || userMessage.startsWith('.tgsticker') || userMessage.startsWith('.telesticker'):
                await stickerTelegramCommand(sock, chatId, message);
                break;
            case userMessage === '.vv':
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === '.clearsession' || userMessage === '.clearsesi':
                await clearSessionCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.autostatus'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, message, autoStatusArgs);
                break;
            case userMessage.startsWith('.metallic'):
                await textmakerCommand(sock, chatId, message, userMessage, 'metallic');
                break;
            case userMessage.startsWith('.ice'):
                await textmakerCommand(sock, chatId, message, userMessage, 'ice');
                break;
            case userMessage.startsWith('.snow'):
                await textmakerCommand(sock, chatId, message, userMessage, 'snow');
                break;
            case userMessage.startsWith('.impressive'):
                await textmakerCommand(sock, chatId, message, userMessage, 'impressive');
                break;
            case userMessage.startsWith('.matrix'):
                await textmakerCommand(sock, chatId, message, userMessage, 'matrix');
                break;
            case userMessage.startsWith('.light'):
                await textmakerCommand(sock, chatId, message, userMessage, 'light');
                break;
            case userMessage.startsWith('.neon'):
                await textmakerCommand(sock, chatId, message, userMessage, 'neon');
                break;
            case userMessage.startsWith('.devil'):
                await textmakerCommand(sock, chatId, message, userMessage, 'devil');
                break;
            case userMessage.startsWith('.purple'):
                await textmakerCommand(sock, chatId, message, userMessage, 'purple');
                break;
            case userMessage.startsWith('.thunder'):
                await textmakerCommand(sock, chatId, message, userMessage, 'thunder');
                break;
            case userMessage.startsWith('.leaves'):
                await textmakerCommand(sock, chatId, message, userMessage, 'leaves');
                break;
            case userMessage.startsWith('.1917'):
                await textmakerCommand(sock, chatId, message, userMessage, '1917');
                break;
            case userMessage.startsWith('.arena'):
                await textmakerCommand(sock, chatId, message, userMessage, 'arena');
                break;
            case userMessage.startsWith('.hacker'):
                await textmakerCommand(sock, chatId, message, userMessage, 'hacker');
                break;
            case userMessage.startsWith('.sand'):
                await textmakerCommand(sock, chatId, message, userMessage, 'sand');
                break;
            case userMessage.startsWith('.blackpink'):
                await textmakerCommand(sock, chatId, message, userMessage, 'blackpink');
                break;
            case userMessage.startsWith('.glitch'):
                await textmakerCommand(sock, chatId, message, userMessage, 'glitch');
                break;
            case userMessage.startsWith('.fire'):
                await textmakerCommand(sock, chatId, message, userMessage, 'fire');
                break;
            case userMessage.startsWith('.antidelete'):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                break;
            case userMessage === '.cleartmp':
                await clearTmpCommand(sock, chatId, message);
                break;
            case userMessage === '.setpp':
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage === '.pp':
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith('.setgdesc'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupDescription(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith('.setgname'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupName(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith('.setgpp'):
                await setGroupPhoto(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('.instagram') || userMessage.startsWith('.insta') || (userMessage === '.ig' || userMessage.startsWith('.ig ')):
                await instagramCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.igsc'):
                await igsCommand(sock, chatId, message, true);
                break;
            case userMessage.startsWith('.igs'):
                await igsCommand(sock, chatId, message, false);
                break;
            case userMessage.startsWith('.fb') || userMessage.startsWith('.facebook'):
                await facebookCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.music'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.mp3') || userMessage.startsWith('.ytmp3') || userMessage.startsWith('.song'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video') || userMessage.startsWith('.ytmp4'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.tiktok') || userMessage.startsWith('.tt'):
                await tiktokCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.aivoice') || userMessage.startsWith('.vai') || userMessage.startsWith('.voicex') || userMessage.startsWith('.voiceai'):
                const voiceText = userMessage.replace(/^\.(aivoice|vai|voicex|voiceai)\s*/i, '');
                await aiVoiceCommand(sock, chatId, senderId, voiceText, message);
                break;
            case userMessage.startsWith('.mickey'):
                await mickeyCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.translate') || userMessage.startsWith('.trt'):
                const commandLength = userMessage.startsWith('.translate') ? 10 : 4;
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(commandLength));
                return;
            case userMessage.startsWith('.areact') || userMessage.startsWith('.autoreact') || userMessage.startsWith('.autoreaction'):
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('.sudo'):
                await sudoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.imagine') || userMessage.startsWith('.flux') || userMessage.startsWith('.dalle'):
                await imagineCommand(sock, chatId, message);
                break;
            case userMessage === '.jid':
                const groupJid = message.key.remoteJid;
                if (!groupJid.endsWith('@g.us')) {
                    await sock.sendMessage(chatId, { text: "❌ This command can only be used in a group." });
                } else {
                    await sock.sendMessage(chatId, { text: `✅ Group JID: ${groupJid}` }, { quoted: message });
                }
                break;
            case userMessage.startsWith('.autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.crop':
                await stickercropCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('.update'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock, chatId, message, zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.checkupdates'):
                {
                    const checkUpdatesArgs = userMessage.split(' ').slice(1);
                    await checkUpdatesCommand(sock, chatId, message, checkUpdatesArgs);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('.newgroup'):
                await newgroupCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gdrive'):
                await gdriveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.getcode'):
                {
                    const args = userMessage.split(' ').slice(1);
                    await getcodeCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.getlink'):
                await getlinkCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.shazam'):
                await shazamCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.repo'):
                await repoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.stats'):
                await statsCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.stickeralt'):
                await stickerAltCommand(sock, chatId, message);
                break;

            // ========== MINI-MENU CASES ==========
            case userMessage === '.menu-general':
                await menuGeneral(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-group':
                await menuGroup(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-moderation' || userMessage === '.menu-security':
                await menuModeration(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-media' || userMessage === '.menu-download':
                await menuMedia(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-ai':
                await menuAI(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-owner':
                await menuOwner(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-other':
                await menuOther(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.menu-all' || userMessage === '.all':
                await menuAll(sock, chatId, message);
                commandExecuted = true;
                break;

            // ========== NEW COMMANDS ==========
            case userMessage === '.buy' || userMessage === '.buyscript':
                await buyCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.buynow':
                await buyNowCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.contactowner':
                await contactOwnerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.support' || userMessage === '.teamsupport':
                await supportCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.getpp' || userMessage === '.pp':
                await getppCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.toimg':
                await toimgCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            default:
                if (isGroup) {
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }
                commandExecuted = false;
                break;
        }

        // If a command was executed, show typing status after command execution
        if (commandExecuted !== false) {
            await showTypingAfterCommand(sock, chatId);
        }

        if (userMessage.startsWith('.')) {
            await addCommandReaction(sock, message, commandExecuted !== false);
            if (commandExecuted !== false) {
                try {
                    // Quick actions disabled
                } catch (e) {
                    console.error('Suggestion buttons error:', e && e.message ? e.message : e);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
        let safeChatId = null;
        try { safeChatId = messageUpdate?.messages?.[0]?.key?.remoteJid || null; } catch (e) { safeChatId = null; }
        if (safeChatId) {
            await sock.sendMessage(safeChatId, {
                text: `❌ Failed to process command: ${String(error.message).slice(0, 300)}`
            }).catch(console.error);
        }
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;

        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
        } catch (e) { }

        if (action === 'promote') {
            if (!isPublic) return;
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }
        if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

async function handleStatus(sock, messageUpdate) {
    try {
        if (!sock || !messageUpdate?.messages) return;
        for (const m of messageUpdate.messages || []) {
            if (m.key?.remoteJid !== 'status@broadcast') continue;
            if (global.autostatusHandler?.handleAutoStatus) {
                await global.autostatusHandler.handleAutoStatus(sock, { messages: [m] });
            }
        }
    } catch (e) { }
}

module.exports = {
    handleMessages,
    handleStatusUpdate,
    handleGroupParticipantUpdate,
    handleStatus
};
