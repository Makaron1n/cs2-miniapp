/**
 * Модуль навигации
 * Переключение вкладок, обновление UI
 */

// Активная вкладка
let currentTab = 'profile';

/**
 * Переключение вкладок
 */
function openTab(tabName) {
    currentTab = tabName;
    
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Показать выбранную вкладку
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    // Обновить кнопки навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[onclick*="${tabName}"]`).classList.add('active');
    
    // Обновить контент вкладки
    updateTabContent(tabName);
}

/**
 * Обновление контента вкладки
 */
function updateTabContent(tabName) {
    switch(tabName) {
        case 'profile':
            updateProfileTab();
            break;
        case 'cases':
            renderCases();
            break;
        case 'top':
            updateTopTab();
            break;
        case 'settings':
            updateSettingsTab();
            break;
    }
}

/**
 * Обновление вкладки профиля
 */
function updateProfileTab() {
    updateUI();
    renderInventory();
    renderQuests();
}

/**
 * Обновление UI профиля
 */
function updateUI() {
    if (!app || !app.player) return;
    
    const player = app.player;
    
    // Баланс
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = player.balance.toLocaleString();
    }
    
    // Количество предметов
    const itemsCountEl = document.getElementById('items-count');
    if (itemsCountEl) {
        itemsCountEl.textContent = player.inventory.length;
    }
    
    // Общая стоимость
    const totalValueEl = document.getElementById('total-value');
    if (totalValueEl) {
        const total = player.inventory.reduce((sum, item) => sum + (item.price || 0), 0);
        totalValueEl.textContent = total.toLocaleString();
    }
}

/**
 * Обновление вкладки топа
 */
function updateTopTab() {
    const topList = document.getElementById('top-list');
    if (!topList) return;
    
    // Генерируем фейковых игроков для демо
    const fakeTop = [
        { name: 'ShadowHunter', drops: 156, value: 125000 },
        { name: 'NightWolf_CS', drops: 142, value: 98500 },
        { name: 'ProPlayer2024', drops: 128, value: 87200 },
        { name: 'LuckyStrike', drops: 115, value: 76800 },
        { name: 'CaseMaster', drops: 98, value: 65400 },
        { name: 'SkinLover', drops: 87, value: 54200 },
        { name: 'GoldenEagle', drops: 76, value: 43100 },
        { name: 'DragonSlayer', drops: 65, value: 32500 },
        { name: 'PixelWarrior', drops: 54, value: 28700 },
        { name: 'CryptoTrader', drops: 43, value: 21300 }
    ];
    
    // Добавляем текущего игрока
    const player = app.player;
    const playerData = {
        name: 'Вы',
        drops: player.inventory.length,
        value: player.inventory.reduce((sum, item) => sum + (item.price || 0), 0)
    };
    
    const allPlayers = [...fakeTop, playerData].sort((a, b) => b.value - a.value);
    
    topList.innerHTML = allPlayers.slice(0, 10).map((p, i) => `
        <div class="top-item ${p.name === 'Вы' ? 'current-player' : ''}">
            <div class="top-rank">${i + 1}</div>
            <div class="top-info">
                <div class="top-name">${p.name}</div>
                <div class="top-stats">${p.drops} дропов • ${p.value.toLocaleString()} ⭐</div>
            </div>
            <div class="top-value">${p.value.toLocaleString()} ⭐</div>
        </div>
    `).join('');
}

/**
 * Обновление вкладки настроек
 */
function updateSettingsTab() {
    updateSteamStatus();
    updateShopButtons();
}

/**
 * Обновление кнопок магазина
 */
function updateShopButtons() {
    const settings = getShopSettings();
    
    // Кнопка продать всё
    const sellAllBtn = document.querySelector('.action-btn.sell-btn');
    if (sellAllBtn) {
        sellAllBtn.disabled = !settings.sellEnabled;
        sellAllBtn.title = settings.sellEnabled ? '' : 'Продажа отключена';
    }
    
    // Кнопка вывести всё
    const withdrawAllBtn = document.querySelector('.action-btn.withdraw-btn');
    if (withdrawAllBtn) {
        withdrawAllBtn.disabled = !settings.withdrawEnabled;
        withdrawAllBtn.title = settings.withdrawEnabled ? '' : 'Вывод отключен';
    }
}

/**
 * Показать результат открытия кейса
 */
function showDropResult(item) {
    const modal = document.getElementById('drop-result-modal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="drop-result-content" style="border-color: ${item.rarity?.color || '#b0c3d9'}">
            <button class="close-modal" onclick="closeDropResult()">✕</button>
            <div class="drop-result-rarity" style="color: ${item.rarity?.color || '#b0c3d9'}">
                ${item.rarity?.name || 'Unknown'}
            </div>
            <img src="${item.image}" alt="${item.name}" class="drop-result-image">
            <div class="drop-result-name">${item.name}</div>
            <div class="drop-result-price">${item.price?.toLocaleString() || 0} ⭐</div>
            <div class="drop-result-actions">
                <button class="action-btn sell-btn" onclick="sellLastDrop()">
                    💰 Продать
                </button>
                <button class="action-btn" onclick="closeDropResult()">
                    📦 В инвентарь
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Закрыть модал результата
 */
function closeDropResult() {
    const modal = document.getElementById('drop-result-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Продать последний дроп
 */
function sellLastDrop() {
    const inventory = app.player.inventory;
    if (inventory.length === 0) return;
    
    const lastItem = inventory[inventory.length - 1];
    const price = lastItem.price || 0;
    
    inventory.pop();
    app.player.balance += price;
    app.player.save();
    
    closeDropResult();
    updateUI();
    renderInventory();
    
    showNotification(`💰 Продано за ${price.toLocaleString()} ⭐`);
}

/**
 * Показать уведомление
 */
function showNotification(message, duration = 2000) {
    // Удаляем старые уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 184, 148, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Инициализация навигации
 */
function initNavigation() {
    // Открываем вкладку профиля по умолчанию
    openTab('profile');
}

// Экспорт для ES6 модулей (если понадобится)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openTab,
        updateUI,
        showNotification,
        initNavigation
    };
}
