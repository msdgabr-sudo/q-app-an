'use strict';

var STATUS_CACHE = 'qiblaastro-code3-notification-test-status-v1';
var STATUS_URL = new URL('./status.json', self.location.href).href;
var MAX_TEST_DELAY_MS = 60000;

function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
function safeDelay(value) {
  var delay = Number(value);
  return Number.isFinite(delay) ? Math.max(0, Math.min(MAX_TEST_DELAY_MS, Math.round(delay))) : 0;
}
function cleanId(value) { return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80); }
async function saveStatus(value) {
  var cache = await caches.open(STATUS_CACHE);
  await cache.put(STATUS_URL, new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } }));
}
async function readStatus() {
  var cache = await caches.open(STATUS_CACHE);
  var response = await cache.match(STATUS_URL);
  return response ? response.json() : { state: 'empty' };
}
async function publish(status) {
  var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientsList.forEach(function (client) { client.postMessage({ type: 'QA_NOTIFY_RESULT', status: status }); });
}
async function scheduleNotification(data) {
  var delayMs = safeDelay(data.delayMs);
  var testId = cleanId(data.testId) || 'notification-test';
  var scheduled = { state: 'scheduled', testId: testId, delayMs: delayMs, at: Date.now() };
  await saveStatus(scheduled);
  await publish(scheduled);
  if (delayMs) await sleep(delayMs);
  try {
    await self.registration.showNotification('QiblaAstro — اختبار الإشعار', {
      body: delayMs ? 'نجح إرسال الإشعار التجريبي بعد تصغير أو إغلاق صفحة الاختبار.' : 'نجح إرسال الإشعار التجريبي الفوري.',
      icon: '../icons/icon-192x192.png',
      badge: '../icons/icon-192x192.png',
      tag: 'qiblaastro-isolated-notification-test',
      renotify: true,
      data: { testId: testId, target: './?notificationResult=clicked' }
    });
    var shown = { state: 'shown', testId: testId, delayMs: delayMs, at: Date.now() };
    await saveStatus(shown);
    await publish(shown);
  } catch (error) {
    var failed = { state: 'failed', testId: testId, error: String(error && error.message || error), at: Date.now() };
    await saveStatus(failed);
    await publish(failed);
  }
}

self.addEventListener('install', function (event) { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'QA_NOTIFY_SCHEDULE') event.waitUntil(scheduleNotification(data));
  else if (data.type === 'QA_NOTIFY_STATUS') event.waitUntil(readStatus().then(publish));
});
self.addEventListener('notificationclick', function (event) {
  var notification = event.notification;
  var target = notification && notification.data && notification.data.target || './?notificationResult=clicked';
  var testId = notification && notification.data && notification.data.testId || '';
  notification.close();
  event.waitUntil((async function () {
    var clicked = { state: 'clicked', testId: cleanId(testId), at: Date.now() };
    await saveStatus(clicked);
    var openClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < openClients.length; i += 1) {
      if ('focus' in openClients[i]) {
        await openClients[i].navigate(target);
        await openClients[i].focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  }()));
});
