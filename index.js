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

app.get('/', (req, res) => res.send('WinGo Smart Pattern Engine Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo Color + Big/Small Smart Bot Live...**", { parse_mode: 'Markdown' });
    fetchWinGoData();
});

let lastSentPeriod = "";
let lastPredictedNumbers = [];
let lastPredictedPeriod = null;

let totalWins = 0;
let totalLosses = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0;

let predictionCount = 0;
let maxLevelReached = 1;
let prediction60History = [];

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

// Color + Big/Small Filtered Multi-Pattern Engine (50 Pages Check)
function advancedPatternEngine(history) {
    try {
        let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        if (numbers.length < 5) return { targetNumbers: [1, 3], numbersStr: "1, 3" };

        // 1. Predict Color Trend (Green vs Red)
        let greenCount = 0;
        let redCount = 0;
        for (let i = 0; i < 10; i++) {
            let n = numbers[i];
            if ([1, 3, 7, 9].includes(n)) greenCount++;
            if ([2, 4, 6, 8].includes(n)) redCount++;
        }
        let predictedColor = (greenCount >= redCount) ? "GREEN" : "RED";

        // 2. Predict Big vs Small Trend (Zig-zag, Double, 3/4 Streaks)
        let last1 = numbers[0];
        let last2 = numbers[1];
        let last3 = numbers[2];
        
        let isBig = n => n >= 5;
        let predictedSize = "BIG";

        // Pattern Check: Double / Zig-Zag Detection
        if (isBig(last1) === isBig(last2)) {
            // Continuation / Streak
            predictedSize = isBig(last1) ? "BIG" : "SMALL";
        } else {
            // Zig-zag pattern (Big -> Small -> Big)
            predictedSize = isBig(last1) ? "SMALL" : "BIG";
        }

        // 3. Match 2 Numbers Based on Color & Big/Small Combination
        let matchedNumbers = [];
        if (predictedColor === "GREEN" && predictedSize === "BIG") {
            matchedNumbers = [7, 9];
        } else if (predictedColor === "GREEN" && predictedSize === "SMALL") {
            matchedNumbers = [1, 3];
        } else if (predictedColor === "RED" && predictedSize === "BIG") {
            matchedNumbers = [6, 8];
        } else { // RED + SMALL
            matchedNumbers = [2, 4];
        }

        // 4. Pattern Repeats Verification (Top-to-Bottom / Bottom-to-Top History Pattern)
        let patternMatchCount = 0;
        for (let i = 0; i < numbers.length - 3; i++) {
            if (numbers[i] === last1 && numbers[i+1] === last2) {
                let historicalNext = numbers[i+2];
                if (matchedNumbers.includes(historicalNext)) {
                    patternMatchCount++;
                }
            }
        }

        return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };

    } catch (e) {
        return { targetNumbers: [1, 3], numbersStr: "1, 3" };
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
        let actualPeriod = String(lastItem.issueName || lastItem.issueNumber || lastItem.period || lastItem.issue);
        
        let nextPeriod = String(BigInt(actualPeriod) + 1n);
        let dynamicStatusMsg = "";

        if (lastPredictedPeriod && lastPredictedPeriod === actualPeriod) {
            let isNumberHit = lastPredictedNumbers.includes(actualNum);

            let currentLevelExecuted = maintenanceLevel;
            let currentBetVal = getBetVal(currentLevelExecuted);

            if (currentLevelExecuted > maxLevelReached) {
                maxLevelReached = currentLevelExecuted;
            }

            predictionCount++;

            if (isNumberHit) {
                totalWins++;
                let singleBet = currentBetVal / 2;
                let winProfit = (singleBet * 9) - currentBetVal; 
                totalProfitLoss += winProfit;

                dynamicStatusMsg = "🏆 **JK WINNER (" + actualNum + ") LEVEL " + currentLevelExecuted + " (+₹" + winProfit.toFixed(1) + ")** 🏆";

                prediction60History.unshift({ period: actualPeriod, status: "WIN (JK)", level: currentLevelExecuted });
                maintenanceLevel = 1; 

            } else {
                totalLosses++;
                totalProfitLoss -= currentBetVal;

                dynamicStatusMsg = "💔 **LOSS (" + actualNum + ") LEVEL " + currentLevelExecuted + "**";

                prediction60History.unshift({ period: actualPeriod, status: "LOSS", level: currentLevelExecuted });
                
                if (maintenanceLevel >= 8) {
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
                                 "🏆 **TOTAL WINS (JK):** " + totalWins + "\n" +
                                 "💔 **TOTAL LOSSES:** " + totalLosses + "\n" +
                                 "📈 **MAX LEVEL REACHED:** Level " + maxLevelReached + "\n" +
                                 "💰 **NET PROFIT / LOSS:** **" + profitSign + "**\n" +
                                 "━━━━━━━━━━━━━━━━━━━━━\n" +
                                 "📝 **RECENT HISTORY SUMMARY (LAST 10):**\n";

                let recent10 = prediction60History.slice(0, 10);
                recent10.forEach(item => {
                    let icon = item.status.includes("WIN") ? "✅" : "❌";
                    summaryMsg += `${icon} Period: \`${item.period}\` - ${item.status} (Level ${item.level})\n`;
                });

                summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n🔄 **Batch completed! Resetting stats for next 60 rounds!**";

                await safeSendMessage(CHANNEL_ID, summaryMsg, { parse_mode: 'Markdown' });

                predictionCount = 0;
                totalWins = 0;
                totalLosses = 0;
                totalProfitLoss = 0;
                maxLevelReached = 1;
                prediction60History = [];
            }
        }

        if (nextPeriod !== lastSentPeriod) {
            let pred = advancedPatternEngine(list);
            
            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));

            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "👑 **KING PREDICTION**\n" +
                      "⚡ **WinGo 30S (Color + Big/Small Filtered)** ⚡\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n" +
                      "📌 **PERIOD:** `" + nextPeriod + "`\n" +
                      "🔢 **NUMBERS:** `" + pred.numbersStr + "`\n" +
                      "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
                      "━━━━━━━━━━━━━━━━━━━━━\n";

            if (dynamicStatusMsg !== "") {
                msg += dynamicStatusMsg + "\n━━━━━━━━━━━━━━━━━━━━━\n";
            }

            msg += "🔢 **PROGRESS:** " + predictionCount + " / 60\n" +
                   "🏆 **JK WINS:** " + totalWins + " | 💔 **LOSSES:** " + totalLosses + "\n" +
                   "📊 **TOTAL PROFIT / LOSS:** **" + profitSign + "**\n" +
                   "━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   "🔗 **Register Link:**\n" + REGISTER_LINK;

            await safeSendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextPeriod;
            lastPredictedPeriod = nextPeriod;
            lastPredictedNumbers = pred.targetNumbers;
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
