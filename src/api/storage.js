function getTickers() {
  return JSON.parse(localStorage.getItem("tickers"));
}

function setTickers(tickersNames) {
  localStorage.setItem("tickers", JSON.stringify(tickersNames));
}

function subscribeToTickersUpdate(updateHandler) {
  window.addEventListener(
    "storage",
    () => updateHandler(getTickers())
  );
}

export {
  getTickers,
  setTickers,
  subscribeToTickersUpdate,
};