<template>
  <main>
    <h1
      class="mt-10 text-center text-4xl font-bold tracking-widest text-red-700"
    >
      Find Client
    </h1>
    <section class="px-10 pt-12">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <h2 class="text-2xl font-bold">Search Client By</h2>
        <select
          v-model="searchBy"
          class="rounded-md border-gray-300 shadow-sm"
          aria-label="Search clients by"
        >
          <option value="Client Name">Client Name</option>
          <option value="Client Number">Client Number</option>
        </select>
        <input
          v-if="searchBy === 'Client Name'"
          v-model="firstName"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter first name"
          @keyup.enter="handleSubmitForm"
        />
        <input
          v-if="searchBy === 'Client Name'"
          v-model="lastName"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter last name"
          @keyup.enter="handleSubmitForm"
        />
        <input
          v-if="searchBy === 'Client Number'"
          v-model="phoneNumber"
          class="rounded-md border-gray-300 shadow-sm"
          placeholder="Enter client phone number"
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
          Search Client
        </button>
      </div>
    </section>
    <hr class="my-10" />
    <section class="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Clients</h2>
        <h3 class="italic">Click a row to view client details</h3>
      </div>
      <div class="col-span-2">
        <p v-if="loading" role="status" class="p-4 text-blue-800">
          Loading client records…
        </p>
        <div
          v-else-if="error"
          role="alert"
          class="rounded bg-red-50 p-4 text-red-900"
        >
          <p>Clients could not be loaded: {{ error }}</p>
          <button class="mt-2 underline" type="button" @click="execute">
            Retry
          </button>
        </div>
        <p v-else-if="!rows.length" class="p-4 text-gray-700">
          No clients match your search.
        </p>
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          @row-click="openClient"
        />
      </div>
    </section>
  </main>
</template>

<script setup>

// Switched the client search over to script setup.
// Client search values are now managed with refs.

import { computed, onMounted, ref } from 'vue';
import { getClients, searchClients } from '../api/api';
import DataTable from '../components/DataTable.vue';
import { useApi } from '../composables/useApi';
import { useRouter } from 'vue-router';

const router = useRouter();
const searchBy = ref('Client Name');
const firstName = ref('');
const lastName = ref('');
const phoneNumber = ref('');

function requestClients() {
  if (searchBy.value === 'Client Name' && (firstName.value || lastName.value)) {
    return searchClients({
      searchBy: 'name',
      firstName: firstName.value,
      lastName: lastName.value
    });
  }
  if (searchBy.value === 'Client Number' && phoneNumber.value) {
    return searchClients({
      searchBy: 'number',
      phoneNumber: phoneNumber.value
    });
  }
  return getClients();
}

const { data, loading, error, execute } = useApi(requestClients);
const rows = computed(() => data.value || []);
const columns = [
  {
    label: 'Name',
    field: 'firstName',
    render: (_value, client) => `${client.firstName} ${client.lastName}`,
    sortValue: (client) => `${client.firstName} ${client.lastName}`
  },
  { label: 'Phone number', field: 'phoneNumber.primary' },
  { label: 'City', field: 'address.city' }
];

function openClient(client) {
  router.push({ name: 'clientdetails', params: { id: client._id } });
}

function clearSearch() {
  searchBy.value = 'Client Name';
  firstName.value = '';
  lastName.value = '';
  phoneNumber.value = '';
  execute();
}

function handleSubmitForm() {
  execute();
}

onMounted(execute);
</script>
