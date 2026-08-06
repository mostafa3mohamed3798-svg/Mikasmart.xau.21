/* ======================================
   Mika Pro Gold Pro
   chart.js
====================================== */

const chartContainer = document.getElementById("chart");

chart = LightweightCharts.createChart(chartContainer, {

    width: chartContainer.clientWidth,

    height: 420,

    layout:{

        background:{
            color:"#070b14"
        },

        textColor:"#f8fafc"

    },

    grid:{

        vertLines:{
            color:"#1f2937"
        },

        horzLines:{
            color:"#1f2937"
        }

    },

    rightPriceScale:{

        borderColor:"#374151"

    },

    timeScale:{

        borderColor:"#374151",

        timeVisible:true,

        secondsVisible:false

    },

    crosshair:{

        mode:1

    }

});


/* ==========================
   Candles
========================== */

candleSeries = chart.addCandlestickSeries({

    upColor:"#22c55e",

    downColor:"#ef4444",

    borderVisible:false,

    wickUpColor:"#22c55e",

    wickDownColor:"#ef4444"

});


/* ==========================
   EMA Lines
========================== */

ema20Series = chart.addLineSeries({

    color:"#3b82f6",

    lineWidth:2

});

ema50Series = chart.addLineSeries({

    color:"#f59e0b",

    lineWidth:2

});

ema200Series = chart.addLineSeries({

    color:"#a855f7",

    lineWidth:2

});


/* ==========================
   Resize
========================== */

window.addEventListener("resize",()=>{

    chart.applyOptions({

        width:chartContainer.clientWidth,

        height:420

    });

});


/* ==========================
   Update Candles
========================== */

function updateChart(candleData){

    if(!Array.isArray(candleData)) return;

    candleSeries.setData(candleData);

}


/* ==========================
   Update EMA
========================== */

function updateEMA(){

    ema20Series.setData(ema20);

    ema50Series.setData(ema50);

    ema200Series.setData(ema200);

}


/* ==========================
   Change TimeFrame
========================== */

document.querySelectorAll(".tf").forEach(btn=>{

    btn.onclick=function(){

        document.querySelectorAll(".tf").forEach(b=>{

            b.classList.remove("active");

        });

        this.classList.add("active");

        CONFIG.TIMEFRAME=this.dataset.tf;

        loadCandles();

    };

});


/* ==========================
   سيتم كتابتها لاحقاً
========================== */

async function loadCandles(){

    console.log("Loading candles...");

}
