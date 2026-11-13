const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('LAN signaling backs off reconnect attempts and restores subscriptions', async () => {
  const timers = new Map();
  let nextTimer = 0;
  class MockWebSocket {
    static instances = [];

    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      MockWebSocket.instances.push(this);
    }

    send(message) { this.sent.push(JSON.parse(message)); }
    open() { this.readyState = 1; this.onopen(); }
    close() { this.readyState = 3; this.onclose(); }
  }

  const context = {
    LCRM_CONFIG: {},
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    URLSearchParams,
    WebSocket: MockWebSocket,
    location: { search: '?lan=1', port: '8787', protocol: 'http:', host: 'localhost:8787' },
    sessionStorage: { setItem() {}, getItem() { return null; } },
    setTimeout(fn, delay) {
      const id = ++nextTimer;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'signal.js'), 'utf8'), context);

  const connected = context.Signal.connect();
  MockWebSocket.instances[0].open();
  const db = await connected;
  db.onValue('rooms/test', () => {});

  const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
  for (const delay of expectedDelays) {
    const current = MockWebSocket.instances.at(-1);
    current.close();
    assert.deepEqual([...timers.values()].map(timer => timer.delay), [delay]);
    const [timerId, timer] = timers.entries().next().value;
    timers.delete(timerId);
    timer.fn();

    const reconnected = MockWebSocket.instances.at(-1);
    reconnected.open();
    assert.deepEqual(reconnected.sent.filter(message => message.op === 'sub').map(message => message.path), ['rooms/test']);
  }

  const [stableId, stableTimer] = timers.entries().next().value;
  assert.equal(stableTimer.delay, 30000);
  timers.delete(stableId);
  stableTimer.fn();
  MockWebSocket.instances.at(-1).close();
  assert.deepEqual([...timers.values()].map(timer => timer.delay), [1000]);
});
