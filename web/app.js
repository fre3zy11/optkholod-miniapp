const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (typeof tg.requestFullscreen === 'function') {
    try { tg.requestFullscreen(); } catch (e) {}
  }
}

const products = [
  {id:1,name:{ru:'Голубика «Свежезамороженная»',en:'Frozen Blueberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p1.jpg',tag:'ягоды'},
  {id:2,name:{ru:'Грибы белые целые 1 сорт',en:'Whole Porcini Mushrooms, Grade 1'},cat:{ru:'Замороженные грибы',en:'Frozen mushrooms'},price:0,img:'assets/p2.jpg',tag:'грибы'},
  {id:3,name:{ru:'Картофель фри 9×9 мм Fry Me',en:'French Fries 9×9 mm Fry Me'},cat:{ru:'Картофель фри',en:'French fries'},price:0,img:'assets/p3.jpg',tag:'фри'},
  {id:4,name:{ru:'Смесь «Попрошайка» 1×10 кг',en:'Vegetable Mix “Poproshaika” 1×10 kg'},cat:{ru:'Замороженные овощи',en:'Frozen vegetables'},price:0,img:'assets/p4.jpg',tag:'овощи'},
  {id:5,name:{ru:'Малина «Свежезамороженная»',en:'Frozen Raspberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p5.jpg',tag:'ягоды'},
  {id:6,name:{ru:'Пельмени «Иркутские» Мириталь',en:'Irkutskie Dumplings Mirital'},cat:{ru:'Замороженные полуфабрикаты',en:'Frozen ready meals'},price:0,img:'assets/p6.jpg',tag:'полуфабрикаты'}
];

const translations = {
  ru: {
    lang: 'RU⌄', currency: 'RUB⌄', heroTitle: 'Ассортимент', heroText: 'Замороженные продукты питания оптом с доставкой по всей России',
    search: 'Поиск товаров', showAll: 'Смотреть все ›', new: 'Новинки', catalog: 'Каталог', fav: 'Избранное', cart: 'Корзина',
    add: '🛒 В корзину', emptyProducts: 'Товары не найдены', emptyCart: 'Корзина пустая', total: 'Итого:', checkout: 'Оформить заказ', orderSent: 'Заказ отправлен в бот', orderMade: 'Заказ сформирован: ',
    cats: {все:'ВСЕ', ягоды:'ЯГОДЫ', фрукты:'ФРУКТЫ', грибы:'ГРИБЫ', овощи:'ОВОЩИ', полуфабрикаты:'ПОЛУФАБРИКАТЫ', фри:'ФРИ'}
  },
  en: {
    lang: 'EN⌄', currency: 'RUB⌄', heroTitle: 'Product Range', heroText: 'Wholesale frozen foods with delivery across Russia',
    search: 'Search products', showAll: 'View all ›', new: 'New', catalog: 'Catalog', fav: 'Favorites', cart: 'Cart',
    add: '🛒 Add to cart', emptyProducts: 'No products found', emptyCart: 'Cart is empty', total: 'Total:', checkout: 'Checkout', orderSent: 'Order sent to bot', orderMade: 'Order created: ',
    cats: {все:'ALL', ягоды:'BERRIES', фрукты:'FRUIT', грибы:'MUSHROOMS', овощи:'VEGETABLES', полуфабрикаты:'READY MEALS', фри:'FRIES'}
  }
};

const cats = ['все','ягоды','фрукты','грибы','овощи','полуфабрикаты','фри'];
let currentLang = localStorage.getItem('lang') || 'ru';
let activeCat = 'все';
let mode = 'new';
let fav = JSON.parse(localStorage.getItem('fav') || '[]');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

const $ = (s) => document.querySelector(s);
const text = (key) => translations[currentLang][key];
const money = (n) => Number(n).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: 2 }) + ' ₽';
const icon = (c) => ({все:'▦', ягоды:'❄️', фрукты:'🍎', грибы:'🍄', овощи:'🥕', полуфабрикаты:'📦', фри:'🍟'}[c] || '');

