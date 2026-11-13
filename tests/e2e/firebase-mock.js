async function mockFirebase(page) {
  await page.route('**/config.js', async route => {
    const response = await route.fetch();
    const body = await response.text();
    return route.fulfill({
      response,
      body: body + '\nwindow.LCRM_CONFIG.firebaseAuth = { apiKey: "test-key", authDomain: "test.firebaseapp.com", projectId: "test" };'
    });
  });
  await page.route('https://www.gstatic.com/firebasejs/**', async route => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    const scripts = {
      'firebase-app-compat.js': `
        window.__firebaseMock = { scripts: ['app'], signInEmails: [], paths: [] };
        const state = window.__firebaseMock;
        state.auth = {
          currentUser: null,
          onAuthStateChanged(callback) { setTimeout(() => callback(this.currentUser), 0); return () => {}; },
          async signInWithEmailAndPassword(email, password) {
            if (password !== 'church-password') throw Object.assign(new Error('Invalid credential'), { code: 'auth/invalid-credential' });
            state.signInEmails.push(email); this.currentUser = { email }; return { user: this.currentUser };
          },
          async signOut() { this.currentUser = null; }
        };
        state.db = {
          ref(path) {
            state.paths.push(path);
            return {
              set: async () => {},
              remove: async () => {},
              push: async () => {},
              on(event, callback) { if (event === 'value') setTimeout(() => callback({ val: () => null }), 0); return callback; },
              off() {},
              onDisconnect() { return { remove: async () => {} }; }
            };
          }
        };
        window.firebase = { apps: [], initializeApp(options) { this.apps.push({ options }); } };
      `,
      'firebase-auth-compat.js': `window.__firebaseMock.scripts.push('auth'); window.firebase.auth = () => window.__firebaseMock.auth;`,
      'firebase-database-compat.js': `window.__firebaseMock.scripts.push('database'); window.firebase.database = () => window.__firebaseMock.db;`
    };
    if (!scripts[file]) return route.abort();
    return route.fulfill({ contentType: 'application/javascript', body: scripts[file] });
  });
}

module.exports = { mockFirebase };
