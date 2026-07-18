import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const catalogPath = resolve('web/products.json');

const categoryTranslations = {
  'Весовые овощи,ягоды,фрукты': 'Bulk Frozen Vegetables, Berries and Fruit',
  'БАЙСАД (РОССИЯ) ЦЕНЫ ЗА КГ': 'BAYSAD (RUSSIA) · PRICES PER KG',
  'BETA TRADE (КИТАЙ) ЦЕНЫ ЗА КГ': 'BETA TRADE (CHINA) · PRICES PER KG',
  'Lamb Weston(Нидерланды) ЦЕНЫ ЗА КГ': 'Lamb Weston (Netherlands) · PRICES PER KG',
  'GLOBAL FRIES/POMUNI(БЕЛЬГИЯ,ФРАНЦИЯ) ЦЕНЫ ЗА КГ': 'GLOBAL FRIES/POMUNI (BELGIUM, FRANCE) · PRICES PER KG',
  'FARM FRITES(Бельгия, Нидерланды, Польша) ЦЕНЫ ЗА КГ': 'FARM FRITES (Belgium, Netherlands, Poland) · PRICES PER KG',
  'ЮНИБУРГЕР (РОССИЯ) ЦЕНЫ ЗА КГ': 'UNIBURGER (RUSSIA) · PRICES PER KG',
  'КАНТАРЕЛЛА (Россия)': 'CANTARELLA (Russia)',
  'ЧЕРЁМУШКИ (Россия)': 'CHERYOMUSHKI (Russia)',
  'ДОНАТЫ STOKSON (POLAND)': 'STOKSON DONUTS (POLAND)',
  'НИКА (РОССИЯ) ЦЕНЫ ЗА КГ': 'NIKA (RUSSIA) · PRICES PER KG',
  'Замороженный картофель · упаковка 9 кг': 'Frozen potato · 9 kg pack',
  'Замороженный картофель · упаковка 10 кг': 'Frozen potato · 10 kg pack',
  'Замороженный картофель · упаковка 12,5 кг': 'Frozen potato · 12.5 kg pack'
};

