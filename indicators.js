/* =====================================================================
   indicators.js — نظام تحليل تقني متكامل (يعمل كفريق واحد لاتخاذ القرار)
   =====================================================================
   شكل البيانات المتوقع (data): مصفوفة شموع مرتبة من الأقدم للأحدث:
     [{ time, open, high, low, close, volume }, ...]

   يحتوي هذا الملف على:
     1) ATR, RSI, MACD, Bollinger, Stochastic, ADX, Fibonacci
     2) الدعم والمقاومة + نماذج شموع مبسّطة
     3) EMA200 + VWAP (فلتر الاتجاه الرئيسي)
     4) Smart Money Concepts: Market Structure (BOS/CHOCH), Order Blocks, FVG
     5) تحليل حجم متقدم: CVD تقريبي + Volume Profile (POC)
     6) فلتر الأخبار الاقتصادية + فلتر التذبذب الشاذ
     7) فلتر الفريمات المتعددة (Multi-Timeframe Confirmation)
     8) generateProSignal(): الدالة الموحّدة التي تدمج كل ما سبق
        وتُخرج قرار BUY/SELL/WAIT مع قوة إشارة من 0 إلى 100 + SL/TP

   الاستخدام الأساسي:
     const result = TA.generateProSignal(candles, higherTimeframeCandles, newsTimes);
     TA.applyProSignalToUI(result); // يحدّث نفس عناصر الواجهة الموجودة بصفحتك
   ===================================================================== */

