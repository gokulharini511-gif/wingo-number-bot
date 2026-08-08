const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

// WinGo 30S Endpoints
const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://api.rajastake7.com/api/web/game/winGo/getHistoryList?type=30'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo 30S 10s Advance Prediction Bot Running!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo 30S - 10 Sec Advance Bot Live...**", { parse_mode: 'Markdown' });
    
    setInterval(monitorAndPredict, 800);
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

function getFallback30SPeriod() {
    let now = new Date();
    let year = now.getUTCFullYear();
    let month = String(now.getUTCMonth() + 1).padStart(2, '0');
    let day = String(now.getUTCDate()).padStart(2, '0');
    let totalSeconds = (now.getUTCHours() * 3600) + (now.getUTCMinutes() * 60) + now.getUTCSeconds();
    let periodIndex = Math.floor(totalSeconds / 30);
    return `${year}${month}${day}3000${10000 + periodIndex}`;
}

function generateEarlyPrediction(historyList) {
    try {
        if (historyList && historyList.length > 0) {
            let numbers = historyList.map(x => parseInt(x.number !== undefined ? x.number : x.result));
            let last1 = numbers[0];
            let last2 = numbers[1] || last1;
            let isBig = n => n >= 5;
            
            let predictedSize = (isBig(last1) === isBig(last2)) 
                ? (isBig(last1) ? "BIG" : "SMALL") 
                : (isBig(last1) ? "SMALL" : "BIG");

            let numbersStr = predictedSize === "BIG" ? "7, 9" : "1, 3";
            return { size: predictedSize, numbersStr: numbersStr };
        }
    } catch (e) {}

    let sizes = ["BIG", "SMALL"];
    let randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    return { size: randomSize, numbersStr: randomSize === "BIG" ? "7, 9" : "1, 3" };
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
                    timeout: 2000,
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
            actualPeriod = getFallback30SPeriod();
            actualSize = Math.random() >= 0.5 ? "BIG" : "SMALL";
        }

        if (pendingPrediction && pendingPrediction.period === actualPeriod) {
            let isSizeHit = (pendingPrediction.size === actualSize);
            let currentBet = getBetVal(maintenanceLevel);

            if (isSizeHit) {
                totalWins++;
                totalProfitLoss += (currentBet * 0.98);
                console.log(`[WIN] 30S Period ${actualPeriod} - Result: ${actualSize}`);
                maintenanceLevel = 1;
            } else {
                totalLosses++;
                totalProfitLoss -= currentBet;
                console.log(`[LOSS] 30S Period ${actualPeriod} - Result: ${actualSize}`);
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }

            pendingPrediction = null;
        }

        let nextPeriod = String(BigInt(actualPeriod) + 1n);

        if (nextPeriod !== lastPredictedPeriod) {
            let pred = generateEarlyPrediction(historyList);

            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "⚡ **WIN GO 30S (10S ADVANCE)** ⚡\n" +
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

            console.log("[SUCCESS] 30S Message Sent for Period: " + nextPeriod);
        }

    } catch (err) {
        console.error("[ERROR]:", err.message);
    } finally {
        isChecking = false;
    }
}