const englishNames = {
  7: 'Global Fries straight-cut French fries, 10 mm, 10 kg',
  23: 'Diced pineapple, China, 1 × 10 kg',
  24: 'Frozen broccoli, Uzbekistan, 1 × 7 kg',
  25: 'Uncalibrated broccoli, China, bulk 1 × 10 kg',
  26: 'Uncalibrated broccoli, EC, bulk 1 × 10 kg',
  27: 'Frozen wild lingonberries, bulk 1 × 10 kg',
  28: 'Frozen lingonberries, China, electronic sorting, bulk 1 × 10 kg',
  29: 'Edamame beans, China',
  30: 'Green edamame pods, China, 1 × 10 kg',
  31: 'Brussels sprouts, bulk 1 × 10 kg',
  32: 'Pitted cherries, China, bulk 1 × 10 kg',
  33: 'Pitted cherries, grade 2, China, bulk 1 × 10 kg',
  34: 'HONGMING pitted cherries, China, 10 kg',
  35: 'Pitted cherries B/C, 10 kg',
  36: 'Cherries with pits, Kyrgyzstan, bulk 10 kg',
  37: 'Pitted cherries, Kyrgyzstan, bulk 1 × 10 kg',
  38: 'Pitted cherries, Uzbekistan, bulk 1 × 10 kg',
  39: 'Pitted cherries, Serbia, bulk 1 × 10 kg',
  40: 'Diced porcini mushrooms, bulk 1 × 10 kg',
  41: 'Whole chanterelle mushrooms, bulk',
  42: 'Sliced champignon mushrooms, Belarus, bulk 1 × 10 kg',
  43: 'Frozen blackberries, China, bulk 1 × 10 kg',
  44: 'Green peas, Russia, bulk 1 × 15 kg',
  45: 'Diced kiwi',
  46: 'Strawberries, Egypt, grade A, bulk 1 × 10 kg',
  47: 'Strawberries, China, grade A, bulk 1 × 10 kg',
  48: 'Wild cranberries, bulk 1 × 10 kg',
  49: 'Cultivated cranberries, grade 1, bulk 18.14 kg / 10 kg',
  50: 'Compote mix, Russia, bulk 1 × 10 kg (plum, apple, kiwi, grapes, cornelian cherry)',
  51: 'Pitted compote mix, China, bulk 1 × 10 kg',
  52: 'Redcurrants, China, bulk 1 × 10 kg',
  53: 'Frozen green gooseberries, bulk 1 × 10 kg',
  54: 'Sweetcorn kernels, China, bulk 1 × 10 kg',
  55: 'Broken raspberries, China, bulk 1 × 10 kg',
  56: 'Whole raspberries, China, 4 × 2.5 kg',
  57: 'Whole raspberries, Belarus, bulk 1 × 10 kg',
  58: 'Whole raspberries, Uzbekistan, bulk 1 × 10 kg',
  59: 'Diced mango, China, 1 × 10 kg',
  60: 'Mango slices, China, 1 × 10 kg',
  61: 'Baby carrots, China, 1 × 10 kg',
  62: 'Sea buckthorn berries, China, bulk 1 × 10 kg',
  63: 'Frozen honey mushrooms, bulk 1 × 10 kg',
  64: 'Diced mixed peppers, China, 1 × 10 kg',
  65: 'Mixed pepper strips, China, 1 × 10 kg',
  66: 'Red pepper strips, Uzbekistan, 1 × 10 kg',
  67: 'Red pepper strips, China, 1 × 10 kg',
  68: 'Plum halves, China, bulk 1 × 10 kg',
  69: 'Spring vegetable mix, bulk 1 × 10 kg (carrot, cauliflower, sweet pepper, green peas, zucchini)',
  70: 'Hawaiian mix, Russia, bulk 1 × 10 kg (rice, carrot, sweet pepper, corn, peas)',
  71: 'European side-dish mix, China, 1 × 10 kg (broccoli, cauliflower, crinkle-cut carrot, beans)',
  72: 'Lecho vegetable mix, Russia, bulk 1 × 10 kg',
  73: 'Mexican vegetable mix, Russia, bulk 1 × 10 kg',
  74: 'Romanesco cauliflower, Russia, bulk 8.5 kg',
  75: 'Asparagus, China, 1 × 10 kg',
  76: 'Romano flat beans, China, 1 × 10 kg',
  77: 'Green beans, Egypt, 1 × 10 kg',
  78: 'Green beans, Serbia, 1 × 10 kg',
  79: 'Cauliflower, China, bulk 1 × 10 kg',
  80: 'Cauliflower, Uzbekistan, bulk 1 × 9 kg',
  81: 'Blackcurrants, China, 1 × 10 kg',
  82: 'Blackcurrants, China, 1 × 15 kg',
  83: 'Wild blueberries, 1 × 10 kg',
  84: 'Blueberries, China, 1 × 10 kg',
  85: 'Frozen chokeberries, China, bulk 1 × 10 kg',
  86: 'Portioned chopped spinach, Uzbekistan, bulk 1 × 12 kg',
  87: 'Portioned chopped spinach, China, bulk 1 × 10 kg',
  88: 'Diced apples, China, bulk 1 × 10 kg',
  89: 'BAYSAD frozen French fries, 10 × 10 mm, 2.5 kg × 4',
  90: 'BAYSAD frozen unseasoned potato wedges, 2.5 kg × 4',
  91: 'BETA TRADE quick-frozen French fries, 9 mm, China, 10 kg (2.5 kg × 4)',
  92: 'BETA TRADE quick-frozen triangular hash browns, China, 10 kg (2 kg × 5)',
  93: 'Lamb Weston coated sweet potato fries, 2.5 kg × 4',
  94: 'Lamb Weston seasoned potato wedges, 2.5 kg × 4, W01 IMPORT',
  95: 'Lamb Weston seasoned potato wedges, 2.5 kg × 5, clear bag',
  100: 'POMUNI triangular hash browns, 10 kg (2.5 kg × 4)',
  101: "BART'S GOURMET triangular hash browns, 2.5 kg × 4, F000785",
  102: 'Global Fries unseasoned potato wedges, 2.5 kg × 4',
  103: 'FRIES4US French fries, 10 mm, Belgium, 10 kg (2.5 kg × 4), FR000093',
  104: 'FARM FRITES French fries, 10 mm, 12.5 kg (2.5 kg × 5), 093.014 / 093.081',
  105: 'Farm Frites Crispy Coated French fries, 10 mm, 12.5 kg (2.5 kg × 5), 441.001',
  106: 'Farm Frites BRAVI French fries, 10 mm, 12.5 kg (2.5 kg × 5)',
  107: 'FARM FRITES crinkle fries, 12 mm, 12.5 kg (2.5 kg × 5), 279.012',
  108: 'FARM FRITES French fries, 7 mm, 12.5 kg (2.5 kg × 5), 173.021',
  109: 'FARM FRITES Fast Fry crinkle fries, 12 mm, 12.5 kg (2.5 kg × 5), 278.002',
  110: 'FARM FRITES Fast Fry French fries, 10 mm, 12.5 kg (2.5 kg × 5), 086.013',
  111: 'FARM FRITES unseasoned skin-on wedges, 10 kg (2.5 kg × 4), 337.034',
  112: 'FARM FRITES seasoned potato wedges, 12.5 kg (2.5 kg × 5), 375.001',
  113: 'FARM FRITES Noisettes potato balls, 10 kg (2.5 kg × 4), 760.006',
  114: 'FARM FRITES mashed potato, 10 kg (2.5 kg × 4), 647.003',
  115: 'Farm Frites oval hash browns, 12.5 kg (2.5 kg × 5), 785.002',
  116: 'FARM FRITES chunky triangular hash browns, 10 kg (2.5 kg × 4), 788.003',
  117: 'Farm Frites coated sweet potato fries, 10 kg (2 kg × 5), 486.001',
  118: 'FARM FRITES potato pancakes, 1.5 kg × 6',
  119: 'FARM FRITES Finest Round Cut skin-on fries, 8/12 mm, 2 kg × 6, 402.005',
  121: 'Original breaded mozzarella sticks, 1 case × 4.5 kg',
  122: 'Original mozzarella cheese balls, 1 case × 4.5 kg',
  123: 'Spicy cheese and jalapeño balls, 1 case × 4.5 kg',
  124: 'CANTARELLA “Tales of Lukomorye” mushroom mix, 0.3 kg × 8',
  125: 'CANTARELLA “Secrets of the Forest” mushroom mix, 0.3 kg × 8',
  126: 'CHERYOMUSHKI frozen non-yeasted puff pastry, 0.5 kg × 16, No. 5002',
  127: 'CHERYOMUSHKI frozen yeasted puff pastry, 0.5 kg × 16, No. 5003',
  128: 'STOKSON cappuccino-filled donut, 0.073 kg × 12 (0.876 kg)',
  129: 'STOKSON apple and cinnamon-filled donut, 0.061 kg × 12 (0.732 kg)',
  130: 'STOKSON caramel-filled donut, 0.067 kg × 12 (0.804 kg)',
  131: 'STOKSON Caramelove caramel-flavoured donut, 0.067 kg × 12 (0.804 kg)',
  132: 'STOKSON Panna Cotta donut, 0.069 kg × 12 (0.828 kg)',
  133: 'STOKSON Triple Choc chocolate-filled donut, 0.069 kg × 12 (0.828 kg)',
  134: 'STOKSON strawberry-filled donut, 0.07 kg × 12 (0.84 kg)',
  135: 'STOKSON currant and raspberry-filled Frutti donut, 0.07 kg × 12 (0.84 kg)',
  136: 'STOKSON coconut-filled Coco donut, 0.07 kg × 12 (0.84 kg)',
  137: 'STOKSON nut cream-filled donut, 0.071 kg × 12 (0.852 kg)',
  138: 'STOKSON wild berry-filled donut, 0.07 kg × 12 (0.84 kg)',
  139: 'STOKSON mango-filled donut, 0.07 kg × 12 (0.84 kg)',
  140: 'STOKSON Love strawberry-filled donut, 0.071 kg × 12 (0.852 kg)',
  141: 'Viburnum berries, Russia, bulk 1 × 10 kg',
  142: 'Cultivated cranberries, grade 2, bulk 18.14 kg / 10 kg',
  143: 'Broken raspberries, Belarus, bulk 1 × 10 kg',
  144: 'Diced red pepper, China, 1 × 10 kg',
  145: 'Mixed pepper strips, Russia, 1 × 10 kg',
  146: 'Plum halves, Russia, bulk 1 × 14 kg',
  147: 'Diced tomatoes, Russia, bulk 1 × 10 kg',
  148: 'Frozen diced pumpkin, Russia / Uzbekistan, 1 × 10 kg',
  149: 'Green beans, Russia, 1 × 10 kg',
  150: 'Cauliflower, Egypt, bulk 1 × 10 kg',
  151: 'Cauliflower, Uzbekistan, bulk 1 × 10 kg',
  152: 'Sweet cherries, China, 1 × 10 kg',
  153: 'Sweet cherries, Uzbekistan, 1 × 10 kg',
  154: 'NIKA spicy potato wedges with aromatic paprika, 2.5 kg × 4',
  155: 'NIKA country-style potato wedges, 2.5 kg × 5'
};

