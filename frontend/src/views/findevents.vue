<template>
  <main>
    <h1
      class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700"
    >
      List of Events
    </h1>
    <section class="px-10 pt-12">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Event By</h2>
        <select
          v-model="searchBy"
          class="rounded-md border-gray-300 shadow-sm"
          aria-label="Search events by"
        >
          <option value="Event Name">Event Name</option>
          <option value="Event Date">Event Date</option>
        </select>
        <input
          v-if="searchBy === 'Event Name'"
          v-model="name"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter event name"
          @keyup.enter="handleSubmitForm"
        />
        <input
          v-if="searchBy === 'Event Date'"
          v-model="eventDate"
          class="rounded-md border-gray-300 shadow-sm"
          type="date"
          @keyup.enter="handleSubmitForm"
        />
      </div>
      <div class="mt-5 flex justify-end gap-3">
        <button
          class="rounded border border-red-700 bg-white text-red-700"
          type="button"
          @click="clearSearch"
        >
          Clear Search
        </button>
        <button
          class="rounded bg-red-700 text-white"
          type="button"
          @click="handleSubmitForm"
        >
          Search Event
        </button>
      </div>
    </section>
    <hr class="my-10" />
    <section class="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Events</h2>
        <h3 class="italic">Click a row to view event details</h3>
      </div>
      <div class="col-span-2">
        <p v-if="loading" role="status" class="p-4 text-amber-800">
          Finding events…
        </p>
        <div
          v-else-if="error"
          role="alert"
          class="rounded bg-red-50 p-4 text-red-900"
        >
          <p>Event search failed: {{ error }}</p>
          <button class="mt-2 underline" type="button" @click="execute">
            Retry
          </button>
        </div>
        <p v-else-if="!rows.length" class="p-4 text-gray-700">
          No events match your search.
        </p>
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          @row-click="openEvent"
        />
      </div>
    </section>
  </main>
</template>

<script setup>

// Reworked the event page to use Composition API functions.
// onmounted loads the event data when the page opens.

import { computed, onMounted, ref } from 'vue';
import { getEvents, searchEvents } from '../api/api';
import DataTable from '../components/DataTable.vue';
import { useApi } from '../composables/useApi';
import { useRouter } from 'vue-router';

const router = useRouter();
const searchBy = ref('Event Name');
const name = ref('');
const eventDate = ref('');

function requestEvents() {
  if (searchBy.value === 'Event Name' && name.value) {
    return searchEvents({ searchBy: 'name', name: name.value });
  }
  if (searchBy.value === 'Event Date' && eventDate.value) {
    return searchEvents({ searchBy: 'date', eventDate: eventDate.value });
  }
  return getEvents();
}

const { data, loading, error, execute } = useApi(requestEvents);
const rows = computed(() => data.value || []);
const columns = [
  { label: 'Event Name', field: 'name' },
  {
    label: 'Event Date',
    field: 'date',
    render: (date) => formatDate(date),
    sortValue: (event) => new Date(event.date).getTime()
  },
  { label: 'Event Address', field: 'address.line1' }
];

function formatDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${String(parsed.getUTCMonth() + 1).padStart(2, '0')}/${String(
    parsed.getUTCDate()
  ).padStart(2, '0')}/${parsed.getUTCFullYear()}`;
}

function openEvent(event) {
  router.push({ name: 'eventdetails', params: { id: event._id } });
}

function clearSearch() {
  searchBy.value = 'Event Name';
  name.value = '';
  eventDate.value = '';
  execute();
}

function handleSubmitForm() {
  execute();
}

onMounted(execute);
</script>
