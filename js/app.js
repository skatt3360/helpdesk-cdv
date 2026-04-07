// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// Your web app's Firebase configuration (NOWA BAZA)
const firebaseConfig = {
  apiKey: "AIzaSyCuCXGLol577LdJBFzkNWky27eDJdaBF0w",
  authDomain: "panel-helpdesk-ed3f1.firebaseapp.com",
  databaseURL: "https://panel-helpdesk-ed3f1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "panel-helpdesk-ed3f1",
  storageBucket: "panel-helpdesk-ed3f1.firebasestorage.app",
  messagingSenderId: "384650483840",
  appId: "1:384650483840:web:7a8db9ea172423046aee65",
  measurementId: "G-4CH63EKLVH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);
const sharedRef = ref(db, "helpdesk/shared");   // ścieżka w nowej bazie

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

function renderMetrics() {
  const open = state.tickets.filter(t => !["Rozwiązany","Zamknięty"].includes(t.status)).length;
  els.metricOpenTickets.textContent = open;
  els.metricSla.textContent = state.goals.slaCompliance || "96%";
  els.metricResolvedToday.textContent = state.goals.resolvedToday || "14";
}

function renderAll() {
  renderTickets();
  renderMetrics();
  // reszta renderów (kalendarz, upcoming, tasks) – możesz dodać później
}

// === AUTH & INIT ===
function initAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      els.authGate.classList.add("hidden");
      els.authReady.classList.remove("hidden");
      els.appShell.classList.remove("hidden");
      renderAll();
    } else {
      els.authGate.classList.remove("hidden");
      els.authReady.classList.add("hidden");
      els.appShell.classList.add("hidden");
    }
  });
}

els.loginBtn.addEventListener("click", async () => {
  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value.trim();
  if (!email || !password) return alert("Podaj email i hasło");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert("Błąd logowania: " + e.message);
  }
});

els.registerBtn.addEventListener("click", async () => {
  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value.trim();
  if (!email || !password) return alert("Podaj email i hasło");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    alert("Konto utworzone! Link aktywacyjny wysłany na " + email);
    await signOut(auth);
  } catch (e) {
    alert("Błąd rejestracji: " + e.message);
  }
});

els.logoutBtn.addEventListener("click", () => signOut(auth));

// Start
initAuth();
renderAll();
