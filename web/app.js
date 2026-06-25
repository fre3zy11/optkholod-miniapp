const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  // Не вызываем requestFullscreen: окно Mini App остается обычным и масштабируется вместе с Telegram.
}

const products = [
  {id:1,name:{ru:'Голубика «Свежезамороженная»',en:'Frozen Blueberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p1.jpg',tag:'ягоды'},
  {id:2,name:{ru:'Грибы белые целые 1 сорт',en:'Whole Porcini Mushrooms, Grade 1'},cat:{ru:'Замороженные грибы',en:'Frozen mushrooms'},price:0,img:'assets/p2.jpg',tag:'грибы'},
  {id:3,name:{ru:'Картофель фри 9×9 мм Fry Me',en:'French Fries 9×9 mm Fry Me'},cat:{ru:'Замороженный картофель',en:'Frozen potato'},price:0,img:'assets/p3.jpg',tag:'картофель'},
  {id:4,name:{ru:'Смесь «Попрошайка» 1×10 кг',en:'Vegetable Mix “Poproshaika” 1×10 kg'},cat:{ru:'Замороженные овощи',en:'Frozen vegetables'},price:0,img:'assets/p4.jpg',tag:'овощи'},
  {id:5,name:{ru:'Малина «Свежезамороженная»',en:'Frozen Raspberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p5.jpg',tag:'ягоды'},
  {id:6,name:{ru:'Пельмени «Иркутские» Мириталь',en:'Irkutskie Dumplings Mirital'},cat:{ru:'Полуфабрикаты',en:'Ready meals'},price:0,img:'assets/p6.jpg',tag:'полуфабрикаты'}
];

const translations = {
  ru: {
    lang: 'RU',
    currency: 'RUB',
    heroTitle: 'Ассортимент',
    heroText: 'Замороженные продукты питания оптом с доставкой по всей России',
    search: 'Поиск товаров',
    showAll: 'Смотреть все ›',
    backAll: 'Все товары',
    new: 'Все товары',
    catalog: 'Каталог',
    fav: 'Избранное',
    cart: 'Корзина',
    add: '🛒 В корзину',
    emptyProducts: 'Товары не найдены',
    emptyCart: 'Корзина пустая',
    total: 'Итого',
    cats: {
      все:'ВСЕ',
      ягоды:'ЯГОДЫ',
      фрукты:'ФРУКТЫ',
      овощи:'ОВОЩИ',
      грибы:'ГРИБЫ',
      картофель:'КАРТОФЕЛЬ',
      полуфабрикаты:'ПОЛУФАБРИКАТЫ',
      молочные:'МОЛОЧНЫЕ ПРОДУКТЫ',
      напитки:'НАПИТКИ',
      соусы:'СОУСЫ И ПРИПРАВЫ',
      бакалея:'БАКАЛЕЯ'
    }
  },
  en: {
    lang: 'EN',
    currency: 'RUB',
    heroTitle: 'Product Range',
    heroText: 'Wholesale frozen foods with delivery across Russia',
    search: 'Search products',
    showAll: 'View all ›',
    backAll: 'All products',
    new: 'All products',
    catalog: 'Catalog',
    fav: 'Favorites',
    cart: 'Cart',
    add: '🛒 Add to cart',
    emptyProducts: 'No products found',
    emptyCart: 'Cart is empty',
    total: 'Total',
    cats: {
      все:'ALL',
      ягоды:'BERRIES',
      фрукты:'FRUIT',
      овощи:'VEGETABLES',
      грибы:'MUSHROOMS',
      картофель:'POTATOES & DISHES',
      полуфабрикаты:'READY MEALS',
      молочные:'DAIRY PRODUCTS',
      напитки:'DRINKS',
      соусы:'SAUCES & SPICES',
      бакалея:'GROCERIES'
    }
  }
};

const chipCats = ['все','ягоды','фрукты','грибы','овощи'];
const catalogCats = ['ягоды','овощи','грибы','картофель','полуфабрикаты'];

let currentLang = localStorage.getItem('lang') || 'ru';
let activeCat = 'все';
let mode = 'new';
let fav = JSON.parse(localStorage.getItem('fav') || '[]');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

const $ = (s) => document.querySelector(s);
const text = (key) => translations[currentLang][key];
const money = (n) => Number(n).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: 2 }) + ' ₽';

