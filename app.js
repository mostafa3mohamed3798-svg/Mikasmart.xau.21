const MarketDecisionEngine = require('./engine.js');

// بيانات تجريبية تفاعلية لأحدث أسعار السوق (شموع)
const liveCandles = [
  { open: 40.0, high: 41.2, low: 39.5, close: 41.0 },
  { open: 41.0, high: 41.8, low: 40.5, close: 41.5 },
  { open: 41.5, high: 42.0, low: 41.0, close: 41.2 },
  { open: 41.2, high: 41.5, low: 40.2, close: 40.5 },
  { open: 40.5, high: 41.0, low: 39.8, close: 40.2 },
  { open: 40.2, high: 40.8, low: 39.9, close: 40.6 },
  { open: 40.6, high: 41.3, low: 40.4, close: 41.1 },
  { open: 41.1, high: 41.9, low: 40.9, close: 41.7 },
  { open: 41.7, high: 42.5, low: 41.5, close: 42.2 },
  { open: 42.2, high: 43.0, low: 42.0, close: 42.8 },
  { open: 42.8, high: 43.5, low: 42.5, close: 43.1 },
  { open: 43.1, high: 43.8, low: 42.9, close: 43.5 },
  { open: 43.5, high: 44.2, low: 43.2, close: 44.0 },
  { open: 44.0, high: 44.7, low: 43.8, close: 44.5 },
  { open: 44.5, high: 45.1, low: 44.2, close: 44.8 }
];

// تشغيل المحرك
const engine = new MarketDecisionEngine(liveCandles);
const signal = engine.generateSignal();

console.log("------------------------------------------");
console.log("📊 تقرير التحليل الفني الآلي لأسواق المال");
console.log("------------------------------------------");
console.log(`🔹 السعر الحالي: ${signal.currentPrice}`);
console.log(`🚀 القرار المتخذ: ${signal.action}`);
console.log(`⭐ نقاط القوة (Score): ${signal.score}`);
console.log("\n📈 المؤشرات والمتعقب:");
console.log(`- مؤشر RSI: ${signal.indicators.rsi}`);
console.log(`- الترند العام: ${signal.indicators.trend}`);
console.log(`- مستويات الدعم:`, signal.indicators.supports);
console.log(`- مستويات المقاومة:`, signal.indicators.resistances);
console.log("\n💡 الأسباب الفنية للقرار:");
signal.reasons.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
console.log("------------------------------------------");