const imageById = {
  1: 'assets/products/ff-bravi-10mm.webp',
  2: 'assets/products/potato-wedges.webp',
  3: 'assets/products/potato-wedges.webp',
  4: 'assets/products/potato-balls.webp',
  5: 'assets/products/pomuni-triangles.jpg',
  6: 'assets/products/potato-wedges.webp',
  7: 'assets/products/ff-bravi-10mm.webp',
  8: 'assets/products/ff-regular-10mm.webp',
  9: 'assets/products/ff-crispy-coated-10mm.webp',
  10: 'assets/products/ff-bravi-10mm.webp',
  11: 'assets/products/ff-crinkle-12mm.webp',
  12: 'assets/products/ff-regular-7mm.webp',
  13: 'assets/products/ff-fast-fry-crinkle.webp',
  14: 'assets/products/ff-fast-fry-10mm.webp',
  15: 'assets/products/ff-wedges-skin-on.webp',
  16: 'assets/products/ff-seasoned-wedges.webp',
  17: 'assets/products/ff-noisettes.webp',
  18: 'assets/products/ff-mash.webp',
  19: 'assets/products/ff-oval-hashbrown.webp',
  20: 'assets/products/ff-triangular-hashbrown.webp',
  21: 'assets/products/ff-potato-pancakes.webp',
  22: 'assets/products/ff-onion-rings.webp',
  40: 'assets/p2.jpg',
  41: 'assets/p2.jpg',
  42: 'assets/p2.jpg',
  46: 'assets/p4.jpg',
  47: 'assets/p4.jpg',
  63: 'assets/p2.jpg',
  69: 'assets/p6.jpg',
  70: 'assets/p6.jpg',
  71: 'assets/p6.jpg',
  72: 'assets/p6.jpg',
  73: 'assets/p6.jpg',
  83: 'assets/p1.jpg',
  84: 'assets/p1.jpg',
  89: 'assets/products/ff-bravi-10mm.webp',
  90: 'assets/products/potato-wedges.webp',
  91: 'assets/products/ff-bravi-10mm.webp',
  92: 'assets/products/pomuni-triangles.jpg',
  93: 'assets/products/sweet-potato-fries.webp',
  94: 'assets/products/potato-wedges.webp',
  95: 'assets/products/potato-wedges.webp',
  100: 'assets/products/pomuni-triangles.jpg',
  101: 'assets/products/pomuni-triangles.jpg',
  102: 'assets/products/potato-wedges.webp',
  103: 'assets/products/ff-bravi-10mm.webp',
  104: 'assets/products/ff-regular-10mm.webp',
  105: 'assets/products/ff-crispy-coated-10mm.webp',
  106: 'assets/products/ff-bravi-10mm.webp',
  107: 'assets/products/ff-crinkle-12mm.webp',
  108: 'assets/products/ff-regular-7mm.webp',
  109: 'assets/products/ff-fast-fry-crinkle.webp',
  110: 'assets/products/ff-fast-fry-10mm.webp',
  111: 'assets/products/ff-wedges-skin-on.webp',
  112: 'assets/products/ff-seasoned-wedges.webp',
  113: 'assets/products/ff-noisettes.webp',
  114: 'assets/products/ff-mash.webp',
  115: 'assets/products/ff-oval-hashbrown.webp',
  116: 'assets/products/ff-triangular-hashbrown.webp',
  117: 'assets/products/ff-sweet-potato-fries.webp',
  118: 'assets/products/ff-potato-pancakes.webp',
  119: 'assets/products/ff-finest-8x12-skin-on.webp',
  124: 'assets/p2.jpg',
  125: 'assets/p2.jpg',
  154: 'assets/products/potato-wedges.webp',
  155: 'assets/products/potato-wedges.webp'
};

