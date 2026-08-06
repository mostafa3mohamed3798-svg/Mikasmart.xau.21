/**
 * Advanced Trading & Market Decision Engine (engine.js)
 */

class MarketDecisionEngine {
  constructor(candles = []) {
    this.candles = candles;
    this.closes = candles.map(c => c.close);
    this.highs = candles.map(c => c.high);
    this.lows = candles.map(c => c.low);
  }

  setData(candles) {
    this.candles = candles;
    this.closes = candles.map(c => c.close);
    this.highs = candles.map(c => c.high);
    this.lows = candles.map(c => c.low);
    return this;
  }

  calculateEMA(period = 20) {
    if (this.closes.length < period) return [];
    let result = [];
    let multiplier = 2 / (period + 1);
    let initialSMA = this.closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(Number(initialSMA.toFixed(2)));

    let prevEMA = initialSMA;
    for (let i = period; i < this.closes.length; i++) {
      let currentEMA = (this.closes[i] - prevEMA) * multiplier + prevEMA;
      result.push(Number(currentEMA.toFixed(2)));
      prevEMA = currentEMA;
    }
    return result;
  }

  calculateRSI(period = 14) {
    if (this.closes.length <= period) return [];
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
      let change = this.closes[i] - this.closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiArray = [];

    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsiArray.push(Number((100 - (100 / (1 + rs))).toFixed(2)));

    for (let i = period + 1; i < this.closes.length; i++) {
      let change = this.closes[i] - this.closes[i - 1];
      let gain = change > 0 ? change : 0;
      let loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      rsiArray.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    }
    return rsiArray;
  }

  findSupportAndResistance(lookback = 3) {
    let supports = [];
    let resistances = [];

    for (let i = lookback; i < this.candles.length - lookback; i++) {
      let currentHigh = this.highs[i];
      let currentLow = this.lows[i];

      let isResistance = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (i !== j && this.highs[j] >= currentHigh) {
          isResistance = false;
          break;
        }
      }
      if (isResistance) resistances.push(currentHigh);

      let isSupport = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (i !== j && this.lows[j] <= currentLow) {
          isSupport = false;
          break;
        }
      }
      if (isSupport) supports.push(currentLow);
    }

    return {
      supports: [...new Set(supports)].slice(-3),
      resistances: [...new Set(resistances)].slice(-3)
    };
  }

  detectTrend() {
    const ema20 = this.calculateEMA(20);
    const ema50 = this.calculateEMA(50);

    if (ema20.length === 0) return "NEUTRAL";

    const currentPrice = this.closes[this.closes.length - 1];
    const lastEMA20 = ema20[ema20.length - 1];

    if (currentPrice > lastEMA20) {
      return "BULLISH (صاعد)";
    } else {
      return "BEARISH (هابط)";
    }
  }

  generateSignal() {
    const rsiValues = this.calculateRSI(14);
    const trend = this.detectTrend();
    const sr = this.findSupportAndResistance();
    
    if (rsiValues.length === 0) return { action: "HOLD", reason: "بيانات الأسعار غير كافية لحساب المؤشرات (يلزم أكثر من 14 شمعة)" };

    const currentRSI = rsiValues[rsiValues.length - 1];
    const currentPrice = this.closes[this.closes.length - 1];
    
    let score = 0;
    let reasons = [];

    if (currentRSI < 30) {
      score += 2;
      reasons.push(`مؤشر RSI (${currentRSI}) في منطقة تشبع بيعي - احتمال ارتداد صعودي`);
    } else if (currentRSI > 70) {
      score -= 2;
      reasons.push(`مؤشر RSI (${currentRSI}) في منطقة تشبع شرائي - احتمال تصحيح هبوطي`);
    }

    if (trend.includes("BULLISH")) {
      score += 1.5;
      reasons.push(`الاتجاه العام للسعر صاعد (${trend})`);
    } else {
      score -= 1.5;
      reasons.push(`الاتجاه العام للسعر هابط (${trend})`);
    }

    let decision = "HOLD / WAIT (انتظار)";
    if (score >= 2) decision = "STRONG_BUY (شراء قوي)";
    else if (score > 0) decision = "BUY (شراء بحذر)";
    else if (score <= -2) decision = "STRONG_SELL (بيع قوي)";
    else if (score < 0) decision = "SELL (بيع بحذر)";

    return {
      action: decision,
      score: score,
      currentPrice: currentPrice,
      indicators: {
        rsi: currentRSI,
        trend: trend,
        supports: sr.supports,
        resistances: sr.resistances
      },
      reasons: reasons
    };
  }
}

module.exports = MarketDecisionEngine;
