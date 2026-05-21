const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search'); // Imewekwa kwa ajili ya kusaka YouTube
const settings = require('./settings');

const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;

async function removeWebhookIfSet(token) {
  try {
    const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`);
    return resp?.data?.ok || false;
  } catch (err) {
    return false;
  }
}

function ensureTelegramDataFile() {
  if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
  if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify([]), 'utf8');
}

function loadAllowedChats() {
  ensureTelegramDataFile();
  try {
    const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
  } catch (error) {
    return [];
  }
}

function saveAllowedChats(chats) {
  const unique = Array.from(new Set(chats.map(id => String(id))));
  fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
}

function isChatAllowed(chatId) {
  return loadAllowedChats().includes(String(chatId));
}

function addAllowedChat(chatId) {
  const allowed = loadAllowedChats();
  if (!allowed.includes(String(chatId))) {
    allowed.push(String(chatId));
    saveAllowedChats(allowed);
  }
}

function removeAllowedChat(chatId) {
  const allowed = loadAllowedChats().filter(id => id !== String(chatId));
  saveAllowedChats(allowed);
}

function formatHelpText() {
  return [
    '*Mickey Glitch Telegram Bot*',
    '',
    '🔒 *Pairing System:*',
    '/pair <code|owner number> - Unganisha Telegram chat na Bot',
    '/unpair - Tenganisha pairing ya chat hii',
    '',
    '🤖 *Core Commands:*',
    '/help, /menu - Onyesha menu hii ya msaada',
    '/ping - Angalia kama bot iko hai',
    '/alive - Angalia mfumo na hali ya bot',
    '/owner - Mawasiliano ya mmiliki wa bot',
    '/update - Vuta upya msimbo kutoka GitHub (Owner tu)',
    '',
    '🎵 *Media Commands:*',
    '/play <jina la wimbo> - Tafuta na upakue Audio kutoka YT',
    '/video <jina la video> - Tafuta na upakue Video kutoka YT',
    '/stickertelegram <link> - Pata maelezo ya sticker pack',
  ].join('\n');
}

function isOwnerChat(chatId) {
  const ownerId = String(settings.telegram?.ownerId || '').trim();
  return ownerId && String(chatId) === ownerId;
}

function isTelegramAuthorized(chatId) {
  if (isChatAllowed(chatId)) return true;
  if (isOwnerChat(chatId)) return true;
  if (String(settings.commandMode || '').toLowerCase() === 'public') return true;
  return false;
}

// FIX: Logic ya kupair imesafishwa na kurahisishwa ili isikatae ovyo
function canPair(chatId, code) {
  const inputCode = String(code || '').trim();
  const ownerId = String(settings.telegram?.ownerId || '').trim();
  const ownerNumber = String(settings.ownerNumber || '').replace(/\D/g, '').trim();
  const pairCode = String(settings.telegram?.pairCode || '').trim();

  if (ownerId && String(chatId) === ownerId) return true;
  if (!inputCode) return false;
  if (pairCode && inputCode === pairCode) return true;
  if (ownerNumber && inputCode === ownerNumber) return true;

  return false;
}

async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = settings.telegram?.botToken?.trim();
  if (!token || !chatId) return;
  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
      chat_id: String(chatId),
      text,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
      ...extra
    });
  } catch (error) {
    console.error('Telegram sendMessage failed:', error?.response?.data || error.message);
  }
}

// Helper ya kutuma Audio/Video faili
async function sendTelegramMedia(chatId, type, url, caption = '') {
  const token = settings.telegram?.botToken?.trim();
  if (!token || !chatId) return;
  const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
      chat_id: String(chatId),
      [type]: url,
      caption: caption,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(`Telegram ${endpoint} failed:`, error?.response?.data || error.message);
    await sendTelegramMessage(chatId, `❌ Kushindwa kutuma ${type}. Kiungo kimezuiliwa au ni kikubwa sana.`);
  }
}

async function handleStickerTelegram(chatId, args) {
  if (!args.length) return sendTelegramMessage(chatId, '⚠️ Tumia: /stickertelegram https://t.me/addstickers/PackName');
  const url = args[0].trim();
  const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
  if (!match) return sendTelegramMessage(chatId, '❌ URL ya Sticker si sahihi.');

  const packName = match[1];
  try {
    const response = await axios.get(`${TELEGRAM_BASE_URL(settings.telegram.botToken)}/getStickerSet`, { params: { name: packName } });
    if (!response.data?.ok || !response.data.result) throw new Error();

    const stickerSet = response.data.result;
    const stickers = stickerSet.stickers || [];
    const sample = stickers.slice(0, 8).map((st, i) => `${i + 1}. ${st.emoji || '☀️'}`);

    const text = [`📦 Sticker Pack: ${stickerSet.title}`, `🆔 Name: ${stickerSet.name}`, `🧩 Count: ${stickers.length}`, '', 'Samples:', sample.join('\n')].join('\n');
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    await sendTelegramMessage(chatId, '❌ Ilifeli kupata maelezo ya sticker pack.');
  }
}

async function handleUpdateCommand(chatId, isActiveOwner) {
  if (!isActiveOwner) return sendTelegramMessage(chatId, '🚷 Amri hii ni maalum kwa Owner tu!');
  await sendTelegramMessage(chatId, '⏳ *Inatafuta mabadiliko kutoka GitHub (Mickey-Glitch)...*');

  const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
  try {
    const response = await axios.get(rawUrl, { responseType: 'text' });
    if (response.status === 200 && response.data) {
      fs.writeFileSync(__filename, response.data, 'utf8');
      await sendTelegramMessage(chatId, '✅ *Msimbo umesasishwa kwa mafanikio!* Inajiwasha upya...');
      setTimeout(() => { process.exit(0); }, 2000);
    } else {
      throw new Error('Data haikupatikana');
    }
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ *Mchakato umefeli:* ${error.message}`);
  }
}

