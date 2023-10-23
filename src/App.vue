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
        :tickers="finalTickers"
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
  getCoinsNames,
  subscribeToTickersUpdate,
  getTickers,
  setTickers,
  setTickersViewOptions,
  getTickersVeiwOptions,
} from "./api";
import TickersUpdatesManager from "./models/TickersUpdatesManager.js";
import Ticker from "./models/Ticker.js";
import { filterTickers } from "./services/ticker.js";

const API = {
  getCoinsNames,
  subscribeToTickersUpdate,
  getTickers,
  setTickers,
  setTickersViewOptions,
  getTickersVeiwOptions,
};
const TickerService = { filterTickers };

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
      return TickerService.filterTickers(this.tickers, this.filterValue);
    },

    finalTickers() {
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

    tickersViewOptions() {
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

      const newTicker = new Ticker(tickerName.toUpperCase(), NaN, true);
      this.tickers = [...this.tickers, newTicker];

      TickersUpdatesManager.subscribe(newTicker.name, (updatedTickerData) => {
        const { newPrice, isValid } = updatedTickerData;
        this.updateTicker(newTicker.name, newPrice ? newPrice : NaN, isValid);
      });

      this.filterValue = "";
      this.hasTickerAdded = [true];
    },

    findTicker(tickerName) {
      return this.tickers.find((ticker) => ticker.name === tickerName);
    },

    checkCoinExists(tickerName) {
      this.isCoinExisting = this.coinsNames.includes(tickerName);
    },

    checkTickerAlreadyInTickers(tickerName) {
      this.hasThisTicker = Boolean(this.findTicker(tickerName));
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
      const ticker = this.findTicker(tickerName);
      ticker.price = newPrice;
      ticker.isValid = isValid;
    },

    removeTicker(tickerToRemove) {
      if (this.activeTicker === tickerToRemove) {
        this.activeTicker = null;
      }

      TickersUpdatesManager.unsubscribe(
        tickerToRemove.name,
        tickerToRemove.isValid
      );

      this.tickers = this.tickers.filter((ticker) => ticker !== tickerToRemove);
    },

    updateTickers(newTickersNames) {
      newTickersNames.forEach((newTickerName) => {
        if (!this.findTicker(newTickerName)) {
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
    API.subscribeToTickersUpdate(this.updateTickers);
    API.getCoinsNames().then((coinsNames) => {
      this.coinsNames = coinsNames;
      this.haveCoinsNamesLoaded = true;

      const storageTickersNames = API.getTickers();

      if (storageTickersNames) {
        storageTickersNames.forEach((tickerName) =>
          this.addNewTicker(tickerName)
        );
      }

      const tickersViewOptions = API.getTickersVeiwOptions();

      if (tickersViewOptions.filter) {
        this.filterValue = tickersViewOptions.filter;
      }

      if (tickersViewOptions.page) {
        this.currentPage = +tickersViewOptions.page;
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
      API.setTickers(newTickers.map((t) => t.name));
    },

    finalTickers() {
      if (this.finalTickers.length === 0 && this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },

    tickersViewOptions(value) {
      API.setTickersViewOptions(value);
    },

    filterValue() {
      this.currentPage = 1;
    },
  },
};
</script>