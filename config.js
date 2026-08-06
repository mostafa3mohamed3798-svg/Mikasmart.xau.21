/* ======================================
   Mika Pro Gold Pro
   config.js
====================================== */

const CONFIG = {

    // الرمز
    SYMBOL: "XAUUSDT",

    // الفريم الافتراضي
    TIMEFRAME: "1",

    // WebSocket
    WS_URL: "wss://stream.bybit.com/v5/public/linear",

    // REST API
    REST_URL: "https://api.bybit.com/v5/market",

    // تحديث السعر
    UPDATE_INTERVAL: 1000,

    // إعدادات EMA
    EMA_FAST: 20,
    EMA_MID: 50,
    EMA_SLOW: 200,

    // RSI
    RSI_PERIOD: 14,

    // ATR
    ATR_PERIOD: 14,

    // MACD

    MACD_FAST: 12,
    MACD_SLOW: 26,
    MACD_SIGNAL: 9,

    // VWAP

    VWAP: true,

    // Volume

    VOLUME: true,

    // أقل نسبة ثقة لإظهار الإشارة

    MIN_CONFIDENCE: 75,

    // وقف الخسارة

    ATR_SL: 1.5,

    // الأهداف

    TP1: 1.0,
    TP2: 2.0,
    TP3: 3.0,

    // الألوان

    COLORS:{

        BUY:"#22c55e",

        SELL:"#ef4444",

        WAIT:"#f59e0b",

        BLUE:"#3b82f6"

    }

};


/* ================================
Global Variables
================================ */

let candles=[];

let ema20=[];

let ema50=[];

let ema200=[];

let rsi=[];

let atr=[];

let macd=[];

let volume=[];

let vwap=[];

let currentSignal="WAIT";

let confidence=0;

let currentPrice=0;

let chart=null;

let candleSeries=null;

let ema20Series=null;

let ema50Series=null;

let ema200Series=null;
