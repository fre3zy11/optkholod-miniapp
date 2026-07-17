// @ts-nocheck -- legacy storefront is being migrated incrementally to typed modules.
import './style.scss';
import { initSnowCanvas } from './ambient';
import { animateCards, animateCart, animateCatalog, animateDetail, animateSuccessModal, initMotion, pulseCart } from './motion';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  // Не включаем fullscreen: окно Mini App масштабируется вместе с окном Telegram.
}

let products = [
  {
    id: 1,
    name: { ru: 'Картофель фри Global Fries 10 мм 10 кг', en: 'Global Fries French Fries 10 mm, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофель фри ровной нарезки 10 мм. Формат 2,5 кг × 4 шт. Подходит для кафе, доставки, фудкортов и ресторанной кухни.',
      en: 'Straight-cut 10 mm frozen fries. Pack format: 2.5 kg × 4 pcs. Suitable for cafés, delivery, food courts and restaurants.'
    },
    pricePerKg: 155,
    packKg: 10,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 2,
    name: { ru: "Картофельные дольки BART'S GOURMET", en: "BART'S GOURMET Potato Wedges" },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные дольки BART’S GOURMET. Формат 2,5 кг × 4 шт. Универсальный гарнир для HoReCa и оптовых поставок.',
      en: 'BART’S GOURMET potato wedges. Pack format: 2.5 kg × 4 pcs. Universal side dish for HoReCa and wholesale.'
    },
    pricePerKg: 170,
    packKg: 10,
    img: 'assets/products/potato-wedges.webp',
    tag: 'картофель'
  },
  {
    id: 3,
    name: { ru: "Картофельные дольки со специями BART'S GOURMET", en: "BART'S GOURMET Spiced Potato Wedges" },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные дольки со специями BART’S GOURMET. Формат 2,5 кг × 4 шт. Готовое решение для насыщенного гарнира.',
      en: 'BART’S GOURMET spiced potato wedges. Pack format: 2.5 kg × 4 pcs. Ready solution for a flavorful side dish.'
    },
    pricePerKg: 205,
    packKg: 10,
    img: 'assets/products/potato-wedges.webp',
    tag: 'картофель'
  },
  {
    id: 4,
    name: { ru: 'Картофельные шарики Pomuni Frozen 10 кг', en: 'Pomuni Frozen Potato Balls, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные шарики Pomuni Frozen. Формат 1 кг × 10 шт. Удобный продукт для гарниров, закусок и детского меню.',
      en: 'Pomuni Frozen potato balls. Pack format: 1 kg × 10 pcs. Convenient for sides, snacks and kids menus.'
    },
    pricePerKg: 220,
    packKg: 10,
    img: 'assets/products/potato-balls.webp',
    tag: 'картофель'
  },
  {
    id: 5,
    name: { ru: 'Треугольные картофельные котлеты POMUNI 10 кг', en: 'POMUNI Triangle Potato Patties, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Треугольные картофельные котлеты POMUNI. Формат 2,5 кг × 4 шт. Быстро готовятся и хорошо держат форму.',
      en: 'POMUNI triangle potato patties. Pack format: 2.5 kg × 4 pcs. Quick to cook and hold their shape well.'
    },
    pricePerKg: 215,
    packKg: 10,
    img: 'assets/products/pomuni-triangles.jpg',
    tag: 'картофель'
  },
  {
    id: 6,
    name: { ru: 'Картофельные дольки без специй Global Fries', en: 'Global Fries Plain Potato Wedges' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные дольки без специй Global Fries. Формат 2,5 кг × 4 шт. Нейтральный вкус для любых блюд и соусов.',
      en: 'Global Fries plain potato wedges. Pack format: 2.5 kg × 4 pcs. Neutral taste for any dishes and sauces.'
    },
    pricePerKg: 160,
    packKg: 10,
    img: 'assets/products/potato-wedges.webp',
    tag: 'картофель'
  },
  {
    id: 7,
    name: { ru: 'Картофель фри соломка 10 мм Global Fries 10 кг', en: 'Global Fries Shoestring Fries 10 mm, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофель фри соломка 10 мм Global Fries. Формат 2,5 кг × 4 шт. Классический вариант для быстрого приготовления.',
      en: 'Global Fries 10 mm shoestring fries. Pack format: 2.5 kg × 4 pcs. Classic option for quick cooking.'
    },
    pricePerKg: 145,
    packKg: 10,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 8,
    name: { ru: 'Farm Frites фри соломка 10 мм 12,5 кг', en: 'Farm Frites French Fries 10 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'Картофель Farm Frites фри соломка 10 мм. Формат 2,5 кг × 5 шт. Стабильное качество для профессиональной кухни.',
      en: 'Farm Frites 10 mm fries. Pack format: 2.5 kg × 5 pcs. Stable quality for professional kitchens.'
    },
    pricePerKg: 178,
    packKg: 12.5,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 9,
    name: { ru: 'Farm Frites Crispy Coated 10 мм 12,5 кг', en: 'Farm Frites Crispy Coated 10 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'Картофель фри в панировке Crispy Coated 10 мм Farm Frites. Формат 2,5 кг × 5 шт. Хрустящая корочка после приготовления.',
      en: 'Farm Frites Crispy Coated 10 mm fries. Pack format: 2.5 kg × 5 pcs. Crispy coating after cooking.'
    },
    pricePerKg: 197,
    packKg: 12.5,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 10,
    name: { ru: 'Farm Frites BRAVI соломка 10 мм 12,5 кг', en: 'Farm Frites BRAVI 10 mm Fries, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'Картофель фри BRAVI Farm Frites соломка 10 мм. Формат 2,5 кг × 5 шт. Практичный вариант для регулярных закупок.',
      en: 'Farm Frites BRAVI 10 mm fries. Pack format: 2.5 kg × 5 pcs. Practical option for regular supplies.'
    },
    pricePerKg: 155,
    packKg: 12.5,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 11,
    name: { ru: 'Farm Frites фри волнистая 12 мм 12,5 кг', en: 'Farm Frites Crinkle Fries 12 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'Волнистый картофель фри Farm Frites 12 мм. Формат 2,5 кг × 5 шт. Хорошо подходит для гарниров и снеков.',
      en: 'Farm Frites 12 mm crinkle fries. Pack format: 2.5 kg × 5 pcs. Great for sides and snacks.'
    },
    pricePerKg: 210,
    packKg: 12.5,
    img: 'assets/products/fries-12mm.webp',
    tag: 'картофель'
  },
  {
    id: 12,
    name: { ru: 'Farm Frites фри 7 мм 12,5 кг', en: 'Farm Frites Fries 7 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'Тонкий картофель фри Farm Frites 7 мм. Формат 2,5 кг × 5 шт. Быстро готовится и подходит для меню fast food.',
      en: 'Farm Frites thin 7 mm fries. Pack format: 2.5 kg × 5 pcs. Quick to cook and suitable for fast-food menus.'
    },
    pricePerKg: 210,
    packKg: 12.5,
    img: 'assets/products/fries-7mm.webp',
    tag: 'картофель'
  },
  {
    id: 13,
    name: { ru: 'FastFry 12 мм волнистая Farm Frites 12,5 кг', en: 'Farm Frites FastFry Crinkle 12 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'FastFry 12 мм волнистая Farm Frites. Формат 2,5 кг × 5 шт. Быстрое приготовление и выраженная форма нарезки.',
      en: 'Farm Frites FastFry 12 mm crinkle fries. Pack format: 2.5 kg × 5 pcs. Fast cooking with a distinct cut.'
    },
    pricePerKg: 230,
    packKg: 12.5,
    img: 'assets/products/fries-12mm.webp',
    tag: 'картофель'
  },
  {
    id: 14,
    name: { ru: 'FastFry 10 мм Farm Frites 12,5 кг', en: 'Farm Frites FastFry 10 mm, 12.5 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 12,5 кг', en: 'Frozen potato · 12.5 kg pack' },
    desc: {
      ru: 'FastFry 10 мм Farm Frites. Формат 2,5 кг × 5 шт. Удобен для кафе и точек с высокой скоростью отдачи.',
      en: 'Farm Frites FastFry 10 mm. Pack format: 2.5 kg × 5 pcs. Convenient for cafés and high-speed service points.'
    },
    pricePerKg: 225,
    packKg: 12.5,
    img: 'assets/products/fries-10mm.webp',
    tag: 'картофель'
  },
  {
    id: 15,
    name: { ru: 'Farm Frites дольки в кожуре 10 кг', en: 'Farm Frites Skin-on Potato Wedges, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные дольки в кожуре Farm Frites. Формат 2,5 кг × 4 шт. Натуральный внешний вид и насыщенный картофельный вкус.',
      en: 'Farm Frites skin-on potato wedges. Pack format: 2.5 kg × 4 pcs. Natural look and rich potato flavor.'
    },
    pricePerKg: 183,
    packKg: 10,
    img: 'assets/products/potato-wedges.webp',
    tag: 'картофель'
  },
  {
    id: 16,
    name: { ru: 'Farm Frites дольки в кожуре со специями 10 кг', en: 'Farm Frites Spiced Skin-on Wedges, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные дольки в кожуре со специями Farm Frites. Упаковка 10 кг. Готовый пряный гарнир для HoReCa.',
      en: 'Farm Frites spiced skin-on potato wedges. 10 kg pack. Ready spiced side dish for HoReCa.'
    },
    pricePerKg: 225,
    packKg: 10,
    img: 'assets/products/potato-wedges.webp',
    tag: 'картофель'
  },
  {
    id: 17,
    name: { ru: 'Farm Frites картофельные шарики 10 кг', en: 'Farm Frites Potato Balls, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельные шарики Farm Frites. Формат 2,5 кг × 4 шт. Подходят для закусок, гарниров и детского меню.',
      en: 'Farm Frites potato balls. Pack format: 2.5 kg × 4 pcs. Suitable for snacks, sides and kids menus.'
    },
    pricePerKg: 280,
    packKg: 10,
    img: 'assets/products/potato-balls.webp',
    tag: 'картофель'
  },
  {
    id: 18,
    name: { ru: 'Farm Frites картофельное пюре 10 кг', en: 'Farm Frites Mashed Potato, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Картофельное пюре Farm Frites 10 кг. Формат 2,5 кг × 4 шт. Удобная основа для гарниров и горячих блюд.',
      en: 'Farm Frites mashed potato, 10 kg. Pack format: 2.5 kg × 4 pcs. Convenient base for sides and hot dishes.'
    },
    pricePerKg: 250,
    packKg: 10,
    img: 'assets/products/potato-specialties.webp',
    tag: 'картофель'
  },
  {
    id: 19,
    name: { ru: 'Farm Frites овальные картофельные котлетки 10 кг', en: 'Farm Frites Oval Potato Patties, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Овальные картофельные котлетки Farm Frites. Упаковка 10 кг. Ровный формат для порционной подачи.',
      en: 'Farm Frites oval potato patties. 10 kg pack. Even format for portioned serving.'
    },
    pricePerKg: 320,
    packKg: 10,
    img: 'assets/products/potato-specialties.webp',
    tag: 'картофель'
  },
  {
    id: 20,
    name: { ru: 'Farm Frites треугольные картофельные котлетки 10 кг', en: 'Farm Frites Triangle Potato Patties, 10 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 10 кг', en: 'Frozen potato · 10 kg pack' },
    desc: {
      ru: 'Треугольные картофельные котлетки Farm Frites. Формат 2,5 кг × 4 шт. Подходят для гарниров и готовых блюд.',
      en: 'Farm Frites triangle potato patties. Pack format: 2.5 kg × 4 pcs. Suitable for sides and ready meals.'
    },
    pricePerKg: 285,
    packKg: 10,
    img: 'assets/products/pomuni-triangles.jpg',
    tag: 'картофель'
  },
  {
    id: 21,
    name: { ru: 'Farm Frites картофельные оладьи 9 кг', en: 'Farm Frites Potato Pancakes, 9 kg' },
    cat: { ru: 'Замороженный картофель · упаковка 9 кг', en: 'Frozen potato · 9 kg pack' },
    desc: {
      ru: 'Картофельные оладьи Farm Frites. Формат 1,5 кг × 6 шт. Удобный продукт для завтраков, гарниров и кафе.',
      en: 'Farm Frites potato pancakes. Pack format: 1.5 kg × 6 pcs. Convenient for breakfasts, sides and cafés.'
    },
    pricePerKg: 240,
    packKg: 9,
    img: 'assets/products/potato-specialties.webp',
    tag: 'картофель'
  },
  {
    id: 22,
    name: { ru: 'Луковые кольца Farm Frites 6 кг', en: 'Farm Frites Onion Rings, 6 kg' },
    cat: { ru: 'Замороженные снеки · упаковка 6 кг', en: 'Frozen snacks · 6 kg pack' },
    desc: {
      ru: 'Луковые кольца Farm Frites. Формат 1 кг × 6 шт. Хрустящая закуска для фудкортов, бургерных и кафе.',
      en: 'Farm Frites onion rings. Pack format: 1 kg × 6 pcs. Crispy snack for food courts, burger bars and cafés.'
    },
    pricePerKg: 360,
    packKg: 6,
    img: 'assets/products/onion-rings.webp',
    tag: 'картофель'
  }
];

