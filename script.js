async function fetchKlines(symbol, interval, startTime, endTime, limit = 1500, priceType = "last") {
    const baseUrl = "https://fapi.binance.com";
    const endpoint = priceType === "mark" ? "/fapi/v1/markPriceKlines" : "/fapi/v1/klines";
    const params = new URLSearchParams({
        symbol: symbol,
        interval: interval,
        startTime: startTime,
        endTime: endTime,
        limit: limit
    });

    const response = await fetch(`${baseUrl}${endpoint}?${params}`);
    if (!response.ok) {
        throw new Error(`Error fetching klines: ${response.statusText}`);
    }
    return response.json();
}

async function checkTrailingStop() {
    const symbol = document.getElementById("symbol").value;
    const startTimeStr = document.getElementById("start_time").value;
    const endTimeStr = document.getElementById("end_time").value;
    const activationPrice = parseFloat(document.getElementById("activation_price").value);
    const callbackRate = parseFloat(document.getElementById("callback_rate").value);
    const orderType = document.getElementById("order_type").value.toLowerCase();
    const priceType = document.getElementById("price_type").value.toLowerCase();

    // Convert input times to milliseconds since epoch in UTC
    const startTime = Date.parse(startTimeStr + 'Z');
    const endTime = Date.parse(endTimeStr + 'Z');

    try {
        const klines = await fetchKlines(symbol, "1m", startTime, endTime, 1500, priceType);
        const prices = klines.map(kline => parseFloat(kline[4])); // Closing prices
        const times = klines.map(kline => new Date(kline[0]));

        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const lowestTime = times[prices.indexOf(lowestPrice)];
        const highestTime = times[prices.indexOf(highestPrice)];

        let resultText = `Lowest Price: ${lowestPrice} at ${lowestTime.toISOString()}<br>`;
        resultText += `Highest Price: ${highestPrice} at ${highestTime.toISOString()}<br>`;

        let isActivated = false;
        if (orderType === "buy") {
            if (prices.some(price => price <= activationPrice)) {
                const bounceBackPrice = lowestPrice * (1 + callbackRate);
                if (prices.some(price => price >= bounceBackPrice)) {
                    isActivated = true;
                }
            }
        } else if (orderType === "sell") {
            if (prices.some(price => price >= activationPrice)) {
                const bounceBackPrice = highestPrice * (1 - callbackRate);
                if (prices.some(price => price <= bounceBackPrice)) {
                    isActivated = true;
                }
            }
        }

        resultText += isActivated ? "Trailing stop order is activated." : "Trailing stop order is not activated.";
        document.getElementById("result").innerHTML = resultText;

        // Display Kline data
        let klineTable = `<table><tr><th>Open Time (UTC)</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr>`;
        klines.forEach(kline => {
            klineTable += `<tr>
                <td>${new Date(kline[0]).toISOString()}</td>
                <td>${kline[1]}</td>
                <td>${kline[2]}</td>
                <td>${kline[3]}</td>
                <td>${kline[4]}</td>
                <td>${kline[5]}</td>
            </tr>`;
        });
        klineTable += `</table>`;
        document.getElementById("kline-data").innerHTML = klineTable;
    } catch (error) {
        document.getElementById("result").innerHTML = `Error: ${error.message}`;
    }
}
