/**
 * Модуль админ-панели
 * Управление кейсами, настройками магазина
 */

// Пароль админа
const ADMIN_PASSWORD = 'admin123';

// Данные для создания кейса
let allSkins = [];
let selectedSkins = [];
let editingCaseId = null;

/**
 * Проверка входа админа
 */
function checkAdminLogin() {
    const password = prompt('🔐 Введите пароль администратора:');
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        openAdminPanel();
    } else if (password !== null) {
        alert('❌ Неверный пароль!');
    }
}

/**
 * Открыть админ-панель
 */
function openAdminPanel() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        checkAdminLogin();
        return;
    }
    
    document.getElementById('admin-panel').classList.add('active');
    renderAdminCaseList();
}

/**
 * Закрыть админ-панель
 */
function closeAdminPanel() {
    document.getElementById('admin-panel').classList.remove('active');
}

/**
 * Переключение вкладок админки
 */
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('admin-cases-tab').style.display = tab === 'cases' ? 'block' : 'none';
    document.getElementById('admin-create-tab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('admin-settings-tab').style.display = tab === 'settings' ? 'block' : 'none';
    
    if (tab === 'create') {
        loadAllSkins().then(() => {
            filterAdminSkins();
        });
    }
    
    if (tab === 'settings') {
        loadAdminShopSettings();
    }
}

/**
 * Загрузка настроек магазина в админке
 */
function loadAdminShopSettings() {
    const settings = getShopSettings();
    document.getElementById('admin-sell-toggle').checked = settings.sellEnabled;
    document.getElementById('admin-withdraw-toggle').checked = settings.withdrawEnabled;
}

/**
 * Переключение настройки магазина
 */
function toggleShopSetting(setting) {
    const settings = getShopSettings();
    if (setting === 'sell') {
        settings.sellEnabled = document.getElementById('admin-sell-toggle').checked;
    } else if (setting === 'withdraw') {
        settings.withdrawEnabled = document.getElementById('admin-withdraw-toggle').checked;
    }
    saveShopSettings(settings);
    updateShopButtons();
    
    const status = settings[setting + 'Enabled'] ? 'включена' : 'отключена';
    const name = setting === 'sell' ? 'Продажа' : 'Вывод';
    alert(`${name} ${status}`);
}

/**
 * Загрузка всех скинов
 */
async function loadAllSkins() {
    if (allSkins.length > 0) return;
    
    try {
        const response = await fetch('skins.json');
        allSkins = await response.json();
        console.log(`Loaded ${allSkins.length} skins for admin`);
    } catch (e) {
        console.error('Failed to load skins:', e);
    }
}

/**
 * Отрисовка списка кейсов в админке
 */
