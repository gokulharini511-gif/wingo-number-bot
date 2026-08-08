const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=15&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=15&pageNo=1',
    'https://api.rajastake7.com/api/web/game/winGo/getHistoryList?type=30'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo 30S Advanced Multi-Pattern Engine Active'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 30S Advanced Multi-Pattern Engine Live...**", { parse_mode: 'Markdown' });
    setInterval(exact2SecEngine, 500);
});

let lastSentPeriod = "";
let cachedHistory = null;

function getExact30SPeriod(offsetSeconds = 0) {
    let now = new Date();
    let totalSeconds = Math.floor(now.getTime() / 1000) + offsetSeconds;
    let periodIndex = Math.floor(totalSeconds / 30);
    
    let date = new Date(totalSeconds * 1000);
    let year = date.getUTCFullYear();
    let month = String(date.getUTCMonth() + 1).padStart(2, '0');
    let day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}${month}${day}3000${10000 + (periodIndex % 2880)}`;
}

// Multi-Pattern Analysis Logic (Trend, Alternating, and Streak Patterns)
function calculatePattern(history) {
    try {
        if (history && history.length >= 5) {
            let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
            let sizes = numbers.slice(0, 5).map(n => n >= 5 ? "BIG" : "SMALL");

            let n1 = numbers[0];
            let n2 = numbers[1];
            let n3 = numbers[2];

            let isBig = n => n >= 5;

            // Pattern 1: Trend Following (If last two are same, follow the trend)
            if (sizes[0] === sizes[1]) {
                let chosenSize = sizes[0];
                let numStr = chosenSize === "BIG" ? (n1 % 2 === 0 ? "6, 8" : "7, 9") : (n1 % 2 === 0 ? "0, 2" : "1, 3");
                return { size: chosenSize, numbersStr: numStr };
            }

            // Pattern 2: Alternating (Zig-Zag pattern detection)
            if (sizes[0] !== sizes[1] && sizes[1] !== sizes[2]) {
                let chosenSize = sizes[0] === "BIG" ? "SMALL" : "BIG";
                let numStr = chosenSize === "BIG" ? "5, 7, 9" : "0, 2, 4";
                return { size: chosenSize, numbersStr: numStr };
            }

            // Pattern 3: Streak / Frequency Balance
            let bigCount = sizes.filter(s => s === "BIG").length;
            let chosenSize = bigCount >= 3 ? "SMALL" : "BIG";
            let numStr = chosenSize === "BIG" ? "6, 7, 8, 9" : "0, 1, 2, 3, 4";
            return { size: chosenSize, numbersStr: numStr };
        }
    } catch (e) {}

    // Fallback Randomizer
    let randomSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
    return { size: randomSize, numbersStr: randomSize === "BIG" ? "7, 9" : "1, 3" };
}

let isRunning = false;

async function exact2SecEngine() {
    if (isRunning) return;
    isRunning = true;

    try {
        let now = new Date();
        let secondInCycle = now.getUTCSeconds() % 30;

        if (secondInCycle <= 3) {
            for (let url of API_ENDPOINTS) {
                try {
                    const res = await axios.get(url, { timeout: 2000 });
                    let extracted = res.data?.data?.list || res.data?.list || res.data?.data;
                    if (Array.isArray(extracted) && extracted.length > 0) {
                        cachedHistory = extracted;
                        break;
                    }
                } catch (err) {}
            }
        }

        if (secondInCycle >= 28) {
            let targetPeriod = getExact30SPeriod(30);

            if (targetPeriod !== lastSentPeriod) {
                let pred = calculatePattern(cachedHistory);

                let msg = "⚡ **WIN GO 30S ADVANCED PREDICTION** ⚡\n" +
                          "━━━━━━━━━━━━━━━━━━━━━\n" +
                          "📌 **PERIOD:** `" + targetPeriod + "`\n" +
                          "📏 **PREDICTION:** `" + pred.size + "`\n" +
                          "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                          "━━━━━━━━━━━━━━━━━━━━━\n" +
                          "🔗 **Register Link:**\n" + REGISTER_LINK;

                await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

                lastSentPeriod = targetPeriod;
                console.log(`[SENT MULTI-PATTERN] Target Period: ${targetPeriod} at second: ${secondInCycle}`);
            }
        }

    } catch (err) {
        console.error("Engine Error:", err.message);
    } finally {
        isRunning = false;
    }
}
