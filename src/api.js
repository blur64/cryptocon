const API_KEY = '895ac081c2491c49bc49f73823830c8fc1d49d9e542ba8d9748a30c1c3108b7b';
const AGGREGATE_INDEX = '5';
const INVALID_SUB_MESSAGE = 'INVALID_SUB';
const INVALID_UNSUB_MESSAGE = 'SUBSCRIPTION_UNRECOGNIZED';
const ALREADY_SUBSCRIBED_MESSAGE = 'SUBSCRIPTION_ALREADY_ACTIVE';
const DEFAULT_CURRENCY_TO = 'USD';
const RESERVE_CURRENCY_TO = 'BTC';
const PARAMETER_SEPARATOR = '~';
let ACTUAL_BTC_TO_USD = null;

const tickersHandlers = new Map();
const pricesOfReserveCurrencySubs = new Map();
const myWorker = new SharedWorker('/sharedWorker.js');

myWorker.port.addEventListener('message', (e) => {
  const message = e.data;

  if (message.TYPE === AGGREGATE_INDEX) {
    defaultWSMessageHandler(message);
  } else if (message.MESSAGE === INVALID_SUB_MESSAGE) {
    invalidSubWSMessageHandler(message);
  } else if (message.MESSAGE === INVALID_UNSUB_MESSAGE) {
    invalidUnsubWSMessageHandler(message);
  } else if (message.MESSAGE === ALREADY_SUBSCRIBED_MESSAGE) {
    return;
  }

}, false);

const TICKERS_MESSAGES_URL = `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`;
myWorker.port.start();
myWorker.port.postMessage({ WSUrl: `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}` });
subscribeTickerToUpdateOnWS(RESERVE_CURRENCY_TO, DEFAULT_CURRENCY_TO);

function updateReserveCurrencySubs() {
  [...pricesOfReserveCurrencySubs.entries()].forEach(([tickerName, oldPrice]) => {
    const handler = tickersHandlers.get(tickerName);
    handler({ newPrice: oldPrice * ACTUAL_BTC_TO_USD, isValid: true });
  })
}

function invalidUnsubWSMessageHandler(message) {
  const [tickerName, currencyTo] = message.PARAMETER
    .split(PARAMETER_SEPARATOR).slice(2, 4);
  if (currencyTo === RESERVE_CURRENCY_TO) return;
  unsubscribeTickerFromUpdateOnWS(tickerName, RESERVE_CURRENCY_TO);
}

function defaultWSMessageHandler(message) {
  const { FROMSYMBOL: tickerName, TOSYMBOL: currencyTo } = message;
  let newPrice = message.PRICE;

  if (tickerName === RESERVE_CURRENCY_TO && currencyTo === DEFAULT_CURRENCY_TO && newPrice) {
    ACTUAL_BTC_TO_USD = newPrice;
    updateReserveCurrencySubs();
  }

  if (currencyTo === RESERVE_CURRENCY_TO) {
    // We need newPrice only in USD, but now newPrice in BTC,
    // so we transfer newPrice to USD
    pricesOfReserveCurrencySubs.set(tickerName, newPrice);
    newPrice = newPrice * ACTUAL_BTC_TO_USD;
  }

  if (newPrice) {
    const handler = tickersHandlers.get(tickerName);
    // We don't have handler here only if we don't have BTC -> USD ticker on page,
    // but BTC -> USD subscription always exists
    if (!handler) return
    handler({ newPrice: newPrice, isValid: true });
  }
}

function invalidSubWSMessageHandler(message) {
  const [tickerName, currencyTo] = message.PARAMETER
    .split(PARAMETER_SEPARATOR).slice(2, 4);

  if (currencyTo === DEFAULT_CURRENCY_TO) {
    // {{ tickerName }} -> USD subscribtion doesn't work, so
    // try to subscribe on {{ tickerName }} -> BTC.
    subscribeTickerToUpdateOnWS(tickerName, RESERVE_CURRENCY_TO);
  } else {
    const handler = tickersHandlers.get(tickerName);
    handler({ isValid: false });
  }
}

function sendToWorker(message) {
  myWorker.port.postMessage({ WSMessage: message });
}

function subscribeTickerToUpdateOnWS(tickerName, currencyTo) {
  sendToWorker({
    action: "SubAdd",
    subs: [`5~CCCAGG~${tickerName}~${currencyTo}`],
  });
}

function unsubscribeTickerFromUpdateOnWS(tickerName, currencyTo) {
  sendToWorker({
    action: "SubRemove",
    subs: [`5~CCCAGG~${tickerName}~${currencyTo}`],
  })
}

export function subscribeTickerToUpdate(tickerName, cb) {
  tickersHandlers.set(tickerName, cb);
  subscribeTickerToUpdateOnWS(tickerName, DEFAULT_CURRENCY_TO);
}

export function unsubscribeTickerFromUpdate(tickerName) {
  tickersHandlers.delete(tickerName);
  pricesOfReserveCurrencySubs.delete(tickerName);
  if (!(tickerName === RESERVE_CURRENCY_TO)) {
    unsubscribeTickerFromUpdateOnWS(tickerName, DEFAULT_CURRENCY_TO);
  }
}

export function loadCoinsNames() {
  return fetch("https://min-api.cryptocompare.com/data/all/coinlist?summary=true")
    .then((response) => response.json())
    .then((rawCoinsData) => {
      const coinsNames = [];
      for (let coin in rawCoinsData.Data) {
        coinsNames.push(coin);
      }
      return coinsNames;
    });
}



function listenTickersMessages(onMessage) {
  TICKERS_MESSAGES_URL

  myWorker.port.addEventListener('message', (e) => onMessage(e.data));
}

function addTickerToTracked(ticker, currencyTo) {
  sendToWorker({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${currencyTo}`],
  });
}

export { listenTickersMessages, addTickerToTracked };