import { ref } from 'vue';

export function useApi(apiCall) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let latestRequest = 0;

  async function execute() {
    const requestId = ++latestRequest;
    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const result = await apiCall();
      if (requestId === latestRequest) {
        data.value = result;
      }
      return result;
    } catch (requestError) {
      if (requestId === latestRequest) {
        error.value = requestError.message;
      }
      return null;
    } finally {
      if (requestId === latestRequest) {
        loading.value = false;
      }
    }
  }

  return { data, loading, error, execute };
}
