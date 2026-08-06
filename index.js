// 100% Pure Trend-Based Prediction Engine
function advancedPatternEngine(history, currentLevel) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    if (numbers.length < 15) return { targetNumbers: [2, 7], numbersStr: "2, 7" };

    let scores = {};
    for (let i = 0; i <= 9; i++) scores[i] = 0;

    let recent10 = numbers.slice(0, 10);
    let last1 = numbers[0];
    let last2 = numbers[1];

    // 1. PARITY TREND (ODD / EVEN STREAK)
    let isOddStreak = recent10.slice(0, 3).every(n => n % 2 !== 0);
    let isEvenStreak = recent10.slice(0, 3).every(n => n % 2 === 0);

    if (isOddStreak) {
      // Trend Continuation: தொடர்ச்சியாக Odd வந்தால் Odd எண்களுக்கே முன்னுரிமை
      [1, 3, 5, 7, 9].forEach(n => scores[n] += 30);
    } else if (isEvenStreak) {
      // Trend Continuation: தொடர்ச்சியாக Even வந்தால் Even எண்களுக்கே முன்னுரிமை
      [0, 2, 4, 6, 8].forEach(n => scores[n] += 30);
    }

    // 2. ALTERNATING TREND (ZIG-ZAG PATTERN)
    let isAlternating = true;
    for (let i = 0; i < 4; i++) {
      if ((recent10[i] % 2) === (recent10[i + 1] % 2)) {
        isAlternating = false;
        break;
      }
    }
    if (isAlternating) {
      // மாறி மாறி வரும் ட்ரெண்ட் என்றால், அடுத்த எதிர்பார்த்த Parity-க்கு அதிக Weightage
      let expectedParity = (last1 % 2 === 0) ? 1 : 0;
      for (let i = 0; i <= 9; i++) {
        if (i % 2 === expectedParity) scores[i] += 25;
      }
    }

    // 3. SIZE TREND (HIGH / LOW ZONE MOMENTUM)
    let highCount = recent10.filter(n => n >= 5).length;
    let lowCount = recent10.length - highCount;

    if (highCount >= 7) {
      // High Zone Trend (5,6,7,8,9)
      [5, 6, 7, 8, 9].forEach(n => scores[n] += 20);
    } else if (lowCount >= 7) {
      // Low Zone Trend (0,1,2,3,4)
      [0, 1, 2, 3, 4].forEach(n => scores[n] += 20);
    }

    // 4. MIRROR REPEAT TREND
    let mirrorMap = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
    scores[mirrorMap[last1]] += 15;
    scores[mirrorMap[last2]] += 10;

    // 5. HIGH LEVEL SAFETY FILTER (Level 3+)
    if (currentLevel >= 3) {
      // லெவல் அதிகரிக்கும் போது ட்ரெண்டில் மிகவும் பாதுகாப்பான Safe Target-க்கு மாறும்
      let safeTrend = (last1 + 5) % 10;
      scores[safeTrend] += 35;
    }

    let sortedNumbers = Object.keys(scores)
      .map(Number)
      .sort((a, b) => scores[b] - scores[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };
  } catch (e) {
    return { targetNumbers: [2, 7], numbersStr: "2, 7" };
  }
}
