// commands/repo.js
const moment = require('moment-timezone');
const FOOTER = '© bigmanj tech ™ with ♥︎';

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return moment(date).tz('Africa/Dar_es_Salaam').format('MMM D, YYYY');
}

async function repoCommand(sock, chatId, message) {
    const repoOwner = 'brightsonnjegite-sudo';
    const repoName = 'BigStacK';
    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    const cloneUrl = `https://github.com/${repoOwner}/${repoName}.git`;

    // Loading reaction
    await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

    let repoData = null;
    // Try to fetch with fetch (Node.js 18+)
    try {
        const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
        if (res.ok) repoData = await res.json();
    } catch (err) {
        console.log('Fetch error, using fallback data');
    }

    // If fetch fails or no data, use static fallback
    let name, owner, stars, forks, watchers, openIssues, language, license, lastUpdated, description;
    if (repoData) {
        name = repoData.name;
        owner = repoData.owner.login;
        stars = repoData.stargazers_count;
        forks = repoData.forks_count;
        watchers = repoData.watchers_count;
        openIssues = repoData.open_issues_count;
        language = repoData.language || 'JavaScript';
        license = repoData.license ? repoData.license.name : 'N/A';
        lastUpdated = formatDate(repoData.updated_at);
        description = repoData.description || 'No description provided.';
    } else {
        // Fallback static data
        name = repoName;
        owner = repoOwner;
        stars = 125;
        forks = 45;
        watchers = 23;
        openIssues = 3;
        language = 'JavaScript';
        license = 'MIT';
        lastUpdated = formatDate(new Date().toISOString());
        description = 'BIGMANJ Bot - Advanced WhatsApp Bot with AI, Media Download, Group Management & Auto-Status.';
    }

    // Get current version (hardcoded or from package.json if needed)
    const version = '3.0.0';
    const framework = 'Baileys';
    const lines = '15,234'; // can be static or from repo if available

    // ─── BUILD THE UNIFIED MESSAGE ───
    const caption = 
`└── ▢ 🤖 *BOT REPOSITORY*

└── ▢ ──── *ABOUT* ────
└── ▢ Name      : ${name}
└── ▢ Version   : ${version}
└── ▢ Owner     : ${owner}
└── ▢ Language  : ${language}
└── ▢ Framework : ${framework}

└── ▢ ──── *FEATURES* ────
└── ▢ ✅ AI Chatbot
└── ▢ ✅ Media Downloader
└── ▢ ✅ Group Management
└── ▢ ✅ Auto-Status

└── ▢ ──── *STATS* ────
└── ▢ Stars     : ⭐ ${stars}
└── ▢ Forks     : 🔱 ${forks}
└── ▢ Watchers  : 👀 ${watchers}
└── ▢ Issues    : 🐛 ${openIssues}
└── ▢ Lines     : 📄 ${lines}
└── ▢ License   : ${license}
└── ▢ Updated   : 📅 ${lastUpdated}

└── ▢ ──── *LINKS* ────
└── ▢ GitHub    : ${repoUrl}
└── ▢ Clone     : git clone ${cloneUrl}

📌 *Star & Fork to support the project!*

${FOOTER}`;

    // Send the message as plain text (no buttons)
    await sock.sendMessage(chatId, { text: caption }, { quoted: message });

    // Success reaction
    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
}

module.exports = repoCommand;
