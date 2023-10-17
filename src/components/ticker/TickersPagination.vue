<template>
  <div>
    <button
      v-if="currentPage > 1"
      @click="$emit('prevPageRequested')"
      class="m-1 my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      Назад
    </button>
    <button
      v-if="hasNextPage"
      @click="$emit('nextPageRequested')"
      class="m-1 my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      Вперёд
    </button>
  </div>
</template>

<script>
export default {
  name: "TickersPagination",
  emits: {
    prevPageRequested: null,
    nextPageRequested: null,
  },
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    hasNextPage: {
      type: Boolean,
      required: true,
    },
  },
};
</script>