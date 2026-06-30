// commands/weather.js
const axios = require('axios');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ========== FUNCTIONS ==========

// 1. Geocode: Get coordinates via Open-Meteo Geocoding (free)
async function getCoordinates(city) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const res = await axios.get(url, { timeout: 10000 });
        if (res.data?.results?.length > 0) {
            const result = res.data.results[0];
            return {
                lat: result.latitude,
                lon: result.longitude,
                name: result.name,
                country: result.country || 'Unknown'
            };
        }
        throw new Error('City not found');
    } catch (err) {
        throw new Error('City not found: ' + err.message);
    }
}

// 2. Weather from Open-Meteo (free, no API key)
async function getWeatherOpenMeteo(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data?.current_weather) {
        const w = res.data.current_weather;
        return {
            temp: w.temperature,
            wind: w.windspeed,
            weatherCode: w.weathercode,
            source: 'Open-Meteo'
        };
    }
    throw new Error('Open-Meteo returned no data');
}

// 3. Fallback: wttr.in (free, no API key)
async function getWeatherWttr(city) {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data?.current_condition?.length > 0) {
        const current = res.data.current_condition[0];
        return {
            temp: parseFloat(current.temp_C) || 0,
            wind: parseFloat(current.windSpeedKmph) || 0,
            weatherCode: null,
            source: 'wttr.in',
            desc: current.weatherDesc?.[0]?.value || 'Unknown'
        };
    }
    throw new Error('wttr.in returned no data');
}

// 4. Translate Open-Meteo weather code to description (English)
function getWeatherDescription(code) {
    const map = {
        0: 'Clear sky ☀️',
        1: 'Mainly clear ☀️',
        2: 'Partly cloudy ⛅',
        3: 'Overcast ☁️',
        45: 'Fog 🌫️',
        48: 'Depositing rime fog 🌫️',
        51: 'Light drizzle 🌧️',
        53: 'Moderate drizzle 🌧️',
        55: 'Dense drizzle 🌧️',
        61: 'Slight rain 🌦️',
        63: 'Moderate rain 🌧️',
        65: 'Heavy rain 🌧️',
        71: 'Slight snow fall ❄️',
        73: 'Moderate snow fall ❄️',
        75: 'Heavy snow fall ❄️',
        80: 'Rain showers ☔',
        81: 'Moderate rain showers ☔',
        82: 'Violent rain showers ☔',
        95: 'Thunderstorm ⛈️',
        96: 'Thunderstorm with slight hail ⛈️',
        99: 'Thunderstorm with heavy hail ⛈️'
    };
    return map[code] || 'Unknown condition 🌤️';
}

// ========== MAIN COMMAND ==========
async function weatherCommand(sock, chatId, message, query) {
    if (!query) {
        const usageMsg = 
`└── ▢ 🌤️ *WEATHER FORECAST*

└── ▢ ──── *USAGE* ────
└── ▢ .weather <city name>

└── ▢ ──── *EXAMPLE* ────
└── ▢ .weather Dar es Salaam
└── ▢ .weather Nairobi

${FOOTER}`;
        return sock.sendMessage(chatId, { text: usageMsg }, { quoted: message });
    }

    // React "searching"
    await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } }).catch(() => {});

    try {
        // 1. Get coordinates
        const coords = await getCoordinates(query);
        
        // 2. Try Open-Meteo first
        let weather;
        let usedFallback = false;
        try {
            weather = await getWeatherOpenMeteo(coords.lat, coords.lon);
        } catch (err) {
            console.log('[Weather] Open-Meteo failed, using wttr.in fallback...');
            usedFallback = true;
            weather = await getWeatherWttr(query);
        }

        // 3. Build message with └── ▢ style
        const temp = weather.temp;
        const wind = weather.wind;
        const desc = weather.weatherCode !== null 
            ? getWeatherDescription(weather.weatherCode) 
            : (weather.desc || 'Unknown');
        const source = weather.source || (usedFallback ? 'wttr.in' : 'Open-Meteo');

        const msg = 
`└── ▢ 🌤️ *WEATHER FORECAST*

└── ▢ ──── *LOCATION* ────
└── ▢ ${coords.name}${coords.country ? `, ${coords.country}` : ''}

└── ▢ ──── *CONDITIONS* ────
└── ▢ Temperature : ${temp}°C
└── ▢ Wind       : ${wind} km/h
└── ▢ Condition  : ${desc}

└── ▢ ──── *INFO* ────
└── ▢ Source     : ${source}
└── ▢ Date       : ${new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}

📌 Weather information provided.

${FOOTER}`;

        await sock.sendMessage(chatId, { text: msg }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (error) {
        console.error('[Weather] Error:', error.message);
        const errorMsg = 
`└── ▢ ❌ *FAILED*

└── ▢ City     : "${query}"
└── ▢ Reason   : ${error.message || 'City not found'}

📌 Please try again with a different city.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
    }
}

module.exports = weatherCommand;
