const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function getProfilePictureCommand(sock, chatId, msg) {
  try {
    const args = msg.message?.conversation?.split(' ') || [];
    const command = args[0]?.toLowerCase();
    const targetType = args[1]?.toLowerCase();

    let targetJids = [];
    let quality = 'image'; // default quality
    let multiple = false;

    // Parse arguments for advanced features
    if (args.includes('--hd') || args.includes('-hd')) {
      quality = 'image'; // Baileys uses 'image' for high quality
    }
    if (args.includes('--multiple') || args.includes('-m')) {
      multiple = true;
    }
    if (args.includes('--group') || args.includes('-g')) {
      // Get all group participants' profile pictures
      const groupMetadata = await sock.groupMetadata(chatId);
      targetJids = groupMetadata.participants.map(p => p.id);
      multiple = true;
    }

    // Get target JIDs
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid && ctx.mentionedJid.length > 0) {
      targetJids = ctx.mentionedJid;
    } else if (ctx?.participant) {
      targetJids = [ctx.participant];
    } else if (args.length > 1 && !args[1].startsWith('--')) {
      // Try to parse as phone number
      const phone = args[1].replace(/[^0-9]/g, '');
      if (phone.length >= 10) {
        targetJids = [`${phone}@s.whatsapp.net`];
      }
    } else {
      targetJids = [msg.key.participant || msg.key.remoteJid];
    }

    if (targetJids.length === 0) {
      const helpText = `📷 *Enhanced Profile Picture Command*

*Usage:*
• \`.getpp\` - Get your own profile picture
• \`.getpp @mention\` - Get mentioned user's profile picture
• \`.getpp reply\` - Get profile picture from replied message
• \`.getpp 255XXXXXXXXX\` - Get profile picture by phone number
• \`.getpp --group\` - Get all group members' profile pictures
• \`.getpp --multiple @user1 @user2\` - Get multiple users' pictures

*Options:*
• \`--hd\` - High quality image
• \`--multiple\` or \`-m\` - Get multiple pictures
• \`--group\` or \`-g\` - All group members

*Examples:*
• \`.getpp --hd @user\`
• \`.getpp --multiple @user1 @user2 @user3\`
• \`.getpp 255712345678\``;

      await sock.sendMessage(chatId, { text: helpText }, { quoted: msg });
      return;
    }

    // Limit multiple requests
    if (targetJids.length > 10) {
      await sock.sendMessage(chatId, { text: '⚠️ Maximum 10 profile pictures at once!' }, { quoted: msg });
      return;
    }

    // Process single profile picture
    if (!multiple && targetJids.length === 1) {
      const targetJid = targetJids[0];
      await sendProfilePicture(sock, chatId, targetJid, quality, msg);
      return;
    }

    // Process multiple profile pictures
    if (multiple || targetJids.length > 1) {
      await sendMultipleProfilePictures(sock, chatId, targetJids, quality, msg);
      return;
    }

  } catch (error) {
    console.error('Error in enhanced getpp command:', error);
    try {
      await sock.sendMessage(chatId, { text: '❌ Error getting profile picture. Please try again.' }, { quoted: msg });
    } catch (e) {}
  }
}

async function sendProfilePicture(sock, chatId, targetJid, quality, msg) {
  try {
    let ppUrl;
    let hasProfilePic = true;

    try {
      ppUrl = await sock.profilePictureUrl(targetJid, quality);
    } catch (e) {
      hasProfilePic = false;
      // Try different qualities if high quality fails
      if (quality === 'image') {
        try {
          ppUrl = await sock.profilePictureUrl(targetJid, 'preview');
        } catch (e2) {
          ppUrl = null;
        }
      }
    }

    if (!ppUrl) {
      // Use default image based on whether it's a group or contact
      const isGroup = targetJid.endsWith('@g.us');
      ppUrl = isGroup
        ? 'https://telegra.ph/file/0309995815610897f90e3.jpg' // Group default
        : 'https://telegra.ph/file/0309995815610897f90e3.jpg'; // Contact default
    }

    const userName = await getUserName(sock, targetJid);
    const status = hasProfilePic ? '✅ Has Profile Picture' : '❌ No Profile Picture (Privacy)';
    const qualityText = quality === 'image' ? 'HD' : 'Standard';

    const caption = `📷 *Profile Picture*\n\n👤 *User:* @${targetJid.split('@')[0]}\n📝 *Name:* ${userName}\n🎯 *Quality:* ${qualityText}\n📊 *Status:* ${status}`;

    await sock.sendMessage(chatId, {
      image: { url: ppUrl },
      caption: caption,
      mentions: [targetJid]
    }, { quoted: msg });

  } catch (error) {
    console.error('Error sending profile picture:', error);
    await sock.sendMessage(chatId, { text: '❌ Failed to send profile picture.' }, { quoted: msg });
  }
}

async function sendMultipleProfilePictures(sock, chatId, targetJids, quality, msg) {
  try {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Send initial message
    const processingMsg = await sock.sendMessage(chatId, { text: `🔄 Processing ${targetJids.length} profile pictures...` }, { quoted: msg });

    for (let i = 0; i < targetJids.length; i++) {
      const targetJid = targetJids[i];
      try {
        let ppUrl;
        let hasProfilePic = true;

        try {
          ppUrl = await sock.profilePictureUrl(targetJid, quality);
        } catch (e) {
          hasProfilePic = false;
          ppUrl = 'https://telegra.ph/file/0309995815610897f90e3.jpg';
        }

        const userName = await getUserName(sock, targetJid);
        const status = hasProfilePic ? '✅' : '❌';

        results.push({
          jid: targetJid,
          name: userName,
          url: ppUrl,
          hasPic: hasProfilePic,
          status: status
        });

        successCount++;

        // Send individual picture with delay to avoid spam
        const caption = `📷 *Profile Picture ${i + 1}/${targetJids.length}*\n\n👤 @${targetJid.split('@')[0]}\n📝 ${userName}\n📊 ${status}`;

        await sock.sendMessage(chatId, {
          image: { url: ppUrl },
          caption: caption,
          mentions: [targetJid]
        });

        // Small delay between sends
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error getting PP for ${targetJid}:`, error);
        failCount++;
      }
    }

    // Send summary
    const summary = `📊 *Profile Pictures Summary*\n\n✅ *Success:* ${successCount}\n❌ *Failed:* ${failCount}\n📈 *Total:* ${targetJids.length}\n\n${results.map((r, i) => `${i + 1}. ${r.status} @${r.jid.split('@')[0]} - ${r.name}`).join('\n')}`;

    await sock.sendMessage(chatId, { text: summary }, { quoted: msg });

    // Delete processing message
    try {
      await sock.sendMessage(chatId, { delete: processingMsg.key });
    } catch (e) {}

  } catch (error) {
    console.error('Error in multiple PP processing:', error);
    await sock.sendMessage(chatId, { text: '❌ Error processing multiple profile pictures.' }, { quoted: msg });
  }
}

async function getUserName(sock, jid) {
  try {
    const contact = await sock.store?.contacts?.[jid];
    if (contact?.name || contact?.notify) {
      return contact.name || contact.notify;
    }

    // Try to get from group metadata if it's a group
    if (jid.endsWith('@g.us')) {
      const groupMetadata = await sock.groupMetadata(jid);
      return groupMetadata.subject || 'Group';
    }

    return 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

module.exports = getProfilePictureCommand;
