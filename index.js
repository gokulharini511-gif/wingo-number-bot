const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = -1003310985903; 
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const API_ENDPOINTS = [
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery02.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1',
    'https://draw.ar-lottery03.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=50&pageNo=1'
];

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo Direct Trend Exact Model Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🔥 **WINGO 30S DIRECT TREND PREDICTION BOT LIVE** 🔥", { parse_mode: 'Markdown' });
    fetchWinGoData();
});

let lastSentPeriod = "";
let lastPredictedResult = null;
let lastPredictedNumbers = [];
let lastPredictedColor = "";
let lastPredictedPeriod = null;

let totalWins = 0;
let totalLosses = 0;
let totalJackpots = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0.0;

let predictionCount = 0;
let maxLevelReached = 1;

let levelWins = { 
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 
};

let prediction60History = [];

const levelData = {
    1: { name: "₹1", val: 1 },
    2: { name: "₹3", val: 3 },
    3: { name: "₹7", val: 7 },
    4: { name: "₹20", val: 20 },
    5: { name: "₹50", val: 50 },
    6: { name: "₹150", val: 150 },
    7: { name: "₹450", val: 450 },
    8: { name: "₹1350", val: 1350 },
    9: { name: "₹4050", val: 4050 },
    10: { name: "₹12150", val: 12150 },
    11: { name: "₹36450", val: 36450 },
    12: { name: "₹109350", val: 109350 }
};

function getBetVal(level) {
    if (levelData[level]) return levelData[level].val;
    return Math.pow(3, level - 1);
}

function getNumberColor(num) {
    if ([2, 4, 6, 8].includes(num)) return "🔴 RED";
    if ([1, 3, 7, 9].includes(num)) return "🟢 GREEN";
    if (num === 0) return "🔴 RED / 🟣 VIOLET";
    if (num === 5) return "🟢 GREEN / 🟣 VIOLET";
    return "🔴 RED";
}

