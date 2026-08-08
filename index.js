const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=10&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=10&pageNo=1',
    'https://api.rajastake7.com/api/web/game/winGo/getHistoryList?type=30'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo 30S High-Speed Direct Period Engine Active'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 30S Direct Period Sync Engine Live...**", { parse_mode: 'Markdown' });
    setInterval(directPeriodSyncEngine, 100);
});

let lastSentPeriod = "";
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

function calculatePattern(history) {
    try {
        if (history && history.length > 0) {
            let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
            let n1 = numbers[0];
            let n2 = numbers[1] || n1;
            let isBig = n => n >= 5;
            
            let predictedSize = (isBig(n1) === isBig(n2)) 
                ? (isBig(n1) ? "BIG" : "SMALL") 
                : (isBig(n1) ? "SMALL" : "BIG");

            let numbersStr = predictedSize === "BIG" ? "7, 9" : "1, 3";
            return { size: predictedSize, numbersStr: numbersStr };
        }
    } catch (e) {}

    let randomSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
    return { size: randomSize, numbersStr: randomSize === "BIG" ? "7, 9" : "1, 3" };
}

let isRunning = false;

async function directPeriodSyncEngine() {
    if (isRunning) return;
    isRunning = true;

    try {
        let historyList = null;

        for (let url of API_ENDPOINTS) {
            try {
                const res = await axios.get(url, { 
                    timeout: 800,
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
                });
                let extracted = res.data?.data?.list || res.data?.list || res.data?.data;
                if (Array.isArray(extracted) && extracted.length > 0) {
                    historyList = extracted;
                    break;
                }
            } catch (err) {}
        }

        if (!historyList || historyList.length === 0) {
            isRunning = false;
            return;
        }

        let latestItem = historyList[0];
        let latestApiPeriod = String(latestItem.issueName || latestItem.issueNumber || latestItem.period || latestItem.issue);
        let actualNum = parseInt(latestItem.number !== undefined ? latestItem.number : latestItem.result);
        let actualSize = actualNum >= 5 ? "BIG" : "SMALL";

        // 1. Check Previous Prediction Result Immediately On API Arrival
        if (pendingPrediction && pendingPrediction.period === latestApiPeriod) {
            let isSizeHit = (pendingPrediction.size === actualSize);
            let currentBet = getBetVal(maintenanceLevel);

            if (isSizeHit) {
                totalWins++;
                totalProfitLoss += (currentBet * 0.98);
                console.log(`[WIN] Period: ${latestApiPeriod} | Result: ${actualSize}`);
                maintenanceLevel = 1;
            } else {
                totalLosses++;
                totalProfitLoss -= currentBet;
                console.log(`[LOSS] Period: ${latestApiPeriod} | Result: ${actualSize}`);
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }
            pendingPrediction = null;
        }

        // 2. Next Period Calculation (+2 offset fixes late delivery & matches live timer)
        let nextTargetPeriod = String(BigInt(latestApiPeriod) + 2n);

        if (nextTargetPeriod !== lastSentPeriod) {
            let pred = calculatePattern(historyList);

            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "⚡ **WIN GO 30S EXACT PREDICTION** ⚡\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + nextTargetPeriod + "`\n" +
                      "📏 **PREDICTION:** `" + pred.size + "`\n" +
                      "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                      "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🏆 **WINS:** " + totalWins + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                      "📊 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextTargetPeriod;
            pendingPrediction = {
                period: nextTargetPeriod,
                size: pred.size
            };

            console.log(`[SENT INSTANT] Target Period: ${nextTargetPeriod} | Latest API Period: ${latestApiPeriod}`);
        }

    } catch (err) {
        console.error("Engine Error:", err.message);
    } finally {
        isRunning = false;
    }
}
