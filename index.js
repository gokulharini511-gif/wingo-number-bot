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

app.get('/', (req, res) => res.send('WinGo 30S Smart Prediction Engine Active!'));
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

let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

const levelData = {
  1: { val: 2 },
  2: { val: 4 },
  3: { val: 6 },
  4: { val: 10 },
  5: { val: 16 },
  6: { val: 24 },
  7: { val: 40 },
  8: { val: 70 },
  9: { val: 120 },
  10: { val: 200 }
};

function getBetVal(level) {
  return levelData[level] ? levelData[level].val : 2;
}

// SMART ACCURACY & LOW-LOSS PREDICTION ENGINE
function advancedPatternEngine(history, currentLevel) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    if (numbers.length < 15) return { targetNumbers: [1, 3], numbersStr: "1, 3" };

    let scores = {};
    for (let i = 0; i <= 9; i++) scores[i] = 0;

    let recent15 = numbers.slice(0, 15);
    let last1 = numbers[0];
    let last2 = numbers[1];

    // 1. DYNAMIC FREQUENCY SCORING (Hot Numbers)
    recent15.forEach(n => {
      if (n >= 0 && n <= 9) scores[n] += 4;
    });

    // 2. PARITY MOMENTUM
    let oddCount = recent15.slice(0, 5).filter(n => n % 2 !== 0).length;
    if (oddCount >= 3) {
      [1, 3, 5, 7, 9].forEach(n => scores[n] += 15);
    } else {
      [0, 2, 4, 6, 8].forEach(n => scores[n] += 15);
    }

    // 3. MIRROR SHIFT RECOVERY
    let mirrorMap = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
    if (mirrorMap[last1] !== undefined) scores[mirrorMap[last1]] += 12;

    // 4. STEP PATTERN (+2 / -2 Shift)
    scores[(last1 + 2) % 10] += 10;
    scores[(last1 + 8) % 10] += 10;

    // 5. HIGH LEVEL RECOVERY SAFETY (Level 4+)
    if (currentLevel >= 4) {
      scores[(last1 + 5) % 10] += 20;
    }

    // Direct repeat penalty (ஒரே எண் உடனே வருவதைக் குறைக்க)
    scores[last1] -= 6;

    let sortedNumbers = Object.keys(scores)
      .map(Number)
      .sort((a, b) => scores[b] - scores[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };
  } catch (e) {
    return { targetNumbers: [1, 3], numbersStr: "1, 3" };
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

        lastWinLevelMsg = "=== CONGRATULATIONS (JK) ===\nLEVEL " + currentLevelExecuted + " WIN (+RS " + winProfit.toFixed(1) + ")\nWINNER: (" + actualNum + ")\n=== CONGRATULATIONS ===";
        maintenanceLevel = 1; 
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        
        lastWinLevelMsg = "LEVEL " + currentLevelExecuted + " LOSS (-RS " + currentBetVal + ")\nRESULT: (" + actualNum + ")";
        
        if (maintenanceLevel >= 10) {
          maintenanceLevel = 1; 
        } else {
          maintenanceLevel++; 
        }
      }

      if (predictionCount % 60 === 0) {
        let levelReport = "";
        for (let lvl in levelWins) {
          if (levelWins[lvl] > 0) levelReport += `• Level ${lvl} Wins: ${levelWins[lvl]}\n`;
        }

        let reportMsg = "60 PREDICTIONS SUMMARY REPORT\n" +
          "--------------------\n" +
          "TOTAL ROUNDS: " + predictionCount + "\n" +
          "TOTAL WINS: " + totalWins + "\n" +
          "TOTAL LOSSES: " + totalLosses + "\n" +
          "OVERALL PROFIT/LOSS: " + (totalProfitLoss >= 0 ? "+RS " : "-RS ") + Math.abs(totalProfitLoss).toFixed(2) + "\n" +
          "--------------------\n" +
          "LEVEL WINS STATS:\n" + levelReport;

        await broadcastMessage(reportMsg);
      }
    }

    if (nextPeriod !== lastSentPeriod) {
      let pred = advancedPatternEngine(list, maintenanceLevel);
      let profitSign = totalProfitLoss >= 0 ? "+RS " + totalProfitLoss.toFixed(2) : "-RS " + Math.abs(totalProfitLoss).toFixed(2);
      let currentBet = getBetVal(maintenanceLevel);

      let msg = "PURE 2-NUMBER PREDICTION\n\n" +
        "PERIOD: `" + nextPeriod + "`\n" +
        "TARGET NUMBERS: `" + pred.numbersStr + "`\n" +
        "LEVEL " + maintenanceLevel + ": RS " + currentBet + " (RS " + (currentBet/2) + " EACH)\n" +
        "WINS: " + totalWins + " | LOSSES: " + totalLosses + "\n\n" +
        "LAST RESULT:\n" + lastWinLevelMsg + "\n\n" +
        "OVERALL PROFIT: `" + profitSign + "`";

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
