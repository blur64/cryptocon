<template>
  <div @click="$emit('selected')">
    <div class="px-4 py-5 sm:p-6 text-center">
      <dt class="text-sm font-medium text-gray-500 truncate">
        {{ tickerName }} - USD
      </dt>
      <dd class="mt-1 text-3xl font-semibold text-gray-900">
        {{ formattedTickerPrice }}
      </dd>
    </div>
    <div class="w-full border-t border-gray-200"></div>

    <RemoveTickerButton
      @clicked="$emit('tickerRemovalRequested', tickerName)"
    />
  </div>
</template>

<script>
import RemoveTickerButton from "../base/RemoveButton.vue";

export default {
  name: "TickersListItem",
  components: { RemoveTickerButton },

  emits: {
    tickerRemovalRequested: null,
    selected: null,
  },

  props: {
    tickerName: {
      type: String,
      required: true,
    },
    tickerPrice: {
      type: Number,
      required: false,
      default: NaN,
    },
  },

  computed: {
    formattedTickerPrice() {
      return isNaN(this.tickerPrice)
        ? "-"
        : this.tickerPrice > 1
        ? this.tickerPrice.toFixed(2)
        : this.tickerPrice.toPrecision(4);
    },
  },
};
</script>