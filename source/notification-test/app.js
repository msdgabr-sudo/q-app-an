(function () {
  'use strict';

  var WORKER_URL = './sw.js?v=20260821-notification-test1';
  var TEST_DELAY_MS = 20000;
  var registration = null;
  var countdownTimer = 0;

  function byId(id) { return document.getElementById(id); }
  function setState(id, text, kind) {
    var el = byId(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'state' + (kind ? ' ' + kind : '');
  }
  function summary(text) { byId('summary').textContent = text; }
  function log(text) {
    var item = document.createElement('li');
    item.textContent = new Date().toLocaleTimeString('ar-EG') + ' — ' + text;
    byId('event-log').prepend(item);
  }
  function notificationPermission() {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }
  function refreshPermission() {
    var permission = notificationPermission();
    var label = permission === 'granted' ? 'مسموح' : permission === 'denied' ? 'مرفوض' : permission === 'default' ? 'لم يُطلب بعد' : 'غير مدعوم';
    setState('permission-state', label, permission === 'granted' ? 'ok' : permission === 'denied' || permission === 'unsupported' ? 'bad' : '');
    var ready = permission === 'granted' && !!registration;
    byId('instant-button').disabled = !ready;
    byId('background-button').disabled = !ready;
  }
  function testId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function activeWorker() {
    return registration && (registration.active || registration.waiting || registration.installing);
  }
  function post(message) {
    var worker = activeWorker();
    if (!worker) throw new Error('عامل الخدمة غير جاهز');
    worker.postMessage(message);
  }
  function schedule(delayMs, kind) {
    if (notificationPermission() !== 'granted') {
      summary('يجب منح إذن الإشعار أولًا.');
      return;
    }
    var id = testId(kind);
    localStorage.setItem('qiblaastro:notification-test:last-id', id);
    post({ type: 'QA_NOTIFY_SCHEDULE', delayMs: delayMs, testId: id, kind: kind });
    log('أُرسل طلب ' + (delayMs ? 'الإشعار المؤجل' : 'الإشعار الفوري') + ' إلى عامل الخدمة.');
    if (!delayMs) {
      summary('جارٍ إرسال الإشعار الفوري…');
      return;
    }
    var endsAt = Date.now() + delayMs;
    clearInterval(countdownTimer);
    summary('تمت الجدولة. صغّر المتصفح أو أغلق الصفحة الآن؛ بقي 20 ثانية.');
    countdownTimer = setInterval(function () {
      var seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      summary(seconds ? 'تمت الجدولة؛ صغّر المتصفح الآن. متبقٍ ' + seconds + ' ثانية.' : 'انتهى الوقت؛ افحص شريط إشعارات الهاتف ثم عد واضغط «فحص آخر نتيجة».');
      if (!seconds) clearInterval(countdownTimer);
    }, 500);
  }
  function requestLastStatus() {
    post({ type: 'QA_NOTIFY_STATUS' });
    summary('جارٍ قراءة آخر نتيجة محفوظة من عامل الخدمة…');
  }
  function handleWorkerMessage(event) {
    var data = event.data || {};
    if (data.type !== 'QA_NOTIFY_RESULT') return;
    var value = data.status || {};
    if (value.state === 'scheduled') summary('تم قبول الجدولة داخل عامل الخدمة؛ يمكنك تصغير المتصفح.');
    else if (value.state === 'shown') summary('أكد عامل الخدمة تنفيذ أمر إظهار الإشعار. افحص شريط إشعارات الهاتف.');
    else if (value.state === 'clicked') summary('نجح الاختبار: تم إظهار الإشعار والضغط عليه.');
    else if (value.state === 'failed') summary('فشل إظهار الإشعار: ' + (value.error || 'سبب غير معروف'));
    else if (value.state === 'empty') summary('لا توجد نتيجة اختبار محفوظة حتى الآن.');
    log('حالة عامل الخدمة: ' + (value.state || 'غير معروفة'));
  }

  async function requestPermission() {
    if (!('Notification' in window)) return;
    var permission = await Notification.requestPermission();
    refreshPermission();
    summary(permission === 'granted' ? 'تم منح الإذن. اختر الآن الإشعار الفوري أو اختبار الخلفية.' : 'لم يُمنح إذن الإشعار؛ لن يتم إرسال أي إشعار.');
    log('نتيجة طلب الإذن: ' + permission);
  }

  async function init() {
    var secure = window.isSecureContext;
    var workerSupported = 'serviceWorker' in navigator;
    var apiSupported = 'Notification' in window;
    setState('secure-state', secure ? 'جاهز' : 'غير آمن', secure ? 'ok' : 'bad');
    setState('worker-state', workerSupported ? 'مدعوم' : 'غير مدعوم', workerSupported ? 'ok' : 'bad');
    setState('api-state', apiSupported ? 'مدعوم' : 'غير مدعوم', apiSupported ? 'ok' : 'bad');
    refreshPermission();
    if (!secure || !workerSupported || !apiSupported) {
      summary('هذا المتصفح لا يوفّر متطلبات اختبار الإشعارات كاملة.');
      return;
    }
    try {
      registration = await navigator.serviceWorker.register(WORKER_URL, { scope: './' });
      registration = await navigator.serviceWorker.ready;
      navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
      refreshPermission();
      summary(notificationPermission() === 'granted' ? 'بيئة الاختبار جاهزة.' : 'بيئة الاختبار جاهزة؛ ابدأ بطلب إذن الإشعار.');
      log('تم تسجيل عامل الخدمة المعزول بنجاح.');
      if (new URLSearchParams(location.search).get('notificationResult') === 'clicked') {
        summary('نجح الاختبار: عُدت إلى الصفحة عن طريق الضغط على الإشعار.');
        requestLastStatus();
      }
    } catch (error) {
      setState('worker-state', 'فشل التسجيل', 'bad');
      summary('تعذر تشغيل عامل الخدمة: ' + error.message);
      log('فشل تسجيل عامل الخدمة.');
    }
  }

  byId('permission-button').addEventListener('click', requestPermission);
  byId('instant-button').addEventListener('click', function () { schedule(0, 'instant'); });
  byId('background-button').addEventListener('click', function () { schedule(TEST_DELAY_MS, 'background'); });
  byId('status-button').addEventListener('click', function () {
    try { requestLastStatus(); } catch (error) { summary(error.message); }
  });
  init();
}());
