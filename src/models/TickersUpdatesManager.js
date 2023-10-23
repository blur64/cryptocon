import {
  listenTickersMessages,
  addTickerToTracked,
  removeTickerFromTracked,
  tickersMessagesTypes
} from '../api';

const api = {
  listenTickersMessages,
  addTickerToTracked,
  removeTickerFromTracked,
  tickersMessagesTypes,
};

/**
 * Represents a module controlling the process of currencies'es rates 
 * updates.
 * @todo Add support of several update handlers for one ticker.
 */
class TickersUpdatesManager {
  constructor() {
    this._updatesHandlers = new Map();
    this._pricesOfReserveCurrencySubs = new Map();
    this._actualReserveInDefaultCurrencyCourse = null;
    this._constants = {
      DEFAULT_CURRENCY_TO: 'USD',
      RESERVE_CURRENCY_TO: 'BTC',
      messagesTypes: api.tickersMessagesTypes,
    };

    api.listenTickersMessages(this._tickersMessageHandler.bind(this));
    api.addTickerToTracked(
      this._constants.RESERVE_CURRENCY_TO,
      this._constants.DEFAULT_CURRENCY_TO
    );
  }

  /**
   * A callback is supposed to be called when a ticker value updated.
   * @callback onTickerUpdate
   * @param {Object} object
   * @param {number} object.newPrice - Updated price.
   * @param {boolean} object.isValid - Ticker updates aviability indicator.
   */

  /**
   * Allows the class instance clients to get regular updates for the chosen 
   * ticker through calling of the passed callback.
   * @param {(string|Object)} ticker - Identifier of a ticker whose value
   * updates should be tracked.
   * @param {onTickerUpdate} onUpdate - The callback should be called when the 
   * ticker value updated.
   * @todo If the tiker will be an object, api.addTickerToTracked won't work, 
   * because it expects ticker as string type. In unsubscribe function it is too.
   */
  subscribe(ticker, onUpdate) {
    this._updatesHandlers.set(ticker, onUpdate);
    api.addTickerToTracked(ticker, this._constants.DEFAULT_CURRENCY_TO);
  }

  /**
   * Allows the class instance clients to stop receiving updates for the 
   * ticker on which updates they have subscribed earlier. 
   * @param {(string|Object)} ticker - Identifier of a ticker from which 
   * updates the client wants to unsubscribe.
   */
  unsubscribe(ticker, isValid) {
    this._updatesHandlers.delete(ticker);

    // If the updates of the ticker were comming in reserve currency, the 
    // ticker must be deleted from this._pricesOfReserveCurrencySubs too
    if (this._pricesOfReserveCurrencySubs.has(ticker)) {
      this._pricesOfReserveCurrencySubs.delete(ticker);
    }

    // Reserve -> default currency exchange rate's update is not deletable 
    // because it's necessary for the class to function correctly (this 
    // subscription exists independant from the client's subscriptions).
    // If the ticker is invalid, it's not tracked.
    if (ticker !== this._constants.RESERVE_CURRENCY_TO && isValid) {
      api.removeTickerFromTracked(ticker, this._constants.DEFAULT_CURRENCY_TO);
    }
  }

  /**
   * Handles messages related to tickers. Based on message type defines 
   * the next message handler.
   * @protected
   * @param {Object} message - The object passing by API every time it has
   * a new message related to tickers.  
   */
  _tickersMessageHandler(message) {
    switch (message.type) {
      case this._constants.messagesTypes.UPDATE:
        this._tickerUpdateHandler(message);
        break;
      case this._constants.messagesTypes.SUB_ERROR:
        this._failedAttemptOfSubscribtionHandler(message);
        break;
      case this._constants.messagesTypes.UNSUB_ERROR:
        this._failedAttemptOfUnsubscribtionHandler(message);
        break;
    }
  }

