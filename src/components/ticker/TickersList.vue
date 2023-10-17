<template>
  <hr class="w-full border-t border-gray-600 my-4" />
  <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
    <TickersListItem
      v-for="ticker of tickers"
      :key="ticker.name"
      :tickerName="ticker.name"
      :tickerPrice="ticker.price"
      class="overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
      :class="[
        ticker.isValid ? 'bg-white' : 'bg-red-100',
        { 'border-4': activeTicker === ticker },
      ]"
      @selected="$emit('tickerSelected', ticker)"
      @tickerRemovalRequested="$emit('tickerRemovalRequested', ticker)"
    />
  </dl>
  <hr class="w-full border-t border-gray-600 my-4" />
</template>

<script>
import TickersListItem from "./TickersListItem.vue";

export default {
  name: "TickersList",
  components: { TickersListItem },

  emits: {
    tickerSelected: null,
    tickerRemovalRequested: null,
  },

  props: {
    tickers: {
      type: Array,
      required: true,
    },
    activeTicker: {
      type: Object,
      required: false,
      default: null,
    },
  },
};
</script>