const fs = require('fs');
const assert = require('assert');

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
