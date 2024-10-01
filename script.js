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
    return await response.json();
}

function convertToUTC(dateTimeStr, timeZone) {
    return moment.tz(dateTimeStr, timeZone).utc().valueOf();
}

function formatToUTC(dateTime, timeZone) {
    return moment.tz(dateTime, timeZone).format('YYYY-MM-DD HH:mm:ss [UTC]');
}

async function checkTrailingStop() {
    const symbol = document.getElementById("symbol").value;
    const startTimeStr = document.getElementById("start_time").value;
    const endTimeStr = document.getElementById("end_time").value;
    const activationPrice = parseFloat(document.getElementById("activation_price").value);
    const callbackRate = parseFloat(document.getElementById("callback_rate").value);
    const orderType = document.getElementById("order_type").value.toLowerCase();
    const priceType = document.getElementById("price_type").value.toLowerCase();

    // 固定时区为 UTC
    const timeZone = "UTC";

    // Convert input times to milliseconds since epoch (UTC)
    const startTime = convertToUTC(startTimeStr, timeZone);
    const endTime = convertToUTC(endTimeStr, timeZone);

    // Debugging prints
    console.log(`Symbol: ${symbol}`);
    console.log(`Start Time: ${startTimeStr}`);
    console.log(`End Time: ${endTimeStr}`);
    console.log(`Activation Price: ${activationPrice}`);
    console.log(`Callback Rate: ${callbackRate}`);
    console.log(`Order Type: ${orderType}`);
    console.log(`Price Type: ${priceType}`);
    console.log(`Start Time (ms): ${startTime}`);
    console.log(`End Time (ms): ${endTime}`);

    try {
        const klines = await fetchKlines(symbol, "1m", startTime, endTime, 1500, priceType);
        const prices = klines.map(kline => parseFloat(kline[4])); // Closing prices
        const highPrices = klines.map(kline => parseFloat(kline[2])); // High prices
        const lowPrices = klines.map(kline => parseFloat(kline[3])); // Low prices
        const times = klines.map(kline => new Date(kline[0])); // Open times in UTC

        const lowestPrice = Math.min(...lowPrices);
        const highestPrice = Math.max(...highPrices);
        const lowestTime = times[lowPrices.indexOf(lowestPrice)];
        const highestTime = times[highPrices.indexOf(highestPrice)];

        const formattedLowestTime = formatToUTC(lowestTime, timeZone);
        const formattedHighestTime = formatToUTC(highestTime, timeZone);

        console.log(`Lowest Price: ${lowestPrice} at ${formattedLowestTime}`);
        console.log(`Highest Price: ${highestPrice} at ${formattedHighestTime}`);

        document.getElementById("prices").textContent = `Lowest Price: ${lowestPrice} at ${formattedLowestTime}\nHighest Price: ${highestPrice} at ${formattedHighestTime}`;

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

        document.getElementById("result").textContent = isActivated
            ? "Trailing stop order is activated."
            : "Trailing stop order is not activated.";

        // Format and print klines data as table
        let tableContent = `
            <table>
                <thead>
                    <tr>
                        <th>Open Time</th>
                        <th>Open</th>
                        <th>High</th>
                        <th>Low</th>
                        <th>Close</th>
                        <th>Close Time</th>
                    </tr>
                </thead>
                <tbody>
        `;
        klines.forEach(kline => {
            const openTime = formatToUTC(kline[0], timeZone);
            const open = kline[1];
            const high = kline[2];
            const low = kline[3];
            const close = kline[4];
            const closeTime = formatToUTC(kline[6], timeZone);
            tableContent += `
                <tr>
                    <td>${openTime}</td>
                    <td>${open}</td>
                    <td>${high}</td>
                    <td>${low}</td>
                    <td>${close}</td>
                    <td>${closeTime}</td>
                </tr>
            `;
        });
        tableContent += `
                </tbody>
            </table>
        `;

        document.getElementById("klines").innerHTML = tableContent;
    } catch (error) {
        console.error(error);
        document.getElementById("result").textContent = `Error: ${error.message}`;
    }
}
