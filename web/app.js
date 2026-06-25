const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  // Не включаем fullscreen: окно Mini App масштабируется вместе с окном Telegram.
}

const WEIGHTS = [0.5, 1, 2, 5, 10];

const products = [
  {
    id: 1,
    name: { ru: 'Голубика «Свежезамороженная»', en: 'Frozen Blueberries' },
    cat: { ru: 'Замороженные ягоды', en: 'Frozen berries' },
    desc: {
      ru: 'Натуральная свежезамороженная голубика без сахара и добавок. Подходит для десертов, смузи, выпечки и здорового питания.',
      en: 'Natural frozen blueberries with no added sugar. Great for desserts, smoothies, baking and healthy meals.'
    },
    pricePerKg: 0,
    img: 'assets/p1.jpg',
    tag: 'ягоды'
  },
  {
    id: 2,
    name: { ru: 'Грибы белые целые 1 сорт', en: 'Whole Porcini Mushrooms, Grade 1' },
    cat: { ru: 'Замороженные грибы', en: 'Frozen mushrooms' },
    desc: {
      ru: 'Отборные белые грибы быстрой заморозки. Сохраняют насыщенный аромат и подходят для супов, соусов и горячих блюд.',
      en: 'Selected quick-frozen porcini mushrooms with rich aroma. Suitable for soups, sauces and hot dishes.'
    },
    pricePerKg: 0,
    img: 'assets/p2.jpg',
    tag: 'грибы'
  },
  {
    id: 3,
    name: { ru: 'Картофель фри 9×9 мм Fry Me', en: 'French Fries 9×9 mm Fry Me' },
    cat: { ru: 'Замороженный картофель', en: 'Frozen potato' },
    desc: {
      ru: 'Картофель фри ровной нарезки 9×9 мм. Удобен для кафе, доставки, фудкортов и домашнего приготовления.',
      en: 'Even-cut 9×9 mm frozen fries. Convenient for cafés, delivery, food courts and home cooking.'
    },
    pricePerKg: 0,
    img: 'assets/p3.jpg',
    tag: 'картофель'
  },
  {
    id: 4,
    name: { ru: 'Смесь «Попрошайка» 1×10 кг', en: 'Vegetable Mix “Poproshaika” 1×10 kg' },
    cat: { ru: 'Замороженные овощи', en: 'Frozen vegetables' },
    desc: {
      ru: 'Овощная замороженная смесь для гарниров, супов и горячих блюд. Быстро готовится и подходит для оптовых закупок.',
      en: 'Frozen vegetable mix for side dishes, soups and hot meals. Quick to cook and suitable for wholesale orders.'
    },
    pricePerKg: 0,
    img: 'assets/p4.jpg',
    tag: 'овощи'
  },
  {
    id: 5,
    name: { ru: 'Малина «Свежезамороженная»', en: 'Frozen Raspberries' },
    cat: { ru: 'Замороженные ягоды', en: 'Frozen berries' },
    desc: {
      ru: 'Ароматная свежезамороженная малина. Подходит для морсов, десертов, начинок и ресторанной кухни.',
      en: 'Aromatic frozen raspberries for drinks, desserts, fillings and restaurant kitchens.'
    },
    pricePerKg: 0,
    img: 'assets/p5.jpg',
    tag: 'ягоды'
  },
  {
    id: 6,
    name: { ru: 'Пельмени «Иркутские» Мириталь', en: 'Irkutskie Dumplings Mirital' },
    cat: { ru: 'Полуфабрикаты', en: 'Ready meals' },
    desc: {
      ru: 'Замороженные пельмени для быстрого приготовления. Удобный товар для розницы, кафе и домашней кухни.',
      en: 'Frozen dumplings for quick cooking. Convenient for retail, cafés and home kitchens.'
    },
    pricePerKg: 0,
    img: 'assets/p6.jpg',
    tag: 'полуфабрикаты'
  }
];

