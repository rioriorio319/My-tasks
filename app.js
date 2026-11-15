
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

const taskCount = document.getElementById("task-count");
const totalEstimate = document.getElementById("total-estimate");

const taskName = document.getElementById("task-name");
const taskSubject = document.getElementById("task-subject");
const taskDeadline = document.getElementById("task-deadline");
const taskEstimate = document.getElementById("task-estimate");

let tasks = JSON.parse(localStorage.getItem("myTasks")) || [];
let activeTimers = {};


// 課題を保存する
function saveTasks() {
  localStorage.setItem("myTasks", JSON.stringify(tasks));
}


// 時間を表示する
function formatTime(milliseconds) {
  if (milliseconds <= 0) {
    return "期限を過ぎています";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `残り ${days}日 ${hours}時間`;
  }

  if (hours > 0) {
    return `残り ${hours}時間 ${minutes}分`;
  }

  return `残り ${minutes}分`;
}


// 作業時間を表示する
function formatHours(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}時間 ${minutes}分 ${seconds}秒`;
}


// HTMLに安全に文字を表示する
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    const escaped = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return escaped[char];
  });
}


// 課題を登録する
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const task = {
    id: Date.now(),
    name: taskName.value.trim(),
    subject: taskSubject.value.trim(),
    deadline: taskDeadline.value,
    estimate: Number(taskEstimate.value),
    actualTime: 0,
    completed: false
  };

  tasks.push(task);

  saveTasks();

  taskForm.reset();

  renderTasks();
});


// 課題一覧を表示する
function renderTasks() {
  taskList.innerHTML = "";

  const unfinishedTasks = tasks.filter(task => !task.completed);

  taskCount.textContent = unfinishedTasks.length;

  const total = unfinishedTasks.reduce(
    (sum, task) => sum + Number(task.estimate || 0),
    0
  );

  totalEstimate.textContent = Number(total.toFixed(2));

  emptyMessage.style.display =
    tasks.length === 0 ? "block" : "none";


  // 未完了を先にし、提出期限が近い順に並べる
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    return new Date(a.deadline) - new Date(b.deadline);
  });


  sortedTasks.forEach(task => {
    const remaining =
      new Date(task.deadline).getTime() - Date.now();

    let statusText = "";
    let statusClass = "";

    if (task.completed) {
      statusText = "完了";
      statusClass = "status-completed";
    } else if (remaining <= 0) {
      statusText = "期限切れ";
      statusClass = "status-danger";
    } else if (remaining <= 24 * 60 * 60 * 1000) {
      statusText = "期限間近";
      statusClass = "status-danger";
    } else if (remaining <= 3 * 24 * 60 * 60 * 1000) {
      statusText = "もうすぐ";
      statusClass = "status-warning";
    } else {
      statusText = "進行中";
      statusClass = "status-normal";
    }


    const deadlineText = task.completed
      ? "提出済み"
      : formatTime(remaining);


    const actualTime =
      task.actualTime +
      (activeTimers[task.id]
        ? Date.now() - activeTimers[task.id]
        : 0);


    const card = document.createElement("div");

    card.className =
      task.completed ? "task-card completed" : "task-card";


    card.innerHTML = `
      <div class="task-top">
        <div>
          <p class="task-name">
            ${escapeHTML(task.name)}
          </p>

          <p class="task-subject">
            ${escapeHTML(task.subject || "科目未設定")}
          </p>
        </div>

        <span class="status ${statusClass}">
          ${statusText}
        </span>
      </div>

      <p class="task-time">
        ⏰ ${deadlineText}
      </p>

      <p class="task-info">
        予想：${task.estimate}時間
        <br>
        実際：${formatHours(actualTime)}
      </p>

      <div class="task-actions">

        <button
          class="complete-button"
          onclick="toggleComplete(${task.id})"
        >
          ${task.completed ? "未完了に戻す" : "完了にする"}
        </button>

        <button
          class="complete-button"
          onclick="toggleTimer(${task.id})"
          ${task.completed ? "disabled" : ""}
        >
          ${activeTimers[task.id] ? "計測を停止" : "計測開始"}
        </button>

        <button
          class="delete-button"
          onclick="deleteTask(${task.id})"
        >
          削除
        </button>

      </div>
    `;

    taskList.appendChild(card);
  });
}


// 完了・未完了を切り替える
function toggleComplete(id) {
  const task = tasks.find(task => task.id === id);

  if (!task) return;

  if (activeTimers[id]) {
    task.actualTime += Date.now() - activeTimers[id];
    delete activeTimers[id];
  }

  task.completed = !task.completed;

  saveTasks();

  renderTasks();
}


// 課題を削除する
function deleteTask(id) {
  if (!confirm("この課題を削除しますか？")) {
    return;
  }

  tasks = tasks.filter(task => task.id !== id);

  delete activeTimers[id];

  saveTasks();

  renderTasks();
}


// ストップウォッチを操作する
function toggleTimer(id) {
  const task = tasks.find(task => task.id === id);

  if (!task || task.completed) return;

  if (activeTimers[id]) {
    task.actualTime += Date.now() - activeTimers[id];

    delete activeTimers[id];
  } else {
    activeTimers[id] = Date.now();
  }

  saveTasks();

  renderTasks();
}


// 残り時間を30秒ごとに更新
setInterval(renderTasks, 30000);


// 最初の表示
renderTasks();


// PWAのService Workerを登録
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((error) => {
        console.error(
          "Service Worker registration failed:",
          error
        );
      });
  });
}
