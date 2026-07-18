// @ts-nocheck -- legacy storefront is being migrated incrementally to typed modules.
import './style.scss';
import { initSnowCanvas } from './ambient';
import { animateCards, animateCart, animateCatalog, animateDetail, animateSuccessModal, initMotion, pulseCart } from './motion';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor?.('#eaf8ff');
    tg.setBackgroundColor?.('#e1f5ff');
    tg.setBottomBarColor?.('#edf9ff');
  } catch (_) {
    // Старые версии Telegram принимают не все цветовые параметры.
  }
  // Не включаем fullscreen: окно Mini App масштабируется вместе с окном Telegram.
}

let products = [];

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const PRODUCT_UNITS = new Set(['кг', 'шт', 'упак']);

function apiUrl(path) {
  const cleanPath = String(path).replace(/^\/+/, '');
  return API_BASE_URL
    ? new URL(cleanPath, new URL(`${API_BASE_URL}/`, document.baseURI))
    : new URL(cleanPath, document.baseURI);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function safeImageUrl(value) {
  if (!value) return '';
  try {
    const contentBase = API_BASE_URL ? new URL(`${API_BASE_URL}/`, document.baseURI) : new URL('.', document.baseURI);
    const url = new URL(String(value), contentBase);
    const assetsRoot = new URL('assets/', contentBase);
    const isImage = /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
    if (url.origin !== assetsRoot.origin || !url.pathname.startsWith(assetsRoot.pathname) || !isImage) return '';
    return url.href;
  } catch (_) {
    return '';
  }
}

function readStoredJson(key, fallback) {
  try {
    const value = JSON.parse(readStoredString(key, 'null'));
    return value ?? fallback;
  } catch (_) {
    try { localStorage.removeItem(key); } catch (_) {}
    return fallback;
  }
}

function readStoredString(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function writeStoredString(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (_) {}
}

function removeStoredValue(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

function createRequestId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const translations = {
  ru: {
    lang: 'RU', appTitle: 'ОптХолод — замороженные продукты оптом', search: 'Найти товар', searchLabel: 'Поиск по каталогу', filtersLabel: 'Выбрать страну', countriesLabel: 'Страна производства', mainNavLabel: 'Основная навигация',
    showAll: 'Категории ›', backAll: 'Все товары', allProducts: 'Все товары', allCountryChip: 'Все', new: 'Товары', catalog: 'Каталог', fav: 'Избранное', cart: 'Корзина', add: 'В корзину',
    emptyProducts: 'Ничего не найдено', emptyCart: 'В корзине пока пусто', total: 'Итого', back: 'Назад', allCountries: 'Все страны',
    vatShort: 'с НДС', amount: 'Количество', amountFrom: 'От', customWeight: 'Минимум', amountHint: 'Можно ввести своё количество', amountInput: 'Количество товара', ask: 'Написать менеджеру', itemTotal: 'Сумма',
    inCart: 'Товар добавлен', description: 'Описание', checkout: 'Отправить заказ', sending: 'Отправляем…',
    orderNote: 'Минимальный заказ — от одной палеты. Самовывоз со склада в Москве.', vatNote: 'Все цены с НДС.',
    orderSuccessTitle: 'Спасибо за заказ!', orderSuccessText: 'Заказ принят. Менеджер свяжется с вами, чтобы уточнить детали.', orderSuccessOk: 'Готово',
    orderError: 'Не удалось отправить заказ. Попробуйте ещё раз чуть позже.', orderSessionError: 'Сессия устарела. Закройте и снова откройте магазин.', orderRateError: 'Слишком много попыток. Подождите минуту и повторите.', orderValidationError: 'Проверьте количество товаров и повторите заказ.', orderTimeoutError: 'Сервер долго не отвечает. Попробуйте ещё раз.',
    loadingProducts: 'Загружаем каталог…', loadProductsError: 'Каталог не загрузился', retry: 'Попробовать снова', loadMore: 'Показать ещё',
    noPhoto: 'Фото скоро появится', detailsManager: 'Подробности и наличие уточнит менеджер.', openProduct: 'Открыть товар', addFavorite: 'Добавить в избранное', removeFavorite: 'Убрать из избранного',
    decreaseQty: 'Уменьшить количество', increaseQty: 'Увеличить количество', removeItem: 'Удалить из корзины',
    switchLanguage: 'Switch to English', offline: 'Нет подключения к интернету', online: 'Подключение восстановлено',
    managerPopupTitle: 'Написать менеджеру', managerPopupText: 'Закройте магазин и напишите вопрос в чат с ботом. Или позвоните: +7 995 796-20-36.', openChat: 'Перейти в чат',
    countries: { Европа: 'Европа', Китай: 'Китай', Россия: 'Россия' },
    cats: { все:'Все товары', картофель:'Картофель', овощи:'Овощи', ягоды:'Ягоды', грибы:'Грибы', фрукты:'Фрукты', смеси:'Овощные смеси', снеки:'Снеки', выпечка:'Выпечка и донаты' }
  },
  en: {
    lang: 'EN', appTitle: 'OptKholod — frozen foods wholesale', search: 'Find a product', searchLabel: 'Search the catalog', filtersLabel: 'Choose a country', countriesLabel: 'Country of origin', mainNavLabel: 'Main navigation',
    showAll: 'Categories ›', backAll: 'All products', allProducts: 'All products', allCountryChip: 'All', new: 'Products', catalog: 'Catalog', fav: 'Favorites', cart: 'Cart', add: 'Add to cart',
    emptyProducts: 'No matching products', emptyCart: 'Your cart is empty', total: 'Total', back: 'Back', allCountries: 'All countries',
    vatShort: 'VAT incl.', amount: 'Quantity', amountFrom: 'From', customWeight: 'Minimum', amountHint: 'You can enter a custom quantity', amountInput: 'Product quantity', ask: 'Message the manager', itemTotal: 'Subtotal',
    inCart: 'Added to cart', description: 'Description', checkout: 'Send order', sending: 'Sending…',
    orderNote: 'Minimum order: one pallet. Pickup from our Moscow warehouse.', vatNote: 'All prices include VAT.',
    orderSuccessTitle: 'Thank you!', orderSuccessText: 'Your order is confirmed. Our manager will contact you to discuss the details.', orderSuccessOk: 'Done',
    orderError: 'Could not send the order. Please try again a little later.', orderSessionError: 'Your session has expired. Close and reopen the shop.', orderRateError: 'Too many attempts. Wait a minute and try again.', orderValidationError: 'Check the product quantities and try again.', orderTimeoutError: 'The server took too long to respond. Please try again.',
    loadingProducts: 'Loading catalog…', loadProductsError: 'Catalog could not be loaded', retry: 'Try again', loadMore: 'Show more',
    noPhoto: 'Photo coming soon', detailsManager: 'Ask the manager for details and availability.', openProduct: 'Open product', addFavorite: 'Add to favorites', removeFavorite: 'Remove from favorites',
    decreaseQty: 'Decrease quantity', increaseQty: 'Increase quantity', removeItem: 'Remove from cart',
    switchLanguage: 'Переключить на русский', offline: 'No internet connection', online: 'Connection restored',
    managerPopupTitle: 'Message the manager', managerPopupText: 'Close the shop and send your question in the bot chat. Or call +7 995 796-20-36.', openChat: 'Open chat',
    countries: { Европа: 'Europe', Китай: 'China', Россия: 'Russia' },
    cats: { все:'All products', картофель:'Potato', овощи:'Vegetables', ягоды:'Berries', грибы:'Mushrooms', фрукты:'Fruit', смеси:'Vegetable mixes', снеки:'Snacks', выпечка:'Bakery and donuts' }
  }
};

let catalogCountry = '';
let countryFilter = '';
let currentLang = readStoredString('lang') === 'en' ? 'en' : 'ru';
let productsLoadState = 'loading';
const CARD_BATCH_SIZE = 24;
let visibleProductLimit = CARD_BATCH_SIZE;
let productWindowKey = '';
let productObserver = null;
const WEIGHT_OPTIONS = [10, 25, 50, 100];
const getWeightOptions = (p) => {
  const base = minProductAmount(p);
  return [...new Set([base, ...WEIGHT_OPTIONS.filter(w => w >= base)])];
};
const minProductWeight = (p) => minProductAmount(p);
const clampProductWeight = (p, value) => normalizeProductAmount(p, value);
let selectedWeight = Number(readStoredString('selectedWeight', '10'));
if (!Number.isFinite(selectedWeight) || selectedWeight <= 0) selectedWeight = 10;
let activeCat = 'все';
let mode = 'new';
let previousMode = 'new';
let previousScrollY = 0;
let selectedProductId = null;
let fav = readStoredJson('fav', []);
if (!Array.isArray(fav)) fav = [];
fav = [...new Set(fav.map(Number).filter(Number.isSafeInteger))];
let cart = readStoredJson('cart', {});
if (!cart || typeof cart !== 'object' || Array.isArray(cart)) cart = {};

const $ = (s) => document.querySelector(s);
const showAllBtn = () => $('#showAll');
function setShowAll(display = 'none', label = '') {
  const btn = showAllBtn();
  if (!btn) return;
  btn.style.display = display;
  if (label) btn.textContent = label;
}
const text = (key) => translations[currentLang][key];
const productById = (id) => products.find(p => p.id === Number(id));
const localized = (value) => typeof value === 'string'
  ? value
  : String(value?.[currentLang] ?? value?.ru ?? value?.en ?? '');
const countryLabel = (country) => translations[currentLang].countries[country] || String(country || '');
const favoriteLabel = (id) => text(fav.includes(Number(id)) ? 'removeFavorite' : 'addFavorite');
const normalizePriceUnit = (p) => PRODUCT_UNITS.has(p?.priceUnit) ? p.priceUnit : 'кг';
const unitLabel = (p) => ({
  ru: { кг: 'кг', шт: 'шт.', упак: 'упак.' },
  en: { кг: 'kg', шт: 'pc', упак: 'pack' }
}[currentLang][normalizePriceUnit(p)]);
const productPrice = (p) => {
  const value = Number(p?.price ?? p?.pricePerKg ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};
const minProductAmount = (p) => cleanWeight(p?.minAmount ?? p?.packKg ?? 1, 1);
const amountStep = (p) => {
  const configured = Number(p?.quantityStep);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return normalizePriceUnit(p) === 'кг' ? 0.1 : 1;
};
function normalizeProductAmount(p, value) {
  const minimum = minProductAmount(p);
  const raw = Math.max(minimum, cleanWeight(value, minimum));
  const step = amountStep(p);
  const snapped = Math.round(raw / step) * step;
  return Math.max(minimum, Math.round(snapped * 100) / 100);
}
const amountLabel = (p, amount) => `${String(amount).replace('.', ',')} ${unitLabel(p)}`;
const money = (rub) => {
  const converted = Number(rub || 0);
  const isInteger = Math.abs(converted - Math.round(converted)) < 0.001;
  const value = converted.toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${value} ₽`;
};
const moneyPerUnit = (p) => `${money(productPrice(p))}/${unitLabel(p)} <span class="vat-inline">${text('vatShort')}</span>`;
const productTotal = (p, amount = minProductAmount(p)) => productPrice(p) * Number(amount || 0);
const productSearchText = (p) => [
  p.name?.ru, p.name?.en, p.cat?.ru, p.cat?.en, p.desc?.ru, p.desc?.en, p.tag,
  productPrice(p), minProductAmount(p), normalizePriceUnit(p),
  translations.ru.cats[p.tag] || '', translations.en.cats[p.tag] || ''
].filter(Boolean).join(' ').toLowerCase();
const cleanWeight = (value, fallback = 10) => {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : fallback;
};
const cartKey = (id, weight) => `${id}|${cleanWeight(weight)}`;
const parseCartKey = (key) => {
  const [id, weight] = String(key).split('|');
  return { id: Number(id), weight: cleanWeight(weight || minProductAmount(productById(id)), minProductAmount(productById(id))) };
};
const productImage = (p, eager = false) => {
  const src = safeImageUrl(p?.img);
  return src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(localized(p?.name))}" width="360" height="360" loading="${eager ? 'eager' : 'lazy'}" fetchpriority="${eager ? 'high' : 'low'}" decoding="async">`
    : `<div class="no-photo" role="img" aria-label="${escapeHtml(text('noPhoto'))}"></div>`;
};
const icon = (name) => ({
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>',
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6"></path></svg>'
}[name] || '');

function save() {
  try {
    localStorage.setItem('fav', JSON.stringify(fav));
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch (error) {
    console.warn('Could not save storefront state', error);
  }
}

let toastTimer;
function showToast(message, duration = 1700, assertive = false) {
  let toast = document.querySelector('.app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.setAttribute('role', assertive ? 'alert' : 'status');
  toast.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), duration);
}

let largestVisualViewport = window.visualViewport?.height || window.innerHeight;

function focusedTextControl() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
}

function syncPhoneViewport() {
  const visualHeight = window.visualViewport?.height || window.innerHeight;
  const telegramHeight = Number(tg?.viewportHeight || 0);
  const stableHeight = Number(tg?.viewportStableHeight || 0);
  const currentHeight = telegramHeight || visualHeight;
  if (!focusedTextControl()) largestVisualViewport = Math.max(largestVisualViewport, visualHeight);
  const referenceHeight = Math.max(stableHeight, largestVisualViewport);
  const keyboardVisible = Boolean(focusedTextControl()) && referenceHeight - Math.min(currentHeight, visualHeight) > 120;

  document.documentElement.style.setProperty('--app-viewport-height', `${Math.round(currentHeight)}px`);
  document.documentElement.style.setProperty('--app-viewport-stable-height', `${Math.round(referenceHeight)}px`);
  document.body.classList.toggle('keyboard-open', keyboardVisible);

  const nav = document.querySelector('.bottom-nav');
  if (nav) {
    nav.style.visibility = keyboardVisible ? 'hidden' : '';
    nav.style.pointerEvents = keyboardVisible ? 'none' : '';
    if (keyboardVisible) nav.setAttribute('aria-hidden', 'true');
    else nav.removeAttribute('aria-hidden');
  }
}

function dismissKeyboard() {
  focusedTextControl()?.blur();
  window.requestAnimationFrame(syncPhoneViewport);
}

function keepFocusedControlVisible() {
  const control = focusedTextControl();
  if (!control) return;
  window.setTimeout(() => control.scrollIntoView({ block: 'center', behavior: 'smooth' }), 180);
}

function normalizeCartEntry(key) {
  const old = cart[key];
  if (!old) return null;
  if (typeof old === 'number') {
    const parsed = parseCartKey(key);
    cart[key] = { qty: old, weight: parsed.weight };
  }
  if (!cart[key] || typeof cart[key] !== 'object' || Array.isArray(cart[key])) {
    delete cart[key];
    return null;
  }
  const qty = Number(cart[key].qty);
  cart[key].qty = Number.isFinite(qty) && qty > 0 ? Math.min(999, Math.floor(qty)) : 1;
  const parsed = parseCartKey(key);
  const p = productById(parsed.id);
  const amount = normalizeProductAmount(p, cart[key].amount ?? cart[key].weight ?? parsed.weight);
  cart[key].weight = amount;
  cart[key].amount = cart[key].weight;
  return cart[key];
}

function updateCount() {
  const count = Object.keys(cart).reduce((sum, id) => {
    const item = normalizeCartEntry(id);
    return sum + (item ? Number(item.qty) : 0);
  }, 0);
  const badge = $('#cartCount');
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.setAttribute('aria-label', `${text('cart')}: ${count}`);
  save();
}

function setAppModeClass() {
  const app = $('.app');
  app.classList.toggle('catalog-mode', mode === 'catalog');
  app.classList.toggle('cart-mode', mode === 'cart');
  app.classList.toggle('detail-mode', mode === 'detail');
}

function filteredProducts() {
  const q = ($('#search')?.value || '').trim().toLowerCase();
  let arr = products.filter(p => {
    const matchCategory = activeCat === 'все' || p.tag === activeCat;
    const matchCountry = !countryFilter || p.country === countryFilter;
    const matchSearch = !q || p._searchText.includes(q);
    return p.visible !== false && matchCountry && matchCategory && matchSearch;
  }).sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
  if (mode === 'fav') arr = arr.filter(p => fav.includes(p.id));
  return arr;
}

function renderProductCards(arr) {
  productObserver?.disconnect();
  productObserver = null;
  if (productsLoadState === 'loading') {
    $('#products').innerHTML = `<div class="loading-status" role="status">${escapeHtml(text('loadingProducts'))}</div>` + Array.from({ length: 6 }, () => `
      <article class="card skeleton-card" aria-hidden="true">
        <div class="skeleton-block skeleton-picture"></div>
        <div class="body"><i></i><i></i><i></i><span></span></div>
      </article>
    `).join('');
    return;
  }
  if (productsLoadState === 'error' && !products.length) {
    $('#products').innerHTML = `<div class="empty" role="alert">${escapeHtml(text('loadProductsError'))}<br><button type="button" data-retry-products>${escapeHtml(text('retry'))}</button></div>`;
    return;
  }
  const query = ($('#search')?.value || '').trim().toLowerCase();
  const nextWindowKey = [mode, activeCat, countryFilter, query, currentLang, productsLoadState].join('|');
  if (productWindowKey !== nextWindowKey) {
    productWindowKey = nextWindowKey;
    visibleProductLimit = CARD_BATCH_SIZE;
  }
  const visibleProducts = arr.slice(0, visibleProductLimit);
  const cards = visibleProducts.map((p, index) => `
    <article class="card" data-open-product="${Number(p.id)}" tabindex="0" aria-label="${escapeHtml(`${text('openProduct')}: ${localized(p.name)}`)}">
      <button class="fav ${fav.includes(Number(p.id)) ? 'on' : ''}" data-fav="${Number(p.id)}" type="button" aria-label="${escapeHtml(favoriteLabel(p.id))}" aria-pressed="${fav.includes(Number(p.id))}">${icon('heart')}</button>
      <div class="pic ${safeImageUrl(p.img) ? '' : 'empty-pic'}">${productImage(p, index < 2)}</div>
      <div class="body">
        <h3 class="name">${escapeHtml(localized(p.name))}</h3>
        <div class="cat">${escapeHtml(text('amountFrom'))} ${escapeHtml(amountLabel(p, minProductAmount(p)))}</div>
        <div class="price">${moneyPerUnit(p)}</div>
        <button class="add" data-cart="${Number(p.id)}" type="button" aria-label="${escapeHtml(`${text('add')}: ${localized(p.name)}`)}">${icon('cart')}<span>${escapeHtml(text('add'))}</span></button>
      </div>
    </article>
  `).join('');
  const hasMore = visibleProducts.length < arr.length;
  const pagination = hasMore
    ? ('IntersectionObserver' in window
      ? `<div class="product-sentinel" data-product-sentinel aria-hidden="true" style="height:1px;grid-column:1/-1"></div>`
      : `<button class="load-more" data-load-more-products type="button">${escapeHtml(text('loadMore'))}</button>`)
    : '';
  $('#products').innerHTML = arr.length ? cards + pagination : `<div class="empty">${escapeHtml(text('emptyProducts'))}</div>`;
  animateCards();
  const sentinel = document.querySelector('[data-product-sentinel]');
  if (sentinel) {
    const observedWindowKey = nextWindowKey;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (productObserver === observer) productObserver = null;
      if (!['new', 'fav'].includes(mode) || productWindowKey !== observedWindowKey) return;
      visibleProductLimit += CARD_BATCH_SIZE;
      renderProductCards(filteredProducts());
    }, { rootMargin: '600px 0px' });
    productObserver = observer;
    observer.observe(sentinel);
  }
}

function renderCatalog() {
  $('#pageTitle').textContent = text('catalog');
  setShowAll('none');
  $('#products').className = 'catalog-list';
  if (!catalogCountry) {
    $('#products').innerHTML = ['Европа','Китай','Россия'].map(country => `
      <button class="catalog-item country-item" data-catalog-country="${escapeHtml(country)}" type="button"><span><b aria-hidden="true">${country === 'Европа' ? '🇪🇺' : country === 'Китай' ? '🇨🇳' : '🇷🇺'}</b>${escapeHtml(countryLabel(country))}</span><span class="arrow" aria-hidden="true">›</span></button>
    `).join('');
    animateCatalog();
    return;
  }
  const tags = [...new Set(products.filter(p => p.visible !== false && p.country === catalogCountry).map(p => p.tag).filter(Boolean))];
  const labels = translations[currentLang].cats;
  $('#products').innerHTML = `<button class="catalog-back" data-catalog-back type="button">‹ ${escapeHtml(text('allCountries'))}</button><div class="catalog-country-title">${escapeHtml(countryLabel(catalogCountry))}</div>` + tags.map(c => `
    <button class="catalog-item" data-catalog-cat="${escapeHtml(c)}" type="button">
      <span>${escapeHtml(labels[c] || c)}</span>
      <span class="arrow" aria-hidden="true">›</span>
    </button>
  `).join('');
  animateCatalog();
}

function renderDetail() {
  const p = productById(selectedProductId);
  if (!p) { mode = 'new'; renderProducts(); return; }
  const currentWeight = clampProductWeight(p, selectedWeight);
  const weightOptions = getWeightOptions(p);
  const itemTotal = productTotal(p, currentWeight);
  const description = localized(p.desc).trim() || text('detailsManager');
  const category = localized(p.cat).trim();
  $('#pageTitle').textContent = '';
  setShowAll('none');
  $('#products').className = 'product-detail';
  $('#products').innerHTML = `
    <div class="detail-top">
      <button class="detail-back" type="button" data-back-detail>‹ ${escapeHtml(text('back'))}</button>
      <button class="detail-heart ${fav.includes(Number(p.id)) ? 'on' : ''}" data-fav="${Number(p.id)}" type="button" aria-label="${escapeHtml(favoriteLabel(p.id))}" aria-pressed="${fav.includes(Number(p.id))}">${icon('heart')}</button>
    </div>
    <div class="detail-image ${safeImageUrl(p.img) ? '' : 'empty-pic'}">${productImage(p, true)}</div>
    <div class="detail-body">
      <h1>${escapeHtml(localized(p.name))}</h1>
      ${category ? `<div class="detail-cat">${escapeHtml(category)}</div>` : ''}
      <p>${escapeHtml(description)}</p>
      <div class="detail-price">${moneyPerUnit(p)}</div>
      <div class="weight-title">${escapeHtml(text('amount'))}</div>
      <div class="weight-options">
        ${weightOptions.map(w => `
          <button class="weight-option ${currentWeight === w ? 'active' : ''}" data-weight="${w}" type="button">${escapeHtml(amountLabel(p, w))}</button>
        `).join('')}
      </div>
      <div class="weight-custom">
        <div class="weight-min">
          <b>${escapeHtml(text('customWeight'))}: ${escapeHtml(amountLabel(p, minProductAmount(p)))}</b>
          <span id="amountHint">${escapeHtml(text('amountHint'))}</span>
        </div>
        <label class="weight-input-wrap" aria-label="${escapeHtml(text('amountInput'))}">
          <input id="customWeight" name="quantity" type="number" min="${minProductAmount(p)}" step="${amountStep(p)}" inputmode="${normalizePriceUnit(p) === 'кг' ? 'decimal' : 'numeric'}" enterkeyhint="done" aria-describedby="amountHint" value="${currentWeight}" placeholder="${escapeHtml(amountLabel(p, minProductAmount(p)))}" />
          <b>${escapeHtml(unitLabel(p))}</b>
        </label>
      </div>
      <div class="detail-total" aria-live="polite"><span>${escapeHtml(text('itemTotal'))}:</span><b>${money(itemTotal)}</b></div>
      <button class="detail-add" data-cart="${Number(p.id)}" data-detail-cart="1" type="button" aria-label="${escapeHtml(`${text('add')}: ${localized(p.name)}`)}">${icon('cart')}<span>${escapeHtml(text('add'))}</span></button>
      <button class="ask-btn" type="button">${escapeHtml(text('ask'))}</button>
    </div>
  `;
  animateDetail();
}


function getCartEntries() {
  return Object.keys(cart).map(key => [key, normalizeCartEntry(key)]).filter(([, item]) => item);
}

function buildOrderPayload(requestId = createRequestId()) {
  const entries = getCartEntries();
  const items = entries.map(([key, item]) => {
    const parsed = parseCartKey(key);
    const p = productById(parsed.id);
    if (!p || p.visible === false) return null;
    const amount = normalizeProductAmount(p, item.amount ?? item.weight ?? parsed.weight);
    const qty = Number(item.qty || 1);
    return {
      id: parsed.id,
      amount,
      weight: amount,
      qty
    };
  }).filter(Boolean);
  return {
    requestId,
    initData: tg?.initData || '',
    items
  };
}

let modalReturnFocus = null;
let bodyOverflowBeforeModal = '';

function closeOrderSuccess() {
  document.querySelector('.order-modal')?.remove();
  document.body.style.overflow = bodyOverflowBeforeModal;
  modalReturnFocus?.focus?.({ preventScroll: true });
  modalReturnFocus = null;
}

function showOrderSuccess() {
  closeOrderSuccess();
  modalReturnFocus = document.querySelector('[data-tab="cart"]')
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  bodyOverflowBeforeModal = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const modal = document.createElement('div');
  modal.className = 'order-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'orderSuccessTitle');
  modal.setAttribute('aria-describedby', 'orderSuccessText');
  modal.innerHTML = `
    <div class="order-modal-box">
      <div class="order-modal-icon" aria-hidden="true">✓</div>
      <h3 id="orderSuccessTitle">${escapeHtml(text('orderSuccessTitle'))}</h3>
      <p id="orderSuccessText">${escapeHtml(text('orderSuccessText')).replace(/\n/g, '<br>')}</p>
      <button type="button" data-close-order-success>${escapeHtml(text('orderSuccessOk'))}</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('button')?.focus();
  animateSuccessModal(modal);
  tg?.HapticFeedback?.notificationOccurred?.('success');
}

let checkoutInFlight = false;
async function checkoutOrder() {
  if (checkoutInFlight) return;
  const requestId = readStoredString('pendingOrderRequestId') || createRequestId();
  writeStoredString('pendingOrderRequestId', requestId);
  const payload = buildOrderPayload(requestId);
  if (!payload.items.length) {
    removeStoredValue('pendingOrderRequestId');
    return;
  }
  checkoutInFlight = true;
  const btn = document.querySelector('[data-checkout]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = text('sending');
  }
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);
  let responseStatus = 0;
  try {
    const response = await fetch(apiUrl('order'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    responseStatus = response.status;
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.error || 'order_failed');
    cart = {};
    removeStoredValue('pendingOrderRequestId');
    save();
    updateCount();
    renderProducts();
    showOrderSuccess();
  } catch (error) {
    console.error('Order delivery failed', error);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    const message = !navigator.onLine
      ? text('offline')
      : error?.name === 'AbortError'
        ? text('orderTimeoutError')
        : [401, 403].includes(responseStatus)
          ? text('orderSessionError')
          : responseStatus === 429
            ? text('orderRateError')
            : [400, 409, 422].includes(responseStatus)
              ? text('orderValidationError')
              : text('orderError');
    showToast(message, 4600, true);
    renderProducts();
  } finally {
    window.clearTimeout(timeoutId);
    checkoutInFlight = false;
  }
}

function renderCartPage() {
  $('#pageTitle').textContent = text('cart');
  setShowAll('none');
  $('#products').className = 'cart-page';

  const entries = getCartEntries();
  const rows = entries.map(([key, item]) => {
    const parsed = parseCartKey(key);
    const p = productById(parsed.id);
    if (!p) return '';
    const amount = normalizeProductAmount(p, item.amount ?? item.weight ?? parsed.weight);
    const rowTotal = productTotal(p, amount) * Number(item.qty);
    const description = localized(p.desc).trim();
    return `
      <div class="cart-row">
        <div class="cart-img ${safeImageUrl(p.img) ? '' : 'empty-pic'}">${productImage(p)}</div>
        <div class="cart-info">
          <h4>${escapeHtml(localized(p.name))}</h4>
          ${description ? `<p>${escapeHtml(description)}</p>` : ''}
          <div class="cart-meta">${escapeHtml(text('amount'))}: ${escapeHtml(amountLabel(p, amount))} · ${moneyPerUnit(p)}</div>
          <div class="cart-price">${money(rowTotal)}</div>
          <div class="qty" aria-label="${escapeHtml(text('amount'))}">
            <button data-qty-minus="${escapeHtml(key)}" type="button" aria-label="${escapeHtml(`${text('decreaseQty')}: ${localized(p.name)}`)}">−</button>
            <b>${Number(item.qty)}</b>
            <button data-qty-plus="${escapeHtml(key)}" type="button" aria-label="${escapeHtml(`${text('increaseQty')}: ${localized(p.name)}`)}">+</button>
          </div>
        </div>
        <button class="remove" data-remove="${escapeHtml(key)}" type="button" aria-label="${escapeHtml(`${text('removeItem')}: ${localized(p.name)}`)}"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
      </div>
    `;
  }).join('');

  const total = entries.reduce((s, [key, item]) => {
    const parsed = parseCartKey(key);
    const p = productById(parsed.id);
    const amount = normalizeProductAmount(p, item.amount ?? item.weight ?? parsed.weight);
    return s + (p ? productTotal(p, amount) * Number(item.qty) : 0);
  }, 0);

  const hasItems = Boolean(rows);
  $('#products').innerHTML = (rows || `<div class="empty">${escapeHtml(text('emptyCart'))}</div>`) + `
    <div class="total"><span>${escapeHtml(text('total'))}</span><b>${money(total)}</b></div>
    <div class="cart-note">
      <b>${escapeHtml(text('vatNote'))}</b>
      <span>${escapeHtml(text('orderNote'))}</span>
    </div>
    <button class="checkout cart-checkout" data-checkout type="button" ${hasItems ? '' : 'disabled'}>${escapeHtml(text('checkout'))}</button>
  `;
  animateCart();
}

function renderProducts() {
  productObserver?.disconnect();
  productObserver = null;
  setAppModeClass();
  updateCount();

  if (mode === 'catalog') return renderCatalog();
  if (mode === 'cart') return renderCartPage();
  if (mode === 'detail') return renderDetail();

  $('#products').className = 'grid';
  if (mode === 'fav') {
    $('#pageTitle').textContent = text('fav');
    setShowAll('none');
  } else if (activeCat !== 'все') {
    $('#pageTitle').textContent = translations[currentLang].cats[activeCat] || text('new');
    setShowAll('', text('backAll'));
  } else {
    $('#pageTitle').textContent = text('allProducts');
    setShowAll('', text('showAll'));
  }
  renderProductCards(filteredProducts());
}

function setActiveNav(tab) {
  document.querySelectorAll('.nav').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

function setCountryFilter(country = '') {
  countryFilter = ['Европа', 'Китай', 'Россия'].includes(country) ? country : '';
  document.querySelectorAll('[data-country-filter]').forEach(button => {
    const selected = button.dataset.countryFilter === countryFilter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function addCart(id, weight = null) {
  const p = productById(id);
  if (!p) return;
  const selected = normalizeProductAmount(p, weight || (mode === 'detail' ? selectedWeight : minProductAmount(p)));
  const key = cartKey(id, selected);
  const old = normalizeCartEntry(key);
  if (old) {
    old.qty += 1;
    old.weight = selected;
    old.amount = selected;
  } else {
    cart[key] = { qty: 1, weight: selected, amount: selected };
  }
  removeStoredValue('pendingOrderRequestId');
  save();
  updateCount();
  pulseCart();
  showToast(text('inCart'));
  tg?.HapticFeedback?.impactOccurred?.('light');
}

function toggleFav(id) {
  fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id];
  save();
  if (mode === 'fav') {
    renderProducts();
    return;
  }
  const selected = fav.includes(id);
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(button => {
    button.classList.toggle('on', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', favoriteLabel(id));
  });
}

function changeQty(id, delta) {
  const item = normalizeCartEntry(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) delete cart[id];
  removeStoredValue('pendingOrderRequestId');
  save();
  renderProducts();
}

function removeCart(id) {
  delete cart[id];
  removeStoredValue('pendingOrderRequestId');
  save();
  renderProducts();
}

function openProduct(id) {
  previousMode = mode === 'detail' ? previousMode : mode;
  previousScrollY = window.scrollY;
  selectedProductId = Number(id);
  const p = productById(id);
  selectedWeight = minProductWeight(p);
  writeStoredString('selectedWeight', selectedWeight);
  mode = 'detail';
  setActiveNav('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderProducts();
}

function applyLanguage() {
  writeStoredString('lang', currentLang);
  document.documentElement.lang = currentLang;
  document.title = text('appTitle');
  $('#langBtn').textContent = text('lang');
  $('#langBtn').setAttribute('aria-label', text('switchLanguage'));
  $('#search').placeholder = text('search');
  $('#search').setAttribute('aria-label', text('searchLabel'));
  $('#filterBtn')?.setAttribute('aria-label', text('filtersLabel'));
  $('#countryFilters')?.setAttribute('aria-label', text('countriesLabel'));
  document.querySelector('.bottom-nav')?.setAttribute('aria-label', text('mainNavLabel'));
  document.querySelectorAll('[data-country-filter]').forEach(button => {
    const country = button.dataset.countryFilter;
    if (!country) {
      button.textContent = text('allCountryChip');
      return;
    }
    const flag = button.querySelector('.flag');
    if (flag) {
      flag.setAttribute('aria-hidden', 'true');
      button.replaceChildren(flag, document.createTextNode(` ${countryLabel(country)}`));
    } else {
      button.textContent = countryLabel(country);
    }
  });
  setShowAll('none', text('showAll'));
  document.querySelector('[data-tab="new"] span').textContent = text('new');
  document.querySelector('[data-tab="catalog"] span').textContent = text('catalog');
  document.querySelector('[data-tab="fav"] span').textContent = text('fav');
  document.querySelector('[data-tab="cart"] span').textContent = text('cart');
  renderProducts();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('input, textarea')) dismissKeyboard();

  if (e.target.closest('#langBtn')) {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    applyLanguage();
    return;
  }

  const backDetail = e.target.closest('[data-back-detail]');
  if (backDetail) {
    mode = previousMode || 'new';
    setActiveNav(mode === 'new' || mode === 'fav' || mode === 'catalog' || mode === 'cart' ? mode : 'new');
    renderProducts();
    window.requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: 'auto' }));
    return;
  }

  const catalogCat = e.target.closest('[data-catalog-cat]');
  if (catalogCat) {
    activeCat = catalogCat.dataset.catalogCat;
    setCountryFilter(catalogCountry);
    catalogCountry = '';
    mode = 'new';
    setActiveNav('new');
    renderProducts();
    return;
  }
  const catalogCountryButton = e.target.closest('[data-catalog-country]');
  if (catalogCountryButton) {
    catalogCountry = ['Европа', 'Китай', 'Россия'].includes(catalogCountryButton.dataset.catalogCountry)
      ? catalogCountryButton.dataset.catalogCountry
      : '';
    renderCatalog();
    return;
  }
  if (e.target.closest('[data-catalog-back]')) { catalogCountry = ''; renderCatalog(); return; }

  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    toggleFav(Number(favBtn.dataset.fav));
    return;
  }

  const weightBtn = e.target.closest('[data-weight]');
  if (weightBtn) {
    const p = productById(selectedProductId);
    selectedWeight = clampProductWeight(p, weightBtn.dataset.weight);
    writeStoredString('selectedWeight', selectedWeight);
    renderProducts();
    return;
  }

  const cartBtn = e.target.closest('[data-cart]');
  if (cartBtn) {
    addCart(Number(cartBtn.dataset.cart), cartBtn.dataset.detailCart ? selectedWeight : null);
    return;
  }

  const checkoutBtn = e.target.closest('[data-checkout]');
  if (checkoutBtn) {
    checkoutOrder();
    return;
  }

  const closeSuccessButton = e.target.closest('[data-close-order-success]');
  if (closeSuccessButton) {
    closeOrderSuccess();
    return;
  }

  if (e.target.classList?.contains('order-modal')) {
    closeOrderSuccess();
    return;
  }

  if (e.target.closest('[data-retry-products]')) {
    loadProducts().then(() => applyLanguage());
    return;
  }

  if (e.target.closest('[data-load-more-products]')) {
    visibleProductLimit += CARD_BATCH_SIZE;
    renderProductCards(filteredProducts());
    return;
  }

  const open = e.target.closest('[data-open-product]');
  if (open) {
    openProduct(Number(open.dataset.openProduct));
    return;
  }

  const nav = e.target.closest('.nav');
  if (nav) {
    mode = nav.dataset.tab;
    if (mode === 'new') {
      activeCat = 'все';
      catalogCountry = '';
      setCountryFilter('');
    } else if (mode === 'catalog') {
      catalogCountry = '';
      setCountryFilter('');
    } else if (mode === 'fav') {
      setCountryFilter('');
    }
    setActiveNav(mode);
    renderProducts();
    return;
  }

  const minus = e.target.closest('[data-qty-minus]');
  if (minus) return changeQty(minus.dataset.qtyMinus, -1);

  const plus = e.target.closest('[data-qty-plus]');
  if (plus) return changeQty(plus.dataset.qtyPlus, 1);

  const remove = e.target.closest('[data-remove]');
  if (remove) removeCart(remove.dataset.remove);
});

let searchTimer;
function applySearch() {
  window.clearTimeout(searchTimer);
  if (mode === 'cart' || mode === 'catalog' || mode === 'detail') {
    if (mode === 'catalog' && catalogCountry) setCountryFilter(catalogCountry);
    mode = 'new';
    catalogCountry = '';
  }
  setActiveNav(mode);
  renderProducts();
}

$('#search').addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(applySearch, 120);
});

document.addEventListener('input', (e) => {
  const custom = e.target.closest('#customWeight');
  if (!custom) return;
  const p = productById(selectedProductId);
  if (!p) return;

  const raw = String(custom.value).replace(',', '.').trim();
  if (raw === '') {
    // Важно: не возвращаем сразу 10 кг, чтобы можно было стереть число и набрать свое значение.
    document.querySelectorAll('[data-weight]').forEach(btn => btn.classList.remove('active'));
    return;
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return;

  selectedWeight = n >= minProductWeight(p) ? Math.round(n * 100) / 100 : minProductWeight(p);
  writeStoredString('selectedWeight', selectedWeight);
  const total = p ? productTotal(p, selectedWeight) : 0;
  document.querySelector('.detail-total b').textContent = money(total);
  document.querySelectorAll('[data-weight]').forEach(btn => {
    btn.classList.toggle('active', cleanWeight(btn.dataset.weight) === selectedWeight);
  });
});

document.addEventListener('change', (e) => {
  const custom = e.target.closest('#customWeight');
  if (!custom) return;
  const p = productById(selectedProductId);
  if (!p) return;
  selectedWeight = clampProductWeight(p, custom.value);
  custom.value = selectedWeight;
  writeStoredString('selectedWeight', selectedWeight);
  document.querySelector('.detail-total b').textContent = money(productTotal(p, selectedWeight));
});

document.addEventListener('keydown', event => {
  if (event.target?.id === 'search' && event.key === 'Enter') {
    event.preventDefault();
    applySearch();
    dismissKeyboard();
    return;
  }
  if (event.target?.id === 'customWeight' && event.key === 'Enter') {
    event.preventDefault();
    dismissKeyboard();
    return;
  }
  const card = event.target instanceof Element ? event.target.closest('[data-open-product]') : null;
  if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openProduct(Number(card.dataset.openProduct));
    return;
  }
  if (event.key !== 'Escape') return;
  const modal = document.querySelector('.order-modal');
  if (modal) {
    closeOrderSuccess();
    return;
  }
  if (mode === 'detail') {
    mode = previousMode || 'new';
    setActiveNav(mode);
    renderProducts();
    window.requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: 'auto' }));
  }
});

showAllBtn()?.addEventListener('click', () => {
  if (activeCat !== 'все' && mode === 'new') {
    activeCat = 'все';
    mode = 'new';
    setActiveNav('new');
    renderProducts();
    return;
  }
  mode = 'catalog';
  catalogCountry = '';
  setCountryFilter('');
  setActiveNav('catalog');
  renderProducts();
});

$('#filterBtn')?.addEventListener('click', () => {
  const chips = document.querySelector('.country-chips');
  if (!chips) return;
  chips.classList.add('highlighted');
  (chips.querySelector('.active') || chips.firstElementChild)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  window.setTimeout(() => chips.classList.remove('highlighted'), 700);
});

async function loadProducts() {
  productsLoadState = 'loading';
  renderProducts();
  try {
    const productsUrl = apiUrl('products.json');
    const response = await fetch(productsUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const loaded = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(loaded)) throw new Error('Invalid products response');
    products = loaded
      .filter(product => product && Number.isSafeInteger(Number(product.id)))
      .map(product => {
        const normalized = { ...product, id: Number(product.id) };
        normalized._searchText = productSearchText(normalized);
        return normalized;
      });
    const validProductIds = new Set(products.filter(product => product.visible !== false).map(product => product.id));
    let cartPruned = false;
    Object.keys(cart).forEach(key => {
      if (!validProductIds.has(parseCartKey(key).id)) {
        delete cart[key];
        cartPruned = true;
      }
    });
    if (cartPruned) removeStoredValue('pendingOrderRequestId');
    save();
    productsLoadState = 'ready';
  } catch (error) {
    products = [];
    productsLoadState = 'error';
    console.warn('Could not load products.json', error);
  }
}

window.visualViewport?.addEventListener('resize', syncPhoneViewport, { passive: true });
window.visualViewport?.addEventListener('scroll', syncPhoneViewport, { passive: true });
window.addEventListener('resize', syncPhoneViewport, { passive: true });
document.addEventListener('focusin', () => {
  syncPhoneViewport();
  keepFocusedControlVisible();
});
document.addEventListener('focusout', () => window.setTimeout(syncPhoneViewport, 80));
window.addEventListener('offline', () => showToast(text('offline'), 3200, true));
window.addEventListener('online', () => showToast(text('online'), 2200));
window.addEventListener('pagehide', () => productObserver?.disconnect(), { once: true });
tg?.onEvent?.('viewportChanged', syncPhoneViewport);

initSnowCanvas();
initMotion();
syncPhoneViewport();
setActiveNav('new');
applyLanguage();
loadProducts().finally(() => applyLanguage());


document.addEventListener('click', (e) => {
  const countryChip = e.target.closest('[data-country-filter]');
  if (countryChip) {
    setCountryFilter(countryChip.dataset.countryFilter);
    catalogCountry = '';
    activeCat = 'все';
    mode = 'new';
    setActiveNav('new');
    renderProducts();
    return;
  }
  const btn = e.target.closest('.ask-btn');
  if (!btn) return;
  e.preventDefault();
  if (tg?.initData && tg.showPopup) {
    tg.showPopup({
      title: text('managerPopupTitle'),
      message: text('managerPopupText'),
      buttons: [{ id: 'chat', type: 'default', text: text('openChat') }, { type: 'cancel' }]
    }, id => { if (id === 'chat') tg.close(); });
  } else {
    window.location.href = 'tel:+79957962036';
  }
});
