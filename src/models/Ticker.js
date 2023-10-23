class Ticker {
  constructor(name, price, isValid) {
    this._name = name;
    this._price = price;
    this._isValid = isValid;
  }

  get name() {
    return this._name;
  }

  get price() {
    return this._price;
  }

  set price(price) {
    this._price = price;
  }

  get isValid() {
    return this._isValid;
  }

  set isValid(isValid) {
    this._isValid = isValid;
  }
}

export default Ticker;