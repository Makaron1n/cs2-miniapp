/**
 * CS2 Mini App - Case Opening System
 * Использует ТОЛЬКО skins.json как источник данных
 * Изображения берутся ТОЛЬКО из skin.image
 */

(function(global) {
  'use strict';

  // =====================================================
  // RARITY CONFIG
  // =====================================================
  const RARITY_CONFIG = {
    'Consumer Grade': { id: 'consumer_grade', color: '#b0c3d9', tier: 1, chance: 50 },
    'Industrial Grade': { id: 'industrial_grade', color: '#5e98d9', tier: 2, chance: 25 },
    'Mil-Spec Grade': { id: 'mil_spec', color: '#4b69ff', tier: 3, chance: 15 },
    'Restricted': { id: 'restricted', color: '#8847ff', tier: 4, chance: 6 },
    'Classified': { id: 'classified', color: '#d32ce6', tier: 5, chance: 2.5 },
    'Covert': { id: 'covert', color: '#eb4b4b', tier: 6, chance: 1 },
    'Extraordinary': { id: 'extraordinary', color: '#e4ae39', tier: 7, chance: 0.4 },
    'Contraband': { id: 'contraband', color: '#e4ae39', tier: 8, chance: 0.1 }
  };

  // =====================================================
  // ANIMATION CONFIG
  // =====================================================
  const ANIMATION_CONFIG = {
    TOTAL_DURATION: 6000,
    ITEM_WIDTH: 120,
    ITEM_GAP: 8,
    VISIBLE_ITEMS: 9,
    TOTAL_ITEMS_IN_CAROUSEL: 80
  };

  // =====================================================
  // WEIGHTED RANDOM - для выбора скина по шансу
  // =====================================================
  class WeightedRandom {
    constructor(items = []) {
      this.items = [];
      this.totalWeight = 0;
      this.cumulativeWeights = [];
      if (items.length > 0) this.setItems(items);
    }

    setItems(items) {
      this.items = items;
      this.totalWeight = 0;
      this.cumulativeWeights = [];
      
      for (const item of items) {
        this.totalWeight += (item.chance || 1);
        this.cumulativeWeights.push(this.totalWeight);
      }
      return this;
    }

    select() {
      const random = Math.random() * this.totalWeight;
      for (let i = 0; i < this.cumulativeWeights.length; i++) {
        if (random <= this.cumulativeWeights[i]) {
          return this.items[i];
        }
      }
      return this.items[0];
    }
  }

  // =====================================================
  // CAROUSEL SPINNER - анимация прокрутки
  // =====================================================
  class CarouselSpinner {
    constructor(items) {
      this.items = items;
      this.weightedRandom = new WeightedRandom(items);
      this.winningItem = null;
      this.carouselItems = [];
      this.winnerIndex = 0;
    }

    get itemTotalWidth() {
      return ANIMATION_CONFIG.ITEM_WIDTH + ANIMATION_CONFIG.ITEM_GAP;
    }

    get centerIndex() {
      return Math.floor(ANIMATION_CONFIG.VISIBLE_ITEMS / 2);
    }

    prepareSpinResult() {
      // Выбираем победителя ОДИН раз
      this.winningItem = this.weightedRandom.select();
      
      // Генерируем элементы карусели
      this.carouselItems = [];
      for (let i = 0; i < ANIMATION_CONFIG.TOTAL_ITEMS_IN_CAROUSEL; i++) {
        this.carouselItems.push({
          ...this.weightedRandom.select(),
          carouselIndex: i,
          isWinner: false
        });
      }
      
      // Победитель будет ближе к концу карусели (позиция 60-70)
      this.winnerIndex = 60 + Math.floor(Math.random() * 10);
      
      // Помещаем победителя в эту позицию
      this.carouselItems[this.winnerIndex] = {
        ...this.winningItem,
        carouselIndex: this.winnerIndex,
        isWinner: true
      };

      return {
        winningItem: this.winningItem,
        carouselItems: this.carouselItems,
        winningIndex: this.winnerIndex
      };
    }
  }

  // =====================================================
  // CAROUSEL UI - отображение карусели
  // =====================================================
  class CarouselUI {
    constructor(container) {
      this.container = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
      this.track = null;
      this.spinner = null;
      this.isSpinning = false;
      this._init();
    }

    _init() {
      this.container.innerHTML = '';
      this.container.style.cssText = 'position:relative;';

      // Viewport
      const viewport = document.createElement('div');
      viewport.style.cssText = `
        position: relative;
        overflow: hidden;
        width: 100%;
        height: ${ANIMATION_CONFIG.ITEM_WIDTH + 40}px;
        border-radius: 12px;
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      `;

      // Track
      this.track = document.createElement('div');
      this.track.style.cssText = `
        display: flex;
        gap: ${ANIMATION_CONFIG.ITEM_GAP}px;
        padding: 20px;
        will-change: transform;
        transition: none;
      `;

      // Indicator (красная линия по центру)
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, #ff4444, #ff6b6b, #ff4444);
        z-index: 10;
        box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
      `;
      
      const pointer = document.createElement('div');
      pointer.style.cssText = `
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 15px solid #ff4444;
      `;
      indicator.appendChild(pointer);

      viewport.appendChild(this.track);
      viewport.appendChild(indicator);

      // Градиенты по краям
      const leftGrad = document.createElement('div');
      leftGrad.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 80px;
        height: 100%;
        background: linear-gradient(90deg, rgba(26,26,46,1), rgba(26,26,46,0));
        z-index: 5;
        pointer-events: none;
      `;
      
      const rightGrad = document.createElement('div');
      rightGrad.style.cssText = `
        position: absolute;
        right: 0;
        top: 0;
        width: 80px;
        height: 100%;
        background: linear-gradient(90deg, rgba(26,26,46,0), rgba(26,26,46,1));
        z-index: 5;
        pointer-events: none;
      `;

      viewport.appendChild(leftGrad);
      viewport.appendChild(rightGrad);
      this.container.appendChild(viewport);

      // Область результата
      this.resultArea = document.createElement('div');
      this.resultArea.style.cssText = 'text-align:center;padding:20px;min-height:80px;display:none;';
      this.container.appendChild(this.resultArea);
    }

    setSpinner(spinner) {
      this.spinner = spinner;
      return this;
    }

    /**
     * Рендерит элементы карусели
     * ВАЖНО: Использует ТОЛЬКО skin.image для картинок
     */
    renderItems(items) {
      this.track.innerHTML = '';
      
      items.forEach((item) => {
        const el = document.createElement('div');
        
        // Получаем цвет редкости
        const rarityInfo = RARITY_CONFIG[item.rarity?.name] || RARITY_CONFIG[item.rarity] || {};
        const color = item.rarity?.color || rarityInfo.color || '#b0c3d9';
        
        el.style.cssText = `
          flex-shrink: 0;
          width: ${ANIMATION_CONFIG.ITEM_WIDTH}px;
          height: ${ANIMATION_CONFIG.ITEM_WIDTH}px;
          background: linear-gradient(145deg, #243447, #1c2733);
          border-radius: 10px;
          border: 2px solid ${color};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        `;
        el.className = item.isWinner ? 'carousel-item winner' : 'carousel-item';

        // ИЗОБРАЖЕНИЕ - ТОЛЬКО из skin.image!
        const img = document.createElement('img');
        img.src = item.image; // <-- ТОЛЬКО skin.image
        img.alt = item.name || 'Skin';
        img.style.cssText = 'width:80%;height:60%;object-fit:contain;';

        // Название скина
        const name = document.createElement('div');
        const skinName = item.pattern?.name || item.name?.split('|')[1]?.trim() || item.name || '?';
        name.textContent = skinName;
        name.style.cssText = `
          font-size: 10px;
          font-weight: bold;
          color: #fff;
          text-align: center;
          padding: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        `;
        
        // Wear badge
        if (item.wear) {
          const wearBadge = document.createElement('div');
          const wearColors = { fn: '#27ae60', mw: '#2ecc71', ft: '#f39c12', ww: '#e67e22', bs: '#e74c3c' };
          wearBadge.textContent = item.wear.toUpperCase();
          wearBadge.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: ${wearColors[item.wear] || 'rgba(0,0,0,0.7)'};
            color: #fff;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: bold;
          `;
          el.appendChild(wearBadge);
        }

        // Полоска редкости
        const bar = document.createElement('div');
        bar.style.cssText = `width:100%;height:3px;background:${color};margin-top:auto;`;

        el.appendChild(img);
        el.appendChild(name);
        el.appendChild(bar);
        this.track.appendChild(el);
      });

      // Центрируем трек
      const containerWidth = this.container.offsetWidth;
      const centerOffset = (containerWidth / 2) - (ANIMATION_CONFIG.ITEM_WIDTH / 2) - 20;
      this.track.style.transform = `translateX(${centerOffset}px)`;
    }

    /**
     * Запускает анимацию прокрутки
     */
    spin() {
      return new Promise((resolve, reject) => {
        if (this.isSpinning) return reject(new Error('Already spinning'));
        if (!this.spinner) return reject(new Error('No spinner set'));

        const spinData = this.spinner.prepareSpinResult();
        this._runAnimation(spinData, resolve, reject);
      });
    }

    /**
     * Запускает анимацию с заранее подготовленным результатом
     */
    spinWithPreparedResult(spinData) {
      return new Promise((resolve, reject) => {
        if (this.isSpinning) return reject(new Error('Already spinning'));
        this._runAnimation(spinData, resolve, reject);
      });
    }

    /**
     * Внутренний метод анимации
     */
    _runAnimation(spinData, resolve, reject) {
      this.isSpinning = true;
      this.resultArea.style.display = 'none';

      // Рендерим элементы
      this.renderItems(spinData.carouselItems);

      // Параметры анимации
      const containerWidth = this.container.offsetWidth;
      const itemTotalWidth = ANIMATION_CONFIG.ITEM_WIDTH + ANIMATION_CONFIG.ITEM_GAP;
      
      // Начальное смещение - центрирует элемент 0
      const startOffset = (containerWidth / 2) - (ANIMATION_CONFIG.ITEM_WIDTH / 2);
      
      // Используем ТОЧНУЮ позицию победителя из spinData
      const winnerIndex = spinData.winningIndex;
      
      // Прокручиваем так, чтобы элемент winnerIndex оказался в центре
      const totalDistance = winnerIndex * itemTotalWidth;

      // Анимация
      const startTime = performance.now();
      const self = this;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_CONFIG.TOTAL_DURATION, 1);
        
        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentPosition = eased * totalDistance;
        
        self.track.style.transform = `translateX(${startOffset - currentPosition}px)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Завершение анимации
          self.isSpinning = false;
          self.track.style.transform = `translateX(${startOffset - totalDistance}px)`;
          
          // Подсветка победителя
          const winner = self.track.querySelector('.winner');
          if (winner) {
            const winColor = spinData.winningItem.rarity?.color || '#e4ae39';
            winner.style.transform = 'scale(1.1)';
            winner.style.boxShadow = `0 0 30px ${winColor}`;
          }

          self._showResult(spinData.winningItem);
          resolve(spinData.winningItem);
        }
      };

      requestAnimationFrame(animate);
    }

    _showResult(item) {
      const rarityInfo = RARITY_CONFIG[item.rarity?.name] || RARITY_CONFIG[item.rarity] || {};
      const color = item.rarity?.color || rarityInfo.color || '#b0c3d9';
      
      // Wear display
      const wearNames = { fn: 'Factory New', mw: 'Minimal Wear', ft: 'Field-Tested', ww: 'Well-Worn', bs: 'Battle-Scarred' };
      const wearColors = { fn: '#27ae60', mw: '#2ecc71', ft: '#f39c12', ww: '#e67e22', bs: '#e74c3c' };
      const wearDisplay = item.wear ? `<div style="margin-top:5px;color:${wearColors[item.wear] || '#888'};font-size:12px;">${wearNames[item.wear] || item.wear.toUpperCase()}</div>` : '';
      
      this.resultArea.style.display = 'block';
      this.resultArea.innerHTML = `
        <div style="color:${color};font-size:24px;font-weight:bold;text-shadow:0 0 20px ${color};">
          🎉 ДРОП! 🎉
        </div>
        <div style="margin-top:15px;">
          <img src="${item.image}" style="width:100px;height:100px;object-fit:contain;">
        </div>
        <div style="margin-top:10px;font-size:18px;color:#fff;">${item.name}</div>
        <div style="margin-top:5px;color:${color};">${item.rarity?.name || item.rarity || 'Unknown'}</div>
        ${wearDisplay}
      `;
    }
  }

  // =====================================================
  // CASE MANAGER - управление кейсами
  // =====================================================
  class CaseManager {
    constructor() {
      this.skins = [];      // Все скины из skins.json
      this.cases = [];      // Конфигурация кейсов
      this.isLoaded = false;
    }

    /**
     * Загружает скины из skins.json
     */
    async loadSkins() {
      try {
        const response = await fetch('skins.json');
        if (!response.ok) throw new Error('Failed to load skins.json');
        
        this.skins = await response.json();
        console.log(`✅ Loaded ${this.skins.length} skins from skins.json`);
        
        this._generateCases();
        this.isLoaded = true;
        
        return this.skins;
      } catch (error) {
        console.error('❌ Error loading skins:', error);
        throw error;
      }
    }

    /**
     * Генерирует кейсы на основе загруженных скинов
     */
    _generateCases() {
      // Фильтруем скины с картинками
      const skinsWithImages = this.skins.filter(s => s.image);
      
      // Группируем по редкости
      const byRarity = {};
      for (const skin of skinsWithImages) {
        const rarityName = skin.rarity?.name || 'Unknown';
        if (!byRarity[rarityName]) byRarity[rarityName] = [];
        byRarity[rarityName].push(skin);
      }

      // Стандартный кейс - обычные скины
      const standardSkins = [
        ...(byRarity['Consumer Grade'] || []).slice(0, 20),
        ...(byRarity['Industrial Grade'] || []).slice(0, 15),
        ...(byRarity['Mil-Spec Grade'] || []).slice(0, 10),
        ...(byRarity['Restricted'] || []).slice(0, 5),
        ...(byRarity['Classified'] || []).slice(0, 3),
        ...(byRarity['Covert'] || []).slice(0, 2)
      ].map(skin => ({
        ...skin,
        chance: RARITY_CONFIG[skin.rarity?.name]?.chance || 10
      }));

      // Элитный кейс - редкие скины
      const eliteSkins = [
        ...(byRarity['Mil-Spec Grade'] || []).slice(10, 25),
        ...(byRarity['Restricted'] || []).slice(5, 20),
        ...(byRarity['Classified'] || []).slice(3, 15),
        ...(byRarity['Covert'] || []).slice(2, 10),
        ...(byRarity['Extraordinary'] || []).slice(0, 5)
      ].map(skin => ({
        ...skin,
        chance: RARITY_CONFIG[skin.rarity?.name]?.chance || 5
      }));

      // Премиум кейс - ножи и перчатки
      const premiumSkins = [
        ...(byRarity['Extraordinary'] || []).slice(0, 30),
        ...(byRarity['Covert'] || []).slice(0, 15),
        ...(byRarity['Classified'] || []).slice(0, 10)
      ].map(skin => ({
        ...skin,
        chance: RARITY_CONFIG[skin.rarity?.name]?.chance || 2
      }));

      this.cases = [
        {
          id: 'case_standard',
          name: '📦 Стандартный кейс',
          price: 100,
          description: 'Базовый набор оружия',
          skins: standardSkins.length > 0 ? standardSkins : skinsWithImages.slice(0, 50)
        },
        {
          id: 'case_elite',
          name: '🏆 Элитный кейс',
          price: 250,
          description: 'Редкие скины оружия',
          skins: eliteSkins.length > 0 ? eliteSkins : skinsWithImages.slice(50, 100)
        },
        {
          id: 'case_premium',
          name: '💎 Премиум кейс',
          price: 500,
          description: 'Ножи и перчатки',
          skins: premiumSkins.length > 0 ? premiumSkins : skinsWithImages.slice(100, 150)
        }
      ];

      console.log('✅ Cases generated:', this.cases.map(c => `${c.name}: ${c.skins.length} skins`));
    }

    getCases() {
      return this.cases;
    }

    getCase(caseId) {
      return this.cases.find(c => c.id === caseId);
    }

    createSpinner(caseId) {
      const caseData = this.getCase(caseId);
      if (!caseData || caseData.skins.length === 0) return null;
      return new CarouselSpinner(caseData.skins);
    }
  }

  // =====================================================
  // PLAYER - игрок
  // =====================================================
  class Player {
    constructor() {
      this.id = 'user_' + Date.now();
      this.name = 'Player123';
      this.balance = 5000;
      this.inventory = [];
      this.stats = {
        casesOpened: 0,
        bestDrop: null,
        bestDropValue: 0
      };
    }

    canAfford(price) {
      return this.balance >= price;
    }

    deductBalance(amount) {
      this.balance -= amount;
    }

    addToInventory(item) {
      const invItem = {
        inventoryId: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...item,
        acquiredAt: new Date().toISOString()
      };
      this.inventory.push(invItem);
      this.stats.casesOpened++;
      return invItem;
    }
  }

  // =====================================================
  // CS2 APP - главный класс приложения
  // =====================================================
  class CS2App {
    constructor() {
      this.caseManager = new CaseManager();
      this.player = this._loadPlayer();
      this.carouselUI = null;
    }

    _loadPlayer() {
      try {
        const data = localStorage.getItem('cs2_player');
        if (data) {
          const parsed = JSON.parse(data);
          const player = new Player();
          Object.assign(player, parsed);
          return player;
        }
      } catch (e) {}
      return new Player();
    }

    _savePlayer() {
      try {
        localStorage.setItem('cs2_player', JSON.stringify(this.player));
      } catch (e) {}
    }

    async init() {
      await this.caseManager.loadSkins();
      console.log('✅ CS2 App initialized');
      return this;
    }

    getCases() {
      return this.caseManager.getCases();
    }

    getCaseInfo(caseId) {
      return this.caseManager.getCase(caseId);
    }

    getPlayerData() {
      return {
        id: this.player.id,
        name: this.player.name,
        balance: this.player.balance,
        inventory: this.player.inventory,
        stats: this.player.stats
      };
    }

    canOpenCase(caseId) {
      const caseData = this.caseManager.getCase(caseId);
      return caseData && this.player.canAfford(caseData.price);
    }

    /**
     * Открывает кейс с анимацией
     */
    async openCaseAnimated(caseId, container) {
      const caseData = this.caseManager.getCase(caseId);
      
      if (!caseData) {
        throw new Error('Case not found');
      }
      
      if (!this.player.canAfford(caseData.price)) {
        throw new Error('Not enough balance');
      }

      // Списываем баланс
      this.player.deductBalance(caseData.price);
      this._savePlayer();

      // ВСЕГДА создаём новый CarouselUI для каждой прокрутки
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      this.carouselUI = new CarouselUI(el);

      // Создаём спиннер
      const spinner = this.caseManager.createSpinner(caseId);
      this.carouselUI.setSpinner(spinner);
      
      // Подготавливаем результат ЗАРАНЕЕ и сохраняем
      const spinResult = spinner.prepareSpinResult();
      const wonItem = spinResult.winningItem;
      
      // Добавляем в инвентарь СРАЗУ (до анимации)
      const invItem = this.player.addToInventory(wonItem);
      this._savePlayer();
      
      // Запускаем анимацию (она покажет тот же wonItem)
      await this.carouselUI.spinWithPreparedResult(spinResult);

      return {
        success: true,
        item: invItem,
        newBalance: this.player.balance
      };
    }

    addBalance(amount) {
      this.player.balance += amount;
      this._savePlayer();
    }
  }

  // =====================================================
  // EXPORTS
  // =====================================================
  global.CS2App = CS2App;
  global.CarouselUI = CarouselUI;
  global.CarouselSpinner = CarouselSpinner;
  global.CaseManager = CaseManager;
  global.Player = Player;
  global.WeightedRandom = WeightedRandom;
  global.RARITY_CONFIG = RARITY_CONFIG;

})(typeof window !== 'undefined' ? window : this);
