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

app.get('/', (req, res) => res.send('WinGo 30S 2-Digit Trend Engine Active'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 30S 2-Digit Trend Engine Live...**", { parse_mode: 'Markdown' });
    setInterval(apiPeriodEngine, 500);
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

// 2-Digit Pattern & Trend Analysis
function calculatePattern(history) {
    try {
        if (history && history.length >= 5) {
            let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
            let sizes = numbers.slice(0, 5).map(n => n >= 5 ? "BIG" : "SMALL");

            let n1 = numbers[0];
            let isBig = n => n >= 5;

            // Trend Based Pattern Logic (Giving 2-digit combinations as requested)
            if (sizes[0] === sizes[1]) {
                let chosenSize = sizes[0];
                let numStr = chosenSize === "BIG" ? (n1 % 2 === 0 ? "6 8" : "7 9") : (n1 % 2 === 0 ? "0 2" : "1 3");
                return { size: chosenSize, numbersStr: numStr };
            }

            if (sizes[0] !== sizes[1] && sizes[1] !== sizes[2]) {
                let chosenSize = sizes[0] === "BIG" ? "SMALL" : "BIG";
                let numStr = chosenSize === "BIG" ? "5 7" : "2 4";
                return { size: chosenSize, numbersStr: numStr };
            }

            let bigCount = sizes.filter(s => s === "BIG").length;
            let chosenSize = bigCount >= 3 ? "SMALL" : "BIG";
            let numStr = chosenSize === "BIG" ? "8 9" : "0 4";
            return { size: chosenSize, numbersStr: numStr };
        }
    } catch (e) {}

    let randomSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
    let randomNumStr = randomSize === "BIG" ? "7 9" : "1 3";
    return { size: randomSize, numbersStr: randomNumStr };
}

let isRunning = false;

async function apiPeriodEngine() {
    if (isRunning) return;
    isRunning = true;

    try {
        let historyList = null;

        for (let url of API_ENDPOINTS) {
            try {
                const res = await axios.get(url, { timeout: 2000 });
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

        // Check Previous Win/Loss
        if (pendingPrediction && pendingPrediction.period === latestApiPeriod) {
            let isSizeHit = (pendingPrediction.size === actualSize);
            let currentBet = getBetVal(maintenanceLevel);

            if (isSizeHit) {
                totalWins++;
                totalProfitLoss += (currentBet * 0.98);
                maintenanceLevel = 1;
            } else {
                totalLosses++;
                totalProfitLoss -= currentBet;
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }
            pendingPrediction = null;
        }

        let nextTargetPeriodFull = String(BigInt(latestApiPeriod) + 2n);
        
        // Shorten the period string to only last 2 digits
        let shortTargetPeriod = nextTargetPeriodFull.slice(-2);

        if (nextTargetPeriodFull !== lastSentPeriod) {
            let pred = calculatePattern(historyList);

            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "⚡ **WIN GO 30S PREDICTION** ⚡\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + shortTargetPeriod + "`\n" +
                      "📏 **PREDICTION:** `" + pred.size + "`\n" +
                      "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                      "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🏆 **WINS:** " + totalWins + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                      "📊 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextTargetPeriodFull;
            pendingPrediction = {
                period: nextTargetPeriodFull,
                size: pred.size
            };

            console.log(`[2-DIGIT SENT] Target Period 2-digit: ${shortTargetPeriod}`);
        }

    } catch (err) {
        console.error("Engine Error:", err.message);
    } finally {
        isRunning = false;
    }
}
