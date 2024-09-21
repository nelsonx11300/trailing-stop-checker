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

    const startTime = new Date(startTimeStr).getTime();
    const endTime = new Date(endTimeStr).getTime();

    try {
        const klines = await fetchKlines(symbol, "1m", startTime, endTime, 1500, priceType);
        const prices = klines.map(kline => parseFloat(kline[4])); // Closing prices
        const times = klines.map(kline => new Date(kline[0]));

        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const lowestTime = times[prices.indexOf(lowestPrice)];
        const highestTime = times[prices.indexOf(highestPrice)];

        let resultText = `Lowest Price: ${lowestPrice} at ${lowestTime}<br>`;
        resultText += `Highest Price: ${highestPrice} at ${highestTime}<br>`;

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
    } catch (error) {
        document.getElementById("result").innerHTML = `Error: ${error.message}`;
    }
}