function save() {
  localStorage.setItem('fav', JSON.stringify(fav));
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCount() {
  $('#cartCount').textContent = Object.values(cart).reduce((a, b) => a + Number(b), 0);
}

function setAppModeClass() {
  const app = $('.app');
  app.classList.toggle('catalog-mode', mode === 'catalog');
  app.classList.toggle('cart-mode', mode === 'cart');
}

function renderCats() {
  const catsEl = $('#categories');
  if (!catsEl) return;
  catsEl.innerHTML = chipCats.map(c => `
    <button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">
      ${translations[currentLang].cats[c]}
    </button>
  `).join('');
}

function filteredProducts() {
  const q = ($('#search')?.value || '').trim().toLowerCase();
  let arr = products.filter(p => {
    const haystack = [
      p.name.ru, p.name.en,
      p.cat.ru, p.cat.en,
      p.tag,
      translations.ru.cats[p.tag] || '',
      translations.en.cats[p.tag] || ''
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
    <article class="card">
      <button class="fav ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">♡</button>
      <div class="pic"><img src="${p.img}" alt="${p.name[currentLang]}"></div>
      <div class="body">
        <h3 class="name">${p.name[currentLang]}</h3>
        <div class="cat">${p.cat[currentLang]}</div>
        <div class="price">${money(p.price)}</div>
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

function renderCartPage() {
  $('#pageTitle').textContent = text('cart');
  $('#showAll').style.display = 'none';
  $('#products').className = 'cart-page';

  const rows = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === Number(id));
    if (!p) return '';
    return `
      <div class="cart-row">
        <img src="${p.img}" alt="${p.name[currentLang]}">
        <div>
          <h4>${p.name[currentLang]}</h4>
          <div class="cart-price">${money(p.price)}</div>
          <div class="qty">
            <button data-qty-minus="${p.id}" type="button">−</button>
            <b>${qty}</b>
            <button data-qty-plus="${p.id}" type="button">+</button>
          </div>
        </div>
        <button class="remove" data-remove="${p.id}" type="button">⌫</button>
      </div>
    `;
  }).join('');

  const total = Object.entries(cart).reduce((s, [id, q]) => {
    const p = products.find(x => x.id === Number(id));
    return s + (p ? p.price * Number(q) : 0);
  }, 0);

  $('#products').innerHTML = (rows || `<div class="empty">${text('emptyCart')}</div>`) + `
    <div class="total"><span>${text('total')}</span><b>${money(total)}</b></div>
  `;
}

function renderProducts() {
  setAppModeClass();
  updateCount();

  if (mode === 'catalog') {
    renderCatalog();
    return;
  }

  if (mode === 'cart') {
    renderCartPage();
    return;
  }

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

function addCart(id) {
  cart[id] = (cart[id] || 0) + 1;
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
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  save();
  renderProducts();
}

function removeCart(id) {
  delete cart[id];
  save();
  renderProducts();
}

function applyLanguage() {
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  $('#langBtn').textContent = text('lang');
  $('#currencyBtn').textContent = text('currency');
  if ($('.hero h1')) $('.hero h1').textContent = text('heroTitle');
  if ($('.hero p')) $('.hero p').textContent = text('heroText');
  $('#search').placeholder = text('search');
  $('#showAll').textContent = text('showAll');
  document.querySelector('[data-tab="new"] span').textContent = text('new');
  document.querySelector('[data-tab="catalog"] span').textContent = text('catalog');
  document.querySelector('[data-tab="fav"] span').textContent = text('fav');
  document.querySelector('[data-tab="cart"] span').textContent = text('cart');
  renderCats();
  renderProducts();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#langBtn')) {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    applyLanguage();
    return;
  }

  const chip = e.target.closest('[data-cat]');
  if (chip) {
    activeCat = chip.dataset.cat;
    mode = 'new';
    setActiveNav('new');
    renderCats();
    renderProducts();
    return;
  }

  const catalogCat = e.target.closest('[data-catalog-cat]');
  if (catalogCat) {
    activeCat = catalogCat.dataset.catalogCat;
    mode = 'new';
    setActiveNav('new');
    renderCats();
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
    addCart(Number(cartBtn.dataset.cart));
    return;
  }

  const nav = e.target.closest('.nav');
  if (nav) {
    mode = nav.dataset.tab;
    if (mode === 'new') {
      activeCat = 'все';
      renderCats();
    }
    setActiveNav(mode);
    renderProducts();
    return;
  }

  const minus = e.target.closest('[data-qty-minus]');
  if (minus) {
    changeQty(Number(minus.dataset.qtyMinus), -1);
    return;
  }

  const plus = e.target.closest('[data-qty-plus]');
  if (plus) {
    changeQty(Number(plus.dataset.qtyPlus), 1);
    return;
  }

  const remove = e.target.closest('[data-remove]');
  if (remove) {
    removeCart(Number(remove.dataset.remove));
  }
});

$('#search').addEventListener('input', () => {
  mode = mode === 'cart' || mode === 'catalog' ? 'new' : mode;
  setActiveNav(mode);
  renderProducts();
});

$('#showAll').addEventListener('click', () => {
  if (activeCat !== 'все' && mode === 'new') {
    activeCat = 'все';
    mode = 'new';
    setActiveNav('new');
    renderCats();
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
