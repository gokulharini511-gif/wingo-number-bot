function advancedPatternEngine(history) {
  try {
    let numbers = history.map(x => parseInt(x.number !== undefined ? x.number : x.result));
    if (numbers.length < 10) return { targetNumbers: [2, 7], numbersStr: "2, 7" };

    let nextNumberScores = {};
    for (let i = 0; i <= 9; i++) nextNumberScores[i] = 0;

    let lastNum = numbers[0]; // கடைசியாக வந்த எண்

    // 1. Mirror Number Logic (0-5, 1-6, 2-7, 3-8, 4-9)
    let mirrorMap = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
    let mirrorNum = mirrorMap[lastNum];
    nextNumberScores[mirrorNum] += 15; // Mirror Number-க்கு அதிக Score

    // 2. Cold Number Logic (கடந்த 25 ரவுண்டில் வராத எண்கள்)
    let recent25 = numbers.slice(0, 25);
    for (let i = 0; i <= 9; i++) {
      if (!recent25.includes(i)) {
        nextNumberScores[i] += 12; // Cold numbers-க்கு Score உயரும்
      }
    }

    // 3. Historical Frequency Logic
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === lastNum) {
        nextNumberScores[numbers[i]] += 8;
      }
    }

    let sortedNumbers = Object.keys(nextNumberScores)
      .map(Number)
      .sort((a, b) => nextNumberScores[b] - nextNumberScores[a]);

    let matchedNumbers = sortedNumbers.slice(0, 2);
    return { targetNumbers: matchedNumbers, numbersStr: matchedNumbers.join(", ") };
  } catch (e) {
    return { targetNumbers: [2, 7], numbersStr: "2, 7" };
  }
}
