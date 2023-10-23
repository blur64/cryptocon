const API_KEY = '895ac081c2491c49bc49f73823830c8fc1d49d9e542ba8d9748a30c1c3108b7b';
const TICKERS_MESSAGES_URL = `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`;

/**
 * Constants for working with messages recieved from tickers API.
 * @constant
 * @type {Object}
 */
const _constants = {
  MESSAGE_TYPE_UPDATE: '5',
  INVALID_SUB_MESSAGE: 'INVALID_SUB',
  INVALID_UNSUB_MESSAGE: 'SUBSCRIPTION_UNRECOGNIZED',
  ALREADY_SUBSCRIBED_MESSAGE: 'SUBSCRIPTION_ALREADY_ACTIVE',
  PARAMETER_SEPARATOR: '~',
};

const portMessagesTypes = {
  SOCKET_INIT: 'SOCKET_INIT',
  SOCKET_MESSAGE: 'SOCKET_MESSAGE',
};

const webSocketSharedWorker = new SharedWorker('/sharedWorker.js');

/**
 * Types of the messages recieving by 
 * Types of messages related to tickers. Every message recieved
 * from tickers API translates into one of theese types, so
 * tickers API subscribers gets messages always in this format
 * independant of tickers API kind (webSocket, fetch or something else).
 * @constant
 * @type {Object}
 */
const tickersMessagesTypes = {
  UPDATE: 1,
  SUB_ERROR: 2,
  UNSUB_ERROR: 3,
};

webSocketSharedWorker.port.start();
// Initialize port.
webSocketSharedWorker.port.postMessage({
  type: portMessagesTypes.SOCKET_INIT,
  text: TICKERS_MESSAGES_URL
});

function _sendMessageToWorker(message) {
  webSocketSharedWorker.port.postMessage({
    type: portMessagesTypes.SOCKET_MESSAGE,
    text: message,
  });
}

/**
 * A callback is supposed to be called when a new message related to 
 * tickers has been recieved.
 * @callback onTickerMessage
 * @param {Object} - The message related to tickers.
 */

/**
 * Sets new "message" event listener on webSocketSharedWorker's port.
 * This worker emits only those messages, that related to tickers.
 * @param {onTickerMessage} onMessage - The callback should be called
 * when new message from sharedWorker's port is recieved.
 */
function listenTickersMessages(onMessage) {
  webSocketSharedWorker.port.addEventListener(
    "message",
    (e) => onMessage(translateForTickersSubs(e.data))
  );
}

function translateForTickersSubs(socketMessage) {
  const message = {
    type: null,
    fromSymbol: null,
    toSymbol: null,
    price: null,
  };

  if (socketMessage.TYPE === _constants.MESSAGE_TYPE_UPDATE) {
    message.type = tickersMessagesTypes.UPDATE;
    message.fromSymbol = socketMessage.FROMSYMBOL;
    message.toSymbol = socketMessage.TOSYMBOL;
    message.price = socketMessage.PRICE;
  } else {
    switch (socketMessage.MESSAGE) {
      case _constants.INVALID_SUB_MESSAGE:
        message.type = tickersMessagesTypes.SUB_ERROR;
        break;
      case _constants.INVALID_UNSUB_MESSAGE:
        message.type = tickersMessagesTypes.UNSUB_ERROR;
        break;
    }

    if (socketMessage.PARAMETER) {
      const socketMessageSymbols = socketMessage.PARAMETER
        .split(_constants.PARAMETER_SEPARATOR).slice(2, 4);
      message.fromSymbol = socketMessageSymbols[0];
      message.toSymbol = socketMessageSymbols[1];
    }
  }

  return message;
}

/**
 * Sends message to webSocketSharedWorker. The message contains a
 * subscrition request which will be sended from the worker to the 
 * webSocket connection connected with tickers API.
 * @param {string} tickerName - Ticker's identifier which tickers API 
 * understands.
 * @param {*} currencyTo - The currency in which 
 */
function addTickerToTracked(tickerName, currencyTo) {
  _sendMessageToWorker({
    action: "SubAdd",
    subs: [`5~CCCAGG~${tickerName}~${currencyTo}`],
  });
}

function removeTickerFromTracked(tickerName, currencyTo) {
  _sendMessageToWorker({
    action: "SubRemove",
    subs: [`5~CCCAGG~${tickerName}~${currencyTo}`],
  })
}

function getCoinsNames() {
  return fetch("https://min-api.cryptocompare.com/data/all/coinlist?summary=true")
    .then((response) => response.json())
    .then((rawCoinsData) => {
      const coinsNames = [];

      for (let coin in rawCoinsData.Data)
        coinsNames.push(coin);

      return coinsNames;
    });
}

export {
  listenTickersMessages,
  addTickerToTracked,
  removeTickerFromTracked,
  getCoinsNames,
  tickersMessagesTypes,
  portMessagesTypes
};