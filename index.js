const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';

const PREDICTION_CHANNELS = ['-1003293600118', '-1003310985903'];
const REPORT_ONLY_CHANNEL = '-1003345976502';

const RAW_TARGET_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=1000&pageNo=1';
const SCRAPINGANT_API_KEY = 'd717a6d4020b465aac8d0eed35459624'; 

const SCRAPINGANT_URL = `https://api.scrapingant.com/v2/general?x-api-key=${SCRAPINGANT_API_KEY}&url=${encodeURIComponent(RAW_TARGET_URL)}&proxy_country=in&browser=false`;

const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

async function sendPredictionToChannels(message, options = {}) {
    for (const channelId of PREDICTION_CHANNELS) {
        try {
            await bot.sendMessage(channelId, message, options);
        } catch (e) {
            console.error(`Error sending prediction to channel ${channelId}:`, e.message);
        }
    }
}

async function sendReportToAllChannels(message, options = {}) {
    const allChannels = [...PREDICTION_CHANNELS, REPORT_ONLY_CHANNEL];
    for (const channelId of allChannels) {
        try {
            await bot.sendMessage(channelId, message, options);
        } catch (e) {
            console.error(`Error sending report to channel ${channelId}:`, e.message);
        }
    }
}

app.get('/', (req, res) => res.send('WinGo Master Ultimate Multi-Pattern Bot Active!'));