const productDescriptions = {
  53: {
    ru: 'Замороженный зелёный крыжовник для напитков, десертов, выпечки и соусов. Оптовый формат подходит для кафе, ресторанов и пищевых производств.',
    en: 'Frozen green gooseberries for drinks, desserts, baking and sauces. The bulk format is suitable for cafés, restaurants and food production.'
  },
  85: {
    ru: 'Замороженная черноплодная рябина для напитков, десертов, выпечки и соусов. Оптовый формат подходит для кафе, ресторанов и пищевых производств.',
    en: 'Frozen chokeberries for drinks, desserts, baking and sauces. The bulk format is suitable for cafés, restaurants and food production.'
  },
  104: {
    ru: 'Классический замороженный картофель фри прямой нарезки 10 мм. Универсальный формат для ресторанов, кафе, фудкортов и доставки.',
    en: 'Classic frozen straight-cut 10 mm fries. A versatile format for restaurants, cafés, food courts and delivery.'
  },
  105: {
    ru: 'Картофель фри 10 мм в хрустящей панировке Chef’s Specials. Покрытие помогает дольше сохранять тепло и хруст, поэтому продукт подходит для доставки и навынос.',
    en: 'Chef’s Specials 10 mm fries with a crispy coating. The coating helps retain heat and crunch, making them suitable for delivery and takeaway.'
  },
  106: {
    ru: 'Замороженный картофель фри BRAVI прямой нарезки 10 мм. Практичный формат для стабильной работы профессиональной кухни.',
    en: 'Frozen BRAVI straight-cut 10 mm fries. A practical format for consistent professional kitchen service.'
  },
  107: {
    ru: 'Замороженный волнистый картофель фри 12 мм. Рифлёная нарезка даёт выразительную текстуру и хорошо удерживает соусы.',
    en: 'Frozen 12 mm crinkle-cut fries. The ridged cut adds texture and holds sauces well.'
  },
  108: {
    ru: 'Тонкий замороженный картофель фри прямой нарезки 7 мм. Подходит для быстрого сервиса, гарниров и снековых блюд.',
    en: 'Thin frozen straight-cut 7 mm fries. Suitable for quick service, side dishes and snack menus.'
  },
  109: {
    ru: 'Волнистый картофель фри Fast Fry 12 мм для быстрого приготовления в часы пик. Рифлёная форма обеспечивает заметный хруст и удобна для подачи с соусами.',
    en: 'Fast Fry 12 mm crinkle fries designed for quick preparation during peak service. The ridged shape adds crunch and works well with dips.'
  },
  110: {
    ru: 'Картофель фри Fast Fry прямой нарезки 10 мм. Разработан для быстрого приготовления и стабильной подачи при высокой загрузке кухни.',
    en: 'Fast Fry straight-cut 10 mm fries. Designed for quick preparation and consistent service during busy periods.'
  },
  111: {
    ru: 'Замороженные картофельные дольки с кожурой без специй. Универсальны как гарнир, закуска или основа для блюда с соусом.',
    en: 'Frozen unseasoned skin-on potato wedges. Versatile as a side dish, snack or base for a loaded dish.'
  },
  112: {
    ru: 'Картофельные дольки с кожурой, специями и хрустящим покрытием. Подходят для гарниров, закусок и доставки.',
    en: 'Seasoned skin-on potato wedges with a crispy coating. Suitable for side dishes, snacks and delivery.'
  },
  113: {
    ru: 'Картофельные шарики Noisettes из картофельного пюре. После приготовления получаются хрустящими снаружи и мягкими внутри.',
    en: 'Noisettes potato balls made from mashed potato. They cook crispy on the outside and fluffy on the inside.'
  },
  114: {
    ru: 'Порционное замороженное картофельное пюре для быстрого приготовления. Подходит для кейтеринга, столовых и готовых блюд.',
    en: 'Portioned frozen mashed potato for quick preparation. Suitable for catering, canteens and prepared meals.'
  },
  115: {
    ru: 'Овальные хэшбрауны из тёртого картофеля. Удобная порционная форма для завтраков, гарниров и закусок.',
    en: 'Oval hash browns made from shredded potato. A convenient portioned format for breakfasts, sides and snacks.'
  },
  116: {
    ru: 'Треугольные хэшбрауны из тёртого картофеля. Порционный формат подходит для завтраков, фудкортов и снекового меню.',
    en: 'Chunky triangular hash browns made from shredded potato. A portioned format suited to breakfasts, food courts and snack menus.'
  },
  117: {
    ru: 'Батат фри 9 мм с кожурой и хрустящим покрытием. Имеет естественный сладковатый вкус и подходит как альтернатива классическому картофелю фри.',
    en: 'Coated 9 mm skin-on sweet potato fries. Their naturally sweet flavour makes them a distinctive alternative to regular fries.'
  },
  118: {
    ru: 'Хрустящие картофельные оладьи из картофеля и лука. Подходят как гарнир, закуска или самостоятельная позиция меню.',
    en: 'Crispy potato pancakes made with potato and onion. Suitable as a side, appetizer or standalone menu item.'
  },
  119: {
    ru: 'Премиальный картофель фри Finest Round Cut с кожурой, калибр 8/12 мм. Выразительная округлая нарезка подходит для ресторанной подачи.',
    en: 'Premium Finest Round Cut skin-on fries in an 8/12 mm cut. Their distinctive rounded shape is suited to restaurant presentation.'
  }
};

