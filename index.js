const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = '8834043338:AAH1uJ9sUVFAM8iHJ9Y348P7S1r4PXmU_Xk';
const SCRAPINGANT_API_KEY = '9b7eaf7431374b2089e3f778b8504522'; 
const TARGET_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?pageSize=120&pageNo=1';

const CHANNEL_ID = '-1003310985903'; 

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    autoStart: true,
    params: { timeout: 10 }
  } 
});

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    console.log("Conflict error detected, retrying cleanly...");
  }
});

app.get('/', (req, res) => res.send('WinGo 30S Precision Pattern Bot Active!'));
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

let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

const levelData = {
  1: { val: 2 }, 2: { val: 6 }, 3: { val: 18 }, 4: { val: 54 }, 5: { val: 162 }
};

function getBetVal(level) {
  return levelData[level] ? levelData[level].val : 2;
}

// 🎯 Highly Accurate Multi-Matrix Pattern Engine
function advancedPatternEngine(history) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    if (numbers.length < 20) return { targetNumbers: [2, 7], numbersStr: "2, 7" };

    let scores = {};
    for (let i = 0; i <= 9; i++) scores[i] = 0;

    let last1 = numbers[0];
    let last2 = numbers[1];
    let last3 = numbers[2];

    // 1. Mirror Strategy
    let mirrorMap = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
    scores[mirrorMap[last1]] += 20;

    // 2. 3-Round Matrix Matching (வரலாற்று சுற்றுகளுடன் ஒப்பீடு)
    let patternSeq = `${last3},${last2},${last1}`;
    for (let i = 3; i < numbers.length - 1; i++) {
      let currentSeq = `${numbers[i+1]},${numbers[i]},${numbers[i-1]}`;
      if (patternSeq === currentSeq) {
        scores[numbers[i-2]] += 25; // Matrix பொருந்தி வந்தால் அதிக Score
      }
    }

    // 3. Hot Frequency Scoring (கடந்த 50 சுற்றுகள்)
    let recent50 = numbers.slice(0, 50);
    recent50.forEach(num => {
      if (num >= 0 && num <= 9) scores[num] += 0.5;
    });

    // 4. Cold Recovery Scoring (கடந்த 15 சுற்றுகளாக வராத எண்கள்)
    let recent15 = numbers.slice(0, 15);
    for (let i = 0; i <= 9; i++) {
      if (!recent15.includes(i)) scores[i] += 12;
    }

    // 5. Avoid Direct Repeat
    scores[last1] -= 15;

    let sortedNumbers = Object.keys(scores)
      .map(Number)
      .sort((a, b) => scores[b] - scores[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };
  } catch (e) {
    return { targetNumbers: [3, 8], numbersStr: "3, 8" };
  }
}

async function broadcastMessage(msgText) {
  try {
    await bot.sendMessage(CHANNEL_ID, msgText, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error(`Failed to send message to Channel (${CHANNEL_ID}):`, e.message);
  }
}

let isFetching = false;

async function fetchWinGoData() {
  if (isFetching) return;
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
        if (levelWins[currentLevelExecuted] !== undefined) {
          levelWins[currentLevelExecuted]++;
        }
        
        let singleBet = currentBetVal / 2;
        let winProfit = (singleBet * 9) - currentBetVal; 
        totalProfitLoss += winProfit;

        lastWinLevelMsg = "Level " + currentLevelExecuted + " WIN (+₹" + winProfit.toFixed(1) + ")";
        maintenanceLevel = 1; 
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        
        lastWinLevelMsg = "Level " + currentLevelExecuted + " LOSS (-₹" + currentBetVal + ")";
        
        if (maintenanceLevel >= 5) {
          maintenanceLevel = 1; 
        } else {
          maintenanceLevel++; 
        }
      }

      if (predictionCount % 60 === 0) {
        let levelReport = "";
        for (let lvl in levelWins) {
          if (levelWins[lvl] > 0) levelReport += `• **Level ${lvl} Wins:** ${levelWins[lvl]}\n`;
        }

        let reportMsg = "📊 **60 PREDICTIONS SUMMARY REPORT** 📊\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "• **TOTAL ROUNDS:** " + predictionCount + "\n" +
          "• **TOTAL WINS:** " + totalWins + "\n" +
          "• **TOTAL LOSSES:** " + totalLosses + "\n" +
          "• **NET PROFIT/LOSS:** " + (totalProfitLoss >= 0 ? "+₹" : "-₹") + Math.abs(totalProfitLoss).toFixed(2) + "\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "📈 **LEVEL WINS STATS:**\n" + levelReport;

        await broadcastMessage(reportMsg);
      }
    }

    if (nextPeriod !== lastSentPeriod) {
      let pred = advancedPatternEngine(list);
      let profitSign = totalProfitLoss >= 0 ? "+₹" + totalProfitLoss.toFixed(2) : "-₹" + Math.abs(totalProfitLoss).toFixed(2);

      let msg = "👑 **PURE 2-NUMBER ACCURATE PREDICTION** 👑\n\n" +
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
