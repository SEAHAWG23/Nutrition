/* ====== STATE ====== */
let rmr = null;
let tdee = null;
let goalCalories = null;
let macroTargets = { kcal: null, protein: null, carbs: null, fat: null };
let meals = [];
let history = [];
let lastDate = null;

const STORAGE_KEY = "nutritionAppState_v1";

/* ====== HELPERS ====== */
function getNumber(id) {
    const val = parseFloat(document.getElementById(id).value);
    return isNaN(val) ? null : val;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function calculateTotals(list = meals) {
    return list.reduce(
        (acc, m) => {
            acc.kcal += m.calories;
            acc.protein += m.protein;
            acc.carbs += m.carbs;
            acc.fat += m.fat;
            return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

/* ====== SAVE / LOAD ====== */
function saveState() {
    const state = {
        rmr,
        tdee,
        goalCalories,
        macroTargets,
        meals,
        history,
        lastDate,
        profile: {
            gender: gender.value,
            age: age.value,
            weight: weight.value,
            height: height.value
        },
        macrosPct: {
            protein: macro-protein.value,
            carbs: macro-carbs.value,
            fat: macro-fat.value
        }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        lastDate = todayISO();
        updateSummaryCards();
        updateTotalsUI();
        updateHistoryUI();
        return;
    }

    const saved = JSON.parse(raw);

    rmr = saved.rmr;
    tdee = saved.tdee;
    goalCalories = saved.goalCalories;
    macroTargets = saved.macroTargets || macroTargets;
    meals = saved.meals || [];
    history = saved.history || [];
    lastDate = saved.lastDate || todayISO();

    if (saved.profile) {
        gender.value = saved.profile.gender;
        age.value = saved.profile.age;
        weight.value = saved.profile.weight;
        height.value = saved.profile.height;
    }

    if (saved.macrosPct) {
        macro-protein.value = saved.macrosPct.protein;
        macro-carbs.value = saved.macrosPct.carbs;
        macro-fat.value = saved.macrosPct.fat;
    }

    handleDailyRolloverOnLoad();
    updateTotalsUI();
    updateSummaryCards();
    updateHistoryUI();
}

/* ====== DAILY ROLLOVER ====== */
function addTodayToHistory(reason) {
    if (!meals.length) return;

    const totals = calculateTotals();

    history.unshift({
        date: lastDate,
        totals,
        reason,
        mealCount: meals.length
    });

    meals = [];
}

function handleDailyRolloverOnLoad() {
    const today = todayISO();

    if (lastDate !== today && meals.length) {
        addTodayToHistory("auto-rollover");
        lastDate = today;
        saveState();
    }
}

/* ====== UI UPDATES ====== */
function updateSummaryCards() {
    const totals = calculateTotals();

    summary-intake.textContent = totals.kcal + " kcal";
    summary-tdee.textContent = tdee ? Math.round(tdee) + " kcal" : "– kcal";

    updateProgressBars();
}

function updateMealList() {
    meal-list.innerHTML = "";

    if (!meals.length) {
        meal-list.innerHTML = `<div class="muted">No foods logged yet.</div>`;
        return;
    }

    meals.forEach((meal, i) => {
        const row = document.createElement("div");
        row.className = "meal-item";
        row.innerHTML = `
            <div>${meal.name}</div>
            <div>${meal.calories} kcal</div>
            <div>${meal.protein} g</div>
            <div>${meal.carbs} g</div>
            <div>${meal.fat} g</div>
            <button data-i="${i}">×</button>
        `;
        meal-list.appendChild(row);
    });

    meal-list.querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
            meals.splice(btn.dataset.i, 1);
            updateTotalsUI();
            saveState();
        };
    });
}

function updateTotalsUI() {
    const totals = calculateTotals();

    totals-kcal.textContent = totals.kcal;
    totals-protein.textContent = totals.protein;
    totals-carbs.textContent = totals.carbs;
    totals-fat.textContent = totals.fat;

    updateMealList();
    updateSummaryCards();
}

function updateProgressBars() {
    const totals = calculateTotals();

    function setBar(fill, label, current, target, unit) {
        if (!target) {
            fill.style.width = "0%";
            label.textContent = `${current} / – ${unit}`;
            return;
        }
        const pct = Math.min(150, (current / target) * 100);
        fill.style.width = pct + "%";
        label.textContent = `${current} / ${Math.round(target)} ${unit}`;
    }

    setBar(progress-kcal, progress-kcal-label, totals.kcal, goalCalories, "kcal");
    setBar(progress-protein, progress-protein-label, totals.protein, macroTargets.protein, "g");
    setBar(progress-carbs, progress-carbs-label, totals.carbs, macroTargets.carbs, "g");
    setBar(progress-fat, progress-fat-label, totals.fat, macroTargets.fat, "g");
}

function updateHistoryUI() {
    history-list.innerHTML = "";

    if (!history.length) {
        history-list.innerHTML = `<div class="muted">No past days stored yet.</div>`;
        return;
    }

    history.forEach(day => {
        const div = document.createElement("div");
        div.className = "history-day";
        div.innerHTML = `
            <strong>${day.date}</strong> — ${day.totals.kcal} kcal  
            <div class="muted">${day.mealCount} items (${day.reason})</div>
        `;
        history-list.appendChild(div);
    });
}

/* ====== EVENT LISTENERS ====== */
btn-add-food.onclick = () => {
    const name = food-name.value.trim();
    const calories = getNumber("food-calories") || 0;
    const protein = getNumber("food-protein") || 0;
    const carbs = getNumber("food-carbs") || 0;
    const fat = getNumber("food-fat") || 0;

    meals.push({ name, calories, protein, carbs, fat });

    food-name.value = "";
    food-calories.value = "";
    food-protein.value = "";
    food-carbs.value = "";
    food-fat.value = "";

    updateTotalsUI();
    saveState();
};

btn-clear-day.onclick = () => {
    addTodayToHistory("manual-clear");
    meals = [];
    lastDate = todayISO();
    updateTotalsUI();
    updateHistoryUI();
    saveState();
};

btn-reset-all.onclick = () => {
    if (!confirm("Erase ALL data?")) return;

    localStorage.removeItem(STORAGE_KEY);
    location.reload();
};

/* ====== INIT ====== */
loadState();
