/**
 * CS2 Mini-App - Главный модуль
 * Инициализация приложения и основные классы
 */

// ========================================
// Классы ядра приложения
// ========================================

/**
 * Класс взвешенного случайного выбора
 */
class WeightedRandom {
    constructor(items) {
        this.items = items;
        this.totalWeight = items.reduce((sum, item) => sum + (item.chance || 1), 0);
    }
    
    pick() {
        let random = Math.random() * this.totalWeight;
        for (const item of this.items) {
            random -= (item.chance || 1);
            if (random <= 0) return item;
        }
        return this.items[this.items.length - 1];
    }
}

/**
 * Класс спиннера карусели
 */
class CarouselSpinner {
    constructor(container, items, options = {}) {
        this.container = container;
        this.items = items;
        this.options = {
            itemWidth: options.itemWidth || 120,
            itemGap: options.itemGap || 10,
            spinDuration: options.spinDuration || 6000,
            extraItems: options.extraItems || 50,
            ...options
        };
    }
    
    async spin(targetItem) {
        return new Promise(resolve => {
            const totalWidth = this.options.itemWidth + this.options.itemGap;
            const containerWidth = this.container.offsetWidth;
            const centerOffset = containerWidth / 2 - this.options.itemWidth / 2;
            
            // Создаём элементы карусели
            const allItems = [];
            for (let i = 0; i < this.options.extraItems; i++) {
                const randomItem = this.items[Math.floor(Math.random() * this.items.length)];
                allItems.push(randomItem);
            }
            
            // Вставляем целевой предмет
            const targetIndex = this.options.extraItems - 10;
            allItems[targetIndex] = targetItem;
            
            // Рендерим карусель
            this.container.innerHTML = allItems.map(item => `
                <div class="carousel-item" style="border-color: ${item.rarity?.color || '#b0c3d9'}">
                    <img src="${item.image}" alt="${item.name}">
                </div>
            `).join('');
            
            // Вычисляем позицию
            const targetPosition = targetIndex * totalWidth - centerOffset;
            
            // Запускаем анимацию
            this.container.style.transition = `transform ${this.options.spinDuration}ms cubic-bezier(0.15, 0.85, 0.3, 1)`;
            this.container.style.transform = `translateX(-${targetPosition}px)`;
            
            setTimeout(() => {
                resolve(targetItem);
            }, this.options.spinDuration);
        });
    }
    
    reset() {
        this.container.style.transition = 'none';
        this.container.style.transform = 'translateX(0)';
    }
}

/**
 * Класс игрока
 */
class Player {
    constructor() {
        this.balance = 1000;
        this.inventory = [];
        this.load();
    }
    
