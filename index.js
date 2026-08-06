const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const SCRAPINGANT_API_KEY = '9b7eaf7431374b2089e3f778b8504522'; 
const TARGET_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=120&pageNo=1';

// polling_error அமைப்புகள் சரி செய்யப்பட்டுள்ளன
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    autoStart: true,
    params: {
      timeout: 10
    }
  } 
});

// Polling Error வராமல் தவிர்க்க எரர் ஹேண்ட்லர்
bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    console.log("Conflict error detected, retrying cleanly...");
  } else {
    console.error("Polling Error:", error.message);
  }
});

let activeChatIds = new Set();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  activeChatIds.add(chatId);
  bot.sendMessage(chatId, "🚀 **Advanced Pattern Match & Verification Bot Active!**", { parse_mode: 'Markdown' });
});

app.get('/', (req, res) => res.send('WinGo 30S Advanced Bot Active!'));
app.listen(PORT, '0.0.0.0', () => console.log("Server running on port " + PORT));

let lastSentPeriod = "";
let lastPredictedNumbers = [];
let lastPredictedPeriod = null;
let totalWins = 0;
let totalLosses = 0;
let maintenanceLevel = 1;
let totalProfitLoss = 0;
let predictionCount = 0;
let lastWinLevelMsg = "None";

let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

const levelData = {
  1: { val: 1 }, 2: { val: 3 }, 3: { val: 7 }, 4: { val: 20 },
  5: { val: 50 }, 6: { val: 150 }, 7: { val: 450 }, 8: { val: 1350 }
};

function getBetVal(level) {
  return levelData[level] ? levelData[level].val : Math.pow(3, level - 1);
}

function advancedPatternEngine(history) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    
    if (numbers.length < 5) return { targetNumbers: [2, 7], numbersStr: "2, 7" };

    let last2 = numbers.slice(0, 2).reverse().join(",");
    let last3 = numbers.slice(0, 3).reverse().join(",");

    let nextNumberScores = {};
    for (let i = 0; i <= 9; i++) nextNumberScores[i] = 0;

    for (let i = 2; i < numbers.length - 1; i++) {
      let seq2 = numbers[i - 1] + "," + numbers[i];
      let seq3 = (i >= 2) ? numbers[i - 2] + "," + numbers[i - 1] + "," + numbers[i] : "";

      let nextNum = numbers[i + 1];

      if (seq3 === last3) {
        nextNumberScores[nextNum] += 10;
      } else if (seq2 === last2) {
        nextNumberScores[nextNum] += 5;
      }
    }

    let currentHour = new Date().getHours();
    let timeWeightMultiplier = (currentHour >= 6 && currentHour < 12) ? 1.2 : (currentHour >= 12 && currentHour < 18) ? 1.1 : 1.3;

    for (let i = 0; i < numbers.length; i++) {
      let num = numbers[i];
      nextNumberScores[num] += (120 - i) * 0.1 * timeWeightMultiplier;
    }

    let sortedNumbers = Object.keys(nextNumberScores)
      .map(Number)
      .sort((a, b) => nextNumberScores[b] - nextNumberScores[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };
  } catch (e) {
    return { targetNumbers: [3, 8], numbersStr: "3, 8" };
  }
}

async function broadcastMessage(msgText) {
  for (let chatId of activeChatIds) {
    try {
      await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    } catch (e) {}
  }
}

let isFetching = false;

async function fetchWinGoData() {
  if (isFetching || activeChatIds.size === 0) return;
  isFetching = true;

  try {
    let rawContent = null;
    try {
      const directRes = await axios.get(TARGET_URL, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.rajastake7.com/'
        }
      });
      rawContent = directRes.data;
    } catch (err) {
      try {
        const scraperUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(TARGET_URL)}&x-api-key=${SCRAPINGANT_API_KEY}&browser=false&return_page_source=false`;
        const response = await axios.get(scraperUrl, { timeout: 8000 });
        rawContent = response.data;
      } catch (e) {}
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

      predictionCount++;

      if (isNumberHit) {
        totalWins++;
        levelWins[currentLevelExecuted] = (levelWins[currentLevelExecuted] || 0) + 1;
        totalProfitLoss += (currentBetVal * 8.8);
        lastWinLevelMsg = "Level " + currentLevelExecuted + " WIN";
        maintenanceLevel = 1;
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        maintenanceLevel++;
      }

      if (predictionCount % 60 === 0) {
        let levelReport = "";
        for (let lvl in levelWins) {
          if (levelWins[lvl] > 0) levelReport += `• **Level ${lvl} Wins:** ${levelWins[lvl]}\n`;
        }

        let reportMsg = "📊 **60 PREDICTIONS COMPLETED SUMMARY REPORT** 📊\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "• **TOTAL ROUNDS:** " + predictionCount + "\n" +
          "• **TOTAL WINS:** " + totalWins + "\n" +
          "• **TOTAL LOSSES:** " + totalLosses + "\n" +
          "• **NET PROFIT/LOSS:** ₹" + totalProfitLoss.toFixed(2) + "\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "📈 **LEVEL WINS STATS:**\n" + levelReport;

        await broadcastMessage(reportMsg);
      }
    }

    if (nextPeriod !== lastSentPeriod) {
      let pred = advancedPatternEngine(list);
      let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

      let msg = "👑 **PURE NUMBER PREDICTION** 👑\n\n" +
        "PERIOD: `" + nextPeriod + "`\n" +
        "TARGET NUMBERS: `" + pred.numbersStr + "`\n" +
        "WINS: " + totalWins + "\n" +
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
