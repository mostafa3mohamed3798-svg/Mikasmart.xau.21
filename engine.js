/**
 * Market Technical Analysis Engine (engine.js)
 * محرك لمعالجة وحساب المؤشرات الفنية للأسواق المالية
 */

class MarketEngine {
  constructor(prices = []) {
    this.prices = prices;
  }

  // تحديث أسعار الإغلاق
  setPrices(prices) {
    this.prices = prices;
    return this;
  }

  // 1. حساب المتوسط المتحرك البسيط (SMA)
  calculateSMA(period = 5) {
    if (this.prices.length < period) return [];
    let result = [];
    for (let i = 0; i <= this.prices.length - period; i++) {
      let window = this.prices.slice(i, i + period);
      let sum = window.reduce((acc, val) => acc + val, 0);
      result.push(Number((sum / period).toFixed(2)));
    }
    return result;
  }

  // 2. حساب المتوسط المتحرك الأسي (EMA)
  calculateEMA(period = 5) {
    if (this.prices.length < period) return [];
    let result = [];
    let multiplier = 2 / (period + 1);
    
    // أول قيمة تبدأ بـ SMA
    let initialSlice = this.prices.slice(0, period);
    let initialSMA = initialSlice.reduce((a, b) => a + b, 0) / period;
    result.push(Number(initialSMA.toFixed(2)));

    let prevEMA = initialSMA;
    for (let i = period; i < this.prices.length; i++) {
      let currentEMA = (this.prices[i] - prevEMA) * multiplier + prevEMA;
      result.push(Number(currentEMA.toFixed(2)));
      prevEMA = currentEMA;
    }
    return result;
  }

  // 3. حساب مؤشر القوة النسبية (RSI)
  calculateRSI(period = 14) {
    if (this.prices.length <= period) return [];
    
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      let change = this.prices[i] - this.prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiArray = [];

    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsiArray.push(Number((100 - (100 / (1 + rs))).toFixed(2)));

    for (let i = period + 1; i < this.prices.length; i++) {
      let change = this.prices[i] - this.prices[i - 1];
      let gain = change > 0 ? change : 0;
      let loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      rsiArray.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    }

    return rsiArray;
  }

  // دالة شاملة لتشغيل جميع المؤشرات دفعة واحدة واستخراج التحليل
  runAll(config = { smaPeriod: 5, emaPeriod: 5, rsiPeriod: 14 }) {
    return {
      prices: this.prices,
      sma: this.calculateSMA(config.smaPeriod),
      ema: this.calculateEMA(config.emaPeriod),
      rsi: this.calculateRSI(config.rsiPeriod)
    };
  }
}

// تصدير المحرك ليعمل مع Node.js أو المتصفح
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketEngine;
}