    load() {
        const data = localStorage.getItem('cs2_player_data');
        if (data) {
            const parsed = JSON.parse(data);
            this.balance = parsed.balance || 1000;
            this.inventory = (parsed.inventory || []).map((item, idx) => {
                if (!item._uid) {
                    item._uid = `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
                }
                return item;
            });
        }
    }
    
    save() {
        localStorage.setItem('cs2_player_data', JSON.stringify({
            balance: this.balance,
            inventory: this.inventory
        }));
    }
    
    addItem(item) {
        item._uid = `item_${Date.now()}_${this.inventory.length}_${Math.random().toString(36).substr(2, 9)}`;
        this.inventory.push(item);
        this.save();
    }
    
    removeItem(uid) {
        const index = this.inventory.findIndex(item => item._uid === uid);
        if (index >= 0) {
            this.inventory.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }
    
    getItem(uid) {
        return this.inventory.find(item => item._uid === uid);
    }
}

/**
 * Класс приложения CS2
 */
class CS2App {
    constructor() {
        this.player = new Player();
        this.cases = [];
        this.allSkins = [];
        this.currentCase = null;
        this.isSpinning = false;
    }
    
    async init() {
        await this.loadSkins();
        this.initCases();
        
        // Инициализация модулей
        if (typeof initNavigation === 'function') initNavigation();
        if (typeof renderCases === 'function') renderCases();
        if (typeof updateUI === 'function') updateUI();
        
        console.log('CS2 Mini-App initialized!');
    }
    
    async loadSkins() {
        try {
            const response = await fetch('skins.json');
            this.allSkins = await response.json();
            console.log(`Loaded ${this.allSkins.length} skins`);
        } catch (e) {
            console.error('Failed to load skins:', e);
            this.allSkins = [];
        }
    }
    
    initCases() {
        // Стандартные кейсы
        this.cases = [
            {
                id: 'starter',
                name: '🎁 Стартовый',
                price: 50,
                description: 'Для новичков',
                skins: this.getSkinsByRarity(['Consumer Grade', 'Industrial Grade'], 10)
            },
            {
                id: 'weapon',
                name: '🔫 Оружейный',
                price: 150,
                description: 'Классические скины',
                skins: this.getSkinsByRarity(['Mil-Spec Grade', 'Restricted'], 15)
            },
            {
                id: 'rare',
                name: '💎 Редкий',
                price: 300,
                description: 'Шанс на редкость',
                skins: this.getSkinsByRarity(['Restricted', 'Classified', 'Covert'], 12)
            },
            {
                id: 'knife',
                name: '🔪 Ножевой',
                price: 500,
                description: 'Ножи и перчатки',
                skins: this.getKnivesAndGloves(10)
            },
            {
                id: 'premium',
                name: '👑 Премиум',
                price: 1000,
                description: 'Лучшие скины',
                skins: this.getSkinsByRarity(['Classified', 'Covert', 'Extraordinary'], 10)
            }
        ];
        
        // Добавляем пользовательские кейсы
        const customCases = JSON.parse(localStorage.getItem('customCases') || '[]');
        this.cases.push(...customCases);
    }
    
    getSkinsByRarity(rarities, count) {
        const filtered = this.allSkins.filter(s => 
            s.image && rarities.includes(s.rarity?.name)
        );
        return this.shuffleArray(filtered).slice(0, count);
    }
    
    getKnivesAndGloves(count) {
        const filtered = this.allSkins.filter(s => 
            s.image && (s.category?.name === 'Knives' || s.category?.name === 'Gloves')
        );
        return this.shuffleArray(filtered).slice(0, count);
    }
    
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    getCases() {
        return this.cases;
    }
    
    getCase(caseId) {
        return this.cases.find(c => c.id === caseId);
    }
    
    canOpenCase(caseData) {
        return this.player.balance >= caseData.price;
    }
    
    async openCase(caseId) {
        const caseData = this.getCase(caseId);
        if (!caseData || this.isSpinning) return null;
        
        if (!this.canOpenCase(caseData)) {
            if (typeof showNotification === 'function') {
                showNotification('❌ Недостаточно средств!');
            }
            return null;
        }
        
        this.isSpinning = true;
        this.player.balance -= caseData.price;
        this.player.save();
        
        if (typeof updateUI === 'function') updateUI();
        
        // Выбираем случайный скин
        const weighted = new WeightedRandom(caseData.skins);
        const droppedSkin = weighted.pick();
        
        // Генерируем цену
        const price = this.generatePrice(droppedSkin);
        const item = {
            ...droppedSkin,
            price,
            droppedAt: Date.now()
        };
        
        return item;
    }
    
    generatePrice(skin) {
        const basePrice = {
            'Consumer Grade': 10,
            'Industrial Grade': 25,
            'Mil-Spec Grade': 50,
            'Restricted': 150,
            'Classified': 400,
            'Covert': 1000,
            'Extraordinary': 2500,
            'Contraband': 5000
        }[skin.rarity?.name] || 50;
        
        const variance = basePrice * 0.5;
        return Math.round(basePrice + (Math.random() * variance * 2 - variance));
    }
    
    finishSpin(item) {
        this.isSpinning = false;
        this.player.addItem(item);
        
        // Обновляем квесты
        if (typeof updateQuestProgress === 'function') {
            updateQuestProgress('open_case', 1);
            updateQuestProgress('collect_item', 1);
            
            const rarityQuests = {
                'Covert': 'get_covert',
                'Classified': 'get_classified',
                'Restricted': 'get_restricted'
            };
            const questType = rarityQuests[item.rarity?.name];
            if (questType) updateQuestProgress(questType, 1);
        }
        
        if (typeof updateUI === 'function') updateUI();
        if (typeof renderInventory === 'function') renderInventory();
    }
}

// ========================================
// Глобальная инициализация
// ========================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new CS2App();
    app.init();
});

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CS2App,
        Player,
        WeightedRandom,
        CarouselSpinner
    };
}
