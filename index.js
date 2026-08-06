const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Express Server for Render Uptime
const app = express();
const PORT = process.env.PORT || 10000;

// Configurations
const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const SCRAPINGANT_API_KEY = '9b7eaf7431374b2089e3f778b8504522'; 
const TARGET_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=1000&pageNo=1';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let activeChatIds = new Set();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  activeChatIds.add(chatId);
  bot.sendMessage(chatId, "🚀 **WinGo Pure Number Prediction Bot Active!**\n\nPredictions start soon...", { parse_mode: 'Markdown' });
});

app.get('/', (req, res) => res.send('WinGo 30S Bot Active!'));

app.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port " + PORT);
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
let lastWinLevelMsg = "None";

let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

const levelData = {
  1: { val: 1 },
  2: { val: 3 },
  3: { val: 7 },
  4: { val: 20 },
  5: { val: 50 },
  6: { val: 150 },
  7: { val: 450 },
  8: { val: 1350 }
};

function getBetVal(level) {
  if (levelData[level]) return levelData[level].val;
  return Math.pow(3, level - 1);
}

function deepNumberPatternEngine(history) {
  try {
    let allNumbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    
    let numberFrequency = {};
    for (let i = 0; i <= 9; i++) numberFrequency[i] = 0;

    for (let i = 0; i < Math.min(60, allNumbers.length); i++) {
      let num = allNumbers[i];
      let weight = (60 - i);
      numberFrequency[num] += weight;
    }

    let sortedNumbers = Object.keys(numberFrequency)
      .map(Number)
      .sort((a, b) => numberFrequency[b] - numberFrequency[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    let numbersStr = matchedNumbers.join(", ");

    return { targetNumbers: matchedNumbers, numbersStr };
  } catch (e) {
    return { targetNumbers: [7, 8], numbersStr: "7, 8" };
  }
}

async function broadcastMessage(msgText) {
  for (let chatId of activeChatIds) {
    try {
      await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error(`Failed to send message to ${chatId}:`, e.message);
    }
  }
}

let isFetching = false;
let isStopped = false;

async function fetchWinGoData() {
  if (isFetching || isStopped || activeChatIds.size === 0) return;
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
    let actualPeriod = String(lastItem.issueName || lastItem.issueNumber || lastItem.period || lastItem.issue);
    
    let nextPeriod = String(BigInt(actualPeriod) + 1n);

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
        let winAmount = currentBetVal * 8.8;
        totalProfitLoss += winAmount;
        
        lastWinLevelMsg = "Level " + currentLevelExecuted + " WIN";
        maintenanceLevel = 1;
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        maintenanceLevel++;
      }

      if (totalWins >= 30) {
        isStopped = true;
        let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);
        
        let summaryMsg = "🏆 **30 WINS TARGET ACHIEVED! BOT STOPPED** 🏆\n\n" +
          "PERIOD: " + actualPeriod + "\n" +
          "WINS: " + totalWins + " / 30\n" +
          "LOSSES: " + totalLosses + "\n" +
          "NET PROFIT/LOSS: " + profitSign + "\n" +
          "LEVELS WIN: " + lastWinLevelMsg;

        await broadcastMessage(summaryMsg);
        return;
      }
    }

    if (nextPeriod !== lastSentPeriod) {
      let pred = deepNumberPatternEngine(list);
      let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

      let msg = "👑 **PURE NUMBER PREDICTION** 👑\n\n" +
        "PERIOD: `" + nextPeriod + "`\n" +
        "TARGET NUMBERS: `" + pred.numbersStr + "`\n" +
        "WINS: " + totalWins + " / 30\n" +
        "LOSSES: " + totalLosses + "\n" +
        "NET PROFIT/LOSS: " + profitSign + "\n" +
        "LEVELS WIN: " + lastWinLevelMsg;

      await broadcastMessage(msg);

      lastSentPeriod = nextPeriod;
      lastPredictedPeriod = nextPeriod;
      lastPredictedNumbers = pred.targetNumbers;
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
