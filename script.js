
const classInput = document.getElementById("classTime");
const busInput = document.getElementById("busTime");
const walkingInput = document.getElementById("walkingTime");
const marginInput = document.getElementById("marginTime");

const sampleBuses = [
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00"
];

// These times are examples, not official bus data.

function toMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) return NaN;

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) return NaN;

  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;

  return String(hours).padStart(2, "0") + ":" +
    String(mins).padStart(2, "0");
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function updateClock() {
  const now = new Date();

  document.getElementById("currentClock").textContent =
    now.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

function calculate() {
  const classTime = toMinutes(classInput.value);
  const busTime = toMinutes(busInput.value);
  const walking = Number(walkingInput.value);
  const margin = Number(marginInput.value);
  const currentTime = getCurrentMinutes();

  const status = document.getElementById("statusText");
  const warning = document.getElementById("warning");

  if (
    !Number.isFinite(classTime) ||
    !Number.isFinite(busTime) ||
    !Number.isInteger(walking) ||
    !Number.isInteger(margin) ||
    walking < 0 ||
    margin < 0 ||
    walking > 180 ||
    margin > 180
  ) {
    status.textContent = "入力内容を確認してください";
    warning.textContent = "有効な時刻と分数を入力してください。";
    document.getElementById("minutesDisplay").textContent = "--";
    return;
  }

  const leaveTime = busTime - walking - margin;
  const available = Math.max(0, leaveTime - currentTime);

  document.getElementById("classDisplay").textContent =
    classInput.value;

  document.getElementById("busDisplay").textContent =
    busInput.value;

  document.getElementById("minutesDisplay").textContent =
    available;

  document.getElementById("resultBus").textContent =
    busInput.value;

  document.getElementById("resultClass").textContent =
    classInput.value;

  document.getElementById("leaveTime").textContent =
    formatTime((leaveTime + 1440) % 1440);

  if (busTime >= classTime) {
    status.textContent = "⚠️ バスの時刻が講義開始以降です";
    warning.textContent =
      "このバスでは次の講義に間に合いません。";
  } else if (leaveTime <= currentTime) {
    status.textContent = "⚠️ 出発時刻を過ぎています";
    warning.textContent =
      "別のバスを選択してください。";
  } else {
    status.textContent = "✅ 出発まで時間があります";
    warning.textContent =
      "バス停までの徒歩時間と余裕時間を含めた結果です。";
  }

  // Save settings in this browser.
  localStorage.setItem("campusFlowSettings", JSON.stringify({
    classTime: classInput.value,
    busTime: busInput.value,
    walking,
    margin
  }));
}

function renderBuses() {
  const list = document.getElementById("busList");

  list.innerHTML = "";

  sampleBuses.forEach(time => {
    const item = document.createElement("div");
    item.className = "bus-item";

    const info = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "🚌 " + time;

    const subtitle = document.createElement("small");
    subtitle.textContent = "サンプル便";

    info.append(title, subtitle);

    const button = document.createElement("button");
    button.textContent = "選択";

    button.addEventListener("click", () => {
      busInput.value = time;
      calculate();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    item.append(info, button);
    list.appendChild(item);
  });
}

function resetSettings() {
  classInput.value = "13:15";
  busInput.value = "12:30";
  walkingInput.value = "5";
  marginInput.value = "5";
  calculate();
}

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("campusFlowSettings")
    );

    if (saved) {
      classInput.value = saved.classTime ?? "13:15";
      busInput.value = saved.busTime ?? "12:30";
      walkingInput.value = saved.walking ?? 5;
      marginInput.value = saved.margin ?? 5;
    }
  } catch (error) {
    console.warn("Saved settings unavailable", error);
  }
}

document.getElementById("calculateButton")
  .addEventListener("click", calculate);

document.getElementById("resetButton")
  .addEventListener("click", resetSettings);

[classInput, busInput, walkingInput, marginInput]
  .forEach(input => {
    input.addEventListener("input", calculate);
  });

loadSettings();
renderBuses();
updateClock();
calculate();

setInterval(() => {
  updateClock();
  calculate();
}, 30000);
