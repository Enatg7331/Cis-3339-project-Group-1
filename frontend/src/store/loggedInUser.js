import { defineStore } from 'pinia';
import jwtDecode from 'jwt-decode';
import {
  clearAuth,
  getCurrentSession,
  loginUser,
  logoutUser,
  setAuthHeader
} from '../api/api';

function sessionFromToken(token) {
  const decoded = jwtDecode(token);
  if (
    !decoded.exp ||
    decoded.exp <= Date.now() / 1000 ||
    !decoded.orgId ||
    !['editor', 'viewer'].includes(decoded.role)
  ) {
    throw new Error('Invalid or expired session');
  }
  return {
    name: decoded.name || '',
    role: decoded.role,
    isLoggedIn: true
  };
}

export const useLoggedInUserStore = defineStore('loggedInUser', {
  state: () => ({
    name: '',
    role: '',
    isLoggedIn: false
  }),
  actions: {
    async login(username, password) {
      const token = await loginUser(username, password);
      this.$patch(sessionFromToken(token));
      this.$router.push('/');
    },
    async restoreSession() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        clearAuth();
        return;
      }
      try {
        sessionFromToken(token);
        setAuthHeader(token);
        const session = await getCurrentSession();
        if (!session.orgId || !['editor', 'viewer'].includes(session.role)) {
          throw new Error('Invalid authenticated session');
        }
        this.$patch({
          name: session.name || '',
          role: session.role,
          isLoggedIn: true
        });
      } catch (error) {
        if (error.message !== 'Unable to reach the server') {
          clearAuth();
        }
        this.$patch({ name: '', role: '', isLoggedIn: false });
      }
    },
    clearSession() {
      this.$patch({ name: '', role: '', isLoggedIn: false });
    },
    logout() {
      logoutUser();
      this.clearSession();
      this.$router.push('/');
    }
  }
});
