const settings = {
  packname: 'bigmanj tech™',
  author: '‎',
  botName: "BigStack",
  botOwner: 'bigmanj tech', // Your name
  ownerNumber: '255636756591', //Set your number here without + symbol, just add country code & number without any space
  
  // Auto Status Sync Settings
  syncTarget: '255612130873', // Target number for status sync (set to owner number)
  syncDelay: 6, // Low number delay in seconds between syncs
  
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  acrcloud: {
    host: 'identify-eu-west-1.acrcloud.com',
    access_key: '250b268b836bc2186fbf49c9a31f904d',
    access_secret: '2nArZpgRhyRoFCZuYMnlhqixwuSjei4QE14vMhkg'
  },
  mode: "whatsapp", // "whatsapp" or "telegram"
  telegram: {
    botToken: "8363363748:AAFG7nwJL3B5LSo487Fap33F55_O6AnXKrs",
    ownerId: "8594354663",
    pairCode: "BIGMANJI"
  },
  commandMode: "public",
  maxStoreMessages: 20,
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.5",
  updateZipUrl: "https://github.com/brightsonnjegite-sudo/Big-Stack/archive/refs/heads/main.zip",
};

module.exports = settings;