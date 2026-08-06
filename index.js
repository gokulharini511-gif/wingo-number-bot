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

app.get('/', (req, res) => res.send('WinGo 30S Smart Bot Active!'));
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
let isCoolingDown = false;

let levelWins = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

// Level Bet Values
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

// Advanced Multi-Pattern Accuracy Engine
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

    // 2. 3-Round Matrix Matching
    let patternSeq = `${last3},${last2},${last1}`;
    for (let i = 3; i < numbers.length - 1; i++) {
      let currentSeq = `${numbers[i+1]},${numbers[i]},${numbers[i-1]}`;
      if (patternSeq === currentSeq) {
        scores[numbers[i-2]] += 30;
      }
    }

    // 3. Hot Frequency Scoring (Last 50)
    let recent50 = numbers.slice(0, 50);
    recent50.forEach(num => {
      if (num >= 0 && num <= 9) scores[num] += 0.8;
    });

    // 4. Cold Numbers Boost (Last 15)
    let recent15 = numbers.slice(0, 15);
    for (let i = 0; i <= 9; i++) {
      if (!recent15.includes(i)) scores[i] += 15;
    }

    // 5. Odd/Even Trend Adjustment
    let recent5 = numbers.slice(0, 5);
    let evenCount = recent5.filter(n => n % 2 === 0).length;
    let oddCount = 5 - evenCount;

    for (let i = 0; i <= 9; i++) {
      if (evenCount >= 4 && i % 2 !== 0) scores[i] += 10; 
      if (oddCount >= 4 && i % 2 === 0) scores[i] += 10;
    }

    // Avoid immediate repetition
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

    if (lastPredictedPeriod && lastPredictedPeriod === actualPeriod && !isCoolingDown) {
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

        lastWinLevelMsg = "=== CONGRATULATIONS ===\nLEVEL " + currentLevelExecuted + " WIN (+RS " + winProfit.toFixed(1) + ")\nWINNER: (" + actualNum + ")\n=== CONGRATULATIONS ===";
        maintenanceLevel = 1; 
      } else {
        totalLosses++;
        totalProfitLoss -= currentBetVal;
        
        lastWinLevelMsg = "LEVEL " + currentLevelExecuted + " LOSS (-RS " + currentBetVal + ")\nRESULT: (" + actualNum + ")";
        
        if (maintenanceLevel >= 10) {
          maintenanceLevel = 1; 
          isCoolingDown = true;
          lastWinLevelMsg += "\n\nLEVEL 10 REACHED! BOT IN COOLING PAUSE (1 MIN)...";
          
          setTimeout(() => {
            isCoolingDown = false;
            broadcastMessage("COOLING PERIOD COMPLETED. RESUMING PREDICTIONS FROM LEVEL 1.");
          }, 60000);
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

    if (nextPeriod !== lastSentPeriod && !isCoolingDown) {
      let pred = advancedPatternEngine(list);
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