function shortProductName(product, lang) {
  const raw = String(product.name?.[lang] || product.name?.ru || '').replace(/\s+/g, ' ').trim();
  if (lang === 'en') {
    return raw
      .replace(/(?:,\s*|\s+)(?:bulk\s+)?(?:(?:1\s+case\s+×\s+)|(?:\d+(?:\.\d+)?\s*×\s*))?\d+(?:\.\d+)?\s*kg\b.*$/i, '')
      .trim();
  }
  return raw
    .replace(/(?:\s+|,\s*)(?:вес(?:овая)?\s+)?(?:(?:1\s+кор\s*[*×хx]\s*)|(?:\d+(?:[.,]\d+)?\s*[*×хx]\s*))?\d+(?:[.,]\d+)?\s*кг.*$/i, '')
    .replace(/\s+\d+(?:[.,]\d+)?\s*[*×хx]\s*\d+\b.*$/i, '')
    .replace(/\s+вес(?:овая)?\s*$/i, '')
    .trim();
}

function minimumLabel(product, lang) {
  const amount = Number(product.minAmount ?? product.packKg ?? 1);
  const value = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 1);
  const units = lang === 'ru'
    ? { кг: 'кг', шт: 'шт', упак: 'упаковок' }
    : { кг: 'kg', шт: 'pcs', упак: 'packs' };
  return `${value} ${units[product.priceUnit] || units.кг}`;
}

