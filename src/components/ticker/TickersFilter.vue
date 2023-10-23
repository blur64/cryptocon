<template>
  <div>
    <label for="filter" class="block text-sm font-medium text-gray-700">
      Фильтр
    </label>
    <div class="max-w-xs flex">
      <div class="mt-1 relative rounded-md shadow-md">
        <input
          :value="filterValue"
          @input="$emit('update:filterValue', $event.target.value)"
          type="text"
          name="filter"
          id="filter"
          class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TickersFilter",
  emits: { "update:filterValue": null },
  props: {
    filterValue: {
      type: String,
      required: true,
      default: "",
    },
  },
};
</script>