(function (global) {
  "use strict";

  // ---------------------------------------------------------------
  // أدوات مساعدة عامة
  // ---------------------------------------------------------------
  function toMillis(t) {
    if (t instanceof Date) return t.getTime();
    if (typeof t === "number") return t < 2e10 ? t * 1000 : t; // ثواني أم ميلي ثانية
    return new Date(t).getTime();
  }

  function closesOf(data) { return data.map(d => d.close); }
  function highsOf(data) { return data.map(d => d.high); }
  function lowsOf(data) { return data.map(d => d.low); }
  function volumesOf(data) { return data.map(d => d.volume); }

  function sma(values, period) {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) sum -= values[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  function ema(values, period) {
    const out = new Array(values.length).fill(null);
    const k = 2 / (period + 1);
    let prev = values[0];
    for (let i = 0; i < values.length; i++) {
      prev = i === 0 ? values[0] : (values[i] - prev) * k + prev;
      out[i] = prev;
    }
    return out;
  }

  function stddev(values, period) {
    const out = new Array(values.length).fill(null);
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
      out[i] = Math.sqrt(variance);
    }
    return out;
  }

  function last(arr) { return arr[arr.length - 1]; }
  function lastN(arr, n) { return arr[arr.length - n]; }

  // ===================================================================
  // 1) ATR - قياس التقلب
  // ===================================================================
  function calculateATR(data, period = 14) {
    const tr = data.map((c, i) => {
      if (i === 0) return c.high - c.low;
      const prevClose = data[i - 1].close;
      return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
    });
    return emaWilder(tr, period);
  }

  // EMA بطريقة وايلدر (alpha = 1/period) المستخدمة في ATR/ADX/RSI الكلاسيكي
  function emaWilder(values, period) {
    const out = new Array(values.length).fill(null);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      if (i < period) {
        if (i === period - 1) {
          const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
          prev = seed;
          out[i] = seed;
        }
        continue;
      }
      prev = (values[i] - prev) / period + prev;
      out[i] = prev;
    }
    return out;
  }

  // ===================================================================
  // 2) RSI
  // ===================================================================
  function calculateRSI(data, period = 14) {
    const closes = closesOf(data);
    const gains = [0], losses = [0];
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(Math.max(diff, 0));
      losses.push(Math.max(-diff, 0));
    }
    const avgGain = emaWilder(gains, period);
    const avgLoss = emaWilder(losses, period);
    return closes.map((_, i) => {
      if (avgGain[i] === null || avgLoss[i] === null) return 50;
      if (avgLoss[i] === 0) return 100;
      const rs = avgGain[i] / avgLoss[i];
      return 100 - 100 / (1 + rs);
    });
  }

  // ===================================================================
  // 3) الدعم والمقاومة
  // ===================================================================
  function calculateSupportResistance(data, window = 20, tolerance = 0.015) {
    const highs = highsOf(data), lows = lowsOf(data);
    const localMax = [], localMin = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) localMax.push(highs[i]);
      if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) localMin.push(lows[i]);
    }
    function cluster(levels, tol) {
      if (!levels.length) return [];
      const sorted = [...levels].sort((a, b) => a - b);
      const clusters = [[sorted[0]]];
      for (let i = 1; i < sorted.length; i++) {
        const cur = clusters[clusters.length - 1];
        if (Math.abs(sorted[i] - cur[cur.length - 1]) / cur[cur.length - 1] <= tol) cur.push(sorted[i]);
        else clusters.push([sorted[i]]);
      }
      return clusters.map(c => +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(4));
    }
    const recentMax = localMax.slice(-window * 3);
    const recentMin = localMin.slice(-window * 3);
    const resistanceLevels = cluster(recentMax, tolerance);
    const supportLevels = cluster(recentMin, tolerance);
    const price = last(closesOf(data));
    const nearestSupport = supportLevels.filter(s => s < price).sort((a, b) => b - a)[0] ?? null;
    const nearestResistance = resistanceLevels.filter(r => r > price).sort((a, b) => a - b)[0] ?? null;
    return { supportLevels, resistanceLevels, nearestSupport, nearestResistance };
  }

  // ===================================================================
  // 4) الحجم: OBV + متوسط الحجم
  // ===================================================================
  function calculateVolumeIndicators(data, maPeriod = 20) {
    const closes = closesOf(data), volumes = volumesOf(data);
    const obv = [0];
    for (let i = 1; i < closes.length; i++) {
      const dir = closes[i] > closes[i - 1] ? 1 : closes[i] < closes[i - 1] ? -1 : 0;
      obv.push(obv[i - 1] + dir * volumes[i]);
    }
    const volumeMA = sma(volumes, maPeriod);
    const volumeRatio = volumes.map((v, i) => (volumeMA[i] ? v / volumeMA[i] : null));
    return { obv, volumeMA, volumeRatio };
  }

  // ===================================================================
  // 5) المتوسطات المتحركة SMA/EMA
  // ===================================================================
  function calculateMovingAverages(data, fast = 20, slow = 50) {
    const closes = closesOf(data);
    return { smaFast: sma(closes, fast), smaSlow: sma(closes, slow), emaFast: ema(closes, fast) };
  }

  // ===================================================================
  // 6) MACD
  // ===================================================================
  function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
    const closes = closesOf(data);
    const emaFast = ema(closes, fast), emaSlow = ema(closes, slow);
    const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
    const signalLine = ema(macdLine, signal);
    const hist = macdLine.map((v, i) => v - signalLine[i]);
    return { macdLine, signalLine, hist };
  }

  // ===================================================================
  // 7) Bollinger Bands / Stochastic / ADX / Fibonacci / نموذج شموع
  // ===================================================================
  function calculateBollingerBands(data, period = 20, stdMult = 2) {
    const closes = closesOf(data);
    const mid = sma(closes, period);
    const sd = stddev(closes, period);
    const upper = mid.map((m, i) => (m === null ? null : m + stdMult * sd[i]));
    const lower = mid.map((m, i) => (m === null ? null : m - stdMult * sd[i]));
    const percentB = closes.map((c, i) => {
      if (upper[i] === null || lower[i] === null || upper[i] === lower[i]) return 0.5;
      return (c - lower[i]) / (upper[i] - lower[i]);
    });
    return { mid, upper, lower, percentB };
  }

  function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
    const highs = highsOf(data), lows = lowsOf(data), closes = closesOf(data);
    const k = closes.map((c, i) => {
      if (i < kPeriod - 1) return null;
      const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      return hh === ll ? 50 : (100 * (c - ll)) / (hh - ll);
    });
    const kClean = k.map(v => (v === null ? 0 : v));
    const d = sma(kClean, dPeriod).map((v, i) => (k[i] === null ? null : v));
    return { k, d };
  }

  function calculateADX(data, period = 14) {
    const highs = highsOf(data), lows = lowsOf(data), closes = closesOf(data);
    const plusDM = [0], minusDM = [0], tr = [highs[0] - lows[0]];
    for (let i = 1; i < data.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    const atrS = emaWilder(tr, period);
    const plusDIRaw = emaWilder(plusDM, period);
    const minusDIRaw = emaWilder(minusDM, period);
    const plusDI = atrS.map((a, i) => (a && plusDIRaw[i] !== null ? (100 * plusDIRaw[i]) / a : null));
    const minusDI = atrS.map((a, i) => (a && minusDIRaw[i] !== null ? (100 * minusDIRaw[i]) / a : null));
    const dx = plusDI.map((p, i) => {
      if (p === null || minusDI[i] === null || p + minusDI[i] === 0) return null;
      return (100 * Math.abs(p - minusDI[i])) / (p + minusDI[i]);
    });
    const dxClean = dx.map(v => (v === null ? 0 : v));
    const adx = emaWilder(dxClean, period).map((v, i) => (dx[i] === null ? null : v));
    return { plusDI, minusDI, adx };
  }

  function calculateFibonacciLevels(data, lookback = 60) {
    const window = data.slice(-lookback);
    const swingHigh = Math.max(...window.map(c => c.high));
    const swingLow = Math.min(...window.map(c => c.low));
    const diff = swingHigh - swingLow;
    const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const levels = {};
    ratios.forEach(r => { levels["fib_" + r] = +(swingHigh - diff * r).toFixed(4); });
    levels.swingHigh = +swingHigh.toFixed(4);
    levels.swingLow = +swingLow.toFixed(4);
    return levels;
  }

  function detectCandlestickPattern(data) {
    if (data.length < 2) return "None";
    const c = data[data.length - 1], p = data[data.length - 2];
    const body = Math.abs(c.close - c.open);
    const range = Math.max(c.high - c.low, 1e-9);
    if (body / range < 0.1) return "Doji";
    if (p.close < p.open && c.close > c.open && c.close > p.open && c.open < p.close) return "Bullish_Engulfing";
    if (p.close > p.open && c.close < c.open && c.close < p.open && c.open > p.close) return "Bearish_Engulfing";
    return "None";
  }

  // ===================================================================
  // 8) EMA200 + VWAP — فلتر الاتجاه الرئيسي
  // ===================================================================
  function calculateEMA200(data) { return ema(closesOf(data), 200); }

  function calculateVWAP(data, resetDaily = true) {
    const out = new Array(data.length).fill(null);
    let cumTPV = 0, cumVol = 0, lastDay = null;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const day = resetDaily ? new Date(toMillis(c.time)).toDateString() : "ALL";
      if (day !== lastDay) { cumTPV = 0; cumVol = 0; lastDay = day; }
      const typical = (c.high + c.low + c.close) / 3;
      cumTPV += typical * c.volume;
      cumVol += c.volume;
      out[i] = cumVol ? cumTPV / cumVol : null;
    }
    return out;
  }

  // ===================================================================
  // 9) Smart Money: Swing Points / Market Structure (BOS / CHOCH)
  // ===================================================================
  function findSwingPoints(data, window = 3) {
    const highs = highsOf(data), lows = lowsOf(data);
    const swingHigh = new Array(data.length).fill(false);
    const swingLow = new Array(data.length).fill(false);
    for (let i = window; i < data.length - window; i++) {
      const hSlice = highs.slice(i - window, i + window + 1);
      const lSlice = lows.slice(i - window, i + window + 1);
      if (highs[i] === Math.max(...hSlice) && hSlice.filter(h => h === highs[i]).length === 1) swingHigh[i] = true;
      if (lows[i] === Math.min(...lSlice) && lSlice.filter(l => l === lows[i]).length === 1) swingLow[i] = true;
    }
    return { swingHigh, swingLow };
  }

  function detectMarketStructure(data, window = 3) {
    const { swingHigh, swingLow } = findSwingPoints(data, window);
    const points = [];
    for (let i = 0; i < data.length; i++) {
      if (swingHigh[i]) points.push({ i, kind: "high", price: data[i].high, time: data[i].time });
      if (swingLow[i]) points.push({ i, kind: "low", price: data[i].low, time: data[i].time });
    }
    points.sort((a, b) => a.i - b.i);

    let lastHigh = null, lastLow = null, trend = null;
    const events = [];
    for (const p of points) {
      if (p.kind === "high") {
        if (lastHigh !== null) {
          if (p.price > lastHigh) {
            if (trend === "down") { events.push({ i: p.i, time: p.time, type: "CHOCH_Bullish", price: p.price }); trend = "up"; }
            else { events.push({ i: p.i, time: p.time, type: "BOS_Bullish", price: p.price }); trend = "up"; }
          }
        }
        lastHigh = p.price;
      } else {
        if (lastLow !== null) {
          if (p.price < lastLow) {
            if (trend === "up") { events.push({ i: p.i, time: p.time, type: "CHOCH_Bearish", price: p.price }); trend = "down"; }
            else { events.push({ i: p.i, time: p.time, type: "BOS_Bearish", price: p.price }); trend = "down"; }
          }
        }
        lastLow = p.price;
      }
    }
    return {
      trend,
      lastEvent: events.length ? events[events.length - 1] : null,
      recentEvents: events.slice(-5),
      lastSwingHigh: lastHigh,
      lastSwingLow: lastLow,
    };
  }

  // ===================================================================
  // 10) Order Blocks & Fair Value Gaps — نسخة محسّنة بشروط احترافية
  // ===================================================================
  // Order Block محسّن: يُقبل فقط إذا تحقق:
  //   1) قوة الكسر: مدى شمعة الكسر > 1.3×ATR (حركة انفجارية حقيقية لا ضوضاء)
  //   2) تأكيد الحجم: حجم شمعة الكسر أعلى من متوسط الحجم المحلي
  //   3) تتبّع لاحق لإعادة الاختبار (retested) والإبطال (mitigated)
  function detectOrderBlocks(data, structureEvents, atrArr) {
    const volumes = volumesOf(data);
    const blocks = [];
    for (const ev of structureEvents) {
      const breakCandle = data[ev.i];
      const breakRange = breakCandle.high - breakCandle.low;
      const atrAtBreak = atrArr && atrArr[ev.i] ? atrArr[ev.i] : null;
      const localVols = volumes.slice(Math.max(0, ev.i - 20), ev.i);
      const localVolAvg = localVols.length ? localVols.reduce((a, b) => a + b, 0) / localVols.length : 0;

      const strongBreak = atrAtBreak ? breakRange >= 1.3 * atrAtBreak : true;
      const volumeConfirmed = localVolAvg ? breakCandle.volume >= localVolAvg : true;
      if (!strongBreak || !volumeConfirmed) continue; // كسر ضعيف بلا سيولة كافية -> يُتجاهل

      const start = Math.max(0, ev.i - 10);
      const segment = data.slice(start, ev.i + 1);
      const isBullish = ev.type.includes("Bullish");
      const opposite = isBullish ? segment.filter(c => c.close < c.open) : segment.filter(c => c.close > c.open);
      if (!opposite.length) continue;
      const c = opposite[opposite.length - 1];

      let retested = false, mitigated = false, mitigatedAt = null;
      for (let j = ev.i + 1; j < data.length; j++) {
        const bar = data[j];
        const touchesZone = bar.low <= c.high && bar.high >= c.low;
        if (touchesZone) {
          retested = true;
          const invalidated = isBullish ? bar.close < c.low : bar.close > c.high;
          if (invalidated) { mitigated = true; mitigatedAt = bar.time; break; }
        }
      }

      blocks.push({
        type: isBullish ? "Bullish_OB" : "Bearish_OB",
        time: c.time, top: +c.high.toFixed(4), bottom: +c.low.toFixed(4),
        relatedEvent: ev.type, breakStrengthATR: atrAtBreak ? +(breakRange / atrAtBreak).toFixed(2) : null,
        volumeConfirmed, retested, mitigated, mitigatedAt,
      });
    }
    return blocks.slice(-10);
  }

  // FVG محسّن: يتتبّع هل تم ملء الفجوة لاحقاً (Mitigation) جزئياً/كلياً؛
  // الفجوات المُعبّأة بالكامل (mitigatedPct>=0.95) تُستبعد من التصويت.
  function detectFVG(data) {
    const gaps = [];
    for (let i = 2; i < data.length; i++) {
      let gap = null;
      if (data[i].low > data[i - 2].high) {
        gap = { type: "Bullish_FVG", time: data[i].time, top: +data[i].low.toFixed(4), bottom: +data[i - 2].high.toFixed(4) };
      } else if (data[i].high < data[i - 2].low) {
        gap = { type: "Bearish_FVG", time: data[i].time, top: +data[i - 2].low.toFixed(4), bottom: +data[i].high.toFixed(4) };
      }
      if (gap) {
        let mitigatedPct = 0;
        for (let j = i + 1; j < data.length; j++) {
          const bar = data[j];
          const overlapTop = Math.min(bar.high, gap.top);
          const overlapBottom = Math.max(bar.low, gap.bottom);
          if (overlapTop > overlapBottom) {
            mitigatedPct = Math.max(mitigatedPct, (overlapTop - overlapBottom) / (gap.top - gap.bottom));
          }
          if (mitigatedPct >= 0.95) break;
        }
        gap.mitigatedPct = +Math.min(1, mitigatedPct).toFixed(2);
        gap.mitigated = gap.mitigatedPct >= 0.95;
        gaps.push(gap);
      }
    }
    return gaps.slice(-10);
  }

  // ===================================================================
  // 10b) Liquidity Sweep (Stop Hunt) + Equal Highs / Equal Lows
  // ===================================================================
  // Liquidity Sweep: شمعة تخترق (بالفتيل فقط) قمة/قاع سابق ثم تُغلق
  // بالعودة داخل النطاق -> إشارة كلاسيكية لتصفية أوامر الوقف قبل الحركة
  // الحقيقية، من أهم مفاهيم Smart Money المطلوبة.
  function detectLiquiditySweep(data, window = 3, wickMinATRMult = 0.5) {
    const { swingHigh, swingLow } = findSwingPoints(data, window);
    const atrArr = calculateATR(data);
    const sweeps = [];
    let lastHighLevel = null, lastLowLevel = null;

    for (let i = 0; i < data.length; i++) {
      if (swingHigh[i]) lastHighLevel = data[i].high;
      if (swingLow[i]) lastLowLevel = data[i].low;
      const c = data[i];
      const atr = atrArr[i] || 0;

      if (lastHighLevel !== null && c.high > lastHighLevel && c.close < lastHighLevel) {
        const wick = c.high - Math.max(c.open, c.close);
        if (wick >= wickMinATRMult * atr) {
          sweeps.push({ type: "Bearish_Sweep", time: c.time, level: +lastHighLevel.toFixed(4), wick: +wick.toFixed(4) });
        }
      }
      if (lastLowLevel !== null && c.low < lastLowLevel && c.close > lastLowLevel) {
        const wick = Math.min(c.open, c.close) - c.low;
    