function genericDescription(product, lang) {
  const name = String(product.name?.ru || '').toLowerCase();
  const tag = product.tag;
  const ru = {
    berries: ['замороженный ягодный продукт', 'Подходит для напитков, десертов, выпечки и соусов.'],
    fruit: ['замороженный фруктовый продукт', 'Подходит для напитков, десертов, выпечки и соусов.'],
    vegetables: ['замороженный овощной продукт', 'Подходит для гарниров, супов и горячих блюд.'],
    mushrooms: ['замороженный грибной продукт', 'Подходит для супов, соусов, гарниров и горячих блюд.'],
    vegetableMix: ['готовая замороженная овощная смесь', 'Подходит для гарниров и горячих блюд на профессиональной кухне.'],
    compoteMix: ['замороженная фруктово-ягодная смесь', 'Подходит для компотов, морсов, десертов и выпечки.'],
    fries: ['замороженный картофель фри', 'Подходит для ресторанов, кафе, фудкортов и доставки.'],
    wedges: ['замороженные картофельные дольки', 'Подходят для гарниров, закусок и доставки.'],
    hashbrown: ['порционный картофельный продукт', 'Подходит для завтраков, гарниров и закусок.'],
    sweetPotato: ['замороженный батат фри', 'Отличается хрустящей текстурой и естественным сладковатым вкусом.'],
    snack: ['замороженная закуска', 'Готовится по инструкции производителя и подходит для кафе, баров и фудкортов.'],
    pastry: ['замороженное слоёное тесто', 'Подходит для кафе, пекарен и пищевых производств.'],
    donut: ['порционный пончик с начинкой', 'Подходит для витрин, кофеен и кейтеринга.']
  };
  const en = {
    berries: ['a frozen berry product', 'Suitable for drinks, desserts, baking and sauces.'],
    fruit: ['a frozen fruit product', 'Suitable for drinks, desserts, baking and sauces.'],
    vegetables: ['a frozen vegetable product', 'Suitable for side dishes, soups and hot meals.'],
    mushrooms: ['a frozen mushroom product', 'Suitable for soups, sauces, side dishes and hot meals.'],
    vegetableMix: ['a ready-to-use frozen vegetable mix', 'Suitable for side dishes and hot meals in professional kitchens.'],
    compoteMix: ['a frozen fruit and berry mix', 'Suitable for compotes, fruit drinks, desserts and baking.'],
    fries: ['frozen French fries', 'Suitable for restaurants, cafés, food courts and delivery.'],
    wedges: ['frozen potato wedges', 'Suitable for side dishes, appetizers and delivery.'],
    hashbrown: ['a portioned potato product', 'Suitable for breakfasts, sides and appetizers.'],
    sweetPotato: ['frozen sweet potato fries', 'They have a crisp texture and naturally sweet flavour.'],
    snack: ['a frozen appetizer', 'Prepare according to the manufacturer’s instructions; suitable for cafés, bars and food courts.'],
    pastry: ['frozen puff pastry', 'Suitable for cafés, bakeries and food production.'],
    donut: ['a portioned filled donut', 'Suitable for displays, coffee shops and catering.']
  };

  let key;
  if (tag === 'ягоды') key = 'berries';
  else if (tag === 'фрукты') key = 'fruit';
  else if (tag === 'овощи') key = 'vegetables';
  else if (tag === 'грибы') key = 'mushrooms';
  else if (tag === 'смеси') key = name.includes('компот') ? 'compoteMix' : 'vegetableMix';
  else if (tag === 'снеки') key = 'snack';
  else if (tag === 'выпечка') key = name.includes('тесто') ? 'pastry' : 'donut';
  else if (tag === 'картофель') {
    if (name.includes('батат') || name.includes('сладк')) key = 'sweetPotato';
    else if (name.includes('дольк')) key = 'wedges';
    else if (name.includes('котлет') || name.includes('хэш') || name.includes('олад')) key = 'hashbrown';
    else key = 'fries';
  }

  const subject = shortProductName(product, lang);
  const minimum = minimumLabel(product, lang);
  if (lang === 'ru') {
    const [kind, usage] = ru[key] || ['замороженный продукт для профессиональной кухни', 'Условия хранения и приготовления указаны на упаковке.'];
    return `«${subject}» — ${kind}. ${usage} Минимальное количество по позиции: ${minimum}.`;
  }
  const [kind, usage] = en[key] || ['a frozen product for professional kitchens', 'Storage and preparation instructions are provided on the packaging.'];
  return `“${subject}” is ${kind}. ${usage} Minimum quantity for this item: ${minimum}.`;
}

