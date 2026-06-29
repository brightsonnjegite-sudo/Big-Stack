const fs = require('fs');
const path = require('path');

const ANTICALL_PATH = path.join(process.cwd(), 'data', 'anticall.json');

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) {
            return { enabled: false, callCounts: {} };
        }
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw);
        return {
            enabled: data.enabled === true,
            callCounts: data.callCounts || {}
        };
    } catch (err) {
        console.error('Error reading anticall state:', err);
        return { enabled: false, callCounts: {} };
    }
}

function writeState(state) {
    try {
        const dir = path.dirname(ANTICALL_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify(state, null, 2));
        console.log(`✅ Anticall state saved: enabled=${state.enabled}`);
    } catch (err) {
        console.error(`Failed to write anticall state: ${err.message}`);
    }
}

// Allowed numbers – add both the phone number and the LID's numeric part
const ALLOWED_NUMBERS = [
    '255715206874',               // phone number
    '126388589871219'             // LID numeric part (without @lid)
];

function normalizeNumber(num) {
    return num.replace(/\s/g, ''); // remove spaces
}

function isAllowedNumber(number) {
    const normalized = normalizeNumber(number);
    return ALLOWED_NUMBERS.some(allowed => normalizeNumber(allowed) === normalized);
}

async function anticallCommand(sock, chatId, message, args) {
    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status')) {
        await sock.sendMessage(chatId, {
            text: `*ANTICALL*\n\n.anticall on  - Enable auto-block on incoming calls\n.anticall off - Disable anticall\n.anticall status - Show current status`
        }, { quoted: message });
        return;
    }

    if (sub === 'status') {
        const statusText = 
`*[ ANTICALL STATUS ]*

*🤖 BigStack* 
*by ~© bigmanj tech ™~* 
Calls: ${state.enabled ? 'BLOCKED ✅' : 'ALLOWED ❌'}
Messages: ALLOWED ✅
Auto‑ban after 3 calls: YES

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: statusText }, { quoted: message });
        return;
    }

    const enable = sub === 'on';
    if (enable === state.enabled) {
        await sock.sendMessage(chatId, {
            text: `Anticall is already *${enable ? 'ENABLED' : 'DISABLED'}*.`
        }, { quoted: message });
        return;
    }

    state.enabled = enable;
    writeState(state);

    const responseText = enable 
        ? `*⚙️– ANTICALL ACTIVATED*\n*BIGMANJ BOT V3*\n*by ~© bigmanj tech ™~*\n\n🔒 All incoming calls are now BLOCKED\n📝 Send a message instead\n\n✅ Status: ON\n\nStay safe from spam calls.\n\n━━━━━━━━━━━━━━━━\n© bigmanj tech ™ with ♥︎`
        : `*⚙️– ANTICALL DEACTIVATED*\n*BIGMANJ BOT V3*\n*by ~© bigmanj tech ™~*\n\n🔓 Calls are now ALLOWED\n📞 You may receive voice calls\n\n⚠️ Note: Bot may still log call attempts\n\n━━━━━━━━━━━━━━━━\n© bigmanj tech ™ with ♥︎`;

    await sock.sendMessage(chatId, { text: responseText }, { quoted: message });
}

async function sendCallPolicyMessage(sock, toJid, callerNumber, callCount) {
    let policyMsg;
    if (callCount === 1) {
        policyMsg = 
`*🤖 BigStack* 
by *~© bigmanj tech ™~*

*– Voice Call Policy*

*We don't accept calls 📞. Please text us.*
*✅ Quick replies for messages*
*❌ Calls are automatically ignored*

*Thank you for understanding*

*If repeated three times @${callerNumber} blocked*

© bigmanj tech ™ with ♥︎`;
    } else if (callCount === 2) {
        policyMsg = 
`⚠️ *WARNING* ⚠️

You have called ${callCount} time(s).
One more call and you will be *PERMANENTLY BLOCKED*.

© bigmanj tech ™ with ♥︎`;
    } else {
        policyMsg = 
`🚫 *YOU HAVE BEEN BLOCKED* 🚫

You ignored the policy and called 3 times.
Bot has now blocked you permanently.

© bigmanj tech ™ with ♥︎`;
    }
    await sock.sendMessage(toJid, { text: policyMsg });
}

async function handleAnticall(sock, update) {
    const state = readState();
    if (!state.enabled) return;

    try {
        const call = update.call;
        if (!call || !call[0]) return;

        const callerId = call[0].from;
        if (!callerId) return;

        let rawNumber = callerId.split('@')[0];
        if (isAllowedNumber(rawNumber)) {
            console.log(`📞 Allowed number/LID ${rawNumber} – ignoring anticall`);
            return; // ❗ WILL NOT BLOCK, WILL NOT REJECT
        }

        const currentState = readState();
        const currentCount = currentState.callCounts[rawNumber] || 0;
        const newCount = currentCount + 1;
        currentState.callCounts[rawNumber] = newCount;
        writeState(currentState);

        if (typeof sock.rejectCall === 'function') {
            await sock.rejectCall(call[0].id, callerId);
        } else {
            console.log('⚠️ sock.rejectCall not available, call not rejected');
        }
        console.log(`📵 Call rejected from: ${rawNumber} (count: ${newCount})`);

        await sendCallPolicyMessage(sock, callerId, rawNumber, newCount);

        if (newCount >= 3) {
            try {
                if (typeof sock.updateBlockStatus === 'function') {
                    await sock.updateBlockStatus(callerId, 'block');
                    console.log(`🚫 User ${rawNumber} BLOCKED successfully`);
                } else if (typeof sock.blockUser === 'function') {
                    await sock.blockUser(callerId);
                    console.log(`🚫 User ${rawNumber} BLOCKED successfully`);
                } else {
                    console.log('⚠️ No block function available. User not blocked.');
                }
            } catch (blockErr) {
                console.error(`Failed to block user: ${blockErr.message}`);
            }
            delete currentState.callCounts[rawNumber];
            writeState(currentState);
        }
    } catch (err) {
        console.error(`Anticall error: ${err.message}`);
    }
}

module.exports = { anticallCommand, readState, handleAnticall };
