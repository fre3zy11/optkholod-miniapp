const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.requestFullscreen?.(); } catch (e) {}
}

const products = [
  {id:1,name:{ru:'Голубика «Свежезамороженная»',en:'Frozen Blueberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p1.jpg',tag:'ягоды'},
  {id:2,name:{ru:'Грибы белые целые 1 сорт',en:'Whole Porcini Mushrooms, Grade 1'},cat:{ru:'Замороженные грибы',en:'Frozen mushrooms'},price:0,img:'assets/p2.jpg',tag:'грибы'},
  {id:3,name:{ru:'Картофель фри 9×9 мм Fry Me',en:'French Fries 9×9 mm Fry Me'},cat:{ru:'Замороженный картофель',en:'Frozen potatoes'},price:0,img:'assets/p3.jpg',tag:'картофель'},
  {id:4,name:{ru:'Смесь «Попрошайка» 1×10 кг',en:'Vegetable Mix “Poproshaika” 1×10 kg'},cat:{ru:'Замороженные овощи',en:'Frozen vegetables'},price:0,img:'assets/p4.jpg',tag:'овощи'},
  {id:5,name:{ru:'Малина «Свежезамороженная»',en:'Frozen Raspberries'},cat:{ru:'Замороженные ягоды',en:'Frozen berries'},price:0,img:'assets/p5.jpg',tag:'ягоды'},
  {id:6,name:{ru:'Пельмени «Иркутские» Мириталь',en:'Irkutskie Dumplings Mirital'},cat:{ru:'Замороженные полуфабрикаты',en:'Frozen ready meals'},price:0,img:'assets/p6.jpg',tag:'полуфабрикаты'}
];

const translations = {
  ru: {
    lang:'RU', currency:'RUB',
    heroTitle:'Ассортимент',
    heroText:'Замороженные продукты питания оптом с доставкой по всей России',
    search:'Поиск товаров',
    showAll:'Смотреть все ›',
    new:'Новинки',
    catalog:'Каталог',
    fav:'Избранное',
    cart:'Корзина',
    add:'🛒 В корзину',
    emptyProducts:'Товары не найдены',
    emptyCart:'Корзина пустая',
    total:'Итого',
    cats:{
      все:'ВСЕ',
      ягоды:'ЯГОДЫ',
      фрукты:'ФРУКТЫ',
      овощи:'ОВОЩИ',
      грибы:'ГРИБЫ',
      картофель:'КАРТОФЕЛЬ',
      полуфабрикаты:'ПОЛУФАБРИКАТЫ'
    },
    catalogItems:[
      {key:'ягоды', title:'Ягоды'},
      {key:'фрукты', title:'Фрукты'},
      {key:'овощи', title:'Овощи'},
      {key:'грибы', title:'Грибы'},
      {key:'картофель', title:'Картофель и блюда'},
      {key:'полуфабрикаты', title:'Полуфабрикаты'},
      {key:'мясо', title:'Мясо, птица'},
      {key:'рыба', title:'Рыба и морепродукты'},
      {key:'тесто', title:'Выпечка и тесто'},
      {key:'молоко', title:'Молочные продукты'},
      {key:'напитки', title:'Напитки'},
      {key:'соусы', title:'Соусы и приправы'},
      {key:'бакалея', title:'Бакалея'}
    ]
  },
  en: {
    lang:'EN', currency:'RUB',
    heroTitle:'Product Range',
    heroText:'Wholesale frozen foods with delivery across Russia',
    search:'Search products',
    showAll:'View all ›',
    new:'New',
    catalog:'Catalog',
    fav:'Favorites',
    cart:'Cart',
    add:'🛒 Add to cart',
    emptyProducts:'No products found',
    emptyCart:'Cart is empty',
    total:'Total',
    cats:{
      все:'ALL',
      ягоды:'BERRIES',
      фрукты:'FRUIT',
      овощи:'VEGETABLES',
      грибы:'MUSHROOMS',
      картофель:'POTATOES',
      полуфабрикаты:'READY MEALS'
    },
    catalogItems:[
      {key:'ягоды', title:'Berries'},
      {key:'фрукты', title:'Fruit'},
      {key:'овощи', title:'Vegetables'},
      {key:'грибы', title:'Mushrooms'},
      {key:'картофель', title:'Potatoes and dishes'},
      {key:'полуфабрикаты', title:'Ready meals'},
      {key:'мясо', title:'Meat and poultry'},
      {key:'рыба', title:'Fish and seafood'},
      {key:'тесто', title:'Bakery and dough'},
      {key:'молоко', title:'Dairy products'},
      {key:'напитки', title:'Drinks'},
      {key:'соусы', title:'Sauces and spices'},
      {key:'бакалея', title:'Grocery'}
    ]
  }
};

const cats = ['все','ягоды','фрукты','овощи','грибы','картофель','полуфабрикаты'];

let currentLang = localStorage.getItem('lang') || 'ru';
let activeCat = 'все';
let mode = 'new';
let fav = JSON.parse(localStorage.getItem('fav') || '[]');
let cart = JSON.parse(localStorage.getItem('cart') || '{}');

const $ = (s) => document.querySelector(s);
const t = (key) => translations[currentLang][key];
const money = (n) => `${Number(n).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {minimumFractionDigits:2})} ₽`;

function save(){
  localStorage.setItem('fav', JSON.stringify(fav));
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCount(){
  $('#cartCount').textContent = Object.values(cart).reduce((a,b)=>a+Number(b),0);
}

function setActiveNav(tab){
  document.querySelectorAll('.nav').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
}

function renderCats(){
  $('#categories').innerHTML = cats.map(c => `
    <button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}" type="button">${translations[currentLang].cats[c]}</button>
  `).join('');
}

function productCard(p){
  return `
    <article class="card">
      <button class="fav ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" type="button">♡</button>
      <div class="pic"><img src="${p.img}" alt="${p.name[currentLang]}"></div>
      <div class="body">
        <h3 class="name">${p.name[currentLang]}</h3>
        <div class="cat">${p.cat[currentLang]}</div>
        <div class="price">${money(p.price)}</div>
        <button class="add" data-cart="${p.id}" type="button">${t('add')}</button>
      </div>
    </article>
  `;
}

function filteredProducts(){
  const q = ($('#search').value || '').toLowerCase();
  return products.filter(p => {
    const name = p.name[currentLang].toLowerCase();
    const cat = p.cat[currentLang].toLowerCase();
    const inCategory = activeCat === 'все' || p.tag === activeCat;
    return inCategory && (name.includes(q) || cat.includes(q));
  });
}

function renderProducts(){
  let arr = filteredProducts();
  if (mode === 'fav') arr = arr.filter(p => fav.includes(p.id));

  $('#view').innerHTML = `
    <div class="grid">
      ${arr.length ? arr.map(productCard).join('') : `<div class="empty">${t('emptyProducts')}</div>`}
    </div>
  `;
}

function renderCatalog(){
  $('#view').innerHTML = `
    <div class="catalog-list">
      ${translations[currentLang].catalogItems.map(item => `
        <button class="catalog-item" data-catalog-cat="${item.key}" type="button">
          <span>${item.title}</span>
          <span>›</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderCart(){
  const entries = Object.entries(cart);
  const rows = entries.map(([id, qty]) => {
    const p = products.find(x => x.id === Number(id));
    if (!p) return '';
    return `
      <div class="cart-card">
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
        <button class="remove" data-remove="${p.id}" type="button">♙</button>
      </div>
    `;
  }).join('');

  const total = entries.reduce((sum,[id,qty]) => {
    const p = products.find(x => x.id === Number(id));
    return sum + (p ? p.price * Number(qty) : 0);
  },0);

  $('#view').innerHTML = entries.length ? `
    <div class="cart-list">${rows}</div>
    <div class="cart-total">
      <span>${t('total')}</span>
      <b>${money(total)}</b>
    </div>
  ` : `<div class="empty">${t('emptyCart')}</div>`;
}

function render(){
  updateCount();
  setActiveNav(mode);
  $('#hero').style.display = mode === 'new' ? 'block' : 'none';
  $('#categories').style.display = mode === 'new' ? 'flex' : 'none';
  $('#showAll').style.display = mode === 'new' || mode === 'fav' ? 'inline-block' : 'none';
  $('#pageTitle').textContent = mode === 'fav' ? t('fav') : mode === 'catalog' ? t('catalog') : mode === 'cart' ? t('cart') : t('new');

  if (mode === 'catalog') renderCatalog();
  else if (mode === 'cart') renderCart();
  else renderProducts();
}

function applyLanguage(){
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  $('#langBtn').textContent = t('lang');
  $('#currencyBtn').textContent = t('currency');
  $('.hero h1').textContent = t('heroTitle');
  $('.hero p').textContent = t('heroText');
  $('#search').placeholder = t('search');
  $('#showAll').textContent = t('showAll');
  document.querySelector('[data-tab="new"] .nav-text').textContent = t('new');
  document.querySelector('[data-tab="catalog"] .nav-text').textContent = t('catalog');
  document.querySelector('[data-tab="fav"] .nav-text').textContent = t('fav');
  document.querySelector('[data-tab="cart"] .nav-text').textContent = t('cart');
  renderCats();
  render();
}

function addCart(id){
  cart[id] = (cart[id] || 0) + 1;
  save();
  updateCount();
  tg?.HapticFeedback?.impactOccurred('light');
}

function toggleFav(id){
  fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id];
  save();
  render();
}

function changeQty(id, delta){
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  save();
  render();
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
    renderCats();
    renderProducts();
    return;
  }

  const catalogCat = e.target.closest('[data-catalog-cat]');
  if (catalogCat) {
    activeCat = catalogCat.dataset.catalogCat;
    mode = 'new';
    applyLanguage();
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
    render();
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
    delete cart[remove.dataset.remove];
    save();
    render();
  }
});

$('#search').addEventListener('input', () => {
  if (mode !== 'new' && mode !== 'fav') mode = 'new';
  render();
});

$('#showAll').addEventListener('click', () => {
  mode = 'catalog';
  render();
});

$('#favBtn').addEventListener('click', () => {
  mode = 'fav';
  render();
});

applyLanguage();