function save() {
  localStorage.setItem('fav', JSON.stringify(fav));
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCount() {
  $('#cartCount').textContent = Object.values(cart).reduce((a, b) => a + Number(b), 0);
}

function renderCats() {
  $('#categories').innerHTML = cats.map(c => `
    <button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${icon(c)} ${translations[currentLang].cats[c]}</button>
  `).join('');
}

function renderProducts() {
  const q = ($('#search').value || '').toLowerCase();
  let arr = products.filter(p => {
    const name = p.name[currentLang].toLowerCase();
    const cat = p.cat[currentLang].toLowerCase();
    return (activeCat === 'все' || p.tag === activeCat) && (name.includes(q) || cat.includes(q));
  });

  if (mode === 'fav') arr = arr.filter(p => fav.includes(p.id));
  if (mode === 'cart') return openCart();

  $('#pageTitle').textContent = mode === 'fav' ? text('fav') : mode === 'catalog' ? text('catalog') : text('new');

  $('#products').innerHTML = arr.length ? arr.map(p => `
    <article class="card">
      <button class="fav ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}">♡</button>
      <div class="pic"><img src="${p.img}" alt="${p.name[currentLang]}"></div>
      <div class="body">
        <h3 class="name">${p.name[currentLang]}</h3>
        <div class="cat">${p.cat[currentLang]}</div>
        <div class="price">${money(p.price)}</div>
        <button class="add" data-cart="${p.id}">${text('add')}</button>
      </div>
    </article>
  `).join('') : `<div class="empty">${text('emptyProducts')}</div>`;

  updateCount();
}

function setActiveNav(tab) {
  document.querySelectorAll('.nav').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}

function openCart() {
  $('#pageTitle').textContent = text('cart');
  const rows = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === Number(id));
    if (!p) return '';
    return `
      <div class="cart-row">
        <img src="${p.img}" alt="${p.name[currentLang]}">
        <div><h4>${p.name[currentLang]}</h4><span>${money(p.price)}</span></div>
        <div class="qty">
          <button data-qty-minus="${p.id}">−</button>
          <b>${qty}</b>
          <button data-qty-plus="${p.id}">+</button>
        </div>
      </div>
    `;
  }).join('');

  $('#cartItems').innerHTML = rows || `<div class="empty">${text('emptyCart')}</div>`;
  const total = Object.entries(cart).reduce((s, [id, q]) => {
    const p = products.find(x => x.id === Number(id));
    return s + (p ? p.price * Number(q) : 0);
  }, 0);
  $('#total').textContent = money(total);
  $('#cartSheet').classList.add('show');
}

function closeCart() { $('#cartSheet').classList.remove('show'); }

function addCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  save();
  updateCount();
  tg?.HapticFeedback?.impactOccurred('light');
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
  updateCount();
  openCart();
}

function checkout() {
  const items = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === Number(id));
    return { id: Number(id), name: p?.name[currentLang], qty: Number(qty), price: p?.price || 0 };
  });

  if (!items.length) {
    alert(text('emptyCart'));
    return;
  }

  const data = JSON.stringify({ type: 'order', items });
  if (tg) {
    tg.sendData(data);
    tg.showAlert(text('orderSent'));
  } else {
    alert(text('orderMade') + data);
  }
}

function applyLanguage() {
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  $('#langBtn').textContent = text('lang');
  $('#currencyBtn').textContent = text('currency');
  $('.hero h1').textContent = text('heroTitle');
  $('.hero p').textContent = text('heroText');
  $('#search').placeholder = text('search');
  $('#showAll').textContent = text('showAll');
  document.querySelector('[data-tab="new"] span').textContent = text('new');
  document.querySelector('[data-tab="catalog"] span').textContent = text('catalog');
  document.querySelector('[data-tab="fav"] span').textContent = text('fav');
  document.querySelector('[data-tab="cart"] span').textContent = text('cart');
  $('#cartTitle').textContent = text('cart');
  $('#totalLabel').textContent = text('total');
  $('#checkout').textContent = text('checkout');
  renderCats();
  renderProducts();
}

document.addEventListener('click', (e) => {
  const langBtn = e.target.closest('#langBtn');
  if (langBtn) { currentLang = currentLang === 'ru' ? 'en' : 'ru'; applyLanguage(); return; }

  const chip = e.target.closest('[data-cat]');
  if (chip) { activeCat = chip.dataset.cat; renderCats(); renderProducts(); return; }

  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) { toggleFav(Number(favBtn.dataset.fav)); return; }

  const cartBtn = e.target.closest('[data-cart]');
  if (cartBtn) { addCart(Number(cartBtn.dataset.cart)); return; }

  const nav = e.target.closest('.nav');
  if (nav) {
    mode = nav.dataset.tab;
    setActiveNav(mode);
    if (mode === 'cart') openCart(); else { closeCart(); renderProducts(); }
    return;
  }

  const minus = e.target.closest('[data-qty-minus]');
  if (minus) { changeQty(Number(minus.dataset.qtyMinus), -1); return; }

  const plus = e.target.closest('[data-qty-plus]');
  if (plus) { changeQty(Number(plus.dataset.qtyPlus), 1); return; }
});

$('#search').addEventListener('input', renderProducts);
$('#showAll').addEventListener('click', () => { mode = 'catalog'; activeCat = 'все'; setActiveNav('catalog'); closeCart(); applyLanguage(); });
$('#favBtn').addEventListener('click', () => { mode = 'fav'; setActiveNav('fav'); closeCart(); renderProducts(); });
$('#closeCart').addEventListener('click', closeCart);
$('#checkout').addEventListener('click', checkout);
$('#cartSheet').addEventListener('click', (e) => { if (e.target.id === 'cartSheet') closeCart(); });

applyLanguage();
