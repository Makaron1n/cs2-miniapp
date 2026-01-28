/**
 * Модуль настроек
 * Steam привязка, настройки магазина
 */

// Статус привязки Steam
let steamLinked = localStorage.getItem('steamLinked') === 'true';

/**
 * Обновить статус Steam
 */
function updateSteamStatus() {
    const statusEl = document.getElementById('steam-status');
    const btnEl = document.getElementById('steam-btn');
    const infoEl = document.getElementById('steam-info');
    
    if (!statusEl || !btnEl) return;
    
    if (steamLinked) {
        statusEl.textContent = 'Привязан';
        statusEl.style.color = '#00b894';
        btnEl.textContent = '✓ Привязан';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.7';
        if (infoEl) infoEl.style.display = 'block';
    } else {
        statusEl.textContent = 'Не привязан';
        statusEl.style.color = '#ff6b6b';
        btnEl.textContent = '🎮 Привязать';
        btnEl.disabled = false;
        btnEl.style.opacity = '1';
        if (infoEl) infoEl.style.display = 'none';
    }
}

/**
 * Привязать Steam (фейк)
 */
function linkSteam() {
    if (steamLinked) return;
    
    const confirmed = confirm('🎮 Привязать Steam аккаунт?\n\nЭто фейковая привязка для демонстрации.');
    if (confirmed) {
        steamLinked = true;
        localStorage.setItem('steamLinked', 'true');
        updateSteamStatus();
        alert('✅ Steam аккаунт успешно привязан!');
    }
}

/**
 * Получить настройки магазина
 */
function getShopSettings() {
    const saved = localStorage.getItem('shopSettings');
    if (saved) return JSON.parse(saved);
    return { sellEnabled: true, withdrawEnabled: true };
}

/**
 * Сохранить настройки магазина
 */
function saveShopSettings(settings) {
    localStorage.setItem('shopSettings', JSON.stringify(settings));
}

/**
 * Обновить кнопки магазина
 */
function updateShopButtons() {
    const settings = getShopSettings();
    const sellBtn = document.getElementById('sell-all-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    
    if (sellBtn) {
        sellBtn.style.opacity = settings.sellEnabled ? '1' : '0.5';
    }
    if (withdrawBtn) {
        withdrawBtn.style.opacity = settings.withdrawEnabled ? '1' : '0.5';
    }
}