async function handleUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat?.id;
  const sender = message.from;
  const rawText = String(message.text || '').trim();
  
  if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

  const cleanText = rawText.substring(1);
  const parts = cleanText.split(/\s+/);
  const commandText = parts[0].toLowerCase();
  const args = parts.slice(1);
  const fullArgs = args.join(' ');

  const allowed = isTelegramAuthorized(chatId);
  const isActiveOwner = isOwnerChat(chatId);

  if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
    await sendTelegramMessage(chatId, formatHelpText());
    return;
  }

  if (commandText === 'pair') {
    if (isChatAllowed(chatId) || isActiveOwner) {
      return sendTelegramMessage(chatId, '✅ Chat hii tayari imeshaunganishwa (Paired).');
    }
    const code = args[0] || '';
    if (!canPair(chatId, code)) {
      return sendTelegramMessage(chatId, '❌ Pairing imekataa. Tumia nambari sahihi ya pairing au weka telegram.ownerId sahihi kwenye settings.js');
    }
    addAllowedChat(chatId);
    return sendTelegramMessage(chatId, '✅ Bot imepairishwa kikamilifu kwenye chat hii! Tumia /menu kuanza.');
  }

  if (commandText === 'unpair') {
    if (!isChatAllowed(chatId)) return sendTelegramMessage(chatId, 'ℹ️ Chat hii haijawa paired bado.');
    removeAllowedChat(chatId);
    return sendTelegramMessage(chatId, '✅ Chat imeondolewa kwenye pairing kwa mafanikio.');
  }

  if (commandText === 'update') {
    await handleUpdateCommand(chatId, isActiveOwner);
    return;
  }

  if (!allowed) {
    return sendTelegramMessage(chatId, '⚠️ Chat hii haijapairishwa bado. Andika `/pair <namba>` ili kuitumia.');
  }

  switch (commandText) {
    case 'ping':
      return sendTelegramMessage(chatId, `🏓 Pong! Inaitikia vizuri kabisa.\n👤 Mtumiaji: ${sender?.username || sender?.first_name || 'Mgeni'}`);
    
    case 'alive':
      return sendTelegramMessage(chatId, `✅ Mickey Glitch Bot iko Active.\n✨ Jukwaa: Telegram Engine\n⚙️ Usanidi: Safi`);
    
    case 'owner':
      return sendTelegramMessage(chatId, `👤 Mmiliki: ${settings.botOwner || 'Mickey Developer'}\n📱 WhatsApp: https://wa.me/${settings.ownerNumber}`);
    
    case 'stickertelegram':
      return handleStickerTelegram(chatId, args);

    // FIX: Amri ya Play inayotumia yt-search na Nayan Downloader API
    case 'play': {
      if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Tafadhali weka jina la wimbo! Mfano: `/play Alikiba Mahaba`');
      await sendTelegramMessage(chatId, `🎵 *Inatafuta wimbo:* _${fullArgs}_...`);
      
      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendTelegramMessage(chatId, '❌ Wimbo haukupatikana YouTube.');

        // Kupiga chombo cha Nayan Video Downloader API
        const apiResponse = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(video.url)}`);
        const formats = apiResponse.data?.data?.data?.formats || [];
        
        // Kutafuta link ya audio (m4a, mp3 au aina yoyote ya audio)
        const audioFormat = formats.find(f => f.type === 'audio' || f.mimeType?.includes('audio')) || formats[formats.length - 1];
        
        if (!audioFormat || !audioFormat.url) throw new Error('Audio link haikupatikana.');

        await sendTelegramMessage(chatId, `⏳ *Inapakua Audio:* _${video.title}_`);
        await sendTelegramMedia(chatId, 'audio', audioFormat.url, `🎵 *Title:* ${video.title}\n🔗 *Link:* ${video.url}`);
      } catch (err) {
        console.error(err);
        await sendTelegramMessage(chatId, '❌ Ilitokea error wakati wa kupakua audio hiyo kutoka kwenye API.');
      }
      return;
    }

    // FIX: Amri ya Video inayotumia yt-search na Nayan Downloader API
    case 'video': {
      if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Tafadhali weka jina la video! Mfano: `/video Harmonize Zanzibar`');
      await sendTelegramMessage(chatId, `📹 *Inatafuta video:* _${fullArgs}_...`);
      
      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendTelegramMessage(chatId, '❌ Video haikutumbukia kwenye utafutaji.');

        const apiResponse = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(video.url)}`);
        const formats = apiResponse.data?.data?.data?.formats || [];
        
        // Kutafuta format inayofaa kwa video yenye audio (Kama 360p mp4)
        const videoFormat = formats.find(f => f.type === 'video_with_audio' && f.ext === 'mp4') || formats.find(f => f.ext === 'mp4') || formats[0];
        
        if (!videoFormat || !videoFormat.url) throw new Error('Video link haikuchujika.');

        await sendTelegramMessage(chatId, `⏳ *Inapakua Video:* _${video.title}_`);
        await sendTelegramMedia(chatId, 'video', videoFormat.url, `📹 *Title:* ${video.title}\n🔗 *Link:* ${video.url}`);
      } catch (err) {
        console.error(err);
        await sendTelegramMessage(chatId, '❌ Imefeli kupata link sahihi ya video kutoka kwenye seva yetu.');
      }
      return;
    }

    default:
      if (rawText.startsWith('/') || rawText.startsWith('.')) {
        return sendTelegramMessage(chatId, `❌ Amri ya '${commandText}' haipo.\nTumia /menu kuona zilizopo.`);
      }
      return;
  }
}

async function startTelegramBot() {
  const token = settings.telegram?.botToken?.trim();
  if (!token) {
    console.error('Telegram botToken haipo kwenye settings.js');
    process.exit(1);
  }

  ensureTelegramDataFile();
  try { await removeWebhookIfSet(token); } catch (e) {}

  let offset = 0;
  console.log('✅ Telegram Bot Engine Imewashwa Vizuri (Mickey Developer).');

  while (true) {
    try {
      const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
        params: { offset: offset + 1, timeout: 30, allowed_updates: ['message', 'edited_message'] },
        timeout: 60000
      });

      if (!response.data?.ok) throw new Error();
      const updates = response.data.result || [];
      for (const update of updates) {
        offset = update.update_id;
        await handleUpdate(update);
      }
    } catch (error) {
      if (error?.response?.data?.error_code === 409) {
        try { await removeWebhookIfSet(token); } catch (e) {}
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startTelegramBot, isChatAllowed, addAllowedChat, removeAllowedChat };
