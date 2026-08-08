const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

// 1-Min / 30S API Endpoint
const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_60S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_60S/GetHistoryIssuePage.json?pageSize=50&pageNo=1'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('10-Sec Early Prediction Engine Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 10-Sec Early Prediction Bot Live...**", { parse_mode: 'Markdown' });
    monitorAndPredict();
});

let lastPredictedPeriod = "";
let pendingPrediction = null; // { period, size, numbers }

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

// History Pattern Predictor Algorithm
function generateEarlyPrediction(history) {
    try {
        let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        if (numbers.length < 5) return { size: "BIG", numbersStr: "7, 9", targetNumbers: [7, 9] };

        let isBigNum = n => n >= 5;
        let last1 = numbers[0];
        let last2 = numbers[1];

        // Simple Trend Check
        let predictedSize = (isBigNum(last1) === isBigNum(last2)) 
            ? (isBigNum(last1) ? "BIG" : "SMALL") 
            : (isBigNum(last1) ? "SMALL" : "BIG");

        let candidates = predictedSize === "BIG" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
        let top2Numbers = candidates.slice(0, 2);

        return {
            size: predictedSize,
            targetNumbers: top2Numbers,
            numbersStr: top2Numbers.join(", ")
        };
    } catch (e) {
        return { size: "BIG", numbersStr: "7, 9", targetNumbers: [7, 9] };
    }
}

let isChecking = false;

async function monitorAndPredict() {
    if (isChecking) return;
    isChecking = true;

    try {
        let historyList = null;

        for (let url of API_ENDPOINTS) {
            try {
                const res = await axios.get(url, { timeout: 2000 });
                let data = res.data?.data?.list || res.data?.list;
                if (Array.isArray(data) && data.length > 0) {
                    historyList = data;
                    break;
                }
            } catch (err) {}
        }

        if (!historyList) {
            isChecking = false;
            return;
        }

        let latestItem = historyList[0];
        let actualPeriod = String(latestItem.issueName || latestItem.issueNumber || latestItem.period);
        let actualNum = parseInt(latestItem.number !== undefined ? latestItem.number : latestItem.result);
        let actualSize = actualNum >= 5 ? "BIG" : "SMALL";

        // 1. Check Previous Pending Prediction (Result Processing)
        if (pendingPrediction && pendingPrediction.period === actualPeriod) {
            let isSizeHit = (pendingPrediction.size === actualSize);
            let currentBet = getBetVal(maintenanceLevel);

            if (isSizeHit) {
                totalWins++;
                totalProfitLoss += (currentBet * 0.98);
                console.log(`[RESULT] Period ${actualPeriod} WIN! (${actualSize})`);
                maintenanceLevel = 1;
            } else {
                totalLosses++;
                totalProfitLoss -= currentBet;
                console.log(`[RESULT] Period ${actualPeriod} LOSS! Got: ${actualSize}`);
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }

            pendingPrediction = null; // Reset Pending
        }

        // 2. Compute Next Period ID for Early Prediction
        let nextPeriod = String(BigInt(actualPeriod) + 1n);

        // 3. Send 10-Sec Early Prediction (If not sent already)
        if (nextPeriod !== lastPredictedPeriod) {
            let pred = generateEarlyPrediction(historyList);

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

            // Save details for next round validation
            lastPredictedPeriod = nextPeriod;
            pendingPrediction = {
                period: nextPeriod,
                size: pred.size,
                numbers: pred.targetNumbers
            };

            console.log("[SUCCESS] 10-Sec Early Message Sent for Period: " + nextPeriod);
        }

    } catch (err) {
        console.error("Monitor Error:", err.message);
    } finally {
        isChecking = false;
    }
}

// Run engine every 1 Second
setInterval(monitorAndPredict, 1000);