function renderAdminCaseList() {
    const container = document.getElementById('admin-case-list');
    const cases = app.getCases();
    const customCases = JSON.parse(localStorage.getItem('customCases') || '[]');
    
    let html = '';
    
    cases.forEach(c => {
        const isCustom = customCases.some(cc => cc.id === c.id);
        html += `
            <div class="admin-case-item">
                <div class="admin-case-info">
                    <h4>${c.name} ${isCustom ? '(Свой)' : ''}</h4>
                    <p>${c.skins.length} скинов • ${c.price} ⭐</p>
                </div>
                <div class="admin-case-actions">
                    <button class="admin-btn admin-btn-edit" onclick="editCase('${c.id}')">✏️</button>
                    ${isCustom ? `<button class="admin-btn admin-btn-delete" onclick="deleteCase('${c.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="text-align:center;color:#8899a6;">Нет кейсов</p>';
}

/**
 * Редактирование кейса
 */
function editCase(caseId) {
    const cases = app.getCases();
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;
    
    const customCases = JSON.parse(localStorage.getItem('customCases') || '[]');
    const isCustom = customCases.some(cc => cc.id === caseId);
    
    if (!isCustom) {
        // Создаём копию стандартного кейса
        editingCaseId = null;
        document.getElementById('admin-case-name').value = caseData.name + ' (Копия)';
    } else {
        editingCaseId = caseId;
        document.getElementById('admin-case-name').value = caseData.name;
    }
    
    document.getElementById('admin-case-price').value = caseData.price;
    document.getElementById('admin-case-desc').value = caseData.description || '';
    document.getElementById('admin-form-title').textContent = isCustom ? '✏️ Редактирование кейса' : '📋 Копия кейса';
    
    selectedSkins = caseData.skins.map(skin => ({
        ...skin,
        chance: skin.chance || getDefaultChance(skin.rarity?.name)
    }));
    
    // Переключаемся на вкладку создания
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab')[1].classList.add('active');
    document.getElementById('admin-cases-tab').style.display = 'none';
    document.getElementById('admin-create-tab').style.display = 'block';
    
    loadAllSkins().then(() => {
        renderAdminSkinsGrid();
        renderSelectedSkins();
    });
}

/**
 * Удаление кейса
 */
function deleteCase(caseId) {
    if (!confirm('Удалить этот кейс?')) return;
    
    let customCases = JSON.parse(localStorage.getItem('customCases') || '[]');
    customCases = customCases.filter(c => c.id !== caseId);
    localStorage.setItem('customCases', JSON.stringify(customCases));
    
    renderAdminCaseList();
    renderCases();
    alert('✅ Кейс удалён!');
}

/**
 * Получить шанс по умолчанию
 */
function getDefaultChance(rarityName) {
    return {
        'Consumer Grade': 40,
        'Industrial Grade': 30,
        'Mil-Spec Grade': 15,
        'Restricted': 10,
        'Classified': 3,
        'Covert': 1.5,
        'Extraordinary': 0.5,
        'Contraband': 0.1
    }[rarityName] || 10;
}

/**
 * Отрисовка сетки скинов в админке
 */
function renderAdminSkinsGrid(filter = '') {
    const container = document.getElementById('admin-skins-grid');
    if (!container) return;
    
    const rarityFilter = document.getElementById('admin-rarity-filter').value;
    const weaponFilter = document.getElementById('admin-weapon-filter').value;
    
    let filtered = allSkins.filter(s => s.image);
    
    // Фильтр по поиску
    if (filter) {
        const lowerFilter = filter.toLowerCase();
        filtered = filtered.filter(s => 
            s.name?.toLowerCase().includes(lowerFilter) ||
            s.weapon?.name?.toLowerCase().includes(lowerFilter)
        );
    }
    
    // Фильтр по типу оружия
    if (weaponFilter) {
        if (weaponFilter.startsWith('category:')) {
            const categoryName = weaponFilter.replace('category:', '');
            filtered = filtered.filter(s => s.category?.name === categoryName);
        } else {
            const weapons = weaponFilter.split(',').map(w => w.toLowerCase().trim());
            filtered = filtered.filter(s => {
                const skinName = (s.name || '').toLowerCase();
                const weaponName = (s.weapon?.name || '').toLowerCase();
                return weapons.some(w => 
                    skinName.includes(w) || 
                    weaponName.includes(w)
                );
            });
        }
    }
    
    // Фильтр по редкости
    if (rarityFilter) {
        filtered = filtered.filter(s => s.rarity?.name === rarityFilter);
    }
    
    const totalCount = filtered.length;
    
    let html = `<div style="grid-column:1/-1;text-align:center;color:#8899a6;font-size:12px;padding:5px;">
        Найдено: ${totalCount} скинов
    </div>`;
    
    // Показываем первые 100
    html += filtered.slice(0, 100).map(skin => {
        const isSelected = selectedSkins.some(s => s.id === skin.id);
        return `
            <div class="admin-skin-item ${isSelected ? 'selected' : ''}" 
                 onclick="toggleAdminSkin('${skin.id}')"
                 style="border-color: ${isSelected ? '#00b894' : skin.rarity?.color || '#b0c3d9'}">
                <img src="${skin.image}" alt="${skin.name}" loading="lazy">
                <div class="admin-skin-item-name">${skin.pattern?.name || skin.name?.split('|')[1]?.trim() || skin.name}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8899a6;padding:20px;">Скины не найдены.</div>';
    }
}

/**
 * Фильтрация скинов в админке
 */
function filterAdminSkins() {
    const search = document.getElementById('admin-skin-search').value;
    renderAdminSkinsGrid(search);
}

/**
 * Выбор/отмена скина
 */
function toggleAdminSkin(skinId) {
    const skin = allSkins.find(s => s.id === skinId);
    if (!skin) return;
    
    const index = selectedSkins.findIndex(s => s.id === skinId);
    if (index >= 0) {
        selectedSkins.splice(index, 1);
    } else {
        selectedSkins.push({
            ...skin,
            chance: getDefaultChance(skin.rarity?.name)
        });
    }
    
    renderAdminSkinsGrid(document.getElementById('admin-skin-search').value);
    renderSelectedSkins();
}

/**
 * Отрисовка выбранных скинов
 */
function renderSelectedSkins() {
    document.getElementById('admin-selected-count').textContent = selectedSkins.length;
    const container = document.getElementById('admin-selected-list');
    
    if (selectedSkins.length === 0) {
        container.innerHTML = '<p style="color:#8899a6;font-size:12px;">Выберите скины из списка выше</p>';
        return;
    }
    
    container.innerHTML = selectedSkins.map((skin, index) => `
        <div class="admin-selected-item" style="border-left: 3px solid ${skin.rarity?.color || '#b0c3d9'}">
            <img src="${skin.image}" alt="${skin.name}">
            <div class="admin-selected-info">
                <div class="admin-selected-name">${skin.pattern?.name || skin.name?.split('|')[1]?.trim() || skin.name}</div>
                <div class="admin-selected-rarity" style="color:${skin.rarity?.color || '#b0c3d9'}">${skin.rarity?.name || 'Unknown'}</div>
            </div>
            <input type="number" class="admin-chance-input" value="${skin.chance}" min="0.1" max="100" step="0.1"
                   onchange="updateSkinChance(${index}, this.value)" placeholder="Шанс %">
            <button class="admin-btn admin-btn-delete" onclick="removeSkin(${index})">✕</button>
        </div>
    `).join('');
}

/**
 * Обновить шанс скина
 */
function updateSkinChance(index, value) {
    selectedSkins[index].chance = parseFloat(value) || 1;
}

/**
 * Удалить скин из выбранных
 */
function removeSkin(index) {
    selectedSkins.splice(index, 1);
    renderAdminSkinsGrid(document.getElementById('admin-skin-search').value);
    renderSelectedSkins();
}

/**
 * Сохранить кейс
 */
function saveAdminCase() {
    const name = document.getElementById('admin-case-name').value.trim();
    const price = parseInt(document.getElementById('admin-case-price').value);
    const desc = document.getElementById('admin-case-desc').value.trim();
    
    if (!name) {
        alert('❌ Введите название кейса!');
        return;
    }
    if (!price || price < 1) {
        alert('❌ Введите корректную цену!');
        return;
    }
    if (selectedSkins.length < 2) {
        alert('❌ Выберите минимум 2 скина!');
        return;
    }
    
    const caseData = {
        id: editingCaseId || `custom_${Date.now()}`,
        name,
        price,
        description: desc || `${selectedSkins.length} скинов`,
        skins: selectedSkins.map(s => ({
            id: s.id,
            name: s.name,
            image: s.image,
            rarity: s.rarity,
            pattern: s.pattern,
            weapon: s.weapon,
            chance: s.chance
        }))
    };
    
    let customCases = JSON.parse(localStorage.getItem('customCases') || '[]');
    
    if (editingCaseId) {
        const index = customCases.findIndex(c => c.id === editingCaseId);
        if (index >= 0) {
            customCases[index] = caseData;
        }
    } else {
        customCases.push(caseData);
    }
    
    localStorage.setItem('customCases', JSON.stringify(customCases));
    
    clearAdminForm();
    renderAdminCaseList();
    renderCases();
    
    alert('✅ Кейс сохранён!');
    
    // Возвращаемся на вкладку кейсов
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab')[0].classList.add('active');
    document.getElementById('admin-cases-tab').style.display = 'block';
    document.getElementById('admin-create-tab').style.display = 'none';
}

/**
 * Очистить форму
 */
function clearAdminForm() {
    document.getElementById('admin-case-name').value = '';
    document.getElementById('admin-case-price').value = '';
    document.getElementById('admin-case-desc').value = '';
    document.getElementById('admin-form-title').textContent = '➕ Новый кейс';
    editingCaseId = null;
    selectedSkins = [];
    renderSelectedSkins();
    renderAdminSkinsGrid();
}