// Direct Trend Engine: Big -> Big (6, 8), Small -> Small (0, 2)
function directTrendEngine(history) {
    try {
        let allNumbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        let allResults = allNumbers.map(n => n >= 5 ? "BIG" : "SMALL");

        let predResult = allResults[0]; // Direct follow

        let bestTwoNumbers = [];
        if (predResult === "BIG") {
            bestTwoNumbers = [6, 8];
        } else {
            bestTwoNumbers = [0, 2];
        }

        let numbersStr = bestTwoNumbers.join(", ");
        let mainColor = predResult === "BIG" ? "GREEN" : "RED";
        let colorStr = mainColor === "GREEN" ? "🟢 GREEN" : "🔴 RED";
        
        if (bestTwoNumbers.includes(0)) {
            colorStr = "🔴 RED / 🟣 VIOLET";
        } else if (bestTwoNumbers.includes(5)) {
            colorStr = "🟢 GREEN / 🟣 VIOLET";
        }

        return { predResult, targetNumbers: bestTwoNumbers, numbersStr, colorStr, mainColor };

    } catch (e) {
        return { predResult: "BIG", targetNumbers: [6, 8], numbersStr: "6, 8", colorStr: "🟢 GREEN", mainColor: "GREEN" };
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
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.rajastake7.com/'
                }
            });

            let data = res.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }

            let extractedList = data?.data?.list || data?.list || data?.data;
            if (Array.isArray(extractedList) && extractedList.length > 0) {
                list = extractedList;
                break;
            }
        } catch (err) {}
    }

    if (!list) {
        isFetching = false;
        return;
    }

    try {
        let lastItem = list[0];
        let actualNum = parseInt(lastItem.number !== undefined ? lastItem.number : lastItem.result);
        let actualResult = actualNum >= 5 ? "BIG" : "SMALL";
        let actualColor = getNumberColor(actualNum);
        let actualPeriod = String(lastItem.issueName || lastItem.issueNumber || lastItem.period || lastItem.issue);
        
        let nextPeriod = String(BigInt(actualPeriod) + 1n);
        let dynamicStatusMsg = "";

        if (lastPredictedPeriod && lastPredictedPeriod === actualPeriod) {
            let isResultHit = (lastPredictedResult === actualResult);
            let isNumberHit = lastPredictedNumbers.includes(actualNum);

            let currentLevelExecuted = maintenanceLevel;
            let currentBetVal = getBetVal(currentLevelExecuted);
            let currentBetName = levelData[currentLevelExecuted]?.name || ("₹" + currentBetVal);

            if (currentLevelExecuted > maxLevelReached) {
                maxLevelReached = currentLevelExecuted;
            }

            predictionCount++;

            if (isResultHit) {
                totalWins++;

                if (levelWins[currentLevelExecuted] !== undefined) {
                    levelWins[currentLevelExecuted]++;
                } else {
                    levelWins[currentLevelExecuted] = 1;
                }

                let winAmount = currentBetVal * 0.98;
                totalProfitLoss += winAmount;

                if (isNumberHit) {
                    totalJackpots++;
                    dynamicStatusMsg = "🎉 **CONGRATULATIONS (LEVEL " + currentLevelExecuted + " - " + currentBetName + " WIN & JACKPOT!)** 🎉\n🏆 **" + actualResult + " (" + actualNum + ") JACKPOT WINNER** 🏆";
                } else {
                    dynamicStatusMsg = "🎉 **CONGRATULATIONS (LEVEL " + currentLevelExecuted + " - " + currentBetName + " WIN!)** 🎉\n🏆 **" + actualResult + " (" + actualNum + ") WIN** 🏆";
                }

                maintenanceLevel = 1; 

            } else {
                totalLosses++;
                totalProfitLoss -= currentBetVal;

                dynamicStatusMsg = "💔 **LOSS (LEVEL " + currentLevelExecuted + " - " + currentBetName + "): " + actualResult + " (" + actualNum + " - " + actualColor + ")**\n⚠️ **MOVING TO LEVEL " + (maintenanceLevel + 1) + "**";

                if (maintenanceLevel >= 12) {
                    maintenanceLevel = 1;
                } else {
                    maintenanceLevel++; 
                }
            }

            if (predictionCount >= 60) {
                let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);
                
                let summaryMsg = "📊 **60 PREDICTIONS BATCH SUMMARY REPORT** 📊\n" +
                                 "━━━━━━━━━━━━━━━━━━━━━\n" +
                                 "🎯 **TOTAL PREDICTIONS:** 60\n" +
                                 "🏆 **B/S WINS:** " + totalWins + "\n" +
                                 "💥 **JACKPOTS:** " + totalJackpots + "\n" +
                                 "💔 **LOSSES:** " + totalLosses + "\n" +
                                 "📈 **MAX LEVEL REACHED:** Level " + maxLevelReached + "\n" +
                                 "💰 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                                 "━━━━━━━━━━━━━━━━━━━━━\n" +
                                 "🔄 **Batch completed! Resetting stats for the next 60 rounds!**";

                await safeSendMessage(CHANNEL_ID, summaryMsg, { parse_mode: 'Markdown' });

                predictionCount = 0;
                totalWins = 0;
                totalLosses = 0;
                totalJackpots = 0;
                totalProfitLoss = 0.0;
                maxLevelReached = 1;
                levelWins = { 
                    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 
                    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 
                };
            }
        }

        if (nextPeriod !== lastSentPeriod) {
            let pred = directTrendEngine(list);
            
            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));

            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "🔥 **WINGO 30S DIRECT TREND PREDICTION** 🔥\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + nextPeriod + "`\n" +
                      "🎲 **BET:** **" + pred.predResult + "**\n" +
                      "🔢 **PRED NO:** `" + pred.numbersStr + "`\n" +
                      "🎨 **COLOUR:** " + pred.colorStr + "\n" +
                      "💰 **BET LEVEL AMT:** **LEVEL " + activeLevel + " (" + currentBetName + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n";

            if (dynamicStatusMsg !== "") {
                msg += dynamicStatusMsg + "\n━━━━━━━━━━━━━━━━━━━━━\n";
            }

            msg += "🔢 **PROGRESS:** " + predictionCount + " / 60\n" +
                   "🏆 **B/S WINS:** " + totalWins + " | 💥 **JK:** " + totalJackpots + " | 💔 **LOSS:** " + totalLosses + "\n" +
                   "📊 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                   "━━━━━━━━━━━━━━━━━━━━━\n" +
                   "🎯 **LIVE LEVEL WINS:**\n" +
                   "🔹 **LEVEL 1:** " + levelWins[1] + " WINS\n" +
                   "🔹 **LEVEL 2:** " + levelWins[2] + " WINS\n" +
                   "🔹 **LEVEL 3:** " + levelWins[3] + " WINS\n" +
                   "🔹 **LEVEL 4:** " + levelWins[4] + " WINS\n" +
                   "🔹 **LEVEL 5:** " + levelWins[5] + " WINS\n" +
                   "🔹 **LEVEL 6:** " + levelWins[6] + " WINS\n" +
                   "🔹 **LEVEL 7:** " + levelWins[7] + " WINS\n" +
                   "🔹 **LEVEL 8:** " + levelWins[8] + " WINS\n" +
                   "🔹 **LEVEL 9:** " + levelWins[9] + " WINS\n" +
                   "🔹 **LEVEL 10:** " + levelWins[10] + " WINS\n" +
                   "🔹 **LEVEL 11:** " + levelWins[11] + " WINS\n" +
                   "🔹 **LEVEL 12:** " + levelWins[12] + " WINS\n" +
                   "━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextPeriod;
            lastPredictedPeriod = nextPeriod;
            lastPredictedResult = pred.predResult;
            lastPredictedNumbers = pred.targetNumbers;
            lastPredictedColor = pred.mainColor;
            console.log("[SUCCESS] Processed Period: " + nextPeriod);
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