const translations = {
  ru: {
    lang: 'RU', currency: 'RUB', search: 'Поиск товаров', showAll: 'Смотреть все ›', backAll: 'Все товары',
    new: 'Все товары', catalog: 'Каталог', fav: 'Избранное', cart: 'Корзина', add: '🛒 В корзину',
    emptyProducts: 'Товары не найдены', emptyCart: 'Корзина пустая', total: 'Итого', back: 'Назад',
    priceKg: '₽/кг', weight: 'Вес', ask: 'ⓘ Задать вопрос', itemTotal: 'Итого', kg: 'кг',
    inCart: 'Добавлено в корзину', qty: 'Кол-во', description: 'Описание', pricePerKg: 'Цена за кг',
    cats: { все:'ВСЕ', ягоды:'ЯГОДЫ', овощи:'ОВОЩИ', грибы:'ГРИБЫ', картофель:'КАРТОФЕЛЬ', полуфабрикаты:'ПОЛУФАБРИКАТЫ' }
  },
  en: {
    lang: 'EN', currency: 'RUB', search: 'Search products', showAll: 'View all ›', backAll: 'All products',
    new: 'All products', catalog: 'Catalog', fav: 'Favorites', cart: 'Cart', add: '🛒 Add to cart',
    emptyProducts: 'No products found', emptyCart: 'Cart is empty', total: 'Total', back: 'Back',
    priceKg: '₽/kg', weight: 'Weight', ask: 'ⓘ Ask a question', itemTotal: 'Total', kg: 'kg',
    inCart: 'Added to cart', qty: 'Qty', description: 'Description', pricePerKg: 'Price per kg',
    cats: { все:'ALL', ягоды:'BERRIES', овощи:'VEGETABLES', грибы:'MUSHROOMS', картофель:'POTATO', полуфабрикаты:'READY MEALS' }
  }
};

const catalogCats = ['ягоды', 'овощи', 'грибы', 'картофель', 'полуфабрикаты'];
let currentLang = localStorage.getItem('lang') || 'ru';
let activeCat = 'все';
let mode = 'new';
let previousMode = 'new';
let selectedProductId = null;
let selectedWeight = 1;
let fav = JSON.parse(localStorage.getItem('fav') || '[]');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

const $ = (s) => document.querySelector(s);
const text = (key) => translations[currentLang][key];
const productById = (id) => products.find(p => p.id === Number(id));
const weightLabel = (w) => `${String(w).replace('.', ',')} ${text('kg')}`;
const money = (n) => Number(n || 0).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: 2 }) + ' ₽';
const moneyKg = (n) => `${money(n).replace(' ₽','')} ${text('priceKg')}`;

function save() {
  localStorage.setItem('fav', JSON.stringify(fav));
  localStorage.setItem('cart', JSON.stringify(cart));
}

function normalizeCartEntry(id) {
  const old = cart[id];
  if (!old) return null;
  if (typeof old === 'number') {
    cart[id] = { qty: old, weight: 1 };
  }
  if (!cart[id].qty) cart[id].qty = 1;
  if (!cart[id].weight) cart[id].weight = 1;
  return cart[id];
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
      translations.ru.cats[p.tag] || '', translations.en.cats[p.tag] || ''
    ].join(' ').toLowerCase();
    const matchCategory = activeCat === 'все' || p.tag === activeCat;
    const matchSearch = !q || haystack.includes(q);
    return matchCategory && matchSearch;
  });
  if (mode === 'fav') arr = arr.filter(p => fav.includes(p.id));
  return arr;
}

function renderProductCards(arr) {
  $('#products').innerHTML = arr.length ? arr.map(p => `
    <article class="card" data-open-product="${p.id}">
      <button class="fav ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">♡</button>
      <div class="pic"><img src="${p.img}" alt="${p.name[currentLang]}"></div>
      <div class="body">
        <h3 class="name">${p.name[currentLang]}</h3>
        <div class="cat">${p.cat[currentLang]}</div>
        <div class="price">${moneyKg(p.pricePerKg)}</div>
        <button class="add" data-cart="${p.id}" type="button">${text('add')}</button>
      </div>
    </article>
  `).join('') : `<div class="empty">${text('emptyProducts')}</div>`;
}

function renderCatalog() {
  $('#pageTitle').textContent = text('catalog');
  $('#showAll').style.display = 'none';
  $('#products').className = 'catalog-list';
  $('#products').innerHTML = catalogCats.map(c => `
    <button class="catalog-item" data-catalog-cat="${c}" type="button">
      <span>${translations[currentLang].cats[c]}</span>
      <span class="arrow">›</span>
    </button>
  `).join('');
}

function renderDetail() {
  const p = productById(selectedProductId);
  if (!p) { mode = 'new'; renderProducts(); return; }
  const itemTotal = Number(p.pricePerKg) * Number(selectedWeight);
  $('#pageTitle').textContent = '';
  $('#showAll').style.display = 'none';
  $('#products').className = 'product-detail';
  $('#products').innerHTML = `
    <div class="detail-top">
      <button class="detail-back" type="button" data-back-detail>‹ ${text('back')}</button>
      <button class="detail-heart ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">♡</button>
    </div>
    <div class="detail-image"><img src="${p.img}" alt="${p.name[currentLang]}"></div>
    <div class="detail-body">
      <h1>${p.name[currentLang]}</h1>
      <div class="detail-cat">${p.cat[currentLang]}</div>
      <p>${p.desc[currentLang]}</p>
      <div class="detail-price">${moneyKg(p.pricePerKg)}</div>
      <div class="weight-title">${text('weight')}</div>
      <div class="weights">
        ${WEIGHTS.map(w => `<button class="weight ${Number(selectedWeight) === Number(w) ? 'active' : ''}" data-weight="${w}" type="button">${weightLabel(w)}</button>`).join('')}
      </div>
      <div class="detail-total"><span>${text('itemTotal')}:</span><b>${money(itemTotal)}</b></div>
      <button class="detail-add" data-cart="${p.id}" data-detail-cart="1" type="button">${text('add')}</button>
      <button class="ask-btn" type="button">${text('ask')}</button>
    </div>
  `;
}

