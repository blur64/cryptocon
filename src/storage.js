function getTickersFromStorage() {
  return JSON.parse(localStorage.getItem("tickers"));
}

function setTickersToStorage(tickersNames) {
  localStorage.setItem("tickers", JSON.stringify(tickersNames));
}

function subscribeToStorageUpdate(cb) {
  window.addEventListener(
    "storage",
    () => cb(getTickersFromStorage())
  );
}

export { subscribeToStorageUpdate, getTickersFromStorage, setTickersToStorage }