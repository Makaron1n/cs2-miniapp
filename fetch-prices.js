/**
 * Скрипт для получения цен скинов со Steam Market
 * 
 * Использование:
 *   1. В админке приложения нажмите "📥 Экспорт скинов для цен"
 *   2. Сохраните файл case-skins.json в папку с приложением
 *   3. Запустите: node fetch-prices.js
 */

const fs = require('fs');
const path = require('path');

// Настройки
const CONFIG = {
    APP_ID: 730, // CS2/CSGO
    CURRENCY: 5, // 5 = RUB, 1 = USD, 3 = EUR
    DELAY_MS: 3500, // Задержка между запросами
    PRICES_FILE: 'prices.json',
    CASE_SKINS_FILE: 'case-skins.json' // Файл со скинами из кейсов
};

// Коды валют Steam
const CURRENCY_CODES = {
    1: 'USD',
    2: 'GBP', 
    3: 'EUR',
    5: 'RUB',
    6: 'PLN',
    7: 'BRL',
    8: 'JPY',
    9: 'NOK',
    10: 'IDR',
    11: 'MYR',
    12: 'PHP',
    13: 'SGD',
    14: 'THB',
    15: 'VND',
    16: 'KRW',
    17: 'TRY',
    18: 'UAH',
    19: 'MXN',
    20: 'CAD',
    21: 'AUD',
    22: 'NZD',
    23: 'CNY',
    24: 'INR',
    25: 'CLP',
    26: 'PEN',
    27: 'COP',
    28: 'ZAR',
    29: 'HKD',
    30: 'TWD',
    31: 'SAR',
    32: 'AED',
    34: 'ARS',
    35: 'ILS',
    37: 'KZT',
    38: 'KWD',
    39: 'QAR',
    40: 'CRC',
    41: 'UYU'
};