function renderCartPage() {
  $('#pageTitle').textContent = text('cart');
  $('#showAll').style.display = 'none';
  $('#products').className = 'cart-page';

  const entries = Object.keys(cart).map(id => [id, normalizeCartEntry(id)]).filter(([, item]) => item);
  const rows = entries.map(([id, item]) => {
    const p = productById(id);
    if (!p) return '';
    const rowTotal = Number(p.pricePerKg) * Number(item.weight) * Number(item.qty);
    return `
      <div class="cart-row">
        <img src="${p.img}" alt="${p.name[currentLang]}">
        <div class="cart-info">
          <h4>${p.name[currentLang]}</h4>
          <p>${p.desc[currentLang]}</p>
          <div class="cart-meta">${weightLabel(item.weight)} · ${moneyKg(p.pricePerKg)}</div>
          <div class="cart-price">${money(rowTotal)}</div>
          <div class="qty">
            <button data-qty-minus="${p.id}" type="button">−</button>
            <b>${item.qty}</b>
            <button data-qty-plus="${p.id}" type="button">+</button>
          </div>
        </div>
        <button class="remove" data-remove="${p.id}" type="button">⌫</button>
      </div>
    `;
  }).join('');

  const total = entries.reduce((s, [id, item]) => {
    const p = productById(id);
    return s + (p ? Number(p.pricePerKg) * Number(item.weight) * Number(item.qty) : 0);
  }, 0);

  $('#products').innerHTML = (rows || `<div class="empty">${text('emptyCart')}</div>`) + `
    <div class="total"><span>${text('total')}</span><b>${money(total)}</b></div>
  `;
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
    $('#showAll').style.display = 'none';
  } else if (activeCat !== 'все') {
    $('#pageTitle').textContent = translations[currentLang].cats[activeCat] || text('new');
    $('#showAll').style.display = '';
    $('#showAll').textContent = text('backAll');
  } else {
    $('#pageTitle').textContent = text('new');
    $('#showAll').style.display = '';
    $('#showAll').textContent = text('showAll');
  }
  renderProductCards(filteredProducts());
}

function setActiveNav(tab) {
  document.querySelectorAll('.nav').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}

function addCart(id, weight = 1) {
  const key = String(id);
  const old = normalizeCartEntry(key);
  if (old) {
    old.qty += 1;
    old.weight = Number(weight || old.weight || 1);
  } else {
    cart[key] = { qty: 1, weight: Number(weight || 1) };
  }
  save();
  updateCount();
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
  selectedWeight = 1;
  mode = 'detail';
  setActiveNav('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderProducts();
}

function applyLanguage() {
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  $('#langBtn').textContent = text('lang');
  $('#currencyBtn').textContent = text('currency');
  $('#search').placeholder = text('search');
  $('#showAll').textContent = text('showAll');
  document.querySelector('[data-tab="new"] span').textContent = text('new');
  document.querySelector('[data-tab="catalog"] span').textContent = text('catalog');
  document.querySelector('[data-tab="fav"] span').textContent = text('fav');
  document.querySelector('[data-tab="cart"] span').textContent = text('cart');
  renderProducts();
}

document.addEventListener('click', (e) => {
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

  const weightBtn = e.target.closest('[data-weight]');
  if (weightBtn) {
    selectedWeight = Number(weightBtn.dataset.weight);
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

  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    toggleFav(Number(favBtn.dataset.fav));
    return;
  }

  const cartBtn = e.target.closest('[data-cart]');
  if (cartBtn) {
    const w = cartBtn.dataset.detailCart ? selectedWeight : 1;
    addCart(Number(cartBtn.dataset.cart), w);
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
  if (minus) return changeQty(Number(minus.dataset.qtyMinus), -1);

  const plus = e.target.closest('[data-qty-plus]');
  if (plus) return changeQty(Number(plus.dataset.qtyPlus), 1);

  const remove = e.target.closest('[data-remove]');
  if (remove) removeCart(Number(remove.dataset.remove));
});

$('#search').addEventListener('input', () => {
  if (mode === 'cart' || mode === 'catalog' || mode === 'detail') mode = 'new';
  setActiveNav(mode);
  renderProducts();
});

$('#showAll').addEventListener('click', () => {
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

$('#favBtn').addEventListener('click', () => {
  mode = 'fav';
  setActiveNav('fav');
  renderProducts();
});

applyLanguage();