  /**
   * Handles ticker update event.the messages containing the new price for a ticker.
   * @protected
   * @param {Object} message - Object containing FROMSYMBOL, TOSYMBOL 
   * and PRICE fields.  
   */
  _tickerUpdateHandler(message) {
    const { fromSymbol: ticker, toSymbol: currencyTo } = message;
    let { price: newPrice } = message;

    // Sometimes API can send void price, it's ok
    if (!newPrice) return;

    // default -> reserve currency update case detection.
    if (ticker === this._constants.RESERVE_CURRENCY_TO
      && currencyTo === this._constants.DEFAULT_CURRENCY_TO) {
      this._actualReserveInDefaultCurrencyCourse = newPrice;
      this._updateReserveCurrencySubs();
    }

    // If the newPrice has came in reserve currency, translate it
    // in default currency.
    if (currencyTo === this._constants.RESERVE_CURRENCY_TO) {
      // Renew old price value.
      this._pricesOfReserveCurrencySubs.set(ticker, newPrice);
      // Translate reserve -> default.
      newPrice = this._fromReserveToDefault(newPrice);
    }

    this._notifySubscriber(ticker, newPrice, true);
  }

  /**
   * Calls the handler of a ticker sending updated price and validity.
   * @protected
   * @param {(string|Object)} ticker - The ticker whose handler should be called.
   * @param {number} newPrice - Updated ticker price.
   * @param {boolean} isValid - Updated ticker validity.
   * @todo Declare params types
   */
  _notifySubscriber(ticker, newPrice, isValid) {
    const handler = this._updatesHandlers.get(ticker);
    // There is no handler here only if the client didn't subscribe on
    // reserve -> default currency updates.
    if (!handler) return;
    handler({ newPrice, isValid });
  }

  /**
   * Updates prices for all reserve currency subscribers. This function 
   * will be called every time when reserve -> default currency update 
   * has been recieved.
   */
  _updateReserveCurrencySubs() {
    this._pricesOfReserveCurrencySubs
      .forEach((currentPriceInReserveCurrency, ticker) =>
        this._notifySubscriber(
          ticker,
          this._fromReserveToDefault(currentPriceInReserveCurrency),
          true
        ));
  }

  /**
   * Translates a price in default currency from reserve using actual
   * reserve -> default currency exchange rate.
   * @protected
   * @param {number} price - An exchange rate value.
   * @returns {number} - Translated price. 
   */
  _fromReserveToDefault(price) {
    return price * this._actualReserveInDefaultCurrencyCourse;
  }

  /**
   * Handles unsuccessful attempt of setting a ticker as tracked.
   * @protected
   * @param {Object} message - The object containing PARAMETER field. This
   * message is recieved from API. 
   */
  _failedAttemptOfSubscribtionHandler(message) {
    const { fromSymbol: ticker, toSymbol: currencyTo } = message;

    if (currencyTo === this._constants.DEFAULT_CURRENCY_TO) {
      // If "currency" -> default subscribtion doesn't work, so
      // try to subscribe on "currency" -> reserve.
      api.addTickerToTracked(ticker, this._constants.RESERVE_CURRENCY_TO);
    } else {
      // If both of the attemps of subscribtion are failed, inform the
      // ticker's client about ticker's invalidity.
      this._notifySubscriber(ticker, null, false);
    }
  }

  /**
   * Handles unsuccessful attempt of removing a ticker from tracked. It
   * could happen because some of the tickers are subscribed to reserve
   * currency, while the first attempt of unsubscribtion is aimed on
   * default.
   * @protected
   * @param {Object} message - The object containing PARAMETER field. This
   * message is recieved from API. 
   */
  _failedAttemptOfUnsubscribtionHandler(message) {
    const { fromSymbol: ticker, toSymbol: currencyTo } = message;

    if (currencyTo === this._constants.RESERVE_CURRENCY_TO) {
      console.warn(`If ticker ${ticker} wasn't deleted by UI, this warning 
should be admitted as error. It's possible the ticker was subscribed to 
unsupposed currency or it hasn't been subscribed at all.`);
      return;
    }

    api.removeTickerFromTracked(ticker, this._constants.RESERVE_CURRENCY_TO);
  }
}

export default new TickersUpdatesManager();