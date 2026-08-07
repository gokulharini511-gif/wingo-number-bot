const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Configured Credentials
const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = '-1003310985903';
const SCRAPINGANT_API_KEY = 'ffbc3803db954886adfaba6ac22b4b2a'; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery03.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo Ultra Hybrid Engine Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo Ultra Hybrid Engine Live...**", { parse_mode: 'Markdown' });
    fetchWinGoData();
});

let lastSentPeriod = "";
let lastPredictedSize = "";
let lastPredictedNumbers = [];
let lastPredictedColor = "";
let lastPredictedPeriod = null;

let totalWins = 0;
let totalLosses = 0;
let totalJackpots = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0;

let predictionCount = 0;
let maxLevelReached = 1;
let prediction60History = [];
let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

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
    if (levelData[level]) return levelData[level].val;
    return Math.pow(3, level - 1);
}

function ultraHybridEngine(history) {
    try {
        let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        let results = numbers.map(n => n >= 5 ? "BIG" : "SMALL");

        let r1 = results[0], r2 = results[1], r3 = results[2], r4 = results[3];
        let predictedSize = "BIG";

        if (r1 !== r2 && r2 !== r3 && r3 !== r4) {
            predictedSize = r1 === "BIG" ? "SMALL" : "BIG"; 
        } else if (r1 === r2) {
            predictedSize = r1; 
        } else {
            predictedSize = r1;
        }

        const lastNum = numbers[0] !== undefined ? numbers[0] : 5;
        let candidates = [];

        if (predictedSize === "BIG") {
            if ([5, 0].includes(lastNum)) candidates = [6, 8];
            else if ([6, 1].includes(lastNum)) candidates = [7, 9];
            else candidates = [7, 8];
        } else {
            if ([0, 5].includes(lastNum)) candidates = [1, 3];
            else if ([1, 6].includes(lastNum)) candidates = [0, 2];
            else candidates = [1, 2];
        }

        let numScores = {};
        candidates.forEach(c => numScores[c] = 0);
        numbers.slice(0, 15).forEach((n, idx) => {
            if (numScores[n] !== undefined) numScores[n] += (15 - idx);
        });

        let matchedNumbers = Object.keys(numScores).map(Number).sort((a, b) => numScores[b] - numScores[a]).slice(0, 2);
        if (matchedNumbers.length < 2) matchedNumbers = candidates;

        let mainColor = predictedSize === "BIG" ? "GREEN" : "RED";
        let colorStr = mainColor === "GREEN" ? "🟢 GREEN" : "🔴 RED";
        if (matchedNumbers.includes(0)) colorStr = "🔴 RED / 🟣 VIOLET";
        else if (matchedNumbers.includes(5)) colorStr = "🟢 GREEN / 🟣 VIOLET";

        return {
            size: predictedSize,
            targetNumbers: matchedNumbers,
            numbersStr: matchedNumbers.join(", "),
            colorStr: colorStr,
            mainColor: mainColor
        };
    } catch (e) {
        return { size: "BIG", targetNumbers: [7, 9], numbersStr: "7, 9", colorStr: "🟢 GREEN", mainColor: "GREEN" };
    }
}

let isFetching = false;