const tagById = {
  22: 'снеки',
  50: 'смеси',
  53: 'ягоды',
  85: 'ягоды'
};

const packKgById = {
  34: 10,
  56: 10,
  112: 12.5,
  115: 12.5,
  121: 4.5,
  122: 4.5,
  146: 14,
  155: 12.5
};

const products = JSON.parse(await readFile(catalogPath, 'utf8'));
let changed = 0;

for (const product of products) {
  const id = Number(product.id);
  product.name ??= { ru: '', en: '' };
  product.cat ??= { ru: '', en: '' };
  product.desc ??= { ru: '', en: '' };

  if (tagById[id] && product.tag !== tagById[id]) {
    product.tag = tagById[id];
    changed += 1;
  }
  if (packKgById[id] && product.packKg !== packKgById[id]) {
    product.packKg = packKgById[id];
    changed += 1;
  }

  if (englishNames[id] && product.name.en !== englishNames[id]) {
    product.name.en = englishNames[id];
    changed += 1;
  }
  const translatedCategory = categoryTranslations[product.cat.ru];
  if (translatedCategory && product.cat.en !== translatedCategory) {
    product.cat.en = translatedCategory;
    changed += 1;
  }
  if (productDescriptions[id]?.ru) {
    if (product.desc.ru !== productDescriptions[id].ru) {
      product.desc.ru = productDescriptions[id].ru;
      changed += 1;
    }
  } else if (id >= 23 || !String(product.desc.ru || '').trim()) {
    const description = genericDescription(product, 'ru');
    if (product.desc.ru !== description) {
      product.desc.ru = description;
      changed += 1;
    }
  }
  if (productDescriptions[id]?.en) {
    if (product.desc.en !== productDescriptions[id].en) {
      product.desc.en = productDescriptions[id].en;
      changed += 1;
    }
  } else if (id >= 23 || !String(product.desc.en || '').trim()) {
    const description = genericDescription(product, 'en');
    if (product.desc.en !== description) {
      product.desc.en = description;
      changed += 1;
    }
  }

  const hasCuratedImage = Object.hasOwn(imageById, id);
  const shouldClearPlaceholder = id >= 23 && !hasCuratedImage;
  const nextImage = hasCuratedImage ? imageById[id] : shouldClearPlaceholder ? '' : product.img;
  if (product.img !== nextImage) {
    product.img = nextImage;
    changed += 1;
  }
  if (!product.priceUnit) {
    product.priceUnit = 'кг';
    changed += 1;
  }
}

await writeFile(catalogPath, JSON.stringify(products, null, 2) + '\n', 'utf8');
console.log('Catalog enriched: ' + products.length + ' products, ' + changed + ' field updates.');
