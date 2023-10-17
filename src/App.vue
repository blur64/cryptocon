<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <ThePreloader v-if="!haveCoinsNamesLoaded" />

    <div v-else class="container">
      <div class="w-full my-4"></div>
      <TickerAdding
        :hasThisTicker="hasThisTicker"
        :hasTickerAdded="hasTickerAdded"
        :isCoinExisting="isCoinExisting"
        :coinsNames="coinsNames"
        @new-ticker="addNewTicker"
        @input-ticker-value-changing="validateTicker"
      />

      <div>
        <TickersFilter v-model:filterValue="filterValue" />
        <TickersPagination
          :currentPage="currentPage"
          :hasNextPage="hasNextPage"
          @prevPageRequested="currentPage--"
          @nextPageRequested="currentPage++"
        />
      </div>

      <TickersList
        v-if="tickers.length"
        :tickers="paginatedTickers"
        :activeTicker="activeTicker"
        @tickerSelected="activateTicker"
        @tickerRemovalRequested="removeTicker"
      />

      <TickerGraph
        v-if="activeTicker"
        :allGraphValues="normalizedGraph"
        :tickerName="activeTicker.name"
        @close-graph="activeTicker = null"
      />
    </div>
  </div>
</template>

<script>
import ThePreloader from "./components/utils/ThePreloader.vue";

import TickerAdding from "./components/ticker/TickerAdding.vue";
import TickerGraph from "./components/ticker/TickerGraph.vue";
import TickersList from "./components/ticker/TickersList.vue";
import TickersFilter from "./components/ticker/TickersFilter.vue";
import TickersPagination from "./components/ticker/TickersPagination";

import {
  subscribeTickerToUpdate,
  unsubscribeTickerFromUpdate,
  loadCoinsNames,
} from "./api.js";

import {
  subscribeToStorageUpdate,
  getTickersFromStorage,
  setTickersToStorage,
} from "./storage.js";

export default {
  name: "App",
  components: {
    TickerAdding,
    TickerGraph,
    TickersList,
    ThePreloader,
    TickersFilter,
    TickersPagination,
  },

  data() {
    return {
      tickers: [],
      activeTicker: null,
      coinsNames: [],
      hints: [],

      filterValue: "",
      currentPage: 1,

      haveCoinsNamesLoaded: false,

      hasThisTicker: false,
      isCoinExisting: false,
      hasTickerAdded: [false],

      pricesForGraph: [],
      newValueForGraph: 0,
    };
  },

  computed: {
    firstPaginatedTikerIndex() {
      return (this.currentPage - 1) * 6;
    },

    lastPaginatedTikerIndex() {
      return this.currentPage * 6;
    },

    filteredTickers() {
      return this.tickers.filter((ticker) =>
        ticker.name.includes(this.filterValue.toUpperCase())
      );
    },

    paginatedTickers() {
      return this.filteredTickers.slice(
        this.firstPaginatedTikerIndex,
        this.lastPaginatedTikerIndex
      );
    },

    hasNextPage() {
      return this.filteredTickers.length > this.lastPaginatedTikerIndex;
    },

    normalizedGraph() {
      const minPrice = Math.min(...this.pricesForGraph);
      const maxPrice = Math.max(...this.pricesForGraph);

      if (maxPrice === minPrice) {
        return this.pricesForGraph.map(() => 50);
      }

      return this.pricesForGraph.map((price) =>
        price === minPrice
          ? 2
          : ((price - minPrice) / (maxPrice - minPrice)) * 100
      );
    },

    pageStateOptions() {
      return {
        filter: this.filterValue,
        page: this.currentPage,
      };
    },
  },

  methods: {
    addNewTicker(tickerName) {
      this.validateTicker(tickerName);

      if (this.hasThisTicker || !this.isCoinExisting) {
        this.hasTickerAdded = [false];
        return;
      }

      const tickerNameInUpperCase = tickerName.toUpperCase();
      const newTicker = {
        name: tickerNameInUpperCase,
        price: NaN,
        isValid: true,
      };

      this.tickers = [...this.tickers, newTicker];

      subscribeTickerToUpdate(newTicker.name, (updatedTickerData) => {
        const { newPrice, isValid } = updatedTickerData;
        this.updateTicker(newTicker.name, newPrice, isValid);
      });

      this.filterValue = "";
      this.hasTickerAdded = [true];
    },

    getTicker(tickerName) {
      return this.tickers.find((ticker) => ticker.name === tickerName);
    },

    checkCoinExists(tickerName) {
      this.isCoinExisting = this.coinsNames.includes(tickerName);
    },

    checkTickerAlreadyInTickers(tickerName) {
      this.hasThisTicker = Boolean(this.getTicker(tickerName));
    },

    validateTicker(tickerName) {
      const tickerNameInUpperCase = tickerName.toUpperCase();
      this.checkTickerAlreadyInTickers(tickerNameInUpperCase);
      this.checkCoinExists(tickerNameInUpperCase);
    },

    activateTicker(ticker) {
      this.activeTicker = ticker;
    },

    updateTicker(tickerName, newPrice, isValid) {
      const currentTicker = this.getTicker(tickerName);
      currentTicker.price = newPrice;
      currentTicker.isValid = isValid;
    },

    removeTicker(tickerToRemove) {
      if (this.activeTicker === tickerToRemove) {
        this.activeTicker = null;
      }

      unsubscribeTickerFromUpdate(tickerToRemove.name);
      this.tickers = this.tickers.filter((ticker) => ticker !== tickerToRemove);
    },

    updateTickers(newTickersNames) {
      newTickersNames.forEach((newTickerName) => {
        if (!this.getTicker(newTickerName)) {
          this.addNewTicker(newTickerName);
        }
      });
      this.tickers.forEach((existedTicker) => {
        if (
          !newTickersNames.find(
            (newTickerName) => newTickerName === existedTicker.name
          )
        ) {
          this.removeTicker(existedTicker);
        }
      });
    },
  },

  created() {
    subscribeToStorageUpdate(this.updateTickers);
    loadCoinsNames().then((coinsNames) => {
      this.coinsNames = coinsNames;
      this.haveCoinsNamesLoaded = true;

      const storageTickersNames = getTickersFromStorage();

      if (storageTickersNames) {
        storageTickersNames.forEach((tickerName) =>
          this.addNewTicker(tickerName)
        );
      }

      const windowData = Object.fromEntries(
        new URL(window.location).searchParams.entries()
      );

      if (windowData.filter) {
        this.filterValue = windowData.filter;
      }

      if (windowData.page) {
        this.currentPage = windowData.page;
      }
    });
  },

  watch: {
    activeTicker: {
      handler(newValue, oldValue) {
        if (oldValue !== newValue) {
          this.pricesForGraph = [];
        } else {
          this.pricesForGraph.push(this.activeTicker.price);
        }
      },
      deep: true,
    },

    tickers(newTickers) {
      setTickersToStorage(newTickers.map((t) => t.name));
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },

    inputTickerName() {
      this.showHints();
    },

    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },

    filterValue() {
      this.currentPage = 1;
    },
  },
};
</script>