app.listen(PORT, '0.0.0.0', async () => {
    console.log("Server running on port " + PORT);
    try {
        await sendPredictionToChannels("🚀 **WinGo Master Multi-Pattern Bot Live...**", { parse_mode: 'Markdown' });
        await bot.sendMessage(REPORT_ONLY_CHANNEL, "🚀 **WinGo Report Bot Live...**", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Startup Error:", e.message);
    }
    startContinuousLoop();
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
let totalProfitLoss = 0;

let predictionCount = 0;
let maxLevelReached = 1;
let consecutiveLosses = 0;

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

function getNumberColor(num) {
    if ([2, 4, 6, 8].includes(num)) return "RED";
    if ([1, 3, 7, 9].includes(num)) return "GREEN";
    if (num === 0) return "RED / VIOLET";
    if (num === 5) return "GREEN / VIOLET";
    return "RED";
}

// Master Pattern Matcher Engine (Dragon, Zig-Zag, Double, Triple, 1-2-1, 1-3-1, 1-4-1, 4-to-4, 6-Continuous 1-3, etc.)
function masterMultiPatternEngine(history, currentConsecutiveLosses, lastActualResult) {
    try {
        let allNumbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
        let allResults = allNumbers.map(n => n >= 5 ? "BIG" : "SMALL");

        let r1 = allResults[0];
        let r2 = allResults[1];
        let r3 = allResults[2];
        let r4 = allResults[3];
        let r5 = allResults[4];
        let r6 = allResults[5];

        let predResult = "";

        // 1. Loss Protection: If 3+ consecutive losses, lock onto the streak
        if (currentConsecutiveLosses >= 3 && lastActualResult) {
            predResult = lastActualResult;
        } else {
            // 2. Dragon Pattern (4+ continuous same results)
            if (r1 === r2 && r2 === r3 && r3 === r4) {
                predResult = r1;
            } 
            // 3. Zig-Zag (Alternating: B, S, B, S)
            else if (r1 !== r2 && r2 !== r3 && r3 !== r4) {
                predResult = (r1 === "BIG") ? "SMALL" : "BIG";
            }
            // 4. Double Pattern (BB, SS, BB)
            else if (r1 === r2 && r3 === r4 && r1 !== r3) {
                predResult = (r1 === "BIG") ? "SMALL" : "BIG";
            }
            // 5. Triple Pattern (BBB, SSS)
            else if (r1 === r2 && r2 === r3) {
                predResult = (r1 === "BIG") ? "SMALL" : "BIG";
            }
            // 6. 1-2-1 Pattern Check
            else if (r1 !== r2 && r2 === r3 && r3 !== r4) {
                predResult = (r4 === "BIG") ? "SMALL" : "BIG";
            }
            // 7. 1-3-1 Pattern Check
            else if (r1 !== r2 && r2 === r3 && r3 === r4 && r4 !== r5) {
                predResult = (r1 === "BIG") ? "SMALL" : "BIG";
            }
            // 8. 1-4-1 Pattern Check
            else if (allResults.length >= 6 && r1 !== r2 && r2 === r3 && r3 === r4 && r4 === r5 && r5 !== r6) {
                predResult = (r1 === "BIG") ? "SMALL" : "BIG";
            }
            // 9. 4-to-4 Block Pattern Check
            else if (allResults.length >= 8 && allResults.slice(0, 4).every(v => v === allResults[0]) && allResults.slice(4, 8).every(v => v !== allResults[0])) {
                predResult = allResults[0];
            }
            // 10. 6 Continuous 1-3 Block Pattern Check
            else {
                let bigCount = allResults.slice(0, 6).filter(x => x === "BIG").length;
                predResult = (bigCount >= 3) ? "BIG" : "SMALL";
            }
        }

        const lastNum = allNumbers[0] !== undefined ? allNumbers[0] : 5;
        let bestTwoNumbers = [];

        if (predResult === "BIG") {
            if (lastNum % 2 === 0) bestTwoNumbers = [6, 8];
            else bestTwoNumbers = [7, 9];
        } else {
            if (lastNum % 2 === 0) bestTwoNumbers = [0, 2];
            else bestTwoNumbers = [1, 3];
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

async function fetchWinGoData() {
    try {
        const response = await axios.get(SCRAPINGANT_URL, { 
            headers: { 'Accept': 'application/json' },
            timeout: 30000 
        });
        
        let rawContent = response.data.content || response.data;
        let parsedData = null;

        if (typeof rawContent === 'object') {
            parsedData = rawContent;
        } else if (typeof rawContent === 'string') {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            }
        }

        if (!parsedData) return;

        let list = parsedData?.data?.list || parsedData?.list || (Array.isArray(parsedData) ? parsedData : null);
        if (!list || !Array.isArray(list) || list.length === 0) return;

        let lastItem = list[0];
        let actualNum = parseInt(lastItem.number !== undefined ? lastItem.number : (lastItem.result !== undefined ? lastItem.result : lastItem.numberValue));
        let actualResult = actualNum >= 5 ? "BIG" : "SMALL";
        let actualColor = getNumberColor(actualNum);
        let actualPeriod = String(lastItem.issueName || lastItem.issueNumber || lastItem.period || lastItem.issue || lastItem.issueCode);
        
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
                consecutiveLosses = 0;

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
                consecutiveLosses++;
                totalProfitLoss -= currentBetVal;

                dynamicStatusMsg = "💔 **LOSS (LEVEL " + currentLevelExecuted + " - " + currentBetName + "): " + actualResult + " (" + actualNum + " - " + actualColor + ")**\n⚠️ **STREAK LOSS (" + consecutiveLosses + ") - SWITCHING MASTER PATTERN!**";

                maintenanceLevel++; 
            }

            if (predictionCount >= 60) {
                let profitSign = totalProfitLoss >= 0 ? "₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);
                
                let summaryMsg = "📊 **60 PREDICTIONS BATCH SUMMARY REPORT** 📊\n" +
                               "━━━━━━━━━━━━━━━━━━━━━\n" +
                               "🎯 **TOTAL PREDICTIONS:** 60\n" +
                               "🏆 **BIG / SMALL WINS:** " + totalWins + "\n" +
                               "💥 **JACKPOT WINS:** " + totalJackpots + "\n" +
                               "💔 **LOSSES:** " + totalLosses + "\n" +
                               "📈 **MAX LEVEL REACHED:** Level " + maxLevelReached + "\n" +
                               "💰 **TOTAL PROFIT:** **" + profitSign + "**\n" +
                               "━━━━━━━━━━━━━━━━━━━━━\n" +
                               "🎯 **LEVEL-WISE WINS BREAKDOWN:**\n" +
                               "🔹 LEVEL 1: " + levelWins[1] + " WINS\n" +
                               "🔹 LEVEL 2: " + levelWins[2] + " WINS\n" +
                               "🔹 LEVEL 3: " + levelWins[3] + " WINS\n" +
                               "🔹 LEVEL 4: " + levelWins[4] + " WINS\n" +
                               "🔹 LEVEL 5: " + levelWins[5] + " WINS\n" +
                               "🔹 LEVEL 6: " + levelWins[6] + " WINS\n" +
                               "🔹 LEVEL 7: " + levelWins[7] + " WINS\n" +
                               "🔹 LEVEL 8: " + levelWins[8] + " WINS\n" +
                               "━━━━━━━━━━━━━━━━━━━━━\n" +
                               "🔄 **Batch completed! Resetting stats for the next 60 rounds non-stop!**";

                await sendReportToAllChannels(summaryMsg, { parse_mode: 'Markdown' });

                predictionCount = 0;
                totalWins = 0;
                totalLosses = 0;
                totalJackpots = 0;
                totalProfitLoss = 0;
                maxLevelReached = 1;
                consecutiveLosses = 0;
                levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
            }
        }

        if (nextPeriod !== lastSentPeriod) {
            let pred = masterMultiPatternEngine(list, consecutiveLosses, actualResult);
            
            let activeLevel = maintenanceLevel;
            let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));

            let profitSign = totalProfitLoss >= 0 ? "₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

            let msg = "🔥 **WINGO 30S MASTER PREDICTION** 🔥\n" +
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
                   "━━━━━━━━━━━━━━━━━━━━━\n\n" +
                   "🔗 **Register Link:**\n" + REGISTER_LINK;

            await sendPredictionToChannels(msg, { parse_mode: 'Markdown' });

            lastSentPeriod = nextPeriod;
            lastPredictedPeriod = nextPeriod;
            lastPredictedResult = pred.predResult;
            lastPredictedNumbers = pred.targetNumbers;
            lastPredictedColor = pred.mainColor;
            console.log("[CONTINUOUS] Sent Period: " + nextPeriod + " to all prediction channels (" + predictionCount + "/60)");
        }
    } catch (error) {
        console.error('[API FETCH ERROR]:', error.message);
    }
}

async function startContinuousLoop() {
    while (true) {
        await fetchWinGoData();
        await new Promise(resolve => setTimeout(resolve, 6000));
    }
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection:', reason));
