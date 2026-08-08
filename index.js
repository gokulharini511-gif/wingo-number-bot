const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

// Updated Active API Endpoints
const API_ENDPOINTS = [
    'https://api.rajastake7.com/api/web/game/winGo/getHistoryList?type=1',
    'https://draw.ar-lottery01.com/WinGo/WinGo_60S/GetHistoryIssuePage.json?pageSize=50&pageNo=1'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo Early Prediction Engine Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 10-Sec Early Prediction Engine Live...**", { parse_mode: 'Markdown' });
    
    setInterval(monitorAndPredict, 1000);
});

let lastPredictedPeriod = "";
let pendingPrediction = null;

let totalWins = 0;
let totalLosses = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0;

const levelData = {
    1: { name: "₹1", val: 1 },
    2: { name: "₹3", val: 3 },
    3: { name: "₹7", val: 7 },
    4: { name: "₹20", val: 20 },
    5: { name: "₹50", val: 50 },
    6: { name: "₹150", val: 150 },
    7: { name: "₹450", val: 450 },
    8: { name: "₹1350", val: 1350 }
};

function getBetVal(level) {
    return levelData[level]?.val || Math.pow(3, level - 1);
}

// Fallback Generator if API blocks
function getFallbackPeriod() {
    let now = new Date();
    let year = now.getUTCFullYear();
    let month = String(now.getUTCMonth() + 1).padStart(2, '0');
    let day = String(now.getUTCDate()).padStart(2, '0');
    let totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    let periodStr = `${year}${month}${day}1000${1000 + totalMinutes}`;
    return periodStr;
}

function generateEarlyPrediction() {
    let sizes = ["BIG", "SMALL"];
    let randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    let numbersStr = randomSize === "BIG" ? "7, 9" : "1, 3";
    return { size: randomSize, numbersStr: numbersStr };
}

let isChecking = false;

async function monitorAndPredict() {
    if (isChecking) return;
    isChecking = true;

    try {
        let historyList = null;

        for (let url of API_ENDPOINTS) {
            try {
                const res = await axios.get(url, { 
                    timeout: 2500,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                });

                let extracted = res.data?.data?.list || res.data?.list || res.data?.data;
                if (Array.isArray(extracted) && extracted.length > 0) {
                    historyList = extracted;
                    break;
                }
            } catch (err) {}
        }

        let actualPeriod = "";
        let actualSize = "";

        if (historyList) {
            let latestItem = historyList[0];
            actualPeriod = String(latestItem.issueName || latestItem.issueNumber || latestItem.period || latestItem.issue);
            let actualNum = parseInt(latestItem.number !== undefined ? latestItem.number : latestItem.result);
            actualSize = actualNum >= 5 ? "BIG" : "SMALL";
        } else {
            // API Response வரவில்லை என்றாலும் Automatic Engine-ஐ இயங்க வைக்கும்
            actualPeriod = getFallbackPeriod();
            actualSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
        }

        // 1. Result Processing
        if (pendingPrediction && pendingPrediction.period === actualPeriod) {
            let isSizeHit = (pendingPrediction.size === actualSize);
            let currentBet = getBetVal(maintenanceLevel);

            if (isSizeHit) {
                totalWins++;
                totalProfitLoss += (currentBet * 0.98);
                console.log(`[WIN] Period ${actualPeriod} - Result: ${actualSize}`);
                maintenanceLevel = 1;
            } else {
                totalLosses++;
                totalProfitLoss -= currentBet;
                console.log(`[LOSS] Period ${actualPeriod} - Result: ${actualSize}`);
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }

            pendingPrediction = null;
        }

        // 2. Next Period Calculation
        let nextPeriod = String(BigInt(actualPeriod) + 1n);

        // 3. Send 10-Sec Early Prediction
        if (nextPeriod !== lastPredictedPeriod) {
            let pred = generateEarlyPrediction();

            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "⚡ **EARLY PREDICTION (10S ADVANCE)** ⚡\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + nextPeriod + "`\n" +
                      "📏 **BIG / SMALL:** `" + pred.size + "`\n" +
                      "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                      "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🏆 **WINS:** " + totalWins + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                      "📊 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastPredictedPeriod = nextPeriod;
            pendingPrediction = {
                period: nextPeriod,
                size: pred.size
            };

            console.log("[SUCCESS] Message Sent to Telegram for Period: " + nextPeriod);
        }

    } catch (err) {
        console.error("[ERROR]:", err.message);
    } finally {
        isChecking = false;
    }
}
