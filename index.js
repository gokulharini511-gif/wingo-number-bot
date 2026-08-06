const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Express Server for Render Uptime
const app = express();
const PORT = process.env.PORT || 10000;

// Configurations (Updated Keys)
const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const CHANNEL_ID = '-1002486828817'; 
const SCRAPINGANT_API_KEY = '9b7eaf7431374b2089e3f778b8504522'; 
const TARGET_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=1000&pageNo=1';
const REGISTER_LINK = 'https://www.rajastake7.com/#/register?invitationCode=172723872480';

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.get('/', (req, res) => res.send('WinGo 30S Number Precision Engine Active!'));

app.listen(PORT, '0.0.0.0', async () => {
  console.log("Server running on port " + PORT);
  try {
    await bot.sendMessage(CHANNEL_ID, "🚀 **WinGo Pure Number Prediction Bot Live!**", { parse_mode: 'Markdown' });
  } catch (e) {
    console.error("Startup Telegram Notification Error:", e.message);
  }
});

let lastSentPeriod = "";
let lastPredictedNumbers = [];
let lastPredictedColor = "";
let lastPredictedPeriod = null;
let totalWins = 0;
let totalLosses = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0;
let predictionCount = 0;
let maxLevelReached = 1;
let predictionHistory = [];

// Track wins per martingale level
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

// Pure Number Pattern Analysis Engine
function deepNumberPatternEngine(history) {
  try {
    let allNumbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    
    let numberFrequency = {};
    for (let i = 0; i <= 9; i++) numberFrequency[i] = 0;

    // Calculate frequency & recency weight over last 60 draws
    for (let i = 0; i < Math.min(60, allNumbers.length); i++) {
      let num = allNumbers[i];
      let weight = (60 - i); // Higher score for recent numbers
      numberFrequency[num] += weight;
    }

    // Sort numbers by highest score
    let sortedNumbers = Object.keys(numberFrequency)
      .map(Number)
      .sort((a, b) => numberFrequency[b] - numberFrequency[a]);

    // Pick top 2 most predicted numbers
    let matchedNumbers = sortedNumbers.slice(0, 2);
    let numbersStr = matchedNumbers.join(", ");
    
    let colorStr = "🔴 RED / 🟢 GREEN";
    if (matchedNumbers.includes(0)) colorStr = "🔴 RED / 🟣 VIOLET";
    else if (matchedNumbers.includes(5)) colorStr = "🟢 GREEN / 🟣 VIOLET";

    return { targetNumbers: matchedNumbers, numbersStr, colorStr };
  } catch (e) {
    console.error("Pattern Engine Error:", e.message);
    return { targetNumbers: [7, 8], numbersStr: "7, 8", colorStr: "🟢 GREEN" };
  }
}

let isFetching = false;
let isStopped = false; // Auto-stop flag once 30 Wins achieved

