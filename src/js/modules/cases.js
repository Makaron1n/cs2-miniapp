/**
 * Модуль кейсов
 * Отрисовка и открытие кейсов
 */

/**
 * Отрисовка сетки кейсов
 */
function renderCases() {
    const container = document.getElementById('cases-grid');
    if (!container) return;
    
    const cases = app.getCases();
    container.innerHTML = '';
    
    cases.forEach(caseData => {
        const card = document.createElement('div');
        card.className = 'case-card';
        
        // Первые несколько скинов для превью
        const previewSkins = caseData.skins.slice(0, 6);
        const skinPreview = previewSkins.map(skin => `
            <div class="case-skin-item">
                <img src="${skin.image}" alt="${skin.name}" onerror="this.src='https://via.placeholder.com/50?text=?'">
                <div class="case-skin-item-name">${skin.pattern?.name || skin.name?.split('|')[1]?.trim() || ''}</div>
            </div>
        `).join('');
        
        card.innerHTML = `
            <div class="case-header">
                <div class="case-name">${caseData.name}</div>
                <div class="case-price">${caseData.price} ⭐</div>
            </div>
            <div class="case-desc">${caseData.description || `${caseData.skins.length} скинов`}</div>
            <div class="case-skins-pool">
                <div class="case-skins-title">🎁 Возможный дроп:</div>
                <div class="case-skins-preview">${skinPreview}</div>
            </div>
            <div class="case-buttons">
                <button class="btn" onclick="openCase('${caseData.id}')">🎰 Открыть</button>
                <button class="btn btn-secondary" onclick="showCaseContents('${caseData.id}')">📋 Содержимое</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

/**
 * Открытие кейса
 */
async function openCase(caseId) {
    if (!app.canOpenCase(caseId)) {
        alert('❌ Недостаточно баланса!');
        return;
    }

    const carouselContainer = document.getElementById('carousel-container');
    carouselContainer.classList.add('active');
    carouselContainer.innerHTML = '<div style="text-align:center;padding:20px;">🎰 Крутим...</div>';

    try {
        const result = await app.openCaseAnimated(caseId, carouselContainer);
        
        setTimeout(() => {
            updateUI();
        }, 1000);
        
    } catch (error) {
        alert('❌ Ошибка: ' + error.message);
        carouselContainer.classList.remove('active');
    }
}

/**
 * Показать содержимое кейса
 */
function showCaseContents(caseId) {
    const cases = app.getCases();
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;
    
    const modal = document.getElementById('case-modal');
    const modalGrid = document.getElementById('modal-skins-grid');
    document.getElementById('modal-case-name').textContent = caseData.name;
    
    // Группируем по редкости
    const byRarity = {};
    const rarityOrder = ['Contraband', 'Covert', 'Extraordinary', 'Classified', 'Restricted', 'Mil-Spec Grade', 'Industrial Grade', 'Consumer Grade'];
    
    caseData.skins.forEach(skin => {
        const rarity = skin.rarity?.name || 'Unknown';
        if (!byRarity[rarity]) byRarity[rarity] = [];
        byRarity[rarity].push(skin);
    });
    
    let html = '';
    rarityOrder.forEach(rarity => {
        if (byRarity[rarity] && byRarity[rarity].length > 0) {
            const color = byRarity[rarity][0].rarity?.color || '#b0c3d9';
            html += `
                <div class="modal-rarity-section">
                    <div class="modal-rarity-title" style="color: ${color}">${rarity} (${byRarity[rarity].length})</div>
                    <div class="modal-skins-row">
                        ${byRarity[rarity].map(skin => `
                            <div class="modal-skin-item" style="border-color: ${skin.rarity?.color || '#b0c3d9'}">
                                <img src="${skin.image}" alt="${skin.name}" onerror="this.src='https://via.placeholder.com/60?text=?'">
                                <div class="modal-skin-name">${skin.pattern?.name || skin.name?.split('|')[1]?.trim() || skin.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    modalGrid.innerHTML = html;
    modal.classList.add('active');
}

/**
 * Закрыть модальное окно содержимого кейса
 */
function closeCaseModal() {
    document.getElementById('case-modal').classList.remove('active');
}
