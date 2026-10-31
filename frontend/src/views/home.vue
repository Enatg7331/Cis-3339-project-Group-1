<template>
  <main>
    <h1
      class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700"
    >
      Dashboard
    </h1>
    <section class="mx-auto mt-10 max-w-5xl">
      <h2 class="mt-8 text-center text-3xl font-bold text-red-700">
        Events Attendance
      </h2>
      <p v-if="attendanceLoading" role="status" class="mt-6 text-center">
        Loading event attendance…
      </p>
      <div
        v-else-if="attendanceError"
        role="alert"
        class="mt-6 rounded bg-red-50 p-4 text-red-900"
      >
        <p>{{ attendanceError }}</p>
        <button class="mt-2 underline" type="button" @click="loadAttendance">
          Retry
        </button>
      </div>
      <p v-else-if="!recentEvents.length" class="mt-6 text-center">
        No recent events found.
      </p>
      <template v-else>
        <table class="mt-6 min-w-full shadow-md">
          <thead class="bg-gray-50 text-lg">
            <tr>
              <th class="p-4 text-left">Event Name</th>
              <th class="p-4 text-left">Event Date</th>
              <th class="p-4 text-left">Number of Attendees</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr
              v-for="event in recentEvents"
              :key="event._id"
              class="cursor-pointer hover:bg-gray-100"
              @click="editEvent(event._id)"
            >
              <td class="p-2">{{ event.name }}</td>
              <td class="p-2">{{ formatDate(event.date) }}</td>
              <td class="p-2">{{ event.attendees.length }}</td>
            </tr>
          </tbody>
        </table>
        <AttendanceChart :label="labels" :chart-data="chartData" />
      </template>
    </section>
    <section class="mx-auto mt-14 max-w-5xl">
      <h2 class="mt-8 text-center text-3xl font-bold text-red-700">
        Clients by Zip Code
      </h2>
      <p v-if="zipLoading" role="status" class="mt-6 text-center">
        Loading ZIP code totals…
      </p>
      <div
        v-else-if="zipError"
        role="alert"
        class="mt-6 rounded bg-red-50 p-4 text-red-900"
      >
        <p>{{ zipError }}</p>
        <button class="mt-2 underline" type="button" @click="loadZipData">
          Retry
        </button>
      </div>
      <p v-else-if="!zips.length" class="mt-6 text-center">
        No client ZIP code data found.
      </p>
      <template v-else>
        <table class="mt-6 min-w-full shadow-md">
          <thead class="bg-gray-50 text-lg">
            <tr>
              <th class="p-4 text-left">ZIP Code</th>
              <th class="p-4 text-left">Client Count</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr v-for="zip in zips" :key="zip._id">
              <td class="p-2">{{ zip._id }}</td>
              <td class="p-2">{{ zip.count }}</td>
            </tr>
          </tbody>
        </table>
        <div class="flex justify-center">
          <ZipChart :label="zipLabels" :chart-data="zipChartData" />
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>

// Changed the dashboard to use computed and onmounted
// for handling its data and loading the charts.

import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AttendanceChart from '../components/barChart.vue';
import ZipChart from '../components/donutZipChart.vue';
import { getAttendance, getClientsByZipCode } from '../api/api';
import { useApi } from '../composables/useApi';

const router = useRouter();
const {
  data: attendanceData,
  loading: attendanceLoading,
  error: attendanceError,
  execute: loadAttendance
} = useApi(getAttendance);
const {
  data: zipData,
  loading: zipLoading,
  error: zipError,
  execute: loadZipData
} = useApi(getClientsByZipCode);

const recentEvents = computed(() => attendanceData.value || []);
const zips = computed(() => zipData.value || []);
const labels = computed(() =>
  recentEvents.value.map((event) => `${event.name} (${formatDate(event.date)})`)
);
const chartData = computed(() =>
  recentEvents.value.map((event) => event.attendees.length)
);
const zipLabels = computed(() => zips.value.map((item) => item._id));
const zipChartData = computed(() => zips.value.map((item) => item.count));

function formatDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${String(parsed.getUTCMonth() + 1).padStart(2, '0')}/${String(
    parsed.getUTCDate()
  ).padStart(2, '0')}/${parsed.getUTCFullYear()}`;
}

function editEvent(id) {
  router.push({ name: 'eventdetails', params: { id } });
}

onMounted(() => {
  loadAttendance();
  loadZipData();
});
</script>
