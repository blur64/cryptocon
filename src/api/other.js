function setTickersViewOptions(options) {
  window.history.pushState(
    null,
    document.title,
    `${window.location.pathname}?filter=${options.filter}&page=${options.page}`
  );
}

function getTickersVeiwOptions() {
  return Object.fromEntries(
    new URL(window.location).searchParams.entries());
}

export { setTickersViewOptions, getTickersVeiwOptions };