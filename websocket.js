/* ======================================
   Mika Pro Gold Pro
   websocket.js
====================================== */

let socket = null;

function connectWebSocket() {

    socket = new WebSocket(CONFIG.WS_URL);

    socket.onopen = () => {

        console.log("✅ WebSocket Connected");

        socket.send(JSON.stringify({

            op: "subscribe",

            args: [
                "tickers.XAUUSDT"
            ]

        }));

    };

    socket.onmessage = (event) => {

        const msg = JSON.parse(event.data);

        if (!msg.data) return;

        const data = msg.data;

        if (Array.isArray(data)) {

            const ticker = data[0];

            if (!ticker) return;

            currentPrice = Number(
                ticker.lastPrice ||
                ticker.markPrice ||
                ticker.indexPrice
            );

        } else {

            currentPrice = Number(
                data.lastPrice ||
                data.markPrice ||
                data.indexPrice
            );

        }

        updatePrice();

    };

    socket.onerror = (err) => {

        console.log("WebSocket Error", err);

    };

    socket.onclose = () => {

        console.log("Disconnected");

        setTimeout(connectWebSocket,3000);

    };

}

function updatePrice(){

    const priceElement=document.getElementById("livePrice");

    if(!priceElement) return;

    priceElement.innerHTML=currentPrice.toFixed(2);

}

connectWebSocket();