const translations = {
  ru: {
    lang: 'RU', currency: 'RUB', search: 'Поиск товаров', showAll: 'Смотреть все ›', backAll: 'Все товары',
    new: 'Все товары', catalog: 'Каталог', fav: 'Избранное', cart: 'Корзина', add: 'В корзину',
    emptyProducts: 'Товары не найдены', emptyCart: 'Корзина пустая', total: 'Итого', back: 'Назад',
    priceKg: '₽/кг', vatShort: 'с ндс*', packWeight: 'Вес упаковки', customWeight: 'Минимум', ask: 'ⓘ Задать вопрос', itemTotal: 'Итого', kg: 'кг',
    inCart: 'Добавлено в корзину', qty: 'Кол-во', description: 'Описание', pricePerKg: 'Цена за кг', pack: 'Упаковка',
    checkout: 'Оформить заказ', orderNote: 'Минимальный заказ от палета. Самовывоз со склада в Москве.', vatNote: 'с НДС*', orderSuccessTitle: 'Спасибо за заказ!', orderSuccessText: 'С вами свяжется наш менеджер\nДля обсуждения деталей)', orderSuccessOk: 'Понятно', orderError: 'Не получилось отправить заказ. Попробуйте еще раз или напишите менеджеру.',
    cats: { все:'ВСЕ', картофель:'КАРТОФЕЛЬ И СНЕКИ' }
  },
  en: {
    lang: 'EN', currency: 'RUB', search: 'Search products', showAll: 'View all ›', backAll: 'All products',
    new: 'All products', catalog: 'Catalog', fav: 'Favorites', cart: 'Cart', add: 'Add to cart',
    emptyProducts: 'No products found', emptyCart: 'Cart is empty', total: 'Total', back: 'Back',
    priceKg: '₽/kg', vatShort: 'vat incl.*', packWeight: 'Pack weight', customWeight: 'Minimum', ask: 'ⓘ Ask a question', itemTotal: 'Total', kg: 'kg',
    inCart: 'Added to cart', qty: 'Qty', description: 'Description', pricePerKg: 'Price per kg', pack: 'Pack',
    checkout: 'Checkout', orderNote: 'Minimum order from one pallet. Pickup from warehouse in Moscow.', vatNote: 'VAT incl.*', orderSuccessTitle: 'Thank you for your order!', orderSuccessText: 'Our manager will contact you\nTo discuss the details)', orderSuccessOk: 'OK', orderError: 'Could not send the order. Please try again or message the manager.',
    cats: { все:'ALL', картофель:'POTATO & SNACKS' }
  }
};

