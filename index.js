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

app.get('/', (req, res) => res.send('WinGo High Accuracy Engine Active!'));

async function safeSendMessage(chatId, text, options) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error("Telegram Send Error:", err.message);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    await safeSendMessage(CHANNEL_ID, "🚀 **WinGo High Accuracy Bot Live...**", { parse_mode: 'Markdown' });
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

// Ultra High Accuracy Filter Algorithm
function ultraAccuracyEngine(history) {
    try {
        let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        if (numbers.length < 10) return { targetNumbers: [1, 3], numbersStr: "1, 3" };

        let isBig = n => n >= 5;
        let isGreen = n => [1, 3, 7, 9].includes(n);
        let isRed = n => [2, 4, 6, 8].includes(n);

        // 1. Dragon Streak Check (Continuous same Big/Small pattern)
        let streakCount = 1;
        let firstIsBig = isBig(numbers[0]);
        for (let i = 1; i < 6; i++) {
            if (isBig(numbers[i]) === firstIsBig) streakCount++;
            else break;
        }

        let targetSize = firstIsBig ? "BIG" : "SMALL";
        if (streakCount < 3) { // If no long streak, follow Zig-Zag
            targetSize = firstIsBig ? "SMALL" : "BIG";
        }

        // 2. Color Frequency Check
        let greenCount = numbers.slice(0, 10).filter(isGreen).length;
        let redCount = numbers.slice(0, 10).filter(isRed).length;
        let targetColor = (greenCount >= redCount) ? "GREEN" : "RED";

        // 3. Filter candidate numbers
        let candidates = [];
        if (targetColor === "GREEN" && targetSize === "BIG") candidates = [7, 9, 5];
        else if (targetColor === "GREEN" && targetSize === "SMALL") candidates = [1, 3];
        else if (targetColor === "RED" && targetSize === "BIG") candidates = [6, 8];
        else candidates = [2, 4, 0];

        // 4. Score based on last 50 games frequency
        let numScores = {};
        candidates.forEach(c => numScores[c] = 0);

        numbers.slice(0, 30).forEach((n, idx) => {
            if (numScores[n] !== undefined) {
                numScores[n] += (30 - idx); // Recent appearances get more weight
            }
        });

        let sorted = Object.keys(numScores).map(Number).sort((a, b) => numScores[b] - numScores[a]);
        let matchedNumbers = sorted.slice(0, 2);

        if (matchedNumbers.length < 2) {
            matchedNumbers = candidates.slice(0, 2);
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
            let pred = ultraAccuracyEngine(list);
            
            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));

            let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "👑 **KING PREDICTION**\n" +
                      "⚡ **WinGo 30S (Ultra Accuracy Algorithm)** ⚡\n" +
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
