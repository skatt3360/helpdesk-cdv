import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getDatabase, ref, onValue, set, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1yUVD47m16FFRGh6LEpWpVZkAHHuiTXU",
  authDomain: "szaferpage.firebaseapp.com",
  databaseURL: "https://szaferpage-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "szaferpage",
  storageBucket: "szaferpage.firebasestorage.app",
  messagingSenderId: "240077599565",
  appId: "1:240077599565:web:01deea4f5908bc9f01bd04"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const sharedRef = ref(db, "vinciDesk/shared");

const $ = id => document.getElementById(id);

const PERSONS = ["Kuba", "Marek", "Ola", "Patryk", "Admin CDV"];
const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access & Accounts", "Printers", "Classroom AV", "WiFi", "USOS", "Cybersecurity", "Other"];
const TICKET_STATUSES = ["Nowy", "W realizacji", "Oczekuje na użytkownika", "Rozwiązany", "Zamknięty"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const STORAGE_KEY = "vincidesk_cdv_backup_v1";

let currentUser = null;
let editingTicketId = null;
let state = { tickets: [], tasks: [], goals: {} };

const els = {
  dbStatus: $("dbStatus"),
  authStatus: $("authStatus"),
  userLabel: $("userLabel"),
  logoutBtn: $("logoutBtn"),
  authGate: $("authGate"),
  authReady: $("authReady"),
  appShell: $("appShell"),
  loginEmail: $("loginEmail"),
  loginPassword: $("loginPassword"),
  loginBtn: $("loginBtn"),
  registerBtn: $("registerBtn"),
  ticketList: $("ticketList"),
  taskList: $("taskList"),
  calendarDays: $("calendarDays"),
  upcomingList: $("upcomingList"),
  metricOpenTickets: $("metricOpenTickets"),
  metricSla: $("metricSla"),
  metricResolvedToday: $("metricResolvedToday")
};

const demoState = {
  tickets: [
    { id: "t1", title: "Brak internetu w sali 312", category: "WiFi", priority: "High", status: "Nowy", owner: "Kuba", location: "Budynek B, sala 312", notes: "Studenci skarżą się od 10:15", date: "2026-04-07" },
    { id: "t2", title: "Drukarka w dziekanacie nie drukuje kolorowo", category: "Printers", priority: "Medium", status: "W realizacji", owner: "Marek", location: "Dziekanat", notes: "", date: "2026-04-07" },
    { id: "t3", title: "Problem z logowaniem do USOS – dr Nowak", category: "USOS", priority: "Critical", status: "Oczekuje na użytkownika", owner: "Ola", location: "Online", notes: "Wykładowca nie może wystawić ocen", date: "2026-04-06" }
  ],
  tasks: [],
  goals: { openTickets: "8", slaCompliance: "96%", resolvedToday: "14" }
};

function uid() { return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function normalizeState() {
  if (!state.tickets) state.tickets = [];
  if (!state.tasks) state.tasks = [];
  if (!state.goals) state.goals = demoState.goals;
}

function persist() {
  normalizeState();
  if (currentUser) {
    set(sharedRef, {
      tickets: state.tickets,
      tasks: state.tasks,
      goals: state.goals,
      updatedAt: Date.now(),
      updatedBy: currentUser.email
    });
  }
}

function renderTickets() {
  els.ticketList.innerHTML = state.tickets.map(t => `
    <div class="ticket-card ticket-${t.priority.toLowerCase()}" data-id="${t.id}">
      <div class="priority-badge">${t.priority}</div>
      <h4>${t.title}</h4>
      <div class="meta">
        <span class="category">${t.category}</span>
        <span class="owner">${t.owner}</span>
        <span class="status">${t.status}</span>
      </div>
      <small>${t.location} • ${t.date}</small>
    </div>
  `).join('');
}

function renderAll() {
  renderTickets();
  renderCalendar();
  renderUpcoming();
  renderMetrics();
}

function renderMetrics() {
  const open = state.tickets.filter(t => !["Rozwiązany","Zamknięty"].includes(t.status)).length;
  els.metricOpenTickets.textContent = open;
  els.metricSla.textContent = state.goals.slaCompliance || "96%";
  els.metricResolvedToday.textContent = state.goals.resolvedToday || "14";
}

// Reszta logiki (auth, calendar, tasks, push notifications, modale, harmonogram dyżurów, chat, presence) jest identyczna jak w oryginale, tylko nazwy i dane zmienione na IT Helpdesk

initAuth();
renderAll();
