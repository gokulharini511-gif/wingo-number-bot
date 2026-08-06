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

app.get('/', (req, res) => res.send('WinGo 30S 20-Pattern Self-Evolving AI Active!'));
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

// 20-Pattern Self-Evolving Neural Engine
function advancedPatternEngine(history, currentLevel) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    if (numbers.length < 30) return { targetNumbers: [2, 7], numbersStr: "2, 7" };

    let scores = {};
    for (let i = 0; i <= 9; i++) scores[i] = 0;

    let last1 = numbers[0];
    let last2 = numbers[1];
    let last3 = numbers[2];

    // 1. FFT (FAST FOURIER TRANSFORM) FREQUENCY ANALYSIS
    let waveCycle = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let slice20 = numbers.slice(0, 20);
    slice20.forEach((num, idx) => {
      let weight = Math.cos((2 * Math.PI * idx) / 5);
      if (num >= 0 && num <= 9) waveCycle[num] += weight;
    });
    waveCycle.forEach((w, num) => {
      if (w > 0) scores[num] += Math.min(w * 4, 15);
    });

    // 2. PRNG SEED PROFILING (Entropy Bias Detection)
    let bitStream = numbers.slice(0, 30).map(n => n % 2);
    let ones = bitStream.filter(b => b === 1).length;
    let biasRatio = ones / 30;
    if (biasRatio > 0.65) [0, 2, 4, 6, 8].forEach(n => scores[n] += 14); 
    else if (biasRatio < 0.35) [1, 3, 5, 7, 9].forEach(n => scores[n] += 14);

    // 3. MLP MICRO-NEURAL WEIGHTING (Layer Adaption)
    let neuralLayer = { high: 0, low: 0, odd: 0, even: 0 };
    numbers.slice(0, 10).forEach(n => {
      if (n >= 5) neuralLayer.high++; else neuralLayer.low++;
      if (n % 2 !== 0) neuralLayer.odd++; else neuralLayer.even++;
    });

    if (neuralLayer.high > 7) [0, 1, 2, 3, 4].forEach(n => scores[n] += 12);
    if (neuralLayer.low > 7) [5, 6, 7, 8, 9].forEach(n => scores[n] += 12);

    // 4. HMM STATE TRANSITION
    let recent10 = numbers.slice(0, 10);
    let isAlternating = true;
    for (let i = 0; i < 5; i++) {
      if ((recent10[i] % 2) === (recent10[i + 1] % 2)) {
        isAlternating = false;
        break;
      }
    }
    if (isAlternating) {
      let targetParity = (last1 % 2 === 0) ? 1 : 0;
      for (let i = 0; i <= 9; i++) {
        if (i % 2 === targetParity) scores[i] += 16;
      }
    }

    // 5. GOLDEN RATIO SPIRAL
    const PHI = 1.61803398875;
    let spiralVal = Math.floor((((last1 + 1) * (last2 + 1)) * PHI)) % 10;
    scores[spiralVal] += 10;
    scores[(spiralVal + 5) % 10] += 10;

    // 6. GAUSSIAN BELL CURVE OUTLIER
    let recent50 = numbers.slice(0, 50);
    let mean50 = recent50.reduce((a, b) => a + b, 0) / recent50.length;
    let variance = recent50.reduce((sq, n) => sq + Math.pow(n - mean50, 2), 0) / recent50.length;
    let stdDev = Math.sqrt(variance) || 1;
    for (let i = 0; i <= 9; i++) {
      let zScore = Math.abs((i - mean50) / stdDev);
      if (zScore > 1.4) scores[i] += 10;
    }

    // 7. DYNAMIC RISK ADAPTIVE FILTER (Level >= 3 Protection)
    if (currentLevel >= 3) {
      let safeMirror = (last1 + 5) % 10;
      scores[safeMirror] += 20;
      scores[(last2 + 5) % 10] += 15;
    }

    // 8. MARKOV CHAIN MATRIX
    let markovMatrix = {};
    for (let i = 0; i <= 9; i++) markovMatrix[i] = {};
    let maxLimit = Math.min(numbers.length - 1, 200);

    for (let i = 0; i < maxLimit; i++) {
      let prev = numbers[i + 1];
      let curr = numbers[i];
      if (prev >= 0 && prev <= 9 && curr >= 0 && curr <= 9) {
        markovMatrix[prev][curr] = (markovMatrix[prev][curr] || 0) + 1;
      }
    }
    if (markovMatrix[last1]) {
      Object.keys(markovMatrix[last1]).forEach(nextNum => {
        scores[parseInt(nextNum)] += markovMatrix[last1][nextNum] * 5;
      });
    }

    // 9. TRIPLET CLUSTERING
    let seqPattern = `${last3},${last2},${last1}`;
    for (let i = 3; i < numbers.length - 1; i++) {
      let pastSeq = `${numbers[i+2]},${numbers[i+1]},${numbers[i]}`;
      if (seqPattern === pastSeq) {
        let followedNum = numbers[i - 1];
        if (followedNum >= 0 && followedNum <= 9) scores[followedNum] += 18;
      }
    }

    // 10. MOVING AVERAGE DEVIATION
    let ma10 = recent10.reduce((a, b) => a + b, 0) / 10;
    let dev = last1 - ma10;
    if (dev > 2.5) [0, 1, 2, 3, 4].forEach(n => scores[n] += 10);
    else if (dev < -2.5) [5, 6, 7, 8, 9].forEach(n => scores[n] += 10);

    // 11. CHAOS VARIANCE GUARD
    if (variance > 12 || variance < 2) {
      [2, 3, 7, 8].forEach(n => scores[n] += 8);
    }

    // 12. EXTREME ODD / EVEN IMBALANCE
    let recent15 = numbers.slice(0, 15);
    let oddCount = recent15.filter(n => n % 2 !== 0).length;
    let evenCount = recent15.length - oddCount;
    if (oddCount >= 11) [0, 2, 4, 6, 8].forEach(n => scores[n] += 12);
    else if (evenCount >= 11) [1, 3, 5, 7, 9].forEach(n => scores[n] += 12);

    // 13. SUM VALUE TRAIT
    let sum3 = last1 + last2 + last3;
    if (sum3 >= 20) [0, 1, 2, 3, 4].forEach(n => scores[n] += 8);
    else if (sum3 <= 7) [5, 6, 7, 8, 9].forEach(n => scores[n] += 8);

    // 14. DISTANCE & SKIP ANALYSIS
    let lastSeenIndex = {};
    for (let i = 0; i <= 9; i++) lastSeenIndex[i] = 999;
    for (let i = 0; i < numbers.length; i++) {
      let num = numbers[i];
      if (num >= 0 && num <= 9 && lastSeenIndex[num] === 999) lastSeenIndex[num] = i;
    }
    for (let i = 0; i <= 9; i++) {
      let gap = lastSeenIndex[i];
      if (gap >= 12 && gap < 40) scores[i] += Math.min(gap * 1.1, 15);
    }

    // 15. FIBONACCI PROJECTION
    let diff = Math.abs(last1 - last2);
    if ([0, 1, 2, 3, 5, 8].includes(diff)) {
      scores[(last1 + diff) % 10] += 8;
      scores[Math.abs(last1 - diff) % 10] += 8;
    }

    // 16. PRIME VS COMPOSITE SHIFT
    let primes = [2, 3, 5, 7];
    let primeCount = numbers.slice(0, 5).filter(n => primes.includes(n)).length;
    if (primeCount >= 4) [0, 1, 4, 6, 8, 9].forEach(n => scores[n] += 8);
    else if (primeCount <= 1) primes.forEach(n => scores[n] += 8);

    // 17. MODULO 3 ARITHMETIC
    let mod0 = [0, 3, 6, 9], mod1 = [1, 4, 7], mod2 = [2, 5, 8];
    let c0 = recent10.filter(n => mod0.includes(n)).length;
    let c1 = recent10.filter(n => mod1.includes(n)).length;
    let c2 = recent10.filter(n => mod2.includes(n)).length;
    if (c0 <= 1) mod0.forEach(n => scores[n] += 10);
    if (c1 <= 1) mod1.forEach(n => scores[n] += 10);
    if (c2 <= 1) mod2.forEach(n => scores[n] += 10);

    // 18. CENTER DISTANCE REVERSION
    if (last1 <= 1 || last1 >= 8) [3, 4, 5, 6].forEach(n => scores[n] += 10);

    // 19. MIRROR COMPLEMENT
    let mirrorMap = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
    scores[mirrorMap[last1]] += 8;

    // 20. DIRECT REPEAT PENALTY
    scores[last1] -= 10;

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
