function filterTickers(tickers, filterBy) {
  return tickers.filter((ticker) => ticker.name
    .includes(filterBy.toUpperCase()));
}

export { filterTickers };