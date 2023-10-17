<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="inputTickerName"
            @keydown.enter="addTicker()"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          v-if="hints.length"
          class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="(coinName, idx) in hints"
            :key="idx"
            @click="addTicker(coinName)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ coinName }}
          </span>
        </div>
        <div v-if="hasThisTicker" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
        <div
          v-if="!isCoinExisting && trimmedInputTickerName"
          class="text-sm text-red-600"
        >
          Такого тикера не существует
        </div>
      </div>
    </div>
    <add-button @click="addTicker" class="my-4" />
  </section>
</template>

<script>
import AddButton from "../base/AddButton.vue";

export default {
  components: {
    AddButton,
  },

  emits: {
    "new-ticker": (tickerName) => typeof tickerName === "string",
    "input-ticker-value-changing": (inputTickerValue) =>
      typeof inputTickerValue === "string",
  },

  props: {
    hasThisTicker: {
      type: Boolean,
      required: false,
      default: false,
    },

    isCoinExisting: {
      type: Boolean,
      required: false,
      default: false,
    },

    hasTickerAdded: {
      type: Array,
      required: false,
      default: () => [false],
    },

    coinsNames: {
      type: Array,
      required: false,
      default: () => [],
    },
  },

  data() {
    return {
      inputTickerName: "",
    };
  },

  methods: {
    addTicker(tickerName) {
      tickerName = tickerName ? tickerName : this.trimmedInputTickerName;
      if (!tickerName) return;
      this.$emit("new-ticker", tickerName);
    },
  },

  computed: {
    hints() {
      let hints = [];

      if (this.inputTickerName) {
        hints = this.coinsNames
          .filter((coinName) =>
            coinName.includes(this.trimmedInputTickerName.toUpperCase())
          )
          .slice(0, 4);
      }

      return hints;
    },

    trimmedInputTickerName() {
      return this.inputTickerName.trim();
    },
  },

  watch: {
    inputTickerName() {
      this.$emit("input-ticker-value-changing", this.trimmedInputTickerName);
    },

    hasTickerAdded() {
      if (this.hasTickerAdded[0]) {
        this.inputTickerName = "";
      }
    },
  },
};
</script>