const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const page = fs.readFileSync('notification-test/index.html', 'utf8');
const app = fs.readFileSync('notification-test/app.js', 'utf8');
const worker = fs.readFileSync('notification-test/sw.js', 'utf8');

assert(page.includes('Code 3 · 3.1.0'), 'test page must identify the preserved Code 3 release');
assert(page.includes('فرع تجريبي فقط') && page.includes('لا يوجد AAB'), 'test must state its isolated non-AAB scope');
assert(page.includes('نجاح هذا الرابط يثبت إشعار الويب'), 'web/native evidence boundary must remain visible');
assert(app.includes("navigator.serviceWorker.register(WORKER_URL, { scope: './' })"), 'test worker must use the isolated directory scope');
assert(app.includes('TEST_DELAY_MS = 20000'), 'background test delay must stay short and explicit');
assert(worker.includes("event.waitUntil(scheduleNotification(data))"), 'the delayed notification must remain attached to the worker event lifetime');
assert(worker.includes("self.registration.showNotification('QiblaAstro — اختبار الإشعار'"), 'notification must be emitted by the service worker');
assert(worker.includes('MAX_TEST_DELAY_MS = 60000'), 'the manual experiment must reject long-lived scheduling');
assert(worker.includes("state: 'shown'") && worker.includes("state: 'clicked'"), 'the experiment must preserve shown/clicked evidence');
assert(!page.includes('nativeToken=') && !app.includes('nativeToken=') && !worker.includes('nativeToken='), 'external preview must never ask for or expose the native bridge token');

console.log('Code 3 isolated web notification experiment: PASS');
console.log('Security boundary (no native token in external preview): PASS');
console.log('Evidence boundary (short web test is not Android closed-app proof): PASS');

(async function executeWorkerContract() {
  const handlers = {};
  const stored = new Map();
  const shown = [];
  const opened = [];
  const clientMessages = [];
  const fakeClient = { postMessage(value) { clientMessages.push(value); } };
  const context = {
    URL,
    Response,
    Promise,
    Number,
    Math,
    Date,
    String,
    setTimeout,
    caches: {
      async open() {
        return {
          async put(key, response) { stored.set(String(key), await response.text()); },
          async match(key) { return stored.has(String(key)) ? new Response(stored.get(String(key))) : undefined; }
        };
      }
    },
    self: {
      location: { href: 'https://example.test/notification-test/sw.js' },
      registration: { async showNotification(title, options) { shown.push({ title, options }); } },
      clients: {
        async matchAll() { return [fakeClient]; },
        async claim() {},
        async openWindow(url) { opened.push(url); }
      },
      async skipWaiting() {},
      addEventListener(name, handler) { handlers[name] = handler; }
    }
  };
  vm.runInNewContext(worker, context, { filename: 'notification-test/sw.js' });
  assert.strictEqual(context.safeDelay(999999), 60000, 'worker must clamp manual delays to one minute');

  let schedulePromise;
  handlers.message({
    data: { type: 'QA_NOTIFY_SCHEDULE', delayMs: 0, testId: 'contract-probe' },
    waitUntil(value) { schedulePromise = value; }
  });
  await schedulePromise;
  assert.strictEqual(shown.length, 1, 'worker must invoke showNotification once');
  assert.strictEqual(shown[0].options.data.testId, 'contract-probe');
  assert(clientMessages.some(value => value.status && value.status.state === 'shown'), 'worker must publish shown evidence');

  let clickPromise;
  let closed = false;
  handlers.notificationclick({
    notification: { data: shown[0].options.data, close() { closed = true; } },
    waitUntil(value) { clickPromise = value; }
  });
  await clickPromise;
  assert.strictEqual(closed, true, 'notification click must close the notification');
  const saved = JSON.parse(Array.from(stored.values()).pop());
  assert.strictEqual(saved.state, 'clicked', 'notification click evidence must persist');
  console.log('Worker runtime contract (schedule -> show -> click evidence): PASS');
}()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