async function fetchWinGoData() {
    if (isFetching) return;
    isFetching = true;

    let list = null;

    for (let url of API_ENDPOINTS) {
        try {
            const res = await axios.get(url, {
                timeout: 4000,
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.rajastake7.com/' }
            });
            let data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            let extractedList = data?.data?.list || data?.list || data?.data;
            if (Array.isArray(extractedList) && extractedList.length > 0) {
                list = extractedList;
                break;
            }
        } catch (err) {}
    }

    if (!list && SCRAPINGANT_API_KEY) {
        try {
            const scraperUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(API_ENDPOINTS[0])}&x-api-key=${SCRAPINGANT_API_KEY}&browser=false`;
            const response = await axios.get(scraperUrl, { timeout: 8000 });
            let data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            list = data?.data?.list || data?.list;
        } catch (e) {}
    }

    if (!list) {
        isFetching = false;
        return;
    }

    try {
        let lastItem = list[0];
        let actualNum = parseInt(lastItem.number !== undefined ? lastItem.number : lastItem.result);
        let actualPeriod = String(lastItem.issueName || lastItem.issueNumber || lastItem.period || lastItem.issue);
        let actualSize = (actualNum >= 5) ? "BIG" : "SMALL";

        let nextPeriod = String(BigInt(actualPeriod) + 1n);
        let dynamicStatusMsg = "";

        if (lastPredictedPeriod && lastPredictedPeriod === actualPeriod) {
            let isNumberHit = lastPredictedNumbers.includes(actualNum);
            let isSizeHit = (lastPredictedSize === actualSize);

            let currentBetVal = getBetVal(maintenanceLevel);
            if (maintenanceLevel > maxLevelReached) maxLevelReached = maintenanceLevel;
            predictionCount++;

            if (isNumberHit) {
                totalWins++;
                totalJackpots++;
                levelWins[maintenanceLevel] = (levelWins[maintenanceLevel] || 0) + 1;
                
                let winProfit = ((currentBetVal / 2) * 9) - currentBetVal;
                totalProfitLoss += winProfit;

                dynamicStatusMsg = "🏆 **JACKPOT NUMBER WIN (" + actualNum + ") LEVEL " + maintenanceLevel + " (+₹" + winProfit.toFixed(1) + ")** 🏆";
                prediction60History.unshift({ period: actualPeriod, status: "JACKPOT WIN", level: maintenanceLevel });
                maintenanceLevel = 1;

            } else if (isSizeHit) {
                totalWins++;
                levelWins[maintenanceLevel] = (levelWins[maintenanceLevel] || 0) + 1;
                let winProfit = currentBetVal * 0.98;
                totalProfitLoss += winProfit;

                dynamicStatusMsg = "✨ **" + actualSize + " WINNER LEVEL " + maintenanceLevel + " (+₹" + winProfit.toFixed(1) + ")**";
                prediction60History.unshift({ period: actualPeriod, status: actualSize + " WIN", level: maintenanceLevel });
                maintenanceLevel = 1;

            } else {
                totalLosses++;
                totalProfitLoss -= currentBetVal;

                dynamicStatusMsg = "💔 **LOSS (" + actualNum + " - " + actualSize + ") LEVEL " + maintenanceLevel + "**";
                prediction60History.unshift({ period: actualPeriod, status: "LOSS", level: maintenanceLevel });
                
                maintenanceLevel = (maintenanceLevel >= 8) ? 1 : maintenanceLevel + 1;
            }

            if (predictionCount >= 60) {
                let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);
                
                let summaryMsg = "📊 **60 PREDICTIONS ULTRA BATCH REPORT** 📊\n" +
                                 "━━━━━━━━━━━━━━━━━━━━━\n" +
                                 "🎯 **TOTAL PREDICTIONS:** 60\n" +
                                 "🏆 **TOTAL WINS:** " + totalWins + " | 💥 **JACKPOTS:** " + totalJackpots + "\n" +
                                 "💔 **TOTAL LOSSES:** " + totalLosses + "\n" +
                                 "📈 **MAX LEVEL REACHED:** Level " + maxLevelReached + "\n" +
                                 "💰 **NET PROFIT / LOSS:** **" + profitSign + "**\n" +
                                 "━━━━━━━━━━━━━━━━━━━━━\n" +
                                 "🎯 **LEVEL-WISE WINS BREAKDOWN:**\n";

                for (let l = 1; l <= 8; l++) {
                    summaryMsg += `🔹 LEVEL ${l} (${levelData[l].name}): ${levelWins[l] || 0} WINS\n`;
                }

                summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n📝 **RECENT HISTORY (LAST 5):**\n";
                prediction60History.slice(0, 5).forEach(item => {
                    let icon = item.status.includes("WIN") ? "✅" : "❌";
                    summaryMsg += `${icon} \`${item.period}\`: ${item.status} (Level ${item.level})\n`;
                });

                summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n🔄 **Batch completed! Resetting stats...**";

                await safeSendMessage(CHANNEL_ID, summaryMsg, { parse_mode: 'Markdown' });

                predictionCount = 0; totalWins = 0; totalLosses = 0; totalJackpots = 0;
                totalProfitLoss = 0; maxLevelReached = 1; prediction60History = [];
                levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
            }
        }

        if (nextPeriod !== lastSentPeriod) {
            let pred = ultraHybridEngine(list);
            let currentBetName = levelData[maintenanceLevel]?.name || ("₹" + getBetVal(maintenanceLevel));
            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "👑 **KING ULTRA PREDICTION**\n" +
                      "⚡ **WinGo 30S (Hybrid Engine)** ⚡\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + nextPeriod + "`\n" +
                      "📏 **BIG / SMALL:** `" + pred.size + "`\n" +
                      "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                      "🎨 **COLOUR:** " + pred.colorStr + "\n" +
                      "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + maintenanceLevel + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n";

            if (dynamicStatusMsg !== "") {
                msg += dynamicStatusMsg + "\n━━━━━━━━━━━━━━━━━━━━━\n";
            }

            msg += "🔢 **PROGRESS:** " + predictionCount + " / 60\n" +
                   "🏆 **WINS:** " + totalWins + " | 💥 **JACKPOTS:** " + totalJackpots + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                   "📊 **NET PROFIT:** **" + profitSign + "**\n" +
                   "━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextPeriod;
            lastPredictedPeriod = nextPeriod;
            lastPredictedNumbers = pred.targetNumbers;
            lastPredictedColor = pred.mainColor;
            lastPredictedSize = pred.size;
        }
    } catch (error) {
        console.error('[PROCESS ERROR]:', error.message);
    } finally {
        isFetching = false;
    }
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection:', reason));

setInterval(fetchWinGoData, 3000);