async function fetchWinGoData() {
  if (isFetching || isStopped) return;
  isFetching = true;

  try {
    let rawContent = null;
    try {
      const directRes = await axios.get(TARGET_URL, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.rajastake7.com/'
        }
      });
      rawContent = directRes.data;
    } catch (err) {
      try {
        const scraperUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(TARGET_URL)}&x-api-key=${SCRAPINGANT_API_KEY}&browser=false&return_page_source=false`;
        const response = await axios.get(scraperUrl, { timeout: 8000 });
        rawContent = response.data;
      } catch (e) {
        console.error("Scraper Error:", e.message);
      }
    }

    if (typeof rawContent === 'string') {
      try { rawContent = JSON.parse(rawContent); } catch (e) {}
    }

    let list = rawContent?.data?.list || rawContent?.list || (Array.isArray(rawContent) ? rawContent : null);
    if (!list || !Array.isArray(list) || list.length === 0) {
      isFetching = false;
      return;
    }

    let lastItem = list[0];
    let actualNum = parseInt(lastItem.number !== undefined ? lastItem.number : lastItem.result);
    let actualColor = getNumberColor(actualNum);
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
        levelWins[currentLevelExecuted] = (levelWins[currentLevelExecuted] || 0) + 1;
        let winAmount = currentBetVal * 8.8; // Number prediction payout multiplier
        totalProfitLoss += winAmount;

        dynamicStatusMsg = "🎉 **JACKPOT WINNER! Correct Number: (" + actualNum + ")** 🎉";
        predictionHistory.unshift({ period: actualPeriod, status: "WIN", level: currentLevelExecuted });
        maintenanceLevel = 1;
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        dynamicStatusMsg = "⚠️ **MISS: Result was (" + actualNum + " - " + actualColor + ")**";
        predictionHistory.unshift({ period: actualPeriod, status: "LOSS", level: currentLevelExecuted });
        maintenanceLevel++;
      }

      // AUTO STOP WHEN 30 WINS ARE COMPLETED
      if (totalWins >= 30) {
        isStopped = true;
        let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);
        let levelReport = "";
        for (let lvl in levelWins) {
          if (levelWins[lvl] > 0) {
            levelReport += `• **Level ${lvl} Wins:** ${levelWins[lvl]}\n`;
          }
        }

        let summaryMsg = "🏆 **30 WINS TARGET ACHIEVED! BOT STOPPED** 🏆\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "📊 **SESSION STATS REPORT**\n" +
          "• **TOTAL ROUNDS PLAYED:** " + predictionCount + "\n" +
          "• **TOTAL WINS:** " + totalWins + "\n" +
          "• **TOTAL LOSSES:** " + totalLosses + "\n" +
          "• **MAX LEVEL REACHED:** Level " + maxLevelReached + "\n" +
          "• **NET PROFIT/LOSS:** **" + profitSign + "**\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "📈 **LEVEL-WISE WINS BREAKDOWN:**\n" + levelReport +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "Prediction session completed successfully!";

        await bot.sendMessage(CHANNEL_ID, summaryMsg, { parse_mode: 'Markdown' });
        return;
      }
    }

    if (nextPeriod !== lastSentPeriod) {
      let pred = deepNumberPatternEngine(list);
      let activeLevel = maintenanceLevel;
      let nextLevel = activeLevel + 1;
      let currentBetName = levelData[activeLevel]?.name || ("₹" + getBetVal(activeLevel));
      let nextBetName = levelData[nextLevel]?.name || ("₹" + getBetVal(nextLevel));
      let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

      let msg = "👑 **PURE NUMBER PREDICTION** 👑\n" +
        "🎯 **WinGo 30S (30-Win Target)**\n" +
        "━━━━━━━━━━━━━━━━━━━━━\n" +
        "📌 **PERIOD:** `" + nextPeriod + "`\n" +
        "🎯 **TARGET NUMBERS:** `" + pred.numbersStr + "`\n" +
        "🎨 **COLOUR HINT:** " + pred.colorStr + "\n" +
        "💰 **BET AMOUNT:** **" + currentBetName + " (Level " + activeLevel + ")**\n" +
        "⏩ **IF LOSS NEXT BET:** **" + nextBetName + " (Level " + nextLevel + ")**\n" +
        "━━━━━━━━━━━━━━━━━━━━━\n";

      if (dynamicStatusMsg !== "") {
        msg += dynamicStatusMsg + "\n━━━━━━━━━━━━━━━━━━━━━\n";
      }

      msg += "📊 **WINS:** " + totalWins + " / 30 | **LOSSES:** " + totalLosses + "\n" +
        "💵 **NET PROFIT/LOSS:** **" + profitSign + "**\n" +
        "━━━━━━━━━━━━━━━━━━━━━\n\n" +
        "🔗 **Register Link:**\n" + REGISTER_LINK;

      await bot.sendMessage(CHANNEL_ID, msg, { parse_mode: 'Markdown' });

      lastSentPeriod = nextPeriod;
      lastPredictedPeriod = nextPeriod;
      lastPredictedNumbers = pred.targetNumbers;
      console.log("[NUMBER ENGINE] Sent Period: " + nextPeriod + " (Wins: " + totalWins + "/30)");
    }
  } catch (error) {
    console.error('[FETCH ERROR]:', error.message);
  } finally {
    isFetching = false;
  }
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection:', reason));

setInterval(fetchWinGoData, 3000);
