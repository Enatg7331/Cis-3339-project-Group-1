<template>
  <div class="w-full overflow-x-auto">
    <table class="min-w-full shadow-md rounded">
      <thead class="bg-gray-50 text-lg">
        <tr>
          <th
            v-for="column in columns"
            :key="column.field"
            class="p-4 text-left"
          >
            <button
              type="button"
              class="font-bold"
              :aria-sort="ariaSort(column)"
              @click="toggleSort(column.field)"
            >
              {{ column.label }}{{ sortIndicator(column.field) }}
            </button>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-300">
        <tr v-if="!sortedRows.length">
          <td
            :colspan="columns.length || 1"
            class="p-4 text-center text-gray-600"
          >
            No results
          </td>
        </tr>
        <tr
          v-for="row in pageRows"
          :key="row._id || row.id"
          class="cursor-pointer hover:bg-gray-100"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="column in columns"
            :key="column.field"
            class="p-3 text-left"
          >
            {{ cellValue(column, row) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div class="flex items-center justify-between gap-4 py-3">
      <span>
        Showing {{ firstRow }}-{{ lastRow }} of {{ sortedRows.length }}
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border px-3 py-1 disabled:opacity-50"
          :disabled="page === 1"
          @click="page -= 1"
        >
          Previous
        </button>
        <span class="px-2 py-1">Page {{ page }} of {{ pageCount }}</span>
        <button
          type="button"
          class="rounded border px-3 py-1 disabled:opacity-50"
          :disabled="page >= pageCount"
          @click="page += 1"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true }
});
defineEmits(['row-click']);

const page = ref(1);
const sortField = ref(null);
const sortDirection = ref(null);
const pageSize = 10;

const sortedRows = computed(() => {
  const rows = [...props.rows];
  if (!sortField.value || !sortDirection.value) {
    return rows;
  }
  const column = props.columns.find((item) => item.field === sortField.value);
  return rows.sort((left, right) => {
    const leftValue = column?.sortValue
      ? column.sortValue(left)
      : readField(left, sortField.value);
    const rightValue = column?.sortValue
      ? column.sortValue(right)
      : readField(right, sortField.value);
    if (leftValue == null) return sortDirection.value === 'asc' ? -1 : 1;
    if (rightValue == null) return sortDirection.value === 'asc' ? 1 : -1;
    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, {
            numeric: true,
            sensitivity: 'base'
          });
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const pageCount = computed(() =>
  Math.max(1, Math.ceil(sortedRows.value.length / pageSize))
);
const pageRows = computed(() =>
  sortedRows.value.slice((page.value - 1) * pageSize, page.value * pageSize)
);
const firstRow = computed(() =>
  sortedRows.value.length ? (page.value - 1) * pageSize + 1 : 0
);
const lastRow = computed(() =>
  Math.min(page.value * pageSize, sortedRows.value.length)
);

watch(
  () => props.rows,
  () => {
    page.value = 1;
  },
  { deep: true }
);
watch(pageCount, (count) => {
  if (page.value > count) {
    page.value = count;
  }
});

function toggleSort(field) {
  if (sortField.value !== field) {
    sortField.value = field;
    sortDirection.value = 'asc';
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc';
  } else if (sortDirection.value === 'desc') {
    sortField.value = null;
    sortDirection.value = null;
  } else {
    sortDirection.value = 'asc';
  }
  page.value = 1;
}

function sortIndicator(field) {
  if (sortField.value !== field || !sortDirection.value) return '';
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼';
}

function ariaSort(column) {
  return sortField.value === column.field
    ? sortDirection.value === 'asc'
      ? 'ascending'
      : sortDirection.value === 'desc'
        ? 'descending'
        : 'none'
    : 'none';
}

function cellValue(column, row) {
  const value = readField(row, column.field);
  return column.render ? column.render(value, row) : value;
}

function readField(row, path) {
  return path.split('.').reduce((value, part) => value?.[part], row);
}
</script>
