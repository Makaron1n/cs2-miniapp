/**
 * Модуль квестов
 * Система ежедневных квестов с лимитом очков
 */

const DAILY_POINTS_LIMIT = 20;
const CASE_COST = 100;

// Шаблоны квестов
const QUEST_TEMPLATES = [
    { id: 'play_matches', title: '🎮 Сыграть матчи', description: 'Сыграйте 3 матча на сервере', target: 3, reward: 5, icon: '🎮' },
    { id: 'win_rounds', title: '🏆 Победить в раундах', description: 'Выиграйте 10 раундов', target: 10, reward: 4, icon: '🏆' },
    { id: 'get_kills', title: '💀 Убийства', description: 'Совершите 15 убийств', target: 15, reward: 5, icon: '💀' },
    { id: 'headshots', title: '🎯 Хедшоты', description: 'Совершите 5 убийств в голову', target: 5, reward: 4, icon: '🎯' },
    { id: 'play_time', title: '⏱️ Время в игре', description: 'Проведите 30 минут на сервере', target: 30, reward: 6, icon: '⏱️' },
    { id: 'use_grenades', title: '💣 Использовать гранаты', description: 'Используйте 10 гранат', target: 10, reward: 3, icon: '💣' },
    { id: 'plant_bomb', title: '💥 Заложить бомбу', description: 'Заложите бомбу 2 раза', target: 2, reward: 4, icon: '💥' },
    { id: 'defuse_bomb', title: '🔧 Разминировать', description: 'Разминируйте бомбу 1 раз', target: 1, reward: 5, icon: '🔧' }
];

/**
 * Получить данные квестов
 */
function getQuestData() {
    const saved = localStorage.getItem('cs2_quests');
    if (saved) {
        const data = JSON.parse(saved);
        // Проверяем, это сегодняшние квесты
        const today = new Date().toDateString();
        if (data.date === today) {
            return data;
        }
    }
    // Генерируем новые квесты на сегодня
    return generateDailyQuests();
}

/**
 * Генерация ежедневных квестов
 */
function generateDailyQuests() {
    // Выбираем 4 случайных квеста на день
    const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    const dailyQuests = shuffled.slice(0, 4).map(q => ({
        ...q,
        progress: 0,
        claimed: false
    }));
    
    const data = {
        date: new Date().toDateString(),
        quests: dailyQuests,
        earnedToday: 0
    };
    
    saveQuestData(data);
    return data;
}

/**
 * Сохранить данные квестов
 */
function saveQuestData(data) {
    localStorage.setItem('cs2_quests', JSON.stringify(data));
}

/**
 * Отрисовка квестов
 */
function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    
    const questData = getQuestData();
    
    document.getElementById('daily-earned').textContent = questData.earnedToday;
    document.getElementById('daily-max').textContent = DAILY_POINTS_LIMIT;
    
    let html = '';
    questData.quests.forEach((quest, index) => {
        const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
        const isComplete = quest.progress >= quest.target;
        const canClaim = isComplete && !quest.claimed && questData.earnedToday < DAILY_POINTS_LIMIT;
        
        html += `
            <div class="quest-item ${quest.claimed ? 'quest-completed' : ''}">
                <div class="quest-info">
                    <div class="quest-title">${quest.title}</div>
                    <div class="quest-description">${quest.description}</div>
                    <div class="quest-progress">
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="quest-progress-text">${quest.progress}/${quest.target}</div>
                    </div>
                </div>
                <div class="quest-reward">
                    <div class="quest-reward-value">${quest.claimed ? '✓' : '+' + quest.reward}</div>
                    <div class="quest-reward-label">${quest.claimed ? 'Получено' : 'очков'}</div>
                    ${canClaim ? `<button class="quest-btn quest-btn-claim" onclick="claimQuest(${index})">Забрать</button>` : ''}
                    ${!isComplete && !quest.claimed ? `<button class="quest-btn quest-btn-disabled" onclick="simulateQuestProgress(${index})">▶️ Симул.</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Забрать награду за квест
 */
function claimQuest(index) {
    const questData = getQuestData();
    const quest = questData.quests[index];
    
    if (quest.claimed || quest.progress < quest.target) return;
    
    // Рассчитываем награду с учётом дневного лимита
    const reward = Math.min(quest.reward, DAILY_POINTS_LIMIT - questData.earnedToday);
    if (reward <= 0) {
        alert('❌ Достигнут дневной лимит очков!');
        return;
    }
    
    quest.claimed = true;
    questData.earnedToday += reward;
    saveQuestData(questData);
    
    // Добавляем очки к балансу
    if (app && app.player) {
        app.player.addBalance(reward);
        app.player.save();
        updateUI();
    }
    
    renderQuests();
    alert(`✅ Получено ${reward} ⭐!`);
}

/**
 * Симуляция прогресса квеста (для демонстрации)
 */
function simulateQuestProgress(index) {
    const questData = getQuestData();
    const quest = questData.quests[index];
    
    if (quest.claimed) return;
    
    // Добавляем случайный прогресс
    const add = Math.ceil(quest.target * 0.3) + Math.floor(Math.random() * quest.target * 0.3);
    quest.progress = Math.min(quest.target, quest.progress + add);
    
    saveQuestData(questData);
    renderQuests();
    
    if (quest.progress >= quest.target) {
        alert(`🎉 Квест "${quest.title}" выполнен! Заберите награду.`);
    }
}
