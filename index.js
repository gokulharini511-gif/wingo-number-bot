// ... [மேலே உள்ள code பகுதிகள் மாறாது] ...

    if (lastPredictedPeriod && lastPredictedPeriod === actualPeriod) {
      let isNumberHit = lastPredictedNumbers.includes(actualNum);
      let currentLevelExecuted = maintenanceLevel;
      let currentBetVal = getBetVal(currentLevelExecuted);

      predictionCount++;

      if (isNumberHit) {
        totalWins++;
        levelWins[currentLevelExecuted] = (levelWins[currentLevelExecuted] || 0) + 1;
        
        // 🎯 Single Number Target என்பதால் Win ஆகும்போது 9x (9x Bet Amount) லாபம் சேரும்
        let winProfit = currentBetVal * 9; 
        totalProfitLoss += winProfit;

        lastWinLevelMsg = "Level " + currentLevelExecuted + " WIN (+₹" + winProfit + ")";
        maintenanceLevel = 1; // Win ஆனதும் Level 1-க்குத் திரும்பும்
      } else {
        totalLosses++;
        
        // ❌ Loss ஆகும்போது அந்த Level-க்கு வைக்கப்பட்ட Bet Amount மட்டும் கழியும்
        totalProfitLoss -= currentBetVal;
        
        lastWinLevelMsg = "Level " + currentLevelExecuted + " LOSS (-₹" + currentBetVal + ")";
        maintenanceLevel++; // Loss ஆனதால் அடுத்த Level-க்கு செல்லும்
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
          "• **NET PROFIT/LOSS:** " + (totalProfitLoss >= 0 ? "+₹" : "-₹") + Math.abs(totalProfitLoss).toFixed(2) + "\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "📈 **LEVEL WINS STATS:**\n" + levelReport;

        await broadcastMessage(reportMsg);
      }
    }

// ... [கீழே உள்ள மற்ற code பகுதிகள் மாறாது] ...
