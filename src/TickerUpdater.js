import {
  listenTickersMessages,
  addTickerToTracked,
  removeTickerFromTracked
} from './apiNew.js';

const api = {
  listenTickersMessages,
  addTickerToTracked,
  removeTickerFromTracked,
};

/**
 * Represents a module controlling the process of currencies updates.
 * @todo Add support of several update handlers for one ticker.
 */
class TickersUpdatesManager {
  constructor() {
    this._updatesHandlers = new Map();
    this._pricesOfReserveCurrencySubs = new Map();
    this._actualReserveInDefaultCurrencyCourse = null;
    this._constants = {
      MESSAGE_TYPE_UPDATE: '5',
      INVALID_SUB_MESSAGE: 'INVALID_SUB',
      INVALID_UNSUB_MESSAGE: 'SUBSCRIPTION_UNRECOGNIZED',
      ALREADY_SUBSCRIBED_MESSAGE: 'SUBSCRIPTION_ALREADY_ACTIVE',
      DEFAULT_CURRENCY_TO: 'USD',
      RESERVE_CURRENCY_TO: 'BTC',
      PARAMETER_SEPARATOR: '~',
    };

    api.listenTickersMessages(this._tickersMessageHandler);
    api.addTickerToTracked(
      this._constants.RESERVE_CURRENCY_TO,
      this._constants.DEFAULT_CURRENCY_TO
    );
  }

  /**
   * 
   * @param {(string|Object)} ticker - Identifier of a ticker whose value
   * updates should be tracked.
   * @param {*} onUpdate - The callback should be called when the ticker value
   * updated
   */
  subscribe(ticker, onUpdate) {
    this._updatesHandlers.set(ticker, onUpdate);
    api.addTickerToTracked(ticker, this._constants.DEFAULT_CURRENCY_TO);
  }

  unsubscribe(ticker) {
    this._updatesHandlers.delete(ticker);

    if (this._pricesOfReserveCurrencySubs.has(ticker)) {
      this._pricesOfReserveCurrencySubs.delete(ticker);
    }

    if (ticker !== this._constants.RESERVE_CURRENCY_TO) {
      api.removeTickerFromTracked(ticker, this._constants.DEFAULT_CURRENCY_TO);
    }
  }

  _tickersMessageHandler(message) {
    if (message.TYPE === this._constants.MESSAGE_TYPE_UPDATE) {
      this._tickerUpdateHandler(message);
    } else {
      switch (message.MESSAGE) {
        case this._constants.INVALID_SUB_MESSAGE:
          this._failedAttemptOfSubscribtionHandler(message);
          break;
        case this._constants.INVALID_UNSUB_MESSAGE:
          // Мы не можем знать на какую валюту подписан тикер,
          // потому что мы не сохраняем это знание. Но мы точно знаем,
          // что он подписан или на USD, или на BTC.
          this._failedAttemptOfUnsubscribtionHandler(message);
          break;
        case this._constants.ALREADY_SUBSCRIBED_MESSAGE:
          break;
      }
    }
  }

  _tickerUpdateHandler(message) {
    const {
      FROMSYMBOL: ticker,
      TOSYMBOL: currencyTo,
      PRICE: newPrice
    } = message;

    this._updateTicker(ticker, currencyTo, newPrice);
  }

  _updateTicker(ticker, currencyTo, newPrice) {
    // BTC -> USD update case detection.
    if (ticker === this._constants.RESERVE_CURRENCY_TO
      && currencyTo === this._constants.DEFAULT_CURRENCY_TO
      && newPrice) {
      this._actualReserveInDefaultCurrencyCourse = newPrice;
      this._updateReserveCurrencySubs();
    }

    // In USD translation
    if (currencyTo === RESERVE_CURRENCY_TO) {
      // We accept newPrice only in USD, but now the price in BTC,
      // so we translate it to USD.
      this._pricesOfReserveCurrencySubs.set(ticker, newPrice);
      // Translate BTC -> USD
      newPrice = this._fromReserveToDefault(newPrice);
    }

    if (newPrice) {
      const handler = this._tickersHandlers.get(ticker);
      // We don't have handler here only if we don't have BTC -> USD ticker on page,
      // but BTC -> USD subscription always exists.
      if (!handler) return
      handler({ newPrice, isValid: true });
    }
  }

  _updateReserveCurrencySubs() {
    this._pricesOfReserveCurrencySubs.entries()
      .forEach(([ticker, currentPriceInReserveCurrency]) => {
        const handler = this._tickersHandlers.get(ticker);
        const newPrice = this._fromReserveToDefault(currentPriceInReserveCurrency);

        handler({ newPrice, isValid: true });
      })
  }

  _fromReserveToDefault(price) {
    return price * this._actualReserveInDefaultCurrencyCourse;
  }

  _failedAttemptOfSubscribtionHandler(message) {
    const [ticker, currencyTo] = message.PARAMETER
      .split(this._constants.PARAMETER_SEPARATOR).slice(2, 4);

    if (currencyTo === this._constants.DEFAULT_CURRENCY_TO) {
      // if "currency" -> USD subscribtion doesn't work, so
      // try to subscribe on "currency" -> BTC.
      addTickerToTracked(ticker, this._constants.RESERVE_CURRENCY_TO);
    } else {
      const handler = this._tickersHandlers.get(ticker);
      handler({ isValid: false });
    }
  }

  _failedAttemptOfUnsubscribtionHandler(message) {
    const [ticker, currencyTo] = message.PARAMETER
      .split(this._constants.PARAMETER_SEPARATOR).slice(2, 4);

    if (currencyTo === this._constants.RESERVE_CURRENCY_TO) {
      console.error(`Ticker ${ticker} was subscribed to unsupposed currency.`);
    };

    api.removeTickerFromTracked(ticker, this._constants.RESERVE_CURRENCY_TO);
  }
}

export default TickersUpdatesManager;