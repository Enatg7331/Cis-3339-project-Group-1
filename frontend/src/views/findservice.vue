<template>
  <main>
    <h1
      class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700"
    >
      Find Services
    </h1>
    <section class="px-10 pt-12">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Service By</h2>
        <select
          v-model="searchBy"
          class="rounded-md border-gray-300 shadow-sm"
          aria-label="Search services by"
        >
          <option value="Service Name">Service Name</option>
          <option value="Service Description">Service Description</option>
        </select>
        <input
          v-if="searchBy === 'Service Name'"
          v-model="name"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter service name"
          @keyup.enter="handleSubmitForm"
        />
        <input
          v-if="searchBy === 'Service Description'"
          v-model="description"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter service description"
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
          Search Service
        </button>
      </div>
    </section>
    <hr class="my-10" />
    <section class="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Services</h2>
        <h3 class="italic">Click a row to view service details</h3>
      </div>
      <div class="col-span-2">
        <p v-if="loading" role="status" class="p-4 text-green-800">
          Loading service directory…
        </p>
        <div
          v-else-if="error"
          role="alert"
          class="rounded bg-red-50 p-4 text-red-900"
        >
          <p>Services are unavailable: {{ error }}</p>
          <button class="mt-2 underline" type="button" @click="execute">
            Retry
          </button>
        </div>
        <p v-else-if="!rows.length" class="p-4 text-gray-700">
          No services match your search.
        </p>
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          @row-click="openService"
        />
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getServices, searchServices } from '../api/api';
import DataTable from '../components/DataTable.vue';
import { useApi } from '../composables/useApi';
import { useRouter } from 'vue-router';

const router = useRouter();
const searchBy = ref('Service Name');
const name = ref('');
const description = ref('');

function requestServices() {
  if (searchBy.value === 'Service Name' && name.value) {
    return searchServices({ searchBy: 'name', name: name.value });
  }
  if (searchBy.value === 'Service Description' && description.value) {
    return searchServices({
      searchBy: 'description',
      description: description.value
    });
  }
  return getServices();
}

const { data, loading, error, execute } = useApi(requestServices);
const rows = computed(() => data.value || []);
const columns = [
  { label: 'Service Name', field: 'name' },
  { label: 'Service Description', field: 'description' }
];

function openService(service) {
  router.push({ name: 'servicedetails', params: { id: service._id } });
}

function clearSearch() {
  searchBy.value = 'Service Name';
  name.value = '';
  description.value = '';
  execute();
}

function handleSubmitForm() {
  execute();
}

onMounted(execute);
</script>
