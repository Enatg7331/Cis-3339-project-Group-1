import { createApp, markRaw } from 'vue';
import router from './router';
import App from './App.vue';
import './index.css';
import Toast from 'vue-toastification';
// Import the CSS or use your own!
import 'vue-toastification/dist/index.css';
//state management library
import { createPinia } from 'pinia';
import { useLoggedInUserStore } from './store/loggedInUser';

const app = createApp(App);

//create a pinia root store
const pinia = createPinia();
//pinia should be able to use router - has to be setup as plugin
pinia.use(({ store }) => {
  store.$router = markRaw(router);
});

//add pinia object to our instance
app.use(pinia);
const user = useLoggedInUserStore();

const options = {
  position: 'bottom-right'
};
app.use(Toast, options);

async function bootstrap() {
  window.addEventListener('auth:expired', () => user.clearSession());
  await user.restoreSession();
  app.use(router);
  await router.isReady();
  app.mount('#app');
}

bootstrap();
