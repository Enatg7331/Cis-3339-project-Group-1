<!-- This viewt allows for the creation of a new service -->
<template>
  <main>
    <!--Header-->
    <h1
      class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10"
    >
      Create Service
    </h1>
    <div class="px-10 py-20">
      <!--Form-->
      <!-- @submit.prevent stops the submit event from reloading the page-->
      <form @submit.prevent="handleSubmitForm">
        <!-- grid container -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10"
        >
          <h2 class="text-2xl font-bold">Service Details</h2>
          <!-- Service Name input field -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Service Name</span>
              <span style="color: #ff0000">*</span>
              <input
                type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="service.name"
              />
              <!-- Validation error messages -->
              <span v-if="v$.service.name.$error" class="text-red-500">
                Service Name is required
              </span>
            </label>
          </div>

          <!-- Description input field -->
          <div class="flex flex-col">
            <label>
              <span class="text-gray-700">Description:</span>
              <textarea
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                v-model="service.description"
              ></textarea>
            </label>
          </div>
        </div>

        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mt-10"
        >
          <div></div>
          <!-- form field: update service description -->
          <div class="flex flex-col">
            <label class="block">
              <span class="text-gray-700">Service Status</span>
              <span style="color: #ff0000">*</span>
              <div class="mt-1">
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    class="form-radio"
                    value="Active"
                    v-model="service.status"
                  />
                  <span class="ml-2">Active</span>
                </label>
                <label class="inline-flex items-center ml-6">
                  <input
                    type="radio"
                    class="form-radio"
                    value="Inactive"
                    v-model="service.status"
                  />
                  <span class="ml-2">Inactive</span>
                </label>
              </div>
            </label>
          </div>
        </div>

        <!-- grid container -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10"
        >
          <div></div>
          <!-- Add Service submit button -->
          <div class="flex justify-between mt-10 mr-20">
            <button class="bg-red-700 text-white rounded" type="submit">
              Add Service
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { createService } from '../api/api';
import { useToast } from 'vue-toastification';

// Composition API migration: reactive service state and explicit validation replace Options API.
const toast = useToast();
const router = useRouter();
const service = reactive({
  name: null,
  description: null,
  status: 'Active'
});
const v$ = useVuelidate({ service: { name: { required } } }, { service });

async function handleSubmitForm() {
  if (!(await v$.value.$validate())) return;

  try {
    const response = await createService(service);
    toast.success(response);
    await router.push('/findservice');
  } catch (error) {
    toast.error(error.message || String(error));
  }
}
</script>
