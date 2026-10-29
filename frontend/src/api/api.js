import axios from 'axios';

const apiClient = axios.create({
  baseURL: window.__APP_CONFIG__?.apiUrl || import.meta.env.VITE_ROOT_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export function setAuthHeader(token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuth() {
  localStorage.removeItem('authToken');
  delete apiClient.defaults.headers.common.Authorization;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.dispatchEvent(new Event('auth:expired'));
      const loginPath = `${import.meta.env.BASE_URL}login`;
      if (window.location.pathname !== loginPath) {
        window.location.assign(loginPath);
      }
    }

    if (!error.response) {
      return Promise.reject(new Error('Unable to reach the server'));
    }

    const body = error.response.data;
    const message =
      body?.error ||
      body?.message ||
      (typeof body === 'string' ? body : '') ||
      'Request failed';
    return Promise.reject(new Error(String(message).slice(0, 180)));
  }
);

export async function loginUser(username, password) {
  const { data } = await apiClient.post('/users/login', { username, password });
  localStorage.setItem('authToken', data.token);
  setAuthHeader(data.token);
  return data.token;
}

export async function getCurrentSession() {
  const { data } = await apiClient.get('/users/session');
  return data;
}

export function logoutUser() {
  clearAuth();
}

export async function getOrgName() {
  const { data } = await apiClient.get('/org');
  return data;
}

export async function getEvents() {
  const { data } = await apiClient.get('/events');
  return data;
}

export async function getEventById(id) {
  const { data } = await apiClient.get(`/events/id/${id}`);
  return data;
}

export async function searchEvents(query) {
  const { data } = await apiClient.get('/events/search', { params: query });
  return data;
}

export async function getClientEvents(id) {
  const { data } = await apiClient.get(`/events/client/${id}`);
  return data;
}

export async function getNonClientEvents(id) {
  const { data } = await apiClient.get(`/events/client/${id}/not-registered`);
  return data;
}

export async function getEventAttendees(id) {
  const { data } = await apiClient.get(`/events/attendees/${id}`);
  return data;
}

export async function getEventsByServiceId(id) {
  const { data } = await apiClient.get(`/events/service/${id}`);
  return data;
}

export async function createEvent(eventData) {
  const { data } = await apiClient.post('/events', eventData);
  return data;
}

export async function updateEvent(id, eventData) {
  const { data } = await apiClient.put(`/events/update/${id}`, eventData);
  return data;
}

export async function registerAttendee(eventId, clientId) {
  const { data } = await apiClient.put('/events/register', null, {
    params: { event: eventId, client: clientId }
  });
  return data;
}

export async function deregisterAttendee(eventId, clientId) {
  const { data } = await apiClient.put('/events/deregister', null, {
    params: { event: eventId, client: clientId }
  });
  return data;
}

export async function deleteEvent(id) {
  const { data } = await apiClient.delete(`/events/${id}`);
  return data;
}

export async function getAttendance() {
  const { data } = await apiClient.get('/events/attendance');
  return data;
}

export async function getClients() {
  const { data } = await apiClient.get('/clients');
  return data;
}

export async function getClientById(id) {
  const { data } = await apiClient.get(`/clients/id/${id}`);
  return data;
}

export async function searchClients(query) {
  const { data } = await apiClient.get('/clients/search', { params: query });
  return data;
}

export async function createClient(client) {
  const { data } = await apiClient.post('/clients', client);
  return data;
}

export async function updateClient(id, client) {
  const { data } = await apiClient.put(`/clients/update/${id}`, client);
  return data;
}

export async function deleteClientbyId(id) {
  const { data } = await apiClient.delete(`/clients/${id}`);
  return data;
}

export async function getClientsByZipCode() {
  const { data } = await apiClient.get('/clients/byzip');
  return data;
}

export async function getServices() {
  const { data } = await apiClient.get('/services');
  return data;
}

export async function getServiceById(id) {
  const { data } = await apiClient.get(`/services/id/${id}`);
  return data;
}

export async function searchServices(query) {
  const { data } = await apiClient.get('/services/search', { params: query });
  return data;
}

export async function createService(service) {
  const { data } = await apiClient.post('/services', service);
  return data;
}

export async function updateService(id, service) {
  const { data } = await apiClient.put(`/services/update/${id}`, service);
  return data;
}

export async function deleteService(id) {
  const { data } = await apiClient.delete(`/services/${id}`);
  return data;
}
