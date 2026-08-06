// 1. حساب المتوسط المتحرك البسيط (SMA)
function calculateSMA(data, period) {
  let result = [];
  for (let i = 0; i <= data.length - period; i++) {
    let window = data.slice(i, i + period);
    let sum = window.reduce((acc, val) => acc + val, 0);
    result.push(sum / period);
  }
  return result;
}

// 2. حساب مؤشر القوة النسبية (RSI)
function calculateRSI(data, period = 14) {
  let gains = 0;
  let losses = 0;

  // حساب المكاسب والخسائر للفترة الأولى
  for (let i = 1; i <= period; i++) {
    let change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rsiArray = [];

  // حساب أول قيمة RSI
  let rs = avgGain / avgLoss;
  rsiArray.push(100 - (100 / (1 + rs)));

  // حساب باقي القيم باستخدام Wilder's Smoothing
  for (let i = period + 1; i < data.length; i++) {
    let change = data[i] - data[i - 1];
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / avgLoss;
    rsiArray.push(100 - (100 / (1 + rs)));
  }

  return rsiArray;
}

// --- مثال تجريبي ---
const prices = [
  44.34, 44.09, 44.15, 43.61, 44.33, 
  44.83, 45.10, 45.42, 45.84, 46.08,
  45.89, 46.03, 46.83, 47.85, 47.45,
  47.12, 46.90, 47.20, 47.80, 48.10
];

const smaResult = calculateSMA(prices, 5);
const rsiResult = calculateRSI(prices, 14);

console.log("SMA Values:", smaResult);
console.log("RSI Values:", rsiResult);
