let adminPassword = sessionStorage.getItem('ADMIN_PASSWORD') || '';
let products = [], orders = [], editingId = null, currentSection = sessionStorage.getItem('ADMIN_SECTION') || 'catalog', modalOpener = null, englishNameManuallyEdited = false, translationTimer = null, translationRequest = 0, lastTranslatedRussian = '';
if(!['catalog','orders','categories','history','notifications','offers'].includes(currentSection))currentSection='catalog';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = value => `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(value||0))} ₽`;
const title = p => p?.name?.ru || p?.name?.en || `Товар #${p.id}`;
const category = p => p?.cat?.ru || p?.cat?.en || 'Без категории';
const icon = name => `<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

function setStatus(text='', ok=true){const el=$('#status');el.textContent=text;el.classList.toggle('error',!ok);el.classList.toggle('visible',Boolean(text));clearTimeout(setStatus.timer);if(text)setStatus.timer=setTimeout(()=>el.classList.remove('visible'),3500)}
async function api(path,options={}){const headers={'X-Admin-Password':adminPassword,...(options.headers||{})};if(!(options.body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(path,{...options,headers});const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false)throw new Error(data.error||data.message||'Не удалось выполнить запрос');return data}

function applySectionVisibility(section){
  $$('[data-section]').forEach(button=>button.classList.toggle('active',button.dataset.section===section));
  $('.catalog-panel').classList.toggle('hidden',section!=='catalog');$('#ordersView').classList.toggle('hidden',section!=='orders');$('#categoriesView').classList.toggle('hidden',section!=='categories');$('#historyView').classList.toggle('hidden',section!=='history');$('#notificationsView').classList.toggle('hidden',section!=='notifications');$('#offersView').classList.toggle('hidden',section!=='offers');$('.stats').classList.toggle('hidden',section!=='catalog');
  $('#openCreateBtn').classList.toggle('hidden',section!=='catalog');$('#importPriceBtn').classList.toggle('hidden',section!=='catalog');
  const names={catalog:'Каталог товаров',orders:'Заказы',categories:'Категории',history:'История цен',notifications:'Уведомления',offers:'Холодные предложения'};$('#pageHeading').textContent=names[section];
}
function showDashboard(){$('#loginView').classList.add('hidden');$('#panel').classList.remove('hidden');$('#reloadBtn').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');applySectionVisibility(currentSection)}
function updateStats(){const prices=products.filter(p=>(p.priceUnit||'кг')==='кг').map(p=>Number(p.pricePerKg||0)).filter(Boolean),cats=new Set(products.map(category).filter(c=>c!=='Без категории')),complete=products.filter(p=>title(p)&&Number(p.pricePerKg)>0&&category(p)!=='Без категории'&&p.desc?.ru&&p.desc?.en).length;$('#totalProducts').textContent=products.length;$('#averagePrice').textContent=money(prices.reduce((a,b)=>a+b,0)/(prices.length||1));$('#totalCategories').textContent=cats.size;$('#catalogHealth').textContent=`${Math.round(complete/(products.length||1)*100)}%`;$('#catalogCaption').textContent=`${products.length} позиций · ${products.filter(p=>p.visible!==false).length} опубликовано · ${products.filter(p=>p.img).length} с фото`}
async function loadProducts(){setStatus('Обновляем каталог…');const data=await api('/api/admin/products');products=(data.products||[]).sort((a,b)=>(a.sortOrder??9999)-(b.sortOrder??9999));renderProducts();renderCategories();updateStats();showDashboard();loadOrders().catch(()=>{});setStatus('Каталог обновлён')}

function renderProducts(){
  const q=($('#search').value||'').trim().toLowerCase();
  const list=products.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  $('#products').innerHTML=list.map(p=>{
    const name=title(p), isHidden=p.visible===false, toggleLabel=isHidden?'Опубликовать':'Скрыть';
    const picture=p.img
      ? `<img src="/${esc(p.img)}" alt="${esc(name)}" loading="lazy" decoding="async">`
      : `<div class="no-img" role="img" aria-label="Фото скоро">${icon('image')}</div>`;
    return `<article class="product ${isHidden?'is-hidden':''}" data-id="${Number(p.id)}">
      <div class="product-info">${picture}<div><h3>${esc(name)}${isHidden?'<em>Скрыт</em>':''}</h3><p>${esc(category(p))}</p></div></div>
      <label class="field-suffix"><span class="mobile-field-label">Цена с НДС</span><input class="price" aria-label="Цена с НДС: ${esc(name)}" type="number" min="0" step="0.01" value="${Number(p.pricePerKg||0)}"><span>₽/${esc(p.priceUnit||'кг')}</span></label>
      <label class="field-suffix"><span class="mobile-field-label">Минимум</span><input class="pack" aria-label="Минимальное количество: ${esc(name)}" type="number" min="0" step="${p.priceUnit==='кг'?'0.1':'1'}" value="${Number(p.packKg||10)}"><span>${esc(p.priceUnit||'кг')}</span></label>
      <div class="actions"><button class="save" data-save type="button" aria-label="Сохранить ${esc(name)}">${icon('check')}<span>Сохранить</span></button><button data-toggle type="button" title="${toggleLabel}" aria-label="${toggleLabel}: ${esc(name)}">${icon(isHidden?'eye':'eye-off')}</button><button data-edit type="button" title="Редактировать" aria-label="Редактировать: ${esc(name)}">${icon('edit')}</button><button class="danger" data-delete type="button" title="Удалить" aria-label="Удалить: ${esc(name)}">${icon('trash')}</button></div>
    </article>`;
  }).join('')||'<div class="empty">Ничего не найдено.</div>';
}

async function saveQuick(card,button){
  if(button.disabled)return;
  const id=Number(card.dataset.id),p=products.find(x=>Number(x.id)===id),price=card.querySelector('.price'),pack=card.querySelector('.pack');
  const payload={pricePerKg:Number(price.value),packKg:Number(pack.value)};
  if(!Number.isFinite(payload.pricePerKg)||payload.pricePerKg<=0||!Number.isFinite(payload.packKg)||payload.packKg<=0){setStatus('Цена и минимальное количество должны быть больше нуля',false);return}
  const original=button.innerHTML;
  button.disabled=true;button.classList.remove('is-saved','is-error');button.classList.add('is-loading');button.innerHTML=`<span class="button-spinner" aria-hidden="true"></span><span>Сохраняем</span>`;
  try{
    const data=await api(`/api/admin/products/${id}`,{method:'POST',body:JSON.stringify(payload)});
    Object.assign(p,data.product);price.value=Number(p.pricePerKg||0);pack.value=Number(p.packKg||0);updateStats();
    button.classList.remove('is-loading');button.classList.add('is-saved');button.innerHTML=`${icon('check')}<span>Сохранено</span>`;setStatus(`Сохранено: ${title(p)}`);
    setTimeout(()=>{if(button.isConnected){button.classList.remove('is-saved');button.innerHTML=original;button.disabled=false}},1500);
  }catch(error){
    button.classList.remove('is-loading');button.classList.add('is-error');button.innerHTML=`${icon('close')}<span>Ошибка</span>`;button.disabled=false;setStatus(error.message,false);
    setTimeout(()=>{if(button.isConnected){button.classList.remove('is-error');button.innerHTML=original}},1800);
  }
}
async function toggleVisible(card){const p=products.find(x=>Number(x.id)===Number(card.dataset.id)),data=await api(`/api/admin/products/${p.id}`,{method:'POST',body:JSON.stringify({visible:p.visible===false})});Object.assign(p,data.product);renderProducts();updateStats();setStatus(p.visible===false?'Товар скрыт':'Товар опубликован')}

function resetForm(){editingId=null;englishNameManuallyEdited=false;lastTranslatedRussian='';clearTimeout(translationTimer);['#newNameRu','#newNameEn','#newCatRu','#newPrice','#newPack','#newImg','#newDescRu'].forEach(id=>$(id).value='');$('#newPriceUnit').value='кг';$('#newVisible').checked=true;$('#uploadStatus').textContent='JPG, PNG или WEBP · до 10 МБ';$('#translationHint').textContent='Введите русское название — перевод появится автоматически через небольшую задержку.';setTranslateButtonLoading(false);$('#modalEyebrow').textContent='Новая позиция';$('#createTitle').textContent='Добавить товар';$('#createBtn').innerHTML=`${icon('plus')}<span>Добавить товар</span>`}
function openCreate(){resetForm();openModal()}
function openEdit(id){const p=products.find(x=>Number(x.id)===Number(id));if(!p)return;editingId=p.id;englishNameManuallyEdited=false;lastTranslatedRussian=p.name?.ru||'';clearTimeout(translationTimer);translationRequest++;setTranslateButtonLoading(false);$('#newNameRu').value=p.name?.ru||'';$('#newNameEn').value=p.name?.en||'';$('#newCatRu').value=p.cat?.ru||'';$('#newPrice').value=p.pricePerKg||0;$('#newPriceUnit').value=p.priceUnit||'кг';$('#newPack').value=p.packKg||10;$('#newImg').value=p.img||'';$('#newDescRu').value=p.desc?.ru||'';$('#newVisible').checked=p.visible!==false;$('#translationHint').textContent='Английское название можно изменить вручную.';$('#modalEyebrow').textContent='Редактирование';$('#createTitle').textContent=title(p);$('#createBtn').innerHTML=`${icon('check')}<span>Сохранить изменения</span>`;openModal()}
function openModal(){modalOpener=document.activeElement;$('#createModal').classList.remove('hidden');$('#createModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('#newNameRu').focus(),50)}
function closeModal(restoreFocus=true){if($('#createModal').classList.contains('hidden'))return;clearTimeout(translationTimer);translationRequest++;setTranslateButtonLoading(false);$('#createModal').classList.add('hidden');$('#createModal').setAttribute('aria-hidden','true');document.body.style.overflow='';if(restoreFocus!==false)modalOpener?.focus?.();modalOpener=null}
function setTranslateButtonLoading(loading){const button=$('#translateNameBtn');button.disabled=loading;button.innerHTML=loading?'<span class="button-spinner" aria-hidden="true"></span><span>Переводим…</span>':`${icon('refresh')}<span>Перевести заново</span>`}
async function translateRussianName(force=false){
  const text=$('#newNameRu').value.trim(),request=++translationRequest;if(!text){if(!englishNameManuallyEdited)$('#newNameEn').value='';$('#translationHint').textContent='Введите русское название — перевод появится автоматически через небольшую задержку.';setTranslateButtonLoading(false);return}
  if(englishNameManuallyEdited&&!force)return;
  setTranslateButtonLoading(true);$('#translationHint').textContent='Переводим название…';
  try{const data=await api('/api/admin/translate-name',{method:'POST',body:JSON.stringify({text})});if(request!==translationRequest||englishNameManuallyEdited&&!force)return;$('#newNameEn').value=data.translation;lastTranslatedRussian=text;englishNameManuallyEdited=false;const messages={catalog:'Готовый перевод из каталога. Его можно изменить.',local:'Переведено по словарю товаров. Текст можно изменить.',cache:'Готовый перевод загружен из защищённого кеша.',yandex:'Переведено через Yandex Cloud. Проверьте название и при необходимости измените.'};$('#translationHint').textContent=messages[data.source]||'Автоперевод готов. Проверьте его и при необходимости измените.'}
  catch(error){if(request===translationRequest)$('#translationHint').textContent=`Не удалось перевести: ${error.message}`}
  finally{if(request===translationRequest)setTranslateButtonLoading(false)}
}
function scheduleNameTranslation(){clearTimeout(translationTimer);if(englishNameManuallyEdited)return;$('#translationHint').textContent='Ждём окончания ввода…';translationTimer=setTimeout(()=>translateRussianName(),320)}
async function saveFullProduct(){const russianName=$('#newNameRu').value.trim();clearTimeout(translationTimer);if(russianName&&!englishNameManuallyEdited&&lastTranslatedRussian!==russianName)await translateRussianName(true);const focusId=editingId,payload={nameRu:russianName,nameEn:$('#newNameEn').value.trim(),catRu:$('#newCatRu').value.trim(),pricePerKg:Number($('#newPrice').value),priceUnit:$('#newPriceUnit').value,packKg:Number($('#newPack').value||10),img:$('#newImg').value.trim(),descRu:$('#newDescRu').value.trim(),visible:$('#newVisible').checked};if(!payload.nameRu||!payload.nameEn||!payload.pricePerKg)throw new Error('Укажите название и цену');if(editingId){const data=await api(`/api/admin/products/${editingId}`,{method:'POST',body:JSON.stringify(payload)}),index=products.findIndex(p=>p.id===editingId);products[index]=data.product;setStatus('Изменения сохранены')}else{const data=await api('/api/admin/products',{method:'POST',body:JSON.stringify(payload)});products.push(data.product);setStatus('Товар добавлен')}closeModal(false);renderProducts();renderCategories();updateStats();requestAnimationFrame(()=>{const target=focusId?document.querySelector(`.product[data-id="${Number(focusId)}"] [data-edit]`):$('#openCreateBtn');(target||$('#search')||$('#openCreateBtn'))?.focus()})}
async function uploadImage(file){if(!file)return;const form=new FormData();form.append('image',file);$('#uploadStatus').textContent='Загружаем изображение…';const data=await api('/api/admin/upload',{method:'POST',body:form});$('#newImg').value=data.path;$('#uploadStatus').textContent='Изображение загружено'}
async function removeProduct(card){const p=products.find(x=>Number(x.id)===Number(card.dataset.id));if(!confirm(`Удалить «${title(p)}»?`))return;await api(`/api/admin/products/${p.id}`,{method:'DELETE'});products=products.filter(x=>x.id!==p.id);renderProducts();renderCategories();updateStats();setStatus('Товар удалён')}

function renderCategories(){
  const groups={};
  products.forEach(p=>(groups[category(p)]??=[]).push(p));
  $('#categoryGroups').innerHTML=Object.entries(groups).map(([name,items])=>`<section class="category-block"><header><div><h3>${esc(name)}</h3><small>${items.length} товаров</small></div></header><div>${items.map((p,index)=>{
    const productTitle=title(p);
    const picture=p.img?`<img src="/${esc(p.img)}" alt="${esc(productTitle)}" loading="lazy" decoding="async">`:`<span class="no-img" role="img" aria-label="Фото скоро">${icon('image')}</span>`;
    return `<article class="sort-item" data-id="${p.id}"><span class="drag" aria-hidden="true">${icon('grip')}</span>${picture}<b>${esc(productTitle)}</b><div><button type="button" data-move="up" aria-label="Поднять ${esc(productTitle)}" ${index===0?'disabled':''}>${icon('up')}</button><button type="button" data-move="down" aria-label="Опустить ${esc(productTitle)}" ${index===items.length-1?'disabled':''}>${icon('down')}</button></div></article>`;
  }).join('')}</div></section>`).join('')||'<div class="empty">Категорий пока нет</div>';
}
async function moveProduct(id,direction){const index=products.findIndex(p=>p.id===id),p=products[index],same=products.map((x,i)=>({x,i})).filter(v=>category(v.x)===category(p)),pos=same.findIndex(v=>v.x.id===id),target=same[pos+(direction==='up'?-1:1)];if(!target)return;[products[index],products[target.i]]=[products[target.i],products[index]];const data=await api('/api/admin/products/reorder',{method:'POST',body:JSON.stringify({ids:products.map(x=>x.id)})});products=data.products;renderProducts();renderCategories();setStatus('Порядок сохранён')}
async function loadHistory(){const data=await api('/api/admin/history');$('#historyList').innerHTML=(data.history||[]).map(item=>`<article><span>₽</span><div><b>${esc(item.productName)}</b><small>${new Date(item.changedAt).toLocaleString('ru-RU')}</small></div><div class="price-change"><del>${money(item.oldPrice)}</del><strong>${money(item.newPrice)}</strong></div></article>`).join('')||'<div class="empty">Изменений цен пока нет</div>'}
async function loadNotifications(){const data=await api('/api/admin/notifications');$('#notifyOrders').checked=data.settings.newOrders;$('#notifyStock').checked=data.settings.lowStock}
async function saveNotifications(){await api('/api/admin/notifications',{method:'POST',body:JSON.stringify({newOrders:$('#notifyOrders').checked,lowStock:$('#notifyStock').checked})});setStatus('Настройки уведомлений сохранены')}
async function importPrice(file){if(!file)return;const form=new FormData();form.append('price',file);setStatus('Импортируем прайс…');const data=await api('/api/admin/import-price',{method:'POST',body:form});await loadProducts();setStatus(`Прайс импортирован: добавлено ${data.added}, обновлено ${data.updated}, без цены ${data.unavailable||0}`)}
async function sendOffer(){const text=$('#offerText').value.trim();if(!text)throw new Error('Введите текст предложения');if(!confirm('Отправить это предложение всем подписчикам бота?'))return;const data=await api('/api/admin/broadcast',{method:'POST',body:JSON.stringify({text})});setStatus(`Рассылка завершена: отправлено ${data.sent}, ошибок ${data.failed}`)}

const orderStatus={new:['Новый','new'],processing:['В работе','processing'],completed:['Завершён','completed'],cancelled:['Отменён','cancelled']};
const orderDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Дата не указана':date.toLocaleString('ru-RU',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})};
function renderOrders(){
  const q=($('#ordersSearch').value||'').trim().toLowerCase(),filter=$('#ordersFilter').value;
  const list=orders.filter(order=>(filter==='all'||(order.status||'new')===filter)&&(!q||JSON.stringify(order).toLowerCase().includes(q)));
  $('#ordersList').innerHTML=list.map(order=>{
    const buyer=order.buyer||{},status=order.status||'new',meta=orderStatus[status]||orderStatus.new,username=String(buyer.username||'').replace(/^@/,'');
    const items=(order.items||[]).map(item=>`<li><div><b>${esc(item.name||`Товар #${item.id}`)}</b><small>${Number(item.amount||item.weight||0)} ${esc(item.unit||'кг')} × ${Number(item.qty||1)} · ${money(item.pricePerKg)}/${esc(item.unit||'кг')}</small></div><strong>${money(item.total)}</strong></li>`).join('');
    const contact=username?`<a href="https://t.me/${encodeURIComponent(username)}" target="_blank" rel="noopener">@${esc(username)}</a>`:'<span>без username</span>';
    const phone=order.phone?`<span>📞 ${esc(order.phone)}</span>`:'';
    return `<article class="order-card" data-order-id="${esc(order.orderId)}">
      <header><div><span class="order-status ${meta[1]}">${esc(meta[0])}</span><h3>${esc(order.orderId||'Заказ без номера')}</h3><time>${esc(orderDate(order.createdAt))}</time></div><strong>${money(order.total)}</strong></header>
      <div class="order-body"><section class="order-buyer"><small>Покупатель</small><b>${esc(buyer.firstName||'Клиент')}</b>${contact}${phone}<span>Telegram ID: ${esc(buyer.id||'не указан')}</span></section><ul>${items||'<li class="order-empty-item">Состав заказа не указан</li>'}</ul></div>
      <footer><div><small>Уведомление менеджеру</small><span class="notification-state ${esc(order.notificationStatus||'pending')}">${order.notificationStatus==='sent'?'Отправлено':order.notificationStatus==='failed'?'Ошибка отправки':order.notificationStatus==='disabled'?'Отключено':'Ожидает отправки'}</span></div><label>Статус<select class="order-status-select" aria-label="Статус заказа ${esc(order.orderId)}"><option value="new" ${status==='new'?'selected':''}>Новый</option><option value="processing" ${status==='processing'?'selected':''}>В работе</option><option value="completed" ${status==='completed'?'selected':''}>Завершён</option><option value="cancelled" ${status==='cancelled'?'selected':''}>Отменён</option></select></label></footer>
    </article>`;
  }).join('')||'<div class="empty orders-empty">Заказов с такими параметрами пока нет.</div>';
}
function updateOrderStats(){
  const count=status=>orders.filter(order=>(order.status||'new')===status).length;
  $('#newOrdersCount').textContent=count('new');$('#processingOrdersCount').textContent=count('processing');$('#completedOrdersCount').textContent=count('completed');
  $('#ordersRevenue').textContent=money(orders.filter(order=>(order.status||'new')!=='cancelled').reduce((sum,order)=>sum+Number(order.total||0),0));
  $('#ordersCaption').textContent=`${orders.length} заказов · ${count('new')} требуют внимания`;
  const badge=$('#ordersBadge');badge.textContent=count('new');badge.classList.toggle('hidden',count('new')===0);
}
async function loadOrders(){
  $('#ordersList').innerHTML='<div class="empty">Загружаем заказы…</div>';
  const data=await api('/api/admin/orders');orders=data.orders||[];updateOrderStats();renderOrders();
}
async function updateOrderStatus(select){
  const card=select.closest('.order-card'),order=orders.find(item=>item.orderId===card.dataset.orderId),previous=order.status||'new';
  select.disabled=true;
  try{const data=await api(`/api/admin/orders/${encodeURIComponent(order.orderId)}/status`,{method:'POST',body:JSON.stringify({status:select.value})});Object.assign(order,data.order);updateOrderStats();renderOrders();setStatus(`Статус заказа ${order.orderId} обновлён`)}
  catch(error){select.value=previous;select.disabled=false;setStatus(error.message,false)}
}

function switchSection(section){currentSection=section;sessionStorage.setItem('ADMIN_SECTION',section);applySectionVisibility(section);if(section==='orders')loadOrders().catch(e=>{$('#ordersList').innerHTML='<div class="empty">Не удалось загрузить заказы.</div>';setStatus(e.message,false)});if(section==='history')loadHistory().catch(e=>setStatus(e.message,false));if(section==='notifications')loadNotifications().catch(e=>setStatus(e.message,false))}
async function reloadCurrentSection(){if(currentSection==='orders'){await loadOrders();setStatus('Заказы обновлены');return}if(currentSection==='history'){await loadHistory();setStatus('История цен обновлена');return}if(currentSection==='notifications'){await loadNotifications();setStatus('Настройки обновлены');return}await loadProducts()}

$('#password').value=adminPassword;
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();adminPassword=$('#password').value.trim();$('#loginStatus').textContent='';try{await loadProducts();sessionStorage.setItem('ADMIN_PASSWORD',adminPassword)}catch(error){$('#loginStatus').textContent=error.message||'Неверный пароль'}});
$('#togglePassword').onclick=()=>{const el=$('#password'),button=$('#togglePassword'),show=el.type==='password';el.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль');button.querySelector('use').setAttribute('href',show?'#i-eye-off':'#i-eye')};
$('#reloadBtn').onclick=()=>reloadCurrentSection().catch(e=>setStatus(e.message,false));$('#search').oninput=renderProducts;$('#openCreateBtn').onclick=openCreate;$('#createBtn').onclick=()=>saveFullProduct().catch(e=>setStatus(e.message,false));$('#imageUpload').onchange=e=>uploadImage(e.target.files[0]).catch(err=>{$('#uploadStatus').textContent=err.message});$('#logoutBtn').onclick=()=>{sessionStorage.removeItem('ADMIN_PASSWORD');sessionStorage.removeItem('ADMIN_SECTION');location.reload()};$('#saveNotifications').onclick=()=>saveNotifications().catch(e=>setStatus(e.message,false));$('#testNotification').onclick=()=>api('/api/admin/notifications/test',{method:'POST',body:'{}'}).then(()=>setStatus('Тест отправлен в Telegram')).catch(e=>setStatus(e.message,false));
$('#priceImport').onchange=e=>importPrice(e.target.files[0]).catch(x=>setStatus(x.message,false));$('#offerText').oninput=e=>$('#offerPreview').textContent=e.target.value||'Здесь появится текст рассылки';$('#sendOffer').onclick=()=>sendOffer().catch(e=>setStatus(e.message,false));
$('#newNameRu').oninput=scheduleNameTranslation;$('#newNameEn').oninput=()=>{englishNameManuallyEdited=true;translationRequest++;setTranslateButtonLoading(false);$('#translationHint').textContent='Изменено вручную — автоперевод больше не заменит этот текст.'};$('#translateNameBtn').onclick=()=>{englishNameManuallyEdited=false;translateRussianName(true)};
$('#reloadOrders').onclick=()=>loadOrders().then(()=>setStatus('Заказы обновлены')).catch(e=>setStatus(e.message,false));$('#ordersSearch').oninput=renderOrders;$('#ordersFilter').onchange=renderOrders;
$$('[data-close-modal]').forEach(el=>el.onclick=()=>closeModal());$$('[data-section]').forEach(el=>el.onclick=()=>switchSection(el.dataset.section));document.addEventListener('keydown',e=>{const modal=$('#createModal');if(e.key==='Escape'&&!modal.classList.contains('hidden')){e.preventDefault();closeModal();return}if(e.key!=='Tab'||modal.classList.contains('hidden'))return;const focusable=[...modal.querySelectorAll('button,input,textarea,select,[href]')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
document.addEventListener('click',e=>{const card=e.target.closest('.product');if(card){const save=e.target.closest('[data-save]');if(save)saveQuick(card,save);if(e.target.closest('[data-toggle]'))toggleVisible(card).catch(x=>setStatus(x.message,false));if(e.target.closest('[data-edit]'))openEdit(card.dataset.id);if(e.target.closest('[data-delete]'))removeProduct(card).catch(x=>setStatus(x.message,false))}const move=e.target.closest('[data-move]');if(move){const item=move.closest('.sort-item');moveProduct(Number(item.dataset.id),move.dataset.move).catch(x=>setStatus(x.message,false))}});
document.addEventListener('change',e=>{const select=e.target.closest('.order-status-select');if(select)updateOrderStatus(select)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.product .price, .product .pack')){e.preventDefault();const card=e.target.closest('.product'),save=card.querySelector('[data-save]');saveQuick(card,save)}});
if(adminPassword)loadProducts().catch(()=>sessionStorage.removeItem('ADMIN_PASSWORD'));
