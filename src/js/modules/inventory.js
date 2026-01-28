/**
 * Модуль инвентаря
 * Управление инвентарём игрока: отображение, продажа, вывод
 */

// Выбранные скины (по UID)
let selectedItemIds = new Set();

/**
 * Отрисовка инвентаря
 */
function renderInventory(inventory) {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Очищаем выбор
    selectedItemIds.clear();
    updateSelectionUI();
    
    // Сбрасываем чекбокс "выбрать всё"
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    if (!inventory || inventory.length === 0) {
        grid.innerHTML = '<div style="opacity:0.5;grid-column:1/-1;text-align:center;padding:20px;">Пусто — откройте кейс!</div>';
        return;
    }
    
    // Добавляем уникальные ID если их нет
    inventory.forEach((item, idx) => {
        if (!item._uid) {
            item._uid = `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
        }
    });
    
    // Показываем последние 30 предметов (новые сверху)
    const visibleItems = inventory.slice(-30).reverse();
    
    visibleItems.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.dataset.uid = item._uid;
        el.style.position = 'relative';
        
        const color = item.rarity?.color || '#b0c3d9';
        el.style.borderLeft = `3px solid ${color}`;
        
        const price = getSkinPrice(item);
        const itemName = item.pattern?.name || item.name?.split('|')[1]?.trim() || item.name || 'Скин';
        
        el.innerHTML = `
            <input type="checkbox" class="inv-item-checkbox" data-uid="${item._uid}" onclick="event.stopPropagation(); toggleItemById('${item._uid}')">
            <img src="${item.image}" alt="${itemName}" onerror="this.src='https://via.placeholder.com/70?text=?'">
            <div class="inv-item-name">${itemName}</div>
            <div class="inv-item-price">${price} ⭐</div>
            <div class="inv-item-buttons">
                <button class="inv-btn inv-btn-sell" onclick="event.stopPropagation(); sellItemById('${item._uid}')">💰</button>
                <button class="inv-btn inv-btn-withdraw" onclick="event.stopPropagation(); withdrawItemById('${item._uid}')">📤</button>
            </div>
        `;
        
        // Клик на карточку тоже выбирает
        el.onclick = () => toggleItemById(item._uid);
        
        grid.appendChild(el);
    });
}

/**
 * Найти предмет по UID
 */
function findItemByUid(uid) {
    return app.player.inventory.find(item => item._uid === uid);
}

/**
 * Найти индекс предмета по UID
 */
function findItemIndexByUid(uid) {
    return app.player.inventory.findIndex(item => item._uid === uid);
}

/**
 * Переключить выбор предмета по UID
 */
function toggleItemById(uid) {
    const itemEl = document.querySelector(`[data-uid="${uid}"]`);
    const checkbox = document.querySelector(`.inv-item-checkbox[data-uid="${uid}"]`);
    
    if (selectedItemIds.has(uid)) {
        selectedItemIds.delete(uid);
        if (itemEl) itemEl.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedItemIds.add(uid);
        if (itemEl) itemEl.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }
    updateSelectionUI();
}

/**
 * Выбрать/снять всё
 */
function toggleSelectAll() {
    const checkbox = document.getElementById('select-all-checkbox');
    const allCheckboxes = document.querySelectorAll('.inv-item-checkbox');
    const allItems = document.querySelectorAll('.inv-item');
    
    if (checkbox && checkbox.checked) {
        // Выбрать все видимые
        allCheckboxes.forEach(cb => {
            const uid = cb.dataset.uid;
            selectedItemIds.add(uid);
            cb.checked = true;
        });
        allItems.forEach(el => el.classList.add('selected'));
    } else {
        // Снять всё
        selectedItemIds.clear();
        allCheckboxes.forEach(cb => cb.checked = false);
        allItems.forEach(el => el.classList.remove('selected'));
    }
    updateSelectionUI();
}

/**
 * Обновить UI выбора
 */
function updateSelectionUI() {
    const count = selectedItemIds.size;
    const sellBtn = document.getElementById('sell-all-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const countEl = document.getElementById('selected-count');
    
    if (sellBtn) {
        sellBtn.textContent = count > 0 ? `💰 Продать (${count})` : '💰 Продать всё';
    }
    if (withdrawBtn) {
        withdrawBtn.textContent = count > 0 ? `📤 Вывести (${count})` : '📤 Вывести всё';
    }
    if (countEl) {
        countEl.textContent = count > 0 ? `выбрано: ${count}` : '';
    }
}

/**
 * Получить цену скина
 */
function getSkinPrice(item) {
    return { 
        'Consumer Grade': 10, 
        'Industrial Grade': 25, 
        'Mil-Spec Grade': 50,
        'Restricted': 150,
        'Classified': 500,
        'Covert': 2000,
        'Extraordinary': 5000,
        'Contraband': 10000
    }[item.rarity?.name] || 15;
}

/**
 * Продать один предмет по UID
 */
function sellItemById(uid) {
    const settings = getShopSettings();
    if (!settings.sellEnabled) {
        alert('❌ Продажа временно отключена администратором');
        return;
    }
    
    const index = findItemIndexByUid(uid);
    if (index === -1) return;
    
    const item = app.player.inventory[index];
    const price = getSkinPrice(item);
    
    // Удаляем из инвентаря
    app.player.inventory.splice(index, 1);
    app.player.addBalance(price);
    app.player.save();
    
    // Убираем из выбранных
    selectedItemIds.delete(uid);
    
    // Обновляем UI
    updateUI();
}

/**
 * Вывести один предмет по UID
 */
function withdrawItemById(uid) {
    const settings = getShopSettings();
    if (!settings.withdrawEnabled) {
        alert('❌ Вывод временно отключен администратором');
        return;
    }
    
    if (!steamLinked) {
        alert('❌ Сначала привяжите Steam аккаунт в настройках!');
        return;
    }
    
    const index = findItemIndexByUid(uid);
    if (index === -1) return;
    
    const item = app.player.inventory[index];
    const itemName = item.pattern?.name || item.name?.split('|')[1]?.trim() || item.name;
    
    // Удаляем из инвентаря
    app.player.inventory.splice(index, 1);
    app.player.save();
    
    // Убираем из выбранных
    selectedItemIds.delete(uid);
    
    // Обновляем UI
    updateUI();
    
    alert(`✅ "${itemName}" отправлен на вывод!`);
}

/**
 * Продать (выбранные или все)
 */
function sellItems() {
    const settings = getShopSettings();
    if (!settings.sellEnabled) {
        alert('❌ Продажа временно отключена администратором');
        return;
    }
    
    if (app.player.inventory.length === 0) {
        alert('📦 Инвентарь пуст!');
        return;
    }
    
    let itemsToSell = [];
    
    if (selectedItemIds.size > 0) {
        // Собираем выбранные предметы
        selectedItemIds.forEach(uid => {
            const item = findItemByUid(uid);
            if (item) itemsToSell.push(item);
        });
    } else {
        // Продаём всё
        if (!confirm(`Продать все ${app.player.inventory.length} предметов?`)) return;
        itemsToSell = [...app.player.inventory];
    }
    
    if (itemsToSell.length === 0) return;
    
    // Считаем сумму
    let totalValue = itemsToSell.reduce((sum, item) => sum + getSkinPrice(item), 0);
    const itemCount = itemsToSell.length;
    
    // Удаляем проданные предметы
    const uidsToRemove = new Set(itemsToSell.map(i => i._uid));
    app.player.inventory = app.player.inventory.filter(item => !uidsToRemove.has(item._uid));
    
    app.player.addBalance(totalValue);
    app.player.save();
    selectedItemIds.clear();
    
    updateUI();
    
    alert(`💰 Продано ${itemCount} предметов! Получено: ${totalValue.toLocaleString()} ⭐`);
}

/**
 * Вывод на Steam (выбранные или все)
 */
function withdrawItems() {
    const settings = getShopSettings();
    if (!settings.withdrawEnabled) {
        alert('❌ Вывод временно отключен администратором');
        return;
    }
    
    if (!steamLinked) {
        alert('❌ Сначала привяжите Steam аккаунт в настройках!');
        return;
    }
    
    if (app.player.inventory.length === 0) {
        alert('📦 Инвентарь пуст!');
        return;
    }
    
    let itemsToWithdraw = [];
    
    if (selectedItemIds.size > 0) {
        // Собираем выбранные предметы
        selectedItemIds.forEach(uid => {
            const item = findItemByUid(uid);
            if (item) itemsToWithdraw.push(item);
        });
    } else {
        // Выводим всё
        if (!confirm(`Вывести все ${app.player.inventory.length} предметов на Steam?`)) return;
        itemsToWithdraw = [...app.player.inventory];
    }
    
    if (itemsToWithdraw.length === 0) return;
    
    const itemCount = itemsToWithdraw.length;
    
    // Удаляем выведенные предметы
    const uidsToRemove = new Set(itemsToWithdraw.map(i => i._uid));
    app.player.inventory = app.player.inventory.filter(item => !uidsToRemove.has(item._uid));
    
    app.player.save();
    selectedItemIds.clear();
    
    updateUI();
    
    alert(`✅ Заявка на вывод ${itemCount} предметов отправлена!\n\n📧 Предметы появятся в вашем Steam инвентаре в течение 24 часов.`);
}
