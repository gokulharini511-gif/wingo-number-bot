const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

// Live WinGo 30S Fast Endpoints
const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=15&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=15&pageNo=1',
    'https://api.rajastake7.com/api/web/game/winGo/getHistoryList?type=30'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('Ultra-Speed API Prediction Engine Active'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "⚡ **WinGo 30S Ultra-Speed API Engine Live...**", { parse_mode: 'Markdown' });
    setInterval(ultraSpeedEngine, 100); // 100ms Ultra-Fast Execution Loop
});

let lastSentPeriod = "";
let pendingPrediction = null;
let cachedHistory = [];

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

function getExact30SPeriod() {
    let now = new Date();
    let totalSeconds = Math.floor(now.getTime() / 1000);
    let periodIndex = Math.floor(totalSeconds / 30);
    
    let date = new Date(totalSeconds * 1000);
    let year = date.getUTCFullYear();
    let month = String(date.getUTCMonth() + 1).padStart(2, '0');
    let day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}${month}${day}3000${10000 + (periodIndex % 2880)}`;
}

// Pattern Algorithm using Live API Data
function analyzeApiPattern(history) {
    try {
        if (history && history.length >= 3) {
            let nums = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
            let bigCount = nums.slice(0, 5).filter(n => n >= 5).length;
            
            // Reverse Trend Analysis
            let predictedSize = bigCount >= 3 ? "SMALL" : "BIG";

            let targetNumbers = [];
            if (predictedSize === "BIG") {
                targetNumbers = [7, 8, 9].sort(() => 0.5 - Math.random()).slice(0, 2);
            } else {
                targetNumbers = [1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 2);
            }

            return {
                size: predictedSize,
                numbersStr: targetNumbers.join(", ")
            };
        }
    } catch (e) {}

    let randomSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
    let randomNums = randomSize === "BIG" ? "7, 9" : "1, 3";
    return { size: randomSize, numbersStr: randomNums };
}

let isRunning = false;

async function ultraSpeedEngine() {
    if (isRunning) return;
    isRunning = true;

    try {
        let now = new Date();
        let secondInCycle = now.getUTCSeconds() % 30;

        // 1. Fetch API Results (Seconds 0 - 3)
        if (secondInCycle <= 3) {
            for (let url of API_ENDPOINTS) {
                try {
                    const res = await axios.get(url, { 
                        timeout: 800,
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
                    });
                    let extracted = res.data?.data?.list || res.data?.list || res.data?.data;
                    if (Array.isArray(extracted) && extracted.length > 0) {
                        cachedHistory = extracted;
                        break;
                    }
                } catch (err) {}
            }

            if (pendingPrediction && cachedHistory.length > 0) {
                let latestItem = cachedHistory[0];
                let actualPeriod = String(latestItem.issueName || latestItem.issueNumber || latestItem.period || latestItem.issue);
                let actualNum = parseInt(latestItem.number !== undefined ? latestItem.number : latestItem.result);
                let actualSize = actualNum >= 5 ? "BIG" : "SMALL";

                if (pendingPrediction.period === actualPeriod) {
                    let isSizeHit = (pendingPrediction.size === actualSize);
                    let currentBet = getBetVal(maintenanceLevel);

                    if (isSizeHit) {
                        totalWins++;
                        totalProfitLoss += (currentBet * 0.98);
                        console.log(`[WIN] Period: ${actualPeriod} | Result: ${actualSize} (${actualNum})`);
                        maintenanceLevel = 1;
                    } else {
                        totalLosses++;
                        totalProfitLoss -= currentBet;
                        console.log(`[LOSS] Period: ${actualPeriod} | Result: ${actualSize} (${actualNum})`);
                        maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
                    }
                    pendingPrediction = null;
                }
            }
        }

        // 2. Dispatch Prediction Exactly 5s Advance (At Second 25)
        if (secondInCycle >= 25) {
            let currentPeriod = getExact30SPeriod();

            if (currentPeriod !== lastSentPeriod) {
                let pred = analyzeApiPattern(cachedHistory);

                let activeLevel = maintenanceLevel;
                let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
                let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

                let msg = "⚡ **WIN GO 30S ULTRA-SPEED PREDICTION** ⚡\n" +
                          "━━━━━━━━━━━━━━━━━━━━━\n" +
                          "📌 **PERIOD:** `" + currentPeriod + "`\n" +
                          "📏 **PREDICTION:** `" + pred.size + "`\n" +
                          "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                          "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
                          "━━━━━━━━━━━━━━━━━━━━━\n" +
                          "🏆 **WINS:** " + totalWins + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                          "📊 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                          "━━━━━━━━━━━━━━━━━━━━━\n" +
                          "🔗 **Register Link:**\n" + REGISTER_LINK;

                await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

                lastSentPeriod = currentPeriod;
                pendingPrediction = {
                    period: currentPeriod,
                    size: pred.size
                };

                console.log(`[SENT 5S ADVANCE] Period: ${currentPeriod} at Second: ${secondInCycle}`);
            }
        }

    } catch (err) {
        console.error("Engine Error:", err.message);
    } finally {
        isRunning = false;
    }
}