const catalogCats = ['картофель'];
let catalogCountry = '';
let countryFilter = '';
let currentLang = localStorage.getItem('lang') || 'ru';
const CURRENCIES = {
  RUB: { code: 'RUB', symbol: '₽', rate: 1, locale: 'ru-RU' }
};
let currentCurrency = 'RUB';
const WEIGHT_OPTIONS = [10, 25, 50, 100];
const getWeightOptions = (p) => {
  const base = cleanWeight(p?.packKg || 10);
  return [...new Set([base, ...WEIGHT_OPTIONS.filter(w => w >= base)])];
};
const minProductWeight = (p) => cleanWeight(p?.packKg || 10);
const clampProductWeight = (p, value) => Math.max(minProductWeight(p), cleanWeight(value));
let selectedWeight = Number(localStorage.getItem('selectedWeight') || 10);
if (!Number.isFinite(selectedWeight) || selectedWeight <= 0) selectedWeight = 10;
let activeCat = 'все';
let mode = 'new';
let previousMode = 'new';
let selectedProductId = null;
let fav = JSON.parse(localStorage.getItem('fav') || '[]');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

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
const kgLabel = (kg) => `${String(kg).replace('.', ',')} ${text('kg')}`;
const currency = () => CURRENCIES.RUB;
const convertMoney = (rub) => Number(rub || 0);
const money = (rub) => {
  const cur = currency();
  const converted = convertMoney(rub);
  const isInteger = Math.abs(converted - Math.round(converted)) < 0.001;
  const value = converted.toLocaleString(cur.locale, {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${value} ${cur.symbol}`;
};
const moneyKg = (rub) => `${money(rub)}/${text('kg')} <span class="vat-inline">${text('vatShort')}</span>`;
const productTotal = (p, weight = p.packKg) => Number(p.pricePerKg || 0) * Number(weight || 0);
const cleanWeight = (value) => {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 10;
};
const cartKey = (id, weight) => `${id}|${cleanWeight(weight)}`;
const parseCartKey = (key) => {
  const [id, weight] = String(key).split('|');
  return { id: Number(id), weight: cleanWeight(weight || productById(id)?.packKg || 10) };
};
const productImage = (p) => p.img ? `<img src="${p.img}" alt="${p.name[currentLang]}" loading="lazy" decoding="async">` : `<div class="no-photo" aria-label="Нет фото"></div>`;
const icon = (name) => ({
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>',
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6"></path></svg>'
}[name] || '');

function save() {
  localStorage.setItem('fav', JSON.stringify(fav));
  localStorage.setItem('cart', JSON.stringify(cart));
}

function normalizeCartEntry(key) {
  const old = cart[key];
  if (!old) return null;
  if (typeof old === 'number') {
    const parsed = parseCartKey(key);
    cart[key] = { qty: old, weight: parsed.weight };
  }
  if (!cart[key].qty) cart[key].qty = 1;
  if (!cart[key].weight) cart[key].weight = parseCartKey(key).weight;
  return cart[key];
}

function updateCount() {
  const count = Object.keys(cart).reduce((sum, id) => {
    const item = normalizeCartEntry(id);
    return sum + (item ? Number(item.qty) : 0);
  }, 0);
  $('#cartCount').textContent = count;
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
    const haystack = [
      p.name.ru, p.name.en, p.cat.ru, p.cat.en, p.desc.ru, p.desc.en, p.tag,
      p.pricePerKg, p.packKg,
      translations.ru.cats[p.tag] || '', translations.en.cats[p.tag] || ''
    ].join(' ').toLowerCase();
    const matchCategory = activeCat === 'все' || p.tag === activeCat;
    const selectedCountry = countryFilter || catalogCountry;
    const matchCountry = !selectedCountry || p.country === selectedCountry;
    const matchSearch = !q || haystack.includes(q);
    return p.visible !== false && matchCountry && matchCategory && matchSearch;
  }).sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
  if (mode === 'fav') arr = arr.filter(p => fav.includes(p.id));
  return arr;
}

function renderProductCards(arr) {
  $('#products').innerHTML = arr.length ? arr.map(p => `
    <article class="card" data-open-product="${p.id}">
      <button class="fav ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">${icon('heart')}</button>
      <div class="pic ${p.img ? '' : 'empty-pic'}">${productImage(p)}</div>
      <div class="body">
        <h3 class="name">${p.name[currentLang]}</h3>
        <div class="cat">${text('pack')}: ${kgLabel(p.packKg)}</div>
        <div class="price">${moneyKg(p.pricePerKg)}</div>
        <button class="add" data-cart="${p.id}" type="button">${icon('cart')}<span>${text('add')}</span></button>
      </div>
    </article>
  `).join('') : `<div class="empty">${text('emptyProducts')}</div>`;
  animateCards();
}

function renderCatalog() {
  $('#pageTitle').textContent = text('catalog');
  setShowAll('none');
  $('#products').className = 'catalog-list';
  if (!catalogCountry) {
    $('#products').innerHTML = ['Европа','Китай','Россия'].map(country => `
      <button class="catalog-item country-item" data-catalog-country="${country}" type="button"><span><b>${country === 'Европа' ? '🇪🇺' : country === 'Китай' ? '🇨🇳' : '🇷🇺'}</b>${country}</span><span class="arrow">›</span></button>
    `).join('');
    animateCatalog();
    return;
  }
  const tags = [...new Set(products.filter(p => p.visible !== false && p.country === catalogCountry).map(p => p.tag).filter(Boolean))];
  const labels = {картофель:'Картофель и снеки',овощи:'Овощи',ягоды:'Ягоды',грибы:'Грибы',фрукты:'Фрукты',смеси:'Овощные смеси'};
  $('#products').innerHTML = `<button class="catalog-back" data-catalog-back type="button">‹ Все страны</button><div class="catalog-country-title">${catalogCountry}</div>` + tags.map(c => `
    <button class="catalog-item" data-catalog-cat="${c}" type="button">
      <span>${labels[c] || c}</span>
      <span class="arrow">›</span>
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
  $('#pageTitle').textContent = '';
  setShowAll('none');
  $('#products').className = 'product-detail';
  $('#products').innerHTML = `
    <div class="detail-top">
      <button class="detail-back" type="button" data-back-detail>‹ ${text('back')}</button>
      <button class="detail-heart ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">${icon('heart')}</button>
    </div>
    <div class="detail-image ${p.img ? '' : 'empty-pic'}">${productImage(p)}</div>
    <div class="detail-body">
      <h1>${p.name[currentLang]}</h1>
      <div class="detail-cat">${p.cat[currentLang]}</div>
      <p>${p.desc[currentLang]}</p>
      <div class="detail-price">${moneyKg(p.pricePerKg)}</div>
      <div class="weight-title">${text('packWeight')}</div>
      <div class="weight-options">
        ${weightOptions.map(w => `
          <button class="weight-option ${currentWeight === w ? 'active' : ''}" data-weight="${w}" type="button">${kgLabel(w)}</button>
        `).join('')}
      </div>
      <div class="weight-custom">
        <div class="weight-min">
          <b>${text('customWeight')}: ${kgLabel(p.packKg)}</b>
          <span>${currentLang === 'ru' ? 'Введите любое значение не меньше упаковки' : 'Enter any value not below pack weight'}</span>
        </div>
        <label class="weight-input-wrap" aria-label="${text('packWeight')}">
          <input id="customWeight" type="number" min="${p.packKg}" step="0.1" inputmode="decimal" value="${currentWeight}" placeholder="${kgLabel(p.packKg)}" />
          <b>${text('kg')}</b>
        </label>
      </div>
      <div class="detail-total"><span>${text('itemTotal')}:</span><b>${money(itemTotal)}</b></div>
      <button class="detail-add" data-cart="${p.id}" data-detail-cart="1" type="button">${icon('cart')}<span>${text('add')}</span></button>
      <button class="ask-btn" type="button">${text('ask')}</button>
    </div>
  `;
  animateDetail();
}


function getCartEntries() {
  return Object.keys(cart).map(key => [key, normalizeCartEntry(key)]).filter(([, item]) => item);
}

function buildOrderPayload() {
  const entries = getCartEntries();
  const items = entries.map(([key, item]) => {
    const parsed = parseCartKey(key);
    const p = productById(parsed.id);
    const weight = cleanWeight(item.weight || parsed.weight);
    const qty = Number(item.qty || 1);
    const rowTotal = p ? productTotal(p, weight) * qty : 0;
    return {
      id: parsed.id,
      name: p?.name?.ru || p?.name?.[currentLang] || `Товар #${parsed.id}`,
      pricePerKg: Number(p?.pricePerKg || 0),
      weight,
      qty,
      total: rowTotal
    };
  }).filter(item => item.id);
  return {
    initData: tg?.initData || '',
    lang: currentLang,
    currency: 'RUB',
    vatIncluded: true,
    note: text('orderNote'),
    items,
    total: items.reduce((sum, item) => sum + Number(item.total || 0), 0)
  };
}

function showOrderSuccess() {
  const old = document.querySelector('.order-modal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.className = 'order-modal';
  modal.innerHTML = `
    <div class="order-modal-box">
      <div class="order-modal-icon">✓</div>
      <h3>${text('orderSuccessTitle')}</h3>
      <p>${text('orderSuccessText').replace(/\n/g, '<br>')}</p>
      <button type="button" data-close-order-success>${text('orderSuccessOk')}</button>
    </div>
  `;
  document.body.appendChild(modal);
  import('./success-animation').then(module => module.mountSuccessAnimation(modal.querySelector('.order-modal-icon'))).catch(() => {});
  animateSuccessModal(modal);
  tg?.HapticFeedback?.notificationOccurred?.('success');
}

async function checkoutOrder() {
  const payload = buildOrderPayload();
  if (!payload.items.length) return;
  const btn = document.querySelector('[data-checkout]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
  }
  try {
    const response = await fetch('/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.error || 'order_failed');
    cart = {};
    save();
    updateCount();
    renderProducts();
    showOrderSuccess();
  } catch (error) {
    if (tg?.sendData) {
      try {
        tg.sendData(JSON.stringify({ type: 'order', ...payload }));
        cart = {};
        save();
        updateCount();
        renderProducts();
        showOrderSuccess();
        return;
      } catch (_) {}
    }
    tg?.HapticFeedback?.notificationOccurred?.('error');
    alert(text('orderError'));
    renderProducts();
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
    const weight = cleanWeight(item.weight || parsed.weight);
    const rowTotal = productTotal(p, weight) * Number(item.qty);
    return `
      <div class="cart-row">
        <div class="cart-img ${p.img ? '' : 'empty-pic'}">${productImage(p)}</div>
        <div class="cart-info">
          <h4>${p.name[currentLang]}</h4>
          <p>${p.desc[currentLang]}</p>
          <div class="cart-meta">${text('pack')}: ${kgLabel(weight)} · ${moneyKg(p.pricePerKg)}</div>
          <div class="cart-price">${money(rowTotal)}</div>
          <div class="qty">
            <button data-qty-minus="${key}" type="button">−</button>
            <b>${item.qty}</b>
            <button data-qty-plus="${key}" type="button">+</button>
          </div>
        </div>
        <button class="remove" data-remove="${key}" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
      </div>
    `;
  }).join('');

  const total = entries.reduce((s, [key, item]) => {
    const parsed = parseCartKey(key);
    const p = productById(parsed.id);
    const weight = cleanWeight(item.weight || parsed.weight);
    return s + (p ? productTotal(p, weight) * Number(item.qty) : 0);
  }, 0);

  const hasItems = entries.length > 0;
  $('#products').innerHTML = (rows || `<div class="empty">${text('emptyCart')}</div>`) + `
    <div class="total"><span>${text('total')}</span><b>${money(total)}</b></div>
    <div class="cart-note">
      <b>${text('vatNote')}</b>
      <span>${text('orderNote')}</span>
    </div>
    <button class="checkout cart-checkout" data-checkout type="button" ${hasItems ? '' : 'disabled'}>${text('checkout')}</button>
  `;
  animateCart();
}

function renderProducts() {
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
    $('#pageTitle').textContent = text('new');
    setShowAll('', text('showAll'));
  }
  renderProductCards(filteredProducts());
}

function setActiveNav(tab) {
  document.querySelectorAll('.nav').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}

function addCart(id, weight = null) {
  const p = productById(id);
  if (!p) return;
  const selected = cleanWeight(weight || (mode === 'detail' ? selectedWeight : p.packKg));
  const key = cartKey(id, selected);
  const old = normalizeCartEntry(key);
  if (old) {
    old.qty += 1;
    old.weight = selected;
  } else {
    cart[key] = { qty: 1, weight: selected };
  }
  save();
  updateCount();
  pulseCart();
  tg?.HapticFeedback?.impactOccurred?.('light');
}

function toggleFav(id) {
  fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id];
  save();
  renderProducts();
}

function changeQty(id, delta) {
  const item = normalizeCartEntry(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) delete cart[id];
  save();
  renderProducts();
}

function removeCart(id) {
  delete cart[id];
  save();
  renderProducts();
}

function openProduct(id) {
  previousMode = mode === 'detail' ? previousMode : mode;
  selectedProductId = Number(id);
  const p = productById(id);
  selectedWeight = minProductWeight(p);
  localStorage.setItem('selectedWeight', String(selectedWeight));
  mode = 'detail';
  setActiveNav('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderProducts();
}

function renderCurrencyButton() {
  currentCurrency = 'RUB';
}

function closeCurrencyDropdown() {
  const wrap = document.querySelector('.currency-wrap');
  const btn = $('#currencyBtn');
  const dropdown = $('#currencyDropdown');
  wrap?.classList.remove('open');
  btn?.setAttribute('aria-expanded', 'false');
  dropdown?.setAttribute('aria-hidden', 'true');
}

function toggleCurrencyDropdown() {
  const wrap = document.querySelector('.currency-wrap');
  const btn = $('#currencyBtn');
  const dropdown = $('#currencyDropdown');
  const isOpen = wrap?.classList.toggle('open');
  btn?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  dropdown?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function setCurrency(code) {
  currentCurrency = 'RUB';
  renderProducts();
}

function applyLanguage() {
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  $('#langBtn').textContent = text('lang');
  renderCurrencyButton();
  $('#search').placeholder = text('search');
  setShowAll('none', text('showAll'));
  document.querySelector('[data-tab="new"] span').textContent = text('new');
  document.querySelector('[data-tab="catalog"] span').textContent = text('catalog');
  document.querySelector('[data-tab="fav"] span').textContent = text('fav');
  document.querySelector('[data-tab="cart"] span').textContent = text('cart');
  renderProducts();
}

document.addEventListener('click', (e) => {
  const currencyOption = e.target.closest('[data-currency]');
  if (currencyOption) {
    setCurrency(currencyOption.dataset.currency);
    return;
  }

  if (e.target.closest('#currencyBtn')) {
    toggleCurrencyDropdown();
    return;
  }

  if (!e.target.closest('.currency-wrap')) {
    closeCurrencyDropdown();
  }

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
    return;
  }

  const catalogCat = e.target.closest('[data-catalog-cat]');
  if (catalogCat) {
    activeCat = catalogCat.dataset.catalogCat;
    mode = 'new';
    setActiveNav('new');
    renderProducts();
    return;
  }
  const catalogCountryButton = e.target.closest('[data-catalog-country]');
  if (catalogCountryButton) { catalogCountry = catalogCountryButton.dataset.catalogCountry; renderCatalog(); return; }
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
    localStorage.setItem('selectedWeight', String(selectedWeight));
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

  const closeOrderSuccess = e.target.closest('[data-close-order-success]');
  if (closeOrderSuccess) {
    document.querySelector('.order-modal')?.remove();
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
    if (mode === 'new') activeCat = 'все';
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
$('#search').addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    if (mode === 'cart' || mode === 'catalog' || mode === 'detail') mode = 'new';
    setActiveNav(mode);
    renderProducts();
  }, 120);
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
  localStorage.setItem('selectedWeight', String(selectedWeight));
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
  localStorage.setItem('selectedWeight', String(selectedWeight));
  document.querySelector('.detail-total b').textContent = money(productTotal(p, selectedWeight));
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
  setActiveNav('catalog');
  renderProducts();
});

$('#filterBtn')?.addEventListener('click', () => {
  document.querySelector('.country-chips')?.classList.toggle('highlighted');
});

async function loadProducts() {
  try {
    const productsUrl = new URL('products.json', document.baseURI);
    productsUrl.searchParams.set('v', String(Date.now()));
    const response = await fetch(productsUrl);
    if (!response.ok) return;
    const data = await response.json();
    const loaded = Array.isArray(data) ? data : data.products;
    if (Array.isArray(loaded) && loaded.length) products = loaded;
  } catch (error) {
    console.warn('products.json не загрузился, используется список из app.js', error);
  }
}

initSnowCanvas();
initMotion();
if (document.querySelector('#brandRive[data-src]')) import('./rive-logo').then(module => module.initRiveLogo());
loadProducts().finally(() => applyLanguage());


document.addEventListener('click', (e) => {
  const countryChip = e.target.closest('[data-country-filter]');
  if (countryChip) {
    countryFilter = countryChip.dataset.countryFilter;
    catalogCountry = '';
    activeCat = 'все';
    mode = 'new';
    document.querySelectorAll('[data-country-filter]').forEach(button => button.classList.toggle('active', button === countryChip));
    setActiveNav('new');
    renderProducts();
    return;
  }
  const btn = e.target.closest('.ask-btn');
  if (!btn) return;
  e.preventDefault();
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.showPopup({title:'Написать менеджеру',message:'Закройте магазин и напишите вопрос прямо в чат с ботом. Сообщение будет передано менеджеру.',buttons:[{id:'chat',type:'default',text:'Перейти в чат'},{type:'cancel'}]}, id => { if (id === 'chat') Telegram.WebApp.close(); });
  } else {
    window.location.href = 'tel:+79957962036';
  }
});