// Загрузка существующих цен
function loadExistingPrices() {
    try {
        if (fs.existsSync(CONFIG.PRICES_FILE)) {
            const data = fs.readFileSync(CONFIG.PRICES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log('⚠️ Не удалось загрузить существующие цены, создаём новый файл');
    }
    return {
        lastUpdate: null,
        currency: CURRENCY_CODES[CONFIG.CURRENCY] || 'USD',
        prices: {}
    };
}

// Сохранение цен
function savePrices(pricesData) {
    pricesData.lastUpdate = new Date().toISOString();
    pricesData.currency = CURRENCY_CODES[CONFIG.CURRENCY] || 'USD';
    fs.writeFileSync(CONFIG.PRICES_FILE, JSON.stringify(pricesData, null, 2), 'utf8');
}

// Уровни износа для поиска
const WEAR_LEVELS = [
    '(Field-Tested)',
    '(Minimal Wear)',
    '(Factory New)',
    '(Well-Worn)',
    '(Battle-Scarred)'
];

// Ключевые слова для определения ножей и перчаток (требуют ★)
const KNIFE_WEAPONS = ['Bayonet', 'Karambit', 'M9 Bayonet', 'Flip Knife', 'Gut Knife', 'Falchion Knife', 
    'Shadow Daggers', 'Bowie Knife', 'Butterfly Knife', 'Huntsman Knife', 'Navaja Knife', 
    'Stiletto Knife', 'Talon Knife', 'Ursus Knife', 'Classic Knife', 'Paracord Knife', 
    'Survival Knife', 'Nomad Knife', 'Skeleton Knife', 'Kukri Knife'];

const GLOVE_WEAPONS = ['Sport Gloves', 'Driver Gloves', 'Hand Wraps', 'Moto Gloves', 
    'Specialist Gloves', 'Hydra Gloves', 'Bloodhound Gloves', 'Broken Fang Gloves'];

// Проверка нужна ли звезда ★ для предмета
function needsStar(marketName, skinData) {
    // Если уже есть звезда - не нужно
    if (marketName.startsWith('★')) return false;
    
    // Проверяем по категории
    if (skinData?.category === 'Knives' || skinData?.category === 'Gloves') return true;
    
    // Проверяем по названию оружия
    const weapon = marketName.split('|')[0].trim();
    if (KNIFE_WEAPONS.some(k => weapon.includes(k))) return true;
    if (GLOVE_WEAPONS.some(g => weapon.includes(g))) return true;
    
    return false;
}

// Проверка есть ли уже wear в названии
function hasWearInName(marketName) {
    return WEAR_LEVELS.some(w => marketName.includes(w));
}

// Получение цены со Steam Market (пробует разные уровни износа и форматы)
async function fetchSteamPrice(baseMarketName, skinData = {}) {
    // Если в названии уже есть wear - используем как есть
    if (hasWearInName(baseMarketName)) {
        // Формируем варианты имени (со звездой и без)
        const names = [baseMarketName];
        if (needsStar(baseMarketName, skinData)) {
            names.unshift(`★ ${baseMarketName}`);
        }
        
        for (const marketHashName of names) {
            const url = `https://steamcommunity.com/market/priceoverview/?appid=${CONFIG.APP_ID}&currency=${CONFIG.CURRENCY}&market_hash_name=${encodeURIComponent(marketHashName)}`;
            
            try {
                const response = await fetch(url);
                if (response.status === 429) {
                    console.log('⏳ Rate limit, ждём 60 секунд...');
                    await sleep(60000);
                    continue;
                }
                if (!response.ok) continue;
                
                const data = await response.json();
                if (data.success && (data.lowest_price || data.median_price)) {
                    return {
                        success: true,
                        lowest_price: data.lowest_price || null,
                        median_price: data.median_price || null,
                        volume: data.volume || null,
                        marketHashName: marketHashName
                    };
                }
            } catch (error) {}
            await sleep(500);
        }
        
        return { success: false, error: 'Item not found on market' };
    }
    
    // Формируем варианты базового имени (со звездой и без)
    const baseNames = [baseMarketName];
    if (needsStar(baseMarketName, skinData)) {
        baseNames.unshift(`★ ${baseMarketName}`);
    }
    
    // Пробуем каждое базовое имя и уровень износа
    for (const baseName of baseNames) {
        for (const wear of WEAR_LEVELS) {
            const marketHashName = `${baseName} ${wear}`;
            const url = `https://steamcommunity.com/market/priceoverview/?appid=${CONFIG.APP_ID}&currency=${CONFIG.CURRENCY}&market_hash_name=${encodeURIComponent(marketHashName)}`;
        
        try {
            const response = await fetch(url);
            
            if (response.status === 429) {
                console.log('⏳ Rate limit, ждём 60 секунд...');
                await sleep(60000);
                continue;
            }
            
            if (!response.ok) {
                continue;
            }
            
            const data = await response.json();
            
            if (data.success && (data.lowest_price || data.median_price)) {
                return {
                    success: true,
                    lowest_price: data.lowest_price || null,
                    median_price: data.median_price || null,
                    volume: data.volume || null,
                    wear: wear,
                    marketHashName: marketHashName
                };
            }
        } catch (error) {
            // Пробуем следующий уровень
        }
        
        // Небольшая задержка между попытками
        await sleep(500);
        }
    }
    
    return { success: false, error: 'Item not found on market with any wear level' };
}

// Старая функция для совместимости
async function fetchSteamPriceOld(marketHashName) {
    const url = `https://steamcommunity.com/market/priceoverview/?appid=${CONFIG.APP_ID}&currency=${CONFIG.CURRENCY}&market_hash_name=${encodeURIComponent(marketHashName)}`;
    
    try {
        const response = await fetch(url);
        
        if (response.status === 429) {
            console.log('⏳ Rate limit, ждём 60 секунд...');
            await sleep(60000);
            return fetchSteamPrice(marketHashName);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                lowest_price: data.lowest_price || null,
                median_price: data.median_price || null,
                volume: data.volume || null
            };
        } else {
            return { success: false, error: 'Item not found on market' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Задержка
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Парсинг цены из строки
function parsePrice(priceStr) {
    if (!priceStr) return null;
    // Убираем символы валюты и пробелы, заменяем запятую на точку
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
}

// Загрузка списка скинов из файла case-skins.json
function loadCaseSkins() {
    if (!fs.existsSync(CONFIG.CASE_SKINS_FILE)) {
        console.log(`\n❌ Файл ${CONFIG.CASE_SKINS_FILE} не найден!\n`);
        console.log('📋 Инструкция:');
        console.log('   1. Откройте приложение в браузере');
        console.log('   2. Перейдите в Настройки → Админ-панель');
        console.log('   3. На вкладке "Настройки" нажмите "📥 Экспорт скинов для цен"');
        console.log('   4. Сохраните файл case-skins.json в эту папку');
        console.log('   5. Запустите скрипт снова: node fetch-prices.js\n');
        return [];
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(CONFIG.CASE_SKINS_FILE, 'utf8'));
        console.log(`📦 Загружен файл ${CONFIG.CASE_SKINS_FILE}`);
        console.log(`   Кейсов: ${data.casesCount || '?'}`);
        console.log(`   Экспортирован: ${data.exportedAt || '?'}\n`);
        return data.skins || [];
    } catch (e) {
        console.log(`❌ Ошибка чтения ${CONFIG.CASE_SKINS_FILE}: ${e.message}`);
        return [];
    }
}

// Основная функция
async function main() {
    console.log('🎮 Steam Market Price Fetcher');
    console.log('============================\n');
    console.log(`💰 Валюта: ${CURRENCY_CODES[CONFIG.CURRENCY]}`);
    console.log(`⏱️ Задержка между запросами: ${CONFIG.DELAY_MS}ms\n`);
    
    // Загружаем существующие цены
    const pricesData = loadExistingPrices();
    console.log(`📂 Загружено существующих цен: ${Object.keys(pricesData.prices).length}\n`);
    
    // Загружаем список скинов из кейсов
    const skins = loadCaseSkins();
    
    if (skins.length === 0) {
        return;
    }
    
    console.log(`🎯 Скинов в кейсах: ${skins.length}\n`);
    
    if (skins.length === 0) {
        console.log('⚠️ Нет скинов для обработки');
        return;
    }
    
    // Фильтруем скины, для которых уже есть актуальные цены (менее 24 часов)
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    const skinsToFetch = skins.filter(skin => {
        const existing = pricesData.prices[skin.id];
        if (!existing) return true;
        const age = now - new Date(existing.fetchedAt).getTime();
        return age > ONE_DAY;
    });
    
    console.log(`🔄 Нужно обновить: ${skinsToFetch.length} скинов\n`);
    
    if (skinsToFetch.length === 0) {
        console.log('✅ Все цены актуальны!');
        return;
    }
    
    // Получаем цены
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    for (const skin of skinsToFetch) {
        processed++;
        const progress = `[${processed}/${skinsToFetch.length}]`;
        
        console.log(`${progress} Получаем цену: ${skin.marketHashName}`);
        
        const result = await fetchSteamPrice(skin.marketHashName, skin);
        
        if (result.success) {
            const lowestPrice = parsePrice(result.lowest_price);
            const medianPrice = parsePrice(result.median_price);
            
            pricesData.prices[skin.id] = {
                marketHashName: skin.marketHashName,
                lowestPrice: lowestPrice,
                medianPrice: medianPrice,
                lowestPriceRaw: result.lowest_price,
                medianPriceRaw: result.median_price,
                volume: result.volume,
                fetchedAt: new Date().toISOString()
            };
            
            console.log(`   ✅ ${result.lowest_price || 'N/A'} (медиана: ${result.median_price || 'N/A'})`);
            success++;
        } else {
            console.log(`   ❌ Ошибка: ${result.error}`);
            
            // Сохраняем информацию об ошибке
            pricesData.prices[skin.id] = {
                marketHashName: skin.marketHashName,
                error: result.error,
                fetchedAt: new Date().toISOString()
            };
            failed++;
        }
        
        // Сохраняем каждые 10 скинов
        if (processed % 10 === 0) {
            savePrices(pricesData);
            console.log(`   💾 Сохранено...`);
        }
        
        // Задержка перед следующим запросом
        if (processed < skinsToFetch.length) {
            await sleep(CONFIG.DELAY_MS);
        }
    }
    
    // Финальное сохранение
    savePrices(pricesData);
    
    console.log('\n============================');
    console.log(`✅ Готово!`);
    console.log(`   Успешно: ${success}`);
    console.log(`   Ошибок: ${failed}`);
    console.log(`   Всего цен в базе: ${Object.keys(pricesData.prices).length}`);
    console.log(`\n📁 Цены сохранены в: ${CONFIG.PRICES_FILE}`);
}

// Запуск
main().catch(console.error);
