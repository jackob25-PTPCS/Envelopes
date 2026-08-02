import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import {
  LayoutDashboard, PiggyBank, CalendarDays, ArrowLeftRight, Snowflake, TrendingUp, Landmark,
  Plus, Trash2, RefreshCw, AlertTriangle, Check, Target, ChevronLeft, ChevronRight, Sparkles,
  Link2, ShieldCheck, Loader2, RotateCcw, Pencil, LogOut, Users, Cog,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n, cents = true) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const parseISO = (s) => new Date(s + "T00:00:00");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/*  seed data                                                          */
/* ------------------------------------------------------------------ */

function seed() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const cats = [
    ["Income", "Income", 0, 0],
    ["Housing", "Four Walls", 1200, 0],
    ["Groceries", "Four Walls", 600, 0],
    ["Utilities", "Four Walls", 250, 0],
    ["Transportation", "Four Walls", 220, 0],
    ["Insurance", "Protection", 180, 0],
    ["Health", "Protection", 90, 0],
    ["Emergency Fund", "Savings", 0, 1000],
    ["Retirement", "Savings", 0, 0],
    ["Car Repair Fund", "Savings", 0, 1500],
    ["Debt Payments", "Debt", 535, 0],
    ["Dining Out", "Lifestyle", 120, 0],
    ["Entertainment", "Lifestyle", 80, 0],
    ["Subscriptions", "Lifestyle", 60, 0],
    ["Personal", "Lifestyle", 100, 0],
    ["Giving", "Giving", 400, 0],
  ].map(([name, group, max, goal]) => ({ id: uid(), name, group, max, goal }));

  const byName = (n) => cats.find((c) => c.name === n).id;

  const accounts = [
    { id: uid(), name: "Everyday Checking", org: "First Community", type: "checking", balance: 2841.16 },
    { id: uid(), name: "Emergency Savings", org: "First Community", type: "savings", balance: 620.0 },
    { id: uid(), name: "Visa Rewards", org: "Cardinal Bank", type: "credit", balance: -1240.55 },
    { id: uid(), name: "Store Card", org: "Retail Credit", type: "credit", balance: -480.0 },
    { id: uid(), name: "Auto Loan", org: "Cardinal Bank", type: "loan", balance: -8450.0 },
    { id: uid(), name: "Student Loan", org: "Federal Servicer", type: "loan", balance: -12400.0 },
    { id: uid(), name: "403(b)", org: "Fidelity", type: "investment", balance: 18412.44 },
  ];
  const checking = accounts[0].id;
  const visa = accounts[2].id;

  const debts = [
    { id: uid(), name: "Store Card", balance: 480.0, apr: 26.99, min: 25 },
    { id: uid(), name: "Visa Rewards", balance: 1240.55, apr: 22.9, min: 45 },
    { id: uid(), name: "Auto Loan", balance: 8450.0, apr: 6.4, min: 320 },
    { id: uid(), name: "Student Loan", balance: 12400.0, apr: 4.5, min: 145 },
  ];

  const bills = [
    ["Rent", 1200, "Housing", 1, "monthly"],
    ["Gym membership", 29, "Personal", 3, "monthly"],
    ["Streaming bundle", 24.49, "Subscriptions", 5, "monthly"],
    ["Internet", 79, "Utilities", 8, "monthly"],
    ["Electric", 145, "Utilities", 12, "monthly"],
    ["Auto loan payment", 320, "Debt Payments", 15, "monthly"],
    ["Phone", 65, "Utilities", 18, "monthly"],
    ["Student loan payment", 145, "Debt Payments", 20, "monthly"],
    ["Car insurance", 138, "Insurance", 22, "monthly"],
    ["Water & trash", 62, "Utilities", 25, "quarterly"],
    ["Renters insurance", 186, "Insurance", 14, "annual"],
  ].map(([name, amount, cat, day, frequency]) => ({
    id: uid(),
    name,
    amount,
    kind: "expense",
    categoryId: byName(cat),
    frequency,
    anchor: iso(new Date(y, m, Math.min(day, 28))),
    autopay: ["Rent", "Internet", "Streaming bundle", "Auto loan payment"].includes(name),
  }));

  bills.push({
    id: uid(), name: "Paycheck", amount: 1975, kind: "income",
    categoryId: byName("Income"), frequency: "biweekly",
    anchor: iso(new Date(y, m, Math.min(today.getDate(), 28))), autopay: true,
  });

  // deterministic-ish transaction history
  const payees = [
    ["Food City", "Groceries", 62, 140],
    ["Kroger", "Groceries", 40, 120],
    ["Shell", "Transportation", 28, 62],
    ["Chick-fil-A", "Dining Out", 9, 24],
    ["El Puerto", "Dining Out", 18, 46],
    ["Amazon", "Personal", 12, 70],
    ["Walgreens", "Health", 8, 34],
    ["Home Depot", "Personal", 15, 88],
    ["Local Church", "Giving", 100, 100],
    ["Movie Theater", "Entertainment", 14, 38],
  ];
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const transactions = [];
  for (let back = 0; back < 52; back++) {
    const d = new Date(y, m, today.getDate() - back);
    const count = rnd() > 0.55 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const p = payees[Math.floor(rnd() * payees.length)];
      const amt = -(p[2] + rnd() * (p[3] - p[2]));
      transactions.push({
        id: uid(),
        accountId: rnd() > 0.7 ? visa : checking,
        date: iso(d),
        payee: p[0],
        amount: Math.round(amt * 100) / 100,
        categoryId: byName(p[1]),
      });
    }
  }
  // paychecks
  for (let back = 0; back < 60; back += 14) {
    const d = new Date(y, m, today.getDate() - back);
    transactions.push({ id: uid(), accountId: checking, date: iso(d), payee: "Paycheck", amount: 1975.0, categoryId: byName("Income") });
  }

  // budget for current month
  const assigned = {};
  const plan = {
    Housing: 1200, Groceries: 600, Utilities: 250, Transportation: 220, Insurance: 180,
    Health: 90, "Emergency Fund": 380, Retirement: 0, "Car Repair Fund": 50,
    "Debt Payments": 735, "Dining Out": 120, Entertainment: 80, Subscriptions: 60,
    Personal: 100, Giving: 400,
  };
  Object.entries(plan).forEach(([n, v]) => { assigned[byName(n)] = v; });

  // 13 months of net worth history
  const snapshots = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    snapshots.push({
      month: monthKey(d),
      assets: Math.round(17800 + (12 - i) * 380 + Math.sin(i) * 220),
      liabilities: Math.round(26200 - (12 - i) * 290),
    });
  }

  return {
    version: 1,
    settings: { income: 4275, extraDebtPayment: 200, autoIncome: true, syncUrl: "", lastSync: null },
    accounts, categories: cats, transactions, bills, debts,
    budgets: { [monthKey(today)]: assigned },
    startingBalances: {},
    snapshots,
    rules: [
      { id: uid(), match: "food city", categoryId: byName("Groceries") },
      { id: uid(), match: "shell", categoryId: byName("Transportation") },
    ],
  };
}

/** An empty book. Keeps the envelope scaffolding — those names are the plan,
 *  not sample data — but every figure starts at zero and waits for you. */
function blank() {
  const base = seed();
  return {
    version: 1,
    settings: { income: 0, extraDebtPayment: 0, syncUrl: base.settings.syncUrl, lastSync: null },
    accounts: [],
    categories: base.categories.map((c) => ({ ...c, max: 0, goal: c.name === "Emergency Fund" ? 1000 : 0 })),
    transactions: [],
    bills: [],
    debts: [],
    budgets: {},
    startingBalances: {},
    snapshots: [],
    rules: [],
  };
}

/** Brings older saved data up to date. Runs on every load, safe to re-run. */
function migrate(s) {
  if (!s.settings) s.settings = {};
  if (!s.startingBalances) s.startingBalances = {};
  if (!s.rules) s.rules = [];
  // rules used to store the whole raw payee, which never matched twice
  const seen = new Set();
  s.rules = s.rules.reduce((acc, r) => {
    const match = merchantKey(r.match) || r.match;
    const key = `${match}|${r.categoryId}`;
    if (!match || seen.has(key)) return acc;
    seen.add(key);
    acc.push({ ...r, match });
    return acc;
  }, []);
  if (!s.goals || !s.goals.length) s.goals = defaultGoals(s);
  if (s.settings.autoIncome === undefined) s.settings.autoIncome = true;
  // the app is served by the same process that brokers the bank now, so bank
  // calls belong on this origin. A leftover localhost value points a phone at
  // itself, and any absolute value makes the request cross-origin, which drops
  // the session cookie and answers 401.
  if (/localhost|127\.0\.0\.1/.test(s.settings.syncUrl || "")) s.settings.syncUrl = "";
  // scheduled items used to be expenses by definition
  s.bills.forEach((b) => { if (!b.kind) b.kind = "expense"; });
  if (!s.settings.paydayBillId) {
    const guess = s.bills.find((b) => b.kind === "income" && /pay/i.test(b.name)) || s.bills.find((b) => b.kind === "income");
    if (guess) s.settings.paydayBillId = guess.id;
  }
  if (!s.categories.some((c) => c.group === "Income")) {
    s.categories.unshift({ id: uid(), name: "Income", group: "Income", max: 0, goal: 0 });
  }
  const inc = s.categories.find((c) => c.group === "Income");
  s.transactions.forEach((t) => { if (t.amount > 0 && !t.categoryId) t.categoryId = inc.id; });
  return s;
}

/** Returns the id of the Income category, creating nothing. */
const incomeCatId = (s) => s.categories.find((c) => c.group === "Income")?.id || null;

/* ------------------------------------------------------------------ */
/*  payee matching                                                     */
/* ------------------------------------------------------------------ */

/** Bank descriptions carry store numbers, dates, and processor prefixes that
 *  differ every time. Strip them down to the merchant so rules can match. */
const NOISE = /\b(purchase|purch|debit|credit|card|pos|payment|pmt|recurring|online|web|ref|id|trans|transaction|authorized|pending|visa|mastercard|checkcard|withdrawal|dda|ach|des|indn|ppd|tel|sq|tst|sqc|amzn|paypal|py|xx+)\b/g;

function normalizePayee(p) {
  return String(p || "")
    .toLowerCase()
    .replace(/[#*]/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, " ")
    .replace(/\b[a-z]{0,3}\d{2,}[a-z0-9]*\b/g, " ")
    .replace(NOISE, " ")
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first couple of meaningful words — what a human would call the merchant. */
function merchantKey(p) {
  const n = normalizePayee(p);
  const words = n.split(" ").filter((w) => w.length > 2);
  return (words.slice(0, 2).join(" ") || n).trim();
}

function matchRule(payee, rules) {
  const n = normalizePayee(payee);
  const k = merchantKey(payee);
  if (!n) return null;
  return rules.find((r) => {
    const m = normalizePayee(r.match);
    if (!m) return false;
    return n.includes(m) || (k.length > 2 && merchantKey(r.match) === k);
  }) || null;
}

/* ------------------------------------------------------------------ */
/*  goals                                                             */
/* ------------------------------------------------------------------ */

/** The rules the app knows how to check. `needsCat` shows a category picker. */
const RULES = {
  savings_balance: { label: "Savings balance reaches", unit: "$", hint: "Totals every account you've typed as savings." },
  emergency_months: { label: "Savings covers N months of expenses", unit: "months", hint: "Compares savings against your scheduled bills." },
  debt_free: { label: "Total debt drops to", unit: "$", hint: "Sums the balances on your snowball page." },
  net_worth: { label: "Net worth reaches", unit: "$", hint: "Assets minus liabilities across all accounts." },
  category_amount: { label: "Monthly assignment to an envelope reaches", unit: "$", needsCat: true, hint: "Checks what you've assigned this month." },
  category_pct: { label: "Assign this % of income to an envelope", unit: "%", needsCat: true, hint: "Assignment as a share of take-home." },
  manual: { label: "Track by hand", unit: "", hint: "No automatic check — mark it done yourself." },
};

function defaultGoals(state) {
  const debtTotal = (state.debts || []).reduce((s, x) => s + x.balance, 0);
  const cat = (n) => state.categories.find((c) => c.name === n)?.id || null;
  return [
    { id: uid(), label: "Save a $1,000 starter emergency fund", rule: "savings_balance", target: 1000, forced: false },
    { id: uid(), label: "Pay off all debt but the house", rule: "debt_free", target: 0, baseline: debtTotal, forced: false },
    { id: uid(), label: "Save 3 months of expenses", rule: "emergency_months", target: 3, forced: false },
    { id: uid(), label: "Invest 15% of income for retirement", rule: "category_pct", target: 15, categoryId: cat("Retirement"), forced: false },
    { id: uid(), label: "Save for the kids' college", rule: "manual", target: 0, forced: false },
    { id: uid(), label: "Pay off the home early", rule: "manual", target: 0, forced: false },
    { id: uid(), label: "Build wealth and give", rule: "manual", target: 0, forced: false },
  ];
}

/** Evaluates one goal against current data. Returns progress, doneness, and a human line. */
function evalGoal(g, state, d) {
  const t = Number(g.target) || 0;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const catName = state.categories.find((c) => c.id === g.categoryId)?.name || "that envelope";
  const assignedTo = d.assigned[g.categoryId] || 0;

  switch (g.rule) {
    case "savings_balance":
      return { pct: t ? clamp(d.emergency / t) : 1, met: d.emergency >= t, detail: `${money(d.emergency, false)} of ${money(t, false)} saved` };

    case "emergency_months": {
      const need = d.monthlyBills * t;
      return { pct: need ? clamp(d.emergency / need) : 1, met: need > 0 && d.emergency >= need, detail: need ? `${money(d.emergency, false)} of ${money(need, false)} — ${t} month${t === 1 ? "" : "s"} of bills` : "Add scheduled bills so this can be measured" };
    }

    case "debt_free": {
      const total = (state.debts || []).reduce((s, x) => s + x.balance, 0);
      const base = Number(g.baseline) || 0;
      const pct = total <= t ? 1 : base > t ? clamp((base - total) / (base - t)) : 0;
      return { pct, met: total <= t, detail: total <= t ? "Cleared" : `${money(total, false)} left${base > total ? ` of ${money(base, false)}` : ""}` };
    }

    case "net_worth":
      return { pct: t ? clamp(d.netWorth / t) : 1, met: d.netWorth >= t, detail: `${money(d.netWorth, false)} of ${money(t, false)}` };

    case "category_amount":
      return { pct: t ? clamp(assignedTo / t) : 1, met: assignedTo >= t, detail: `${money(assignedTo, false)} assigned to ${catName}, target ${money(t, false)}` };

    case "category_pct": {
      const need = (d.income * t) / 100;
      return { pct: need ? clamp(assignedTo / need) : 0, met: need > 0 && assignedTo >= need, detail: need ? `${money(assignedTo, false)} to ${catName}, need ${money(need, false)} (${t}% of income)` : "Set your take-home so this can be measured" };
    }

    default:
      return { pct: 0, met: false, detail: "Mark this one complete yourself" };
  }
}

/** Every goal with its status, plus the index of the first unfinished one. */
function goalStatus(state, d) {
  const rows = (state.goals || []).map((g) => {
    const e = evalGoal(g, state, d);
    return { goal: g, ...e, done: g.forced || e.met, forced: !!g.forced && !e.met };
  });
  const currentIndex = rows.findIndex((r) => !r.done);
  return { rows, currentIndex: currentIndex === -1 ? rows.length : currentIndex };
}

/* ------------------------------------------------------------------ */
/*  domain logic                                                       */
/* ------------------------------------------------------------------ */

function occurrencesInMonth(bill, year, month) {
  const a = parseISO(bill.anchor);
  if (bill.frequency === "once") {
    return a.getFullYear() === year && a.getMonth() === month ? [new Date(a)] : [];
  }
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const out = [];
  const clamp = (day) => Math.min(day, last.getDate());
  if (bill.frequency === "monthly") out.push(new Date(year, month, clamp(a.getDate())));
  else if (bill.frequency === "annual") { if (a.getMonth() === month) out.push(new Date(year, month, clamp(a.getDate()))); }
  else if (bill.frequency === "quarterly") { if ((((month - a.getMonth()) % 3) + 3) % 3 === 0) out.push(new Date(year, month, clamp(a.getDate()))); }
  else {
    const step = bill.frequency === "weekly" ? 7 : 14;
    const d = new Date(a);
    while (d > first) d.setDate(d.getDate() - step);
    while (d <= last) { if (d >= first) out.push(new Date(d)); d.setDate(d.getDate() + step); }
  }
  return out;
}

function simulatePayoff(debts, extra, method) {
  const list = debts.map((d) => ({ ...d, bal: d.balance, paidMonth: null }));
  const order = [...list].sort((a, b) => (method === "avalanche" ? b.apr - a.apr : a.bal - b.bal));
  let month = 0, interest = 0;
  const timeline = [];
  while (list.some((d) => d.bal > 0.01) && month < 600) {
    month++;
    let pool = list.reduce((s, d) => s + (d.bal > 0.01 ? d.min : 0), 0) + extra;
    for (const d of list) {
      if (d.bal <= 0.01) continue;
      const i = (d.bal * (d.apr / 100)) / 12;
      d.bal += i; interest += i;
    }
    for (const d of order) {
      if (d.bal <= 0.01 || pool <= 0) continue;
      const pay = Math.min(d.bal, d.min, pool);
      d.bal -= pay; pool -= pay;
    }
    for (const d of order) {
      if (pool <= 0) break;
      if (d.bal <= 0.01) continue;
      const pay = Math.min(d.bal, pool);
      d.bal -= pay; pool -= pay;
    }
    for (const d of order) if (d.bal <= 0.01 && !d.paidMonth) d.paidMonth = month;
    timeline.push({ month, total: Math.round(list.reduce((s, d) => s + Math.max(d.bal, 0), 0)) });
  }
  return { months: month, interest, order, timeline };
}

/* ------------------------------------------------------------------ */
/*  styles                                                             */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.eb { --ink:#1B0B2E; --soft:#6B5A87; --violet:#6D28D9; --bright:#8B5CF6; --pale:#F6F2FF;
  --line:#E7DDFA; --rose:#C2255C; --teal:#0E7C68; --white:#fff;
  font-family:'Inter',ui-sans-serif,system-ui,sans-serif; color:var(--ink); background:var(--white);
  min-height:100vh; -webkit-font-smoothing:antialiased; }
.eb *{box-sizing:border-box}
.eb .num{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.eb .display{font-family:'Fraunces','Iowan Old Style',Georgia,serif;font-weight:600;letter-spacing:-.02em;line-height:1.05}
.eb .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--soft);font-weight:600}
.eb-shell{display:flex;min-height:100vh}
.eb-nav{width:76px;flex:0 0 76px;border-right:1px solid var(--line);padding:18px 8px;position:sticky;top:0;height:100vh;overflow:auto;background:var(--white)}
.eb-brand{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 0 16px}
.eb-brand-word{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:10px;color:var(--violet);display:none}
/* one icon per row; the label appears only on the page you're looking at */
.eb-nav-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;
  padding:9px 4px;border-radius:11px;border:1px solid transparent;background:transparent;color:var(--soft);
  font:inherit;font-size:9.5px;font-weight:500;cursor:pointer;text-align:center;margin-bottom:3px;transition:.14s}
.eb-nav-label{display:none;line-height:1.15;letter-spacing:.01em}
.eb-nav-btn[aria-current="true"] .eb-nav-label{display:block}
.eb-nav-foot{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.eb-nav-btn:hover{background:var(--pale);color:var(--ink)}
.eb-nav-btn[aria-current="true"]{background:var(--violet);color:#fff;border-color:var(--violet)}
.eb-main{flex:1;min-width:0;padding:26px 30px 70px}
.eb-card{border:1px solid var(--line);border-radius:14px;background:var(--white);padding:18px}
.eb-card.tint{background:var(--pale)}
.eb-grid{display:grid;gap:14px}
.eb h1.display{font-size:30px;margin:0}
.eb h2{font-size:14px;margin:0 0 12px;font-weight:600}
.eb-sub{color:var(--soft);font-size:13px;margin:4px 0 0}
.eb-btn{border:1px solid var(--violet);background:var(--violet);color:#fff;border-radius:9px;padding:8px 14px;
  font:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:.14s}
.eb-btn:hover{background:#5B21B6}
.eb-btn.ghost{background:transparent;color:var(--violet)}
.eb-btn.ghost:hover{background:var(--pale)}
.eb-btn.quiet{background:transparent;color:var(--soft);border-color:var(--line)}
.eb-btn.quiet:hover{color:var(--ink);border-color:var(--bright)}
.eb input,.eb select{border:1px solid var(--line);border-radius:8px;padding:7px 9px;font:inherit;font-size:13px;color:var(--ink);background:#fff;width:100%}
.eb input:focus,.eb select:focus,.eb-btn:focus-visible,.eb-nav-btn:focus-visible{outline:2px solid var(--bright);outline-offset:2px}
.eb table{width:100%;border-collapse:collapse;font-size:13px}
.eb th{text-align:left;font-weight:600;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);padding:0 10px 9px;border-bottom:1px solid var(--line)}
.eb td{padding:9px 10px;border-bottom:1px solid #F3EEFE;vertical-align:middle}
.eb tr:last-child td{border-bottom:none}
.eb .right{text-align:right}
.eb-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;padding:3px 8px;border-radius:99px;background:var(--pale);color:var(--violet)}
.eb-pill.warn{background:#FDF0F5;color:var(--rose)}
.eb-pill.good{background:#EAF6F3;color:var(--teal)}
.eb-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden}
.eb-bar>span{display:block;height:100%;background:var(--bright);border-radius:99px}
.eb-rail{display:flex;height:34px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:var(--pale)}
.eb-rail-seg{position:relative;transition:.2s}
.eb-rail-rest{flex:1;background:repeating-linear-gradient(135deg,#fff,#fff 6px,var(--pale) 6px,var(--pale) 12px)}
.eb-cal{display:grid;grid-template-columns:repeat(7,1fr);border-left:1px solid var(--line);border-top:1px solid var(--line);border-radius:12px;overflow:hidden}
.eb-day{border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-height:112px;padding:6px 7px;background:#fff}
.eb-day.out{background:#FCFAFF}
.eb-day.today{background:var(--pale)}
.eb-ev{font-size:10.5px;line-height:1.3;background:var(--violet);color:#fff;border-radius:5px;padding:2px 5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eb-ev.soft{background:var(--pale);color:var(--violet)}
.eb-ev.income{background:#E4F3EF;color:var(--teal);font-weight:500}
.eb-daysum{display:flex;flex-wrap:wrap;gap:4px;margin-top:auto;padding-top:4px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;font-variant-numeric:tabular-nums;line-height:1.3}
.eb-daysum .out{color:var(--soft)}
.eb-daysum .in{color:var(--teal)}
.eb-daysum .net{font-weight:600;padding:0 3px;border-radius:3px}
.eb-daysum .net.pos{color:var(--teal);background:#E4F3EF}
.eb-daysum .net.neg{color:var(--rose);background:#FDF0F5}
.eb-day{display:flex;flex-direction:column}
.eb-coach{border:1px solid var(--line);border-left:3px solid var(--bright);border-radius:10px;padding:11px 13px;margin-bottom:8px;background:#fff}
.eb-coach.warn{border-left-color:var(--rose)}
.eb-coach.good{border-left-color:var(--teal)}
.eb-step{display:flex;gap:11px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #F3EEFE}
.eb-step:last-child{border-bottom:none}
.eb-dot{flex:0 0 24px;height:24px;border-radius:99px;border:1.5px solid var(--line);display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--soft)}
.eb-dot.done{background:var(--teal);border-color:var(--teal);color:#fff}
.eb-dot.now{background:var(--violet);border-color:var(--violet);color:#fff}

/* nothing may push the page wider than the screen */
.eb, .eb-main, .eb-card, .eb-grid { max-width: 100%; min-width: 0; }
.eb-main { overflow-x: clip; }
.eb-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
/* grid children default to min-width:auto, which lets long content force overflow */
.eb-grid > *, .eb-cal > *, .eb-rail > * { min-width: 0; }
.eb-day { min-width: 0; overflow: hidden; }
.eb td, .eb th { overflow-wrap: anywhere; }

@media (max-width:860px){
  .eb-shell{display:block}
  /* wrap the nav instead of scrolling it sideways */
  .eb-nav{width:auto;height:auto;position:static;display:flex;flex-wrap:wrap;gap:5px;
    padding:10px;border-right:none;border-bottom:1px solid var(--line)}
  .eb-nav-btn{width:auto;flex-direction:row;gap:6px;white-space:nowrap;padding:8px 11px;font-size:12.5px;
    border:1px solid var(--line);border-radius:99px;margin:0}
  .eb-nav-btn[aria-current="true"]{border-color:var(--violet)}
  .eb-brand{flex-direction:row;padding:0 6px 0 2px;align-self:center}
  .eb-nav .eyebrow{display:none}
  .eb-nav-foot{margin-top:0;padding-top:0;border-top:none;display:contents}
  .eb-main{padding:18px 14px 60px}
  /* every two-column layout becomes one column, inline styles included */
  .eb-grid{grid-template-columns:1fr!important}
}

@media (max-width:720px){
  .eb-main{padding:14px 11px 56px}
  .eb-card{padding:13px}
  .eb h1.display{font-size:24px}
  .eb-form{grid-template-columns:1fr!important}

  /* wide tables stop being tables — each row becomes its own little card */
  table.eb-stack,.eb-stack tbody,.eb-stack tr,.eb-stack td{display:block;width:100%}
  .eb-stack thead{display:none}
  .eb-stack tr{border:1px solid var(--line);border-radius:11px;padding:11px 12px;margin-bottom:9px;background:#fff}
  .eb-stack tr:last-child{margin-bottom:0}
  .eb-stack td{border:none;padding:5px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:right}
  .eb-stack td:first-child{padding-top:0;font-size:14px}
  .eb-stack td:last-child{padding-bottom:0;justify-content:flex-end}
  .eb-stack td::before{content:attr(data-label);font-size:10px;letter-spacing:.12em;
    text-transform:uppercase;color:var(--soft);font-weight:600;flex:0 0 auto;text-align:left}
  .eb-stack td:not([data-label])::before{display:none}
  .eb-stack td.right{text-align:right}
  .eb-stack input,.eb-stack select{max-width:58%;text-align:right}
  .eb-stack td:first-child input{max-width:100%;text-align:left}

  /* calendar: keep seven columns, just make them cheap */
  .eb-day{min-height:62px;padding:4px 4px}
  .eb-ev{font-size:9px;padding:1px 3px}
  .eb-cal{font-size:10px}
}

@media (max-width:720px){
  .eb-day{min-height:88px}
  .eb-daysum{font-size:8.5px;gap:3px}
}

@media (max-width:460px){
  /* a few columns simply aren't worth the width on a phone */
  .eb-hide-xs{display:none!important}
  .eb-day{min-height:64px}
  .eb-ev{font-size:0;padding:0;height:5px;border-radius:99px;margin-top:2px}
  /* only the net survives at this width — the components are unreadable */
  .eb-daysum .out,.eb-daysum .in{display:none}
  .eb-daysum{font-size:8.5px;justify-content:flex-start}
  .eb-daysum .net{padding:0 2px}
}
.eb .spin{animation:ebspin 1s linear infinite}
@keyframes ebspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.eb *{transition:none!important;animation:none!important}}
`;

/* ------------------------------------------------------------------ */
/*  small pieces                                                       */
/* ------------------------------------------------------------------ */

const Card = ({ title, action, children, tint, style }) => (
  <div className={"eb-card" + (tint ? " tint" : "")} style={style}>
    {(title || action) && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {action}
      </div>
    )}
    {children}
  </div>
);

const Stat = ({ label, value, note, tone }) => (
  <div className="eb-card" style={{ padding: "15px 16px" }}>
    <div className="eyebrow">{label}</div>
    <div className="num display" style={{ fontSize: 25, marginTop: 6, color: tone === "bad" ? "var(--rose)" : tone === "good" ? "var(--teal)" : "var(--ink)" }}>{value}</div>
    {note && <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 3 }}>{note}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  app                                                                */
/* ------------------------------------------------------------------ */

export default function EnvelopeBudget() {
  const [state, setState] = useState(null);
  const [page, setPage] = useState("overview");
  const [session] = useState(() => (typeof window !== "undefined" && window.__envelopeSession) || null);
  const [status, setStatus] = useState("loading");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("envelope:state");
        if (r && r.value) {
          const saved = migrate(JSON.parse(r.value));
          // budgets that predate the wizard are already set up
          if (saved.onboarded === undefined) saved.onboarded = true;
          setState(saved);
        } else {
          const fresh = migrate(blank());
          fresh.onboarded = false;
          setState(fresh);
        }
      } catch {
        setState(migrate(seed()));
      }
      setStatus("ready");
    })();
  }, []);

  useEffect(() => {
    if (!state || status !== "ready") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set("envelope:state", JSON.stringify(state)); } catch { /* keep working in memory */ }
    }, 500);
  }, [state, status]);

  const update = useCallback((fn) => setState((s) => { const n = structuredClone(s); fn(n); return n; }), []);

  if (!state) {
    return (
      <div className="eb" style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <style>{CSS}</style>
        <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#6B5A87" }}>
          <Loader2 size={16} className="spin" /> Loading your budget…
        </div>
      </div>
    );
  }

  if (state.onboarded === false) {
    return (
      <>
        <style>{CSS}</style>
        <Setup state={state} update={update} session={session} onDone={() => setPage("overview")} />
      </>
    );
  }

  const nav = [
    ["overview", "Overview", "Overview", LayoutDashboard],
    ["budget", "Budget", "Budget builder", PiggyBank],
    ["bills", "Bills", "Bills & Income", CalendarDays],
    ["transactions", "Activity", "Transactions", ArrowLeftRight],
    ["debt", "Debt", "Debt snowball", Snowflake],
    ["networth", "Net worth", "Net worth", TrendingUp],
    ["bank", "Bank", "Bank connection", Landmark],
    ["settings", "Settings", "Settings", Cog],
  ];

  return (
    <div className="eb">
      <style>{CSS}</style>
      <div className="eb-shell">
        <nav className="eb-nav">
          <div className="eb-brand" title="Envelopes — every dollar gets a name">
            <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true" focusable="false">
              <rect x="3.5" y="10.5" width="33" height="21" rx="3"
                    fill="#fff" stroke="var(--violet)" strokeWidth="2.6" />
              <path d="M4.8 11.8 H35.2 L20 24.5 Z" fill="var(--violet)" />
            </svg>
            <span className="eb-nav-label eb-brand-word">Envelopes</span>
          </div>
          {nav.map(([id, short, full, Icon]) => (
            <button key={id} className="eb-nav-btn" aria-current={page === id}
                    title={full} aria-label={full} onClick={() => setPage(id)}>
              <Icon size={17} />
              <span className="eb-nav-label">{short}</span>
            </button>
          ))}
          {session?.authRequired && (
            <div className="eb-nav-foot">
              {session.admin && (
                <button className="eb-nav-btn" aria-current={page === "accounts"}
                        title="Accounts" aria-label="Accounts" onClick={() => setPage("accounts")}>
                  <Users size={17} />
                  <span className="eb-nav-label">Accounts</span>
                </button>
              )}
              <button className="eb-nav-btn" title={`Sign out of ${session.email}`} aria-label="Sign out"
                onClick={async () => {
                  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch { /* ignore */ }
                  location.reload();
                }}>
                <LogOut size={17} />
                <span className="eb-nav-label">Sign out</span>
              </button>
            </div>
          )}
        </nav>
        <main className="eb-main">
          {page === "overview" && <Overview state={state} update={update} go={setPage} />}
          {page === "budget" && <Budget state={state} update={update} />}
          {page === "bills" && <Bills state={state} update={update} />}
          {page === "transactions" && <Transactions state={state} update={update} />}
          {page === "debt" && <Debt state={state} update={update} />}
          {page === "networth" && <NetWorth state={state} update={update} />}
          {page === "bank" && <Bank state={state} update={update} setState={setState} />}
          {page === "settings" && <Settings state={state} update={update} setState={setState} session={session} />}
          {page === "accounts" && <Accounts session={session} />}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  derived selectors                                                  */
/* ------------------------------------------------------------------ */

function useDerived(state) {
  return useMemo(() => {
    const now = new Date();
    const mk = monthKey(now);
    const assigned = state.budgets[mk] || {};
    const spentBy = {};
    let monthSpend = 0, monthIncome = 0;
    state.transactions.forEach((t) => {
      if (!t.date.startsWith(mk)) return;
      if (t.amount < 0) {
        monthSpend += -t.amount;
        if (t.categoryId) spentBy[t.categoryId] = (spentBy[t.categoryId] || 0) + -t.amount;
      } else monthIncome += t.amount;
    });
    const totalAssigned = Object.values(assigned).reduce((a, b) => a + (b || 0), 0);
    const deposits = state.transactions.filter((t) => t.date.startsWith(mk) && t.amount > 0).length;
    const actualIncome = monthIncome;
    const perMonth = (b) => (b.frequency === "once" ? 0 : b.amount * ({ monthly: 1, weekly: 4.345, biweekly: 2.17, quarterly: 1 / 3, annual: 1 / 12 }[b.frequency] || 1));
    // income you've told the app to leave out of planning still shows on the calendar
    const scheduledIncome = state.bills.filter((b) => b.kind === "income" && !b.excludeFromBudget).reduce((t, b) => t + perMonth(b), 0);
    // deposits actually received, else a figure you typed, else what your paydays add up to
    const income = state.settings.autoIncome ? actualIncome : (state.settings.income || scheduledIncome);
    const startBal = state.startingBalances?.[mk] || 0;
    const available = startBal + income;
    const unassigned = available - totalAssigned;
    const assets = state.accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
    const liabilities = -state.accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
    const cash = state.accounts.filter((a) => ["checking", "savings"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
    const emergency = state.accounts.filter((a) => a.type === "savings").reduce((s, a) => s + a.balance, 0);

    // upcoming 30 days, split by direction
    const all = [];
    for (let off = -1; off <= 1; off++) {
      const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
      state.bills.forEach((b) => occurrencesInMonth(b, d.getFullYear(), d.getMonth()).forEach((day) => {
        const diff = Math.round((day - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
        if (diff >= 0 && diff <= 30) all.push({ bill: b, date: day, inDays: diff });
      }));
    }
    all.sort((a, b) => a.date - b.date);
    const upcoming = all.filter((u) => u.bill.kind !== "income");
    const upcomingIncome = all.filter((u) => u.bill.kind === "income" && !u.bill.excludeFromBudget);

    // everything that drafts before the next paycheck lands
    const nextPay = upcomingIncome[0] || null;
    const beforePay = nextPay ? upcoming.filter((u) => u.date < nextPay.date) : [];
    const draftsBeforePay = beforePay.reduce((t, u) => t + u.bill.amount, 0);

    // only outgoings count as "expenses" — the emergency-fund milestones read this
    const monthlyBills = state.bills.filter((b) => b.kind !== "income").reduce((s, b) => s + perMonth(b), 0);

    return { mk, assigned, spentBy, monthSpend, monthIncome, actualIncome, deposits, startBal, available, totalAssigned, income, unassigned, assets, liabilities, netWorth: assets - liabilities, cash, emergency, upcoming, upcomingIncome, nextPay, beforePay, draftsBeforePay, monthlyBills, scheduledIncome };
  }, [state]);
}

function coachTips(state, d) {
  const tips = [];
  const { rows, currentIndex } = goalStatus(state, d);
  const step = currentIndex + 1;
  const current = rows[currentIndex];

  if (d.available <= 0) {
    tips.push({ tone: "", head: "Start with your take-home pay", body: "Open the budget builder and enter what actually hits your account each month — after taxes, after insurance, after retirement withholding. Everything else here is built on that one number." });
    if (state.accounts.length === 0) tips.push({ tone: "", head: "Then connect a bank or add accounts by hand", body: "The bank connection page walks through SimpleFIN. You can also skip it and enter transactions manually — the budget works either way." });
    return { tips, step, rows, currentIndex };
  }
  if (d.unassigned > 1) tips.push({ tone: "warn", head: `${money(d.unassigned)} still has no job`, body: "A zero-based budget means everything available minus assignments equals zero. Push the remainder into your current goal before the month starts." });
  else if (d.unassigned < -1) tips.push({ tone: "warn", head: `You've assigned ${money(-d.unassigned)} more than you have`, body: "Pull it back out of a lifestyle envelope — dining out, entertainment, or personal spending — until the rail reads zero." });
  else tips.push({ tone: "good", head: "Every dollar is assigned", body: "Your budget balances to zero. Hold the line and only move money between envelopes on purpose." });

  if (!current) {
    tips.push({ tone: "good", head: "Every goal on your list is met", body: "Nothing left to chase on the plan as written. Add another goal if you want the app to keep measuring something." });
  } else if (current.goal.rule === "debt_free") {
    const sim = simulatePayoff(state.debts, state.settings.extraDebtPayment, "snowball");
    const next = sim.order[0];
    tips.push({ tone: "", head: next ? `${current.goal.label} — attack ${next.name} next` : current.goal.label, body: next ? `Smallest balance first: ${money(next.balance)} at ${next.apr}%. Minimums on everything else, then throw ${money(state.settings.extraDebtPayment)} extra here. Debt-free in about ${sim.months} months at this pace.` : "Add your debts on the snowball page so this goal can be measured." });
  } else {
    tips.push({ tone: current.goal.rule === "manual" ? "" : "", head: current.goal.label, body: `${current.detail}. ${current.goal.rule === "manual" ? "This one has no automatic check — mark it complete on the goals page when it's done." : `${Math.round(current.pct * 100)}% of the way there.`}` });
  }

  state.categories.forEach((c) => {
    const spent = d.spentBy[c.id] || 0;
    if (c.max > 0 && spent > c.max) tips.push({ tone: "warn", head: `${c.name} is over its max by ${money(spent - c.max)}`, body: `You set a ${money(c.max, false)} ceiling and have spent ${money(spent)}. Move money in from another envelope now rather than discovering it at month end.` });
  });

  const cardSpend = state.transactions.filter((t) => t.date.startsWith(d.mk) && t.amount < 0 && state.accounts.find((a) => a.id === t.accountId)?.type === "credit").reduce((s, t) => s + -t.amount, 0);
  if (cardSpend > 0) tips.push({ tone: "warn", head: `${money(cardSpend)} went on credit cards this month`, body: "Ramsey's rule is cash-flow the budget and stop adding to balances. Move those categories to your debit card so the snowball actually shrinks." });

  return { tips, step, rows, currentIndex };
}

/* ------------------------------------------------------------------ */
/*  the rail — signature element                                       */
/* ------------------------------------------------------------------ */

function Rail({ state, d }) {
  const groups = {};
  state.categories.forEach((c) => {
    const v = d.assigned[c.id] || 0;
    if (v > 0) groups[c.group] = (groups[c.group] || 0) + v;
  });
  const shades = ["#4C1D95", "#6D28D9", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"];
  const total = Math.max(d.available, d.totalAssigned, 1);
  const entries = Object.entries(groups);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <div className="eyebrow">Zero-based rail · {MONTHS[new Date().getMonth()]}</div>
        <div className="num" style={{ fontSize: 12, color: d.unassigned === 0 ? "var(--teal)" : d.unassigned < 0 ? "var(--rose)" : "var(--soft)" }}>
          {d.unassigned > 0 ? `${money(d.unassigned)} unassigned` : d.unassigned < 0 ? `${money(-d.unassigned)} over` : "Balanced to zero"}
        </div>
      </div>
      <div className="eb-rail">
        {entries.map(([g, v], i) => (
          <div key={g} className="eb-rail-seg" title={`${g} · ${money(v)}`} style={{ width: `${(v / total) * 100}%`, background: shades[i % shades.length] }} />
        ))}
        {d.unassigned > 0 && <div className="eb-rail-rest" title={`Unassigned · ${money(d.unassigned)}`} />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 9 }}>
        {entries.map(([g, v], i) => (
          <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--soft)" }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: shades[i % shades.length], display: "inline-block" }} />
            {g} <span className="num" style={{ color: "var(--ink)" }}>{money(v, false)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview                                                           */
/* ------------------------------------------------------------------ */

function Overview({ state, update, go }) {
  const d = useDerived(state);
  const { tips, rows, currentIndex } = coachTips(state, d);
  const week = d.upcoming.filter((u) => u.inDays <= 7).reduce((s, u) => s + u.bill.amount, 0);
  const month = d.upcoming.reduce((s, u) => s + u.bill.amount, 0);
  const weekIn = d.upcomingIncome.filter((u) => u.inDays <= 7).reduce((s, u) => s + u.bill.amount, 0);
  const monthIn = d.upcomingIncome.reduce((s, u) => s + u.bill.amount, 0);

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Overview</h1>
        <p className="eb-sub">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()} · {state.settings.lastSync ? `Bank synced ${new Date(state.settings.lastSync).toLocaleString()}` : "Bank not connected yet"}</p>
      </div>

      <Card><Rail state={state} d={d} /></Card>

      <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(178px,1fr))" }}>
        <Stat label="Cash on hand" value={money(d.cash)} note="Checking + savings" />
        <Stat label="Spent this month" value={money(d.monthSpend)} note={`of ${money(d.totalAssigned, false)} assigned`} />
        {d.nextPay ? (
          <Stat
            label="Drafts before payday"
            value={money(d.draftsBeforePay)}
            note={`${d.beforePay.length} bill${d.beforePay.length === 1 ? "" : "s"} before ${MONTHS[d.nextPay.date.getMonth()].slice(0, 3)} ${d.nextPay.date.getDate()}`}
            tone={d.draftsBeforePay > d.cash ? "bad" : undefined}
          />
        ) : (
          <Stat label="Due in 7 days" value={money(week)}
                note={`${d.upcoming.filter((u) => u.inDays <= 7).length} bills`}
                tone={week > d.cash ? "bad" : undefined} />
        )}
        <Stat label="Net worth" value={money(d.netWorth, false)} note={`${money(d.assets, false)} assets · ${money(d.liabilities, false)} debt`} tone={d.netWorth >= 0 ? "good" : "bad"} />
      </div>

      <div className="eb-grid" style={{ gridTemplateColumns: "1.35fr 1fr", alignItems: "start" }}>
        <div className="eb-grid" style={{ gap: 16 }}>
          <Card title="Linked accounts" action={<button className="eb-btn quiet" onClick={() => go("bank")}><Link2 size={13} /> Manage</button>}>
            <table>
              <tbody>
                {state.accounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--soft)" }}>{a.org} · {a.type}</div>
                    </td>
                    <td className="right num" style={{ color: a.balance < 0 ? "var(--rose)" : "var(--ink)", fontWeight: 500 }}>{money(a.balance)}</td>
                  </tr>
                ))}
                {state.accounts.length === 0 && (
                  <tr><td style={{ color: "var(--soft)", padding: "14px 10px" }}>No accounts yet. Connect your bank through SimpleFIN, or add transactions by hand and the accounts will follow.</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card title={"What is coming"} action={<button className="eb-btn quiet" onClick={() => go("bills")}><CalendarDays size={13} /> Calendar</button>}>
            <div style={{ display: "flex", gap: 22, marginBottom: 12, flexWrap: "wrap" }}>
              <div><div className="eyebrow">Out this week</div><div className="num display" style={{ fontSize: 19 }}>{money(week)}</div></div>
              <div><div className="eyebrow">Out, 30 days</div><div className="num display" style={{ fontSize: 19 }}>{money(month)}</div></div>
              {monthIn > 0 && (
                <div>
                  <div className="eyebrow">In, 30 days</div>
                  <div className="num display" style={{ fontSize: 19, color: "var(--teal)" }}>+{money(monthIn)}</div>
                </div>
              )}
            </div>
            {d.nextPay && (
              <div className="eb-coach" style={{ marginBottom: 12, borderLeftColor: d.cash - d.draftsBeforePay < 0 ? "var(--rose)" : "var(--teal)" }}>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <strong>{money(d.draftsBeforePay)}</strong> drafts between today and your next payday on{" "}
                  <strong>{MONTHS[d.nextPay.date.getMonth()]} {d.nextPay.date.getDate()}</strong>
                  {d.nextPay.inDays === 0 ? " (today)" : d.nextPay.inDays === 1 ? " (tomorrow)" : ` (${d.nextPay.inDays} days)`}.
                </div>
                <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 5, lineHeight: 1.55 }}>
                  You have {money(d.cash)} on hand, so that leaves{" "}
                  <strong style={{ color: d.cash - d.draftsBeforePay < 0 ? "var(--rose)" : "var(--teal)" }}>
                    {money(d.cash - d.draftsBeforePay)}
                  </strong>
                  {d.cash - d.draftsBeforePay < 0 ? " short before the money arrives." : ` before ${money(d.nextPay.bill.amount, false)} lands.`}
                </div>
              </div>
            )}
            <table>
              <tbody>
                {[...d.upcoming, ...d.upcomingIncome].sort((a, b) => a.date - b.date).slice(0, 8).map((u, i) => {
                  const inbound = u.bill.kind === "income";
                  return (
                    <tr key={i}>
                      <td className="num" style={{ width: 62, color: "var(--soft)", fontSize: 12 }}>{MONTHS[u.date.getMonth()].slice(0, 3)} {u.date.getDate()}</td>
                      <td>{u.bill.name}{u.bill.autopay && !inbound && <span className="eb-pill" style={{ marginLeft: 7 }}>autopay</span>}</td>
                      <td className="right num" style={{ color: inbound ? "var(--teal)" : "var(--ink)" }}>
                        {inbound ? "+" : ""}{money(u.bill.amount)}
                      </td>
                    </tr>
                  );
                })}
                {d.upcoming.length === 0 && d.upcomingIncome.length === 0 && <tr><td style={{ color: "var(--soft)" }}>Nothing scheduled in the next 30 days. Add bills and paychecks on the bills page.</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="Recent transactions" action={<button className="eb-btn quiet" onClick={() => go("transactions")}>See all</button>}>
            <table>
              <tbody>
                {[...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((t) => (
                  <tr key={t.id}>
                    <td className="num" style={{ width: 62, color: "var(--soft)", fontSize: 12 }}>{t.date.slice(5)}</td>
                    <td>{t.payee}</td>
                    <td className="eb-hide-xs" style={{ color: "var(--soft)", fontSize: 12 }}>{state.categories.find((c) => c.id === t.categoryId)?.name || "Uncategorized"}</td>
                    <td className="right num" style={{ color: t.amount > 0 ? "var(--teal)" : "var(--ink)" }}>{money(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="eb-grid" style={{ gap: 16 }}>
          <Card title="Coaching" tint>
            {tips.slice(0, 4).map((t, i) => (
              <div key={i} className={"eb-coach " + t.tone}>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", gap: 7, alignItems: "center" }}>
                  {t.tone === "warn" ? <AlertTriangle size={14} color="#C2255C" /> : t.tone === "good" ? <Check size={14} color="#0E7C68" /> : <Sparkles size={14} color="#8B5CF6" />}
                  {t.head}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 4, lineHeight: 1.5 }}>{t.body}</div>
              </div>
            ))}
          </Card>

          <Card title="Milestones" action={<button className="eb-btn quiet" onClick={() => go("settings")}><Cog size={13} /> Edit</button>}>
            {rows.map((r, i) => (
              <div className="eb-step" key={r.goal.id}>
                <div className={"eb-dot " + (r.done ? "done" : i === currentIndex ? "now" : "")}>{r.done ? <Check size={12} /> : i + 1}</div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ fontSize: 12.5, color: r.done ? "var(--soft)" : i === currentIndex ? "var(--ink)" : "var(--soft)", fontWeight: i === currentIndex ? 600 : 400 }}>
                    {r.goal.label}
                    {r.forced && <span className="eb-pill" style={{ marginLeft: 6 }}>marked done</span>}
                  </div>
                  {!r.done && (
                    <>
                      {r.goal.rule !== "manual" && (
                        <div className="eb-bar" style={{ marginTop: 6 }}><span style={{ width: `${Math.round(r.pct * 100)}%` }} /></div>
                      )}
                      <div style={{ fontSize: 10.5, color: "var(--soft)", marginTop: 4 }}>{r.detail}</div>
                    </>
                  )}
                </div>
                <button
                  className="eb-btn quiet"
                  style={{ padding: 4, flex: "0 0 auto" }}
                  aria-label={r.goal.forced ? `Un-mark ${r.goal.label}` : `Mark ${r.goal.label} complete`}
                  title={r.goal.forced ? "Undo — let the app measure this again" : r.met ? "Already met on its own" : "Mark complete anyway"}
                  disabled={r.met}
                  onClick={() => update((s) => { const g = s.goals.find((x) => x.id === r.goal.id); if (g) g.forced = !g.forced; })}
                >
                  {r.goal.forced ? <RotateCcw size={12} /> : <Check size={12} />}
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Setup wizard                                                       */
/* ------------------------------------------------------------------ */

function Setup({ state, update, session, onDone }) {
  const d = useDerived(state);
  const [step, setStep] = useState(2);          // step 1 was the signup screen
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [synced, setSynced] = useState(0);

  const claim = async () => {
    setBusy("claim"); setMsg(null);
    try {
      const r = await fetch("/api/simplefin/claim", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Server returned ${r.status}`);
      setToken("");
      setMsg({ ok: true, text: "Connected. Pull your accounts in next." });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(null);
  };

  const sync = async () => {
    setBusy("sync"); setMsg(null);
    try {
      const r = await fetch("/api/simplefin/accounts?days=90", { credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Server returned ${r.status}`);
      let added = 0;
      update((s) => {
        (j.accounts || []).forEach((sa) => {
          const bal = Number(sa.balance);
          let acc = s.accounts.find((a) => a.simplefinId === sa.id);
          if (acc) { acc.balance = bal; acc.name = sa.name; }
          else {
            acc = { id: uid(), simplefinId: sa.id, name: sa.name,
              org: (sa.org && (sa.org.name || sa.org.domain)) || "Bank",
              type: bal < 0 ? "credit" : "checking", balance: bal };
            s.accounts.push(acc);
          }
          (sa.transactions || []).forEach((tx) => {
            if (s.transactions.some((t) => t.simplefinId === tx.id)) return;
            const payee = tx.payee || tx.description || "Transaction";
            const amount = Number(tx.amount);
            const rule = matchRule(payee, s.rules);
            s.transactions.push({
              id: uid(), simplefinId: tx.id, accountId: acc.id,
              date: iso(new Date(tx.posted * 1000)), payee, amount,
              categoryId: amount > 0 ? incomeCatId(s) : rule ? rule.categoryId : null,
            });
            added++;
          });
        });
        s.settings.lastSync = Date.now();
      });
      setSynced((j.accounts || []).length);
      setMsg({ ok: true, text: `Pulled ${(j.accounts || []).length} account${(j.accounts || []).length === 1 ? "" : "s"} and ${added} transactions.` });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(null);
  };

  const finish = () => { update((s) => { s.onboarded = true; }); onDone(); };

  const Dots = () => (
    <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{ flex: 1, height: 3, borderRadius: 9, background: n <= step ? "var(--violet)" : "var(--line)" }} />
      ))}
    </div>
  );

  return (
    <div className="eb" style={{ minHeight: "100vh", padding: "42px 22px 70px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="display" style={{ fontSize: 21, color: "var(--violet)" }}>Envelopes</div>
        <Dots />

        {step === 2 && (
          <div className="eb-grid" style={{ gap: 16 }}>
            <div>
              <h1 className="display" style={{ fontSize: 26 }}>When does the money arrive?</h1>
              <p className="eb-sub">
                Add each paycheck coming into the household — amount, next payday, and how often. Two earners means two entries. This drives the calendar, and the Overview uses it to tell you what drafts before the next one lands.
              </p>
            </div>

            <IncomeSchedule state={state} update={update} />

            <div style={{ marginTop: 8 }}>
              <h2 className="display" style={{ fontSize: 21, margin: 0 }}>Milestones</h2>
              <p className="eb-sub">
                The goals the app measures you against, in order. The first unfinished one is what the coaching pushes toward. The defaults follow the classic Ramsey sequence — keep them, edit them, or replace them entirely.
              </p>
            </div>

            <MilestoneEditor state={state} update={update} />

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button className="eb-btn" onClick={() => { setMsg(null); setStep(3); }}>Continue to bank setup <ChevronRight size={13} /></button>
              <button className="eb-btn quiet" onClick={finish}>Skip the rest</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="eb-grid" style={{ gap: 16 }}>
            <div>
              <h1 className="display" style={{ fontSize: 26 }}>Connect your bank</h1>
              <p className="eb-sub">
                Envelopes reads transactions through SimpleFIN Bridge — read-only, and your bank credentials never touch this app. Each account here needs its own SimpleFIN subscription; it runs about $15 a year.
              </p>
            </div>

            <Card title="How this works">
              <ol style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.75, paddingLeft: 20, margin: 0 }}>
                <li>Make an account at <strong>bridge.simplefin.org</strong> and link your bank there.</li>
                <li>Under Apps, create a new connection and generate a <strong>setup token</strong>.</li>
                <li>Paste it below. It's single-use, and gets exchanged for a long-lived key that stays on the server.</li>
              </ol>
              <p style={{ fontSize: 12, color: "var(--soft)", marginBottom: 0, marginTop: 12, lineHeight: 1.6 }}>
                Want to try the plumbing first? The demo token on SimpleFIN's developer page returns fabricated accounts and is safe to paste anywhere.
              </p>
            </Card>

            <Card title="Setup token">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input placeholder="aHR0cHM6Ly9iZXRhLWJyaWRnZS5zaW1wbGVmaW4ub3JnL..." value={token}
                  onChange={(e) => setToken(e.target.value)} style={{ minWidth: 240, flex: 1 }} />
                <button className="eb-btn" disabled={!token.trim() || busy} onClick={claim}>
                  {busy === "claim" ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />} Claim
                </button>
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                <button className="eb-btn ghost" disabled={busy} onClick={sync}>
                  {busy === "sync" ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Pull accounts and transactions
                </button>
                {synced > 0 && <span className="eb-pill good"><Check size={11} /> {synced} account{synced === 1 ? "" : "s"} in</span>}
              </div>
              {msg && (
                <div className={"eb-coach " + (msg.ok ? "good" : "warn")} style={{ marginTop: 12, marginBottom: 0 }}>
                  <div style={{ fontSize: 12.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                    {msg.ok ? <Check size={14} color="#0E7C68" style={{ flex: "0 0 14px", marginTop: 2 }} />
                            : <AlertTriangle size={14} color="#C2255C" style={{ flex: "0 0 14px", marginTop: 2 }} />}
                    <span>{msg.text}</span>
                  </div>
                </div>
              )}
            </Card>

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button className="eb-btn quiet" onClick={() => setStep(2)}><ChevronLeft size={13} /> Back</button>
              <button className="eb-btn" onClick={finish}>
                {synced > 0 ? "Finish setup" : "Finish without a bank"} <Check size={13} />
              </button>
            </div>

            {synced === 0 && (
              <p style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.6, marginTop: 0 }}>
                Skipping is fine — the budget works with transactions entered by hand, and you can connect a bank any time from the Bank connection page.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Milestone editor — shared by Settings and the setup wizard          */
/* ------------------------------------------------------------------ */

function MilestoneEditor({ state, update }) {
  const d = useDerived(state);
  const { rows, currentIndex } = goalStatus(state, d);
  const [label, setLabel] = useState("");
  const spendCats = state.categories.filter((c) => c.group !== "Income");

  const setGoal = (id, k, v) => update((s) => {
    const g = s.goals.find((x) => x.id === id);
    if (!g) return;
    g[k] = k === "target" || k === "baseline" ? (Number(v) || 0) : v;
    if (k === "rule" && v === "debt_free" && g.baseline === undefined) {
      g.baseline = s.debts.reduce((a, x) => a + x.balance, 0);
    }
  });

  const move = (i, dir) => update((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.goals.length) return;
    [s.goals[i], s.goals[j]] = [s.goals[j], s.goals[i]];
  });

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      {rows.map((r, i) => {
        const g = r.goal;
        const spec = RULES[g.rule] || RULES.manual;
        return (
          <Card key={g.id} style={i === currentIndex ? { borderColor: "var(--bright)", borderWidth: 2 } : undefined}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div className={"eb-dot " + (r.done ? "done" : i === currentIndex ? "now" : "")} style={{ marginTop: 4 }}>{r.done ? <Check size={12} /> : i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input value={g.label} onChange={(e) => setGoal(g.id, "label", e.target.value)} style={{ fontWeight: 600, fontSize: 14 }} />
                <div style={{ fontSize: 11.5, color: r.done ? "var(--teal)" : "var(--soft)", marginTop: 5 }}>
                  {r.done ? (r.forced ? "Marked done by you" : "Met") : r.detail}
                  {!r.done && g.rule !== "manual" && ` · ${Math.round(r.pct * 100)}%`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
                <button className="eb-btn quiet" style={{ padding: 5 }} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ChevronLeft size={13} style={{ transform: "rotate(90deg)" }} /></button>
                <button className="eb-btn quiet" style={{ padding: 5 }} aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ChevronRight size={13} style={{ transform: "rotate(90deg)" }} /></button>
                <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${g.label}`} onClick={() => update((s) => { s.goals = s.goals.filter((x) => x.id !== g.id); })}><Trash2 size={13} /></button>
              </div>
            </div>

            <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 5 }}>How to measure it</div>
                <select value={g.rule} onChange={(e) => setGoal(g.id, "rule", e.target.value)}>
                  {Object.entries(RULES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {g.rule !== "manual" && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 5 }}>Target {spec.unit && `(${spec.unit})`}</div>
                  <input className="num" type="number" value={g.target} onChange={(e) => setGoal(g.id, "target", e.target.value)} />
                </div>
              )}

              {spec.needsCat && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 5 }}>Envelope</div>
                  <select value={g.categoryId || ""} onChange={(e) => setGoal(g.id, "categoryId", e.target.value)}>
                    <option value="">Pick one</option>
                    {spendCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {g.rule === "debt_free" && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 5 }}>Started from ($)</div>
                  <input className="num" type="number" value={g.baseline ?? 0} onChange={(e) => setGoal(g.id, "baseline", e.target.value)} />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: r.met ? "var(--soft)" : "var(--ink)", cursor: r.met ? "default" : "pointer" }}>
                  <input type="checkbox" checked={!!g.forced} disabled={r.met} onChange={(e) => setGoal(g.id, "forced", e.target.checked)} style={{ width: "auto", margin: 0 }} />
                  {r.met ? "Met on its own" : "Mark complete anyway"}
                </label>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 10 }}>{spec.hint}</div>
          </Card>
        );
      })}

      <Card title="Add a milestone">
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <input placeholder="What are you working toward?" value={label} onChange={(e) => setLabel(e.target.value)} style={{ maxWidth: 340 }} />
          <button className="eb-btn" disabled={!label.trim()} onClick={() => {
            update((s) => s.goals.push({ id: uid(), label: label.trim(), rule: "manual", target: 0, forced: false }));
            setLabel("");
          }}><Plus size={13} /> Add milestone</button>
          <button className="eb-btn quiet" onClick={() => {
            if (window.confirm("Replace your milestone list with the seven defaults? Anything you've added or edited is lost.")) {
              update((s) => { s.goals = defaultGoals(s); });
            }
          }}><RotateCcw size={13} /> Restore the defaults</button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Income schedule — used by the setup wizard and by Settings          */
/* ------------------------------------------------------------------ */

const FREQ_LABEL = { weekly: "every week", biweekly: "every two weeks", monthly: "monthly", quarterly: "quarterly", annual: "yearly" };

function IncomeSchedule({ state, update }) {
  const d = useDerived(state);
  const incomes = state.bills.filter((b) => b.kind === "income" && b.frequency !== "once");
  const [draft, setDraft] = useState({ name: "", amount: "", anchor: iso(new Date()), frequency: "biweekly" });

  const setField = (id, k, v) => update((s) => {
    const b = s.bills.find((x) => x.id === id);
    if (b) b[k] = k === "amount" ? (Number(v) || 0) : v;
  });

  const add = () => {
    update((s) => {
      const nb = {
        id: uid(), name: draft.name.trim() || (s.bills.some((b) => b.kind === "income") ? "Second income" : "Payday"),
        amount: Number(draft.amount) || 0, kind: "income", categoryId: incomeCatId(s),
        frequency: draft.frequency, anchor: draft.anchor, autopay: true,
      };
      s.bills.push(nb);
      if (!s.settings.paydayBillId) s.settings.paydayBillId = nb.id;
    });
    setDraft({ ...draft, name: "", amount: "" });
  };

  const remove = (id) => update((s) => {
    s.bills = s.bills.filter((b) => b.id !== id);
    if (s.settings.paydayBillId === id) {
      s.settings.paydayBillId = s.bills.find((b) => b.kind === "income")?.id || null;
    }
  });

  return (
    <div className="eb-grid" style={{ gap: 12 }}>
      {incomes.map((b) => (
        <Card key={b.id}>
          <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>Who or what</div>
              <input value={b.name} onChange={(e) => setField(b.id, "name", e.target.value)} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>Amount each time</div>
              <input className="num" type="number" value={b.amount} onChange={(e) => setField(b.id, "amount", e.target.value)} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>Next payday</div>
              <input type="date" value={b.anchor} onChange={(e) => setField(b.id, "anchor", e.target.value)} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>How often</div>
              <select value={b.frequency} onChange={(e) => setField(b.id, "frequency", e.target.value)}>
                <option value="weekly">Every week</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="eb-btn quiet" style={{ padding: 6 }} aria-label={`Remove ${b.name}`} onClick={() => remove(b.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "var(--soft)", marginTop: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={!!b.excludeFromBudget}
                   onChange={(e) => update((s) => { const x = s.bills.find((z) => z.id === b.id); if (x) x.excludeFromBudget = e.target.checked; })}
                   style={{ width: "auto", margin: "2px 0 0" }} />
            <span>Calendar only — show the dates but keep this out of budget and week totals</span>
          </label>
        </Card>
      ))}

      <Card tint>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{incomes.length ? "Add another income" : "Add your first payday"}</div>
        <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          <input placeholder={incomes.length ? "Second income" : "Payday"} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="num" type="number" placeholder="Amount" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <input type="date" value={draft.anchor} onChange={(e) => setDraft({ ...draft, anchor: e.target.value })} />
          <select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}>
            <option value="weekly">Every week</option>
            <option value="biweekly">Every two weeks</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="eb-btn" disabled={!draft.amount} onClick={add}><Plus size={13} /> Add</button>
        </div>
      </Card>

      {incomes.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--soft)", lineHeight: 1.65 }}>
          {incomes.filter((b) => !b.excludeFromBudget).length === 1
            ? `${money(incomes.find((b) => !b.excludeFromBudget).amount, false)} ${FREQ_LABEL[incomes.find((b) => !b.excludeFromBudget).frequency]} works out to about `
            : `${incomes.filter((b) => !b.excludeFromBudget).length} incomes together come to about `}
          <strong style={{ color: "var(--ink)" }}>{money(d.scheduledIncome, false)}</strong> a month — that's what the budget divides up until real deposits land.
          {d.nextPay && ` Next one is ${MONTHS[d.nextPay.date.getMonth()]} ${d.nextPay.date.getDate()}, with ${money(d.draftsBeforePay)} of bills drafting before it.`}
          <div style={{ marginTop: 8 }}>
            Paid on fixed dates like the 1st and 15th? Add two monthly entries — that pattern isn't a fixed interval.
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

function Settings({ state, update, setState, session }) {
  const d = useDerived(state);
  const [pw, setPw] = useState({ current: "", next: "", msg: null });

  const changePassword = async () => {
    setPw((x) => ({ ...x, msg: null }));
    try {
      const r = await fetch("/api/password", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: pw.current, next: pw.next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Server returned ${r.status}`);
      setPw({ current: "", next: "", msg: { ok: true, text: "Password changed." } });
    } catch (e) {
      setPw((x) => ({ ...x, msg: { ok: false, text: e.message } }));
    }
  };

  const setGoal = (id, k, v) => update((s) => {
    const g = s.goals.find((x) => x.id === id);
    if (!g) return;
    g[k] = k === "target" || k === "baseline" ? (Number(v) || 0) : v;
    if (k === "rule" && v === "debt_free" && g.baseline === undefined) {
      g.baseline = s.debts.reduce((a, x) => a + x.balance, 0);
    }
  });

  const move = (i, dir) => update((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.goals.length) return;
    [s.goals[i], s.goals[j]] = [s.goals[j], s.goals[i]];
  });

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Settings</h1>
        <p className="eb-sub">Milestones, budget preferences, your password, and the reset switches.</p>
      </div>

      <h2 className="display" style={{ fontSize: 19, marginTop: 6, marginBottom: 0 }}>Milestones</h2>

      <Card tint>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--soft)" }}>
          The default list follows the classic Ramsey sequence, but it's only a starting point — rewrite, reorder, or replace any of it. Order is the logic: the first unfinished milestone is what the Overview coaching pushes toward and where <strong>Sweep to current goal</strong> sends leftover money. Anything the app can't measure — a paid-off house, a funded 529 — set to <strong>Track by hand</strong> and mark done yourself.
        </div>
      </Card>

      <MilestoneEditor state={state} update={update} />

      <h2 className="display" style={{ fontSize: 19, marginTop: 14, marginBottom: 0 }}>Income & paydays</h2>

      <IncomeSchedule state={state} update={update} />

      <h2 className="display" style={{ fontSize: 19, marginTop: 14, marginBottom: 0 }}>Budget preferences</h2>

      <Card>
        <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Take-home pay</div>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={!!state.settings.autoIncome}
                onChange={(e) => update((s) => {
                  s.settings.autoIncome = e.target.checked;
                  if (!e.target.checked) s.settings.income = Math.round(d.actualIncome) || s.settings.income;
                })}
                style={{ width: "auto", margin: 0 }} />
              Track deposits automatically
            </label>
            <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 6, lineHeight: 1.5 }}>
              On, the figure climbs as paychecks land. Off, you type it once and the budget builder flags any drift from what actually arrived.
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Extra debt payment</div>
            <input className="num" type="number" value={state.settings.extraDebtPayment}
              onChange={(e) => update((s) => { s.settings.extraDebtPayment = Number(e.target.value) || 0; })} />
            <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 6, lineHeight: 1.5 }}>
              Thrown at the smallest balance each month on top of minimums. Drives the payoff dates on the snowball page.
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Bank sync address</div>
            <input placeholder="this server" value={state.settings.syncUrl || ""} onChange={(e) => update((s) => { s.settings.syncUrl = e.target.value; })} />
            <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 6, lineHeight: 1.5 }}>
              Leave blank. Bank calls then go to whatever server you loaded this page from, which is the only setup that carries your sign-in.
            </div>
          </div>
        </div>
      </Card>

      {session?.authRequired && (
        <>
          <h2 className="display" style={{ fontSize: 19, marginTop: 14, marginBottom: 0 }}>Your account</h2>
          <Card>
            <div style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 12 }}>
              Signed in as <strong style={{ color: "var(--ink)" }}>{session.email}</strong>
              {session.admin && <span className="eb-pill" style={{ marginLeft: 7 }}>admin</span>}
            </div>
            <div className="eb-grid" style={{ gap: 8, maxWidth: 320 }}>
              <input type="password" placeholder="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <input type="password" placeholder="New password (8+ characters)" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <button className="eb-btn" disabled={!pw.current || pw.next.length < 8} onClick={changePassword}><ShieldCheck size={13} /> Change password</button>
            </div>
            {pw.msg && (
              <div className={"eb-coach " + (pw.msg.ok ? "good" : "warn")} style={{ marginTop: 12, marginBottom: 0 }}>
                <div style={{ fontSize: 12.5 }}>{pw.msg.text}</div>
              </div>
            )}
          </Card>
        </>
      )}

      <h2 className="display" style={{ fontSize: 19, marginTop: 14, marginBottom: 0 }}>Data</h2>

      <Card>
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 0, lineHeight: 1.6 }}>
          Walk through the setup steps again — milestones, then bank connection. Nothing is erased; you're just revisiting the same screens.
        </p>
        <button className="eb-btn quiet" onClick={() => update((s) => { s.onboarded = false; })}>
          <RotateCcw size={13} /> Run setup again
        </button>
      </Card>

      <Card>
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 0, lineHeight: 1.6 }}>
          The app ships with a fictional household so the charts have something to draw on day one. Clear it out when you're ready for your own numbers. Neither option touches your bank connection — that lives on the server and survives both.
        </p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button className="eb-btn" onClick={async () => {
            if (!window.confirm("Erase every envelope, bill, debt, transaction and milestone, and start from nothing? This can't be undone.")) return;
            const fresh = blank();
            setState(fresh);
            try { await window.storage.set("envelope:state", JSON.stringify(fresh)); } catch { /* ignore */ }
          }}><Trash2 size={13} /> Clear it out and start empty</button>
          <button className="eb-btn quiet" onClick={async () => {
            if (!window.confirm("Replace everything with the sample household?")) return;
            const fresh = migrate(seed());
            setState(fresh);
            try { await window.storage.set("envelope:state", JSON.stringify(fresh)); } catch { /* ignore */ }
          }}><RotateCcw size={13} /> Put the sample data back</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--soft)", marginBottom: 0, lineHeight: 1.6 }}>
          Starting empty keeps the envelope names — Four Walls, Savings and the rest are the plan itself, not filler — with every amount zeroed.
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Budget builder                                                     */
/* ------------------------------------------------------------------ */

function Budget({ state, update }) {
  const d = useDerived(state);
  const [newCat, setNewCat] = useState({ name: "", group: "Lifestyle" });
  const groups = [...new Set(state.categories.map((c) => c.group))].filter((g) => g !== "Income");

  const setAssigned = (id, v) => update((s) => {
    s.budgets[d.mk] = s.budgets[d.mk] || {};
    s.budgets[d.mk][id] = Math.max(0, Number(v) || 0);
  });
  const setField = (id, k, v) => update((s) => {
    const c = s.categories.find((x) => x.id === id);
    if (c) c[k] = k === "name" || k === "group" ? v : Math.max(0, Number(v) || 0);
  });

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Budget builder</h1>
        <p className="eb-sub">Assign every dollar of income before the month starts. Spending maxes cap an envelope; savings targets give it a finish line.</p>
      </div>

      <Card>
        <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Starting balance</div>
            <input
              className="num"
              type="number"
              value={d.startBal}
              onChange={(e) => update((s) => { s.startingBalances[d.mk] = Number(e.target.value) || 0; })}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
              <button
                className="eb-btn ghost"
                style={{ padding: "2px 0", border: "none", fontSize: 11 }}
                onClick={() => update((s) => { s.startingBalances[d.mk] = Math.round(d.cash * 100) / 100; })}
              >Use cash on hand</button>
              <button
                className="eb-btn ghost"
                style={{ padding: "2px 0", border: "none", fontSize: 11 }}
                onClick={() => update((s) => {
                  const [y, mo] = d.mk.split("-").map(Number);
                  const prev = monthKey(new Date(y, mo - 2, 1));
                  const prevAssigned = Object.values(s.budgets[prev] || {}).reduce((a, b) => a + (b || 0), 0);
                  const prevIncome = s.transactions.filter((t) => t.date.startsWith(prev) && t.amount > 0).reduce((a, t) => a + t.amount, 0);
                  const prevStart = s.startingBalances[prev] || 0;
                  s.startingBalances[d.mk] = Math.round((prevStart + prevIncome - prevAssigned) * 100) / 100;
                })}
              >Carry over last month</button>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Monthly take-home</div>
            {state.settings.autoIncome ? (
              <>
                <div className="num display" style={{ fontSize: 21 }}>{money(d.actualIncome)}</div>
                <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 2 }}>
                  {d.deposits ? `${d.deposits} deposit${d.deposits === 1 ? "" : "s"} received this month` : "No deposits yet this month"}
                </div>
              </>
            ) : (
              <>
                <input className="num" type="number" placeholder={String(Math.round(d.scheduledIncome) || 0)}
                       value={state.settings.income || ""} onChange={(e) => update((s) => { s.settings.income = Number(e.target.value) || 0; })} />
                <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 4 }}>
                  {!state.settings.income && d.scheduledIncome > 0
                    ? "from your scheduled paydays"
                    : `${money(d.actualIncome)} actually received${d.actualIncome > 0 && Math.abs(d.actualIncome - d.income) > 1 ? " — doesn't match" : ""}`}
                </div>
              </>
            )}
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--soft)", marginTop: 7, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={state.settings.autoIncome}
                onChange={(e) => update((s) => {
                  s.settings.autoIncome = e.target.checked;
                  if (!e.target.checked) s.settings.income = Math.round(d.actualIncome) || s.settings.income;
                })}
                style={{ width: "auto", margin: 0 }}
              />
              Track deposits automatically
            </label>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Assigned</div>
            <div className="num display" style={{ fontSize: 21 }}>{money(d.totalAssigned)}</div>
            <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 2 }}>of {money(d.available)} available</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Left to assign</div>
            <div className="num display" style={{ fontSize: 21, color: d.unassigned === 0 ? "var(--teal)" : d.unassigned < 0 ? "var(--rose)" : "var(--violet)" }}>{money(d.unassigned)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="eb-btn ghost" title="Assign the remainder toward whichever goal you're currently on" onClick={() => {
              const { rows, currentIndex } = goalStatus(state, d);
              const g = rows[currentIndex]?.goal;
              const byName = (n) => state.categories.find((c) => c.name === n)?.id;
              const targetId =
                g?.categoryId ||
                (g?.rule === "debt_free" ? byName("Debt Payments") : null) ||
                (g && ["savings_balance", "emergency_months", "net_worth"].includes(g.rule) ? byName("Emergency Fund") : null) ||
                byName("Emergency Fund");
              if (targetId && d.unassigned !== 0) setAssigned(targetId, (d.assigned[targetId] || 0) + d.unassigned);
            }}><Target size={13} /> Sweep to current goal</button>
          </div>
        </div>
        <Rail state={state} d={d} />
      </Card>

      {groups.map((g) => (
        <Card key={g} title={g}>
          <table className="eb-stack">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Envelope</th>
                <th className="right" style={{ width: 110 }}>Assigned</th>
                <th className="right" style={{ width: 110 }}>Spending max</th>
                <th className="right" style={{ width: 110 }}>Savings target</th>
                <th className="right" style={{ width: 100 }}>Spent</th>
                <th style={{ width: "22%" }}>Progress</th>
                <th style={{ width: 34 }} />
              </tr>
            </thead>
            <tbody>
              {state.categories.filter((c) => c.group === g).map((c) => {
                const a = d.assigned[c.id] || 0;
                const spent = d.spentBy[c.id] || 0;
                const cap = c.max > 0 ? c.max : a;
                const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
                const over = c.max > 0 && spent > c.max;
                return (
                  <tr key={c.id}>
                    <td>
                      <input value={c.name} onChange={(e) => setField(c.id, "name", e.target.value)} style={{ border: "none", padding: "4px 0", fontWeight: 500 }} />
                    </td>
                    <td data-label="Assigned"><input className="num right" type="number" value={a} onChange={(e) => setAssigned(c.id, e.target.value)} style={{ textAlign: "right" }} /></td>
                    <td data-label="Max"><input className="num right" type="number" value={c.max} onChange={(e) => setField(c.id, "max", e.target.value)} style={{ textAlign: "right" }} /></td>
                    <td data-label="Target"><input className="num right" type="number" value={c.goal} onChange={(e) => setField(c.id, "goal", e.target.value)} style={{ textAlign: "right" }} /></td>
                    <td data-label="Spent" className="right num" style={{ color: over ? "var(--rose)" : "var(--ink)" }}>{money(spent)}</td>
                    <td>
                      <div className="eb-bar"><span style={{ width: `${pct}%`, background: over ? "var(--rose)" : pct > 85 ? "#A78BFA" : "var(--bright)" }} /></div>
                      <div style={{ fontSize: 10.5, color: over ? "var(--rose)" : "var(--soft)", marginTop: 4 }}>
                        {over ? `${money(spent - c.max)} over max` : c.max > 0 ? `${money(Math.max(0, c.max - spent))} left of max` : `${money(Math.max(0, a - spent))} left`}
                      </div>
                    </td>
                    <td>
                      <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${c.name}`} onClick={() => update((s) => { s.categories = s.categories.filter((x) => x.id !== c.id); })}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}

      <Card title="Add an envelope">
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <input placeholder="Envelope name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} style={{ maxWidth: 240 }} />
          <select value={newCat.group} onChange={(e) => setNewCat({ ...newCat, group: e.target.value })} style={{ maxWidth: 180 }}>
            {groups.map((g) => <option key={g}>{g}</option>)}
          </select>
          <button className="eb-btn" disabled={!newCat.name.trim()} onClick={() => {
            update((s) => s.categories.push({ id: uid(), name: newCat.name.trim(), group: newCat.group, max: 0, goal: 0 }));
            setNewCat({ name: "", group: newCat.group });
          }}><Plus size={13} /> Add envelope</button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bills & calendar                                                   */
/* ------------------------------------------------------------------ */

function Bills({ state, update }) {
  const d = useDerived(state);
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState(null);
  const spendCats = state.categories.filter((c) => c.group !== "Income");
  const setBill = (id, k, v) => update((s) => {
    const b = s.bills.find((x) => x.id === id);
    if (!b) return;
    b[k] = k === "amount" ? (Number(v) || 0) : v;
    if (k === "frequency" && v === "once") b.excludeFromBudget = false;
  });
  const [form, setForm] = useState({ name: "", amount: "", kind: "expense", categoryId: state.categories[0]?.id, frequency: "monthly", anchor: iso(new Date()) });
  const FREQS = ["once", "weekly", "biweekly", "monthly", "quarterly", "annual"];
  const freqLabel = (f) => (f === "once" ? "one time" : f);

  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(y, m, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const eventsFor = (day) => state.bills.flatMap((b) => occurrencesInMonth(b, day.getFullYear(), day.getMonth()).filter((o) => o.getDate() === day.getDate()).map(() => b));
  const counts = (b, kind) => (kind === "income" ? b.kind === "income" && !b.excludeFromBudget : b.kind !== "income");
  const dayTotals = (day) => {
    const evs = eventsFor(day);
    const out = evs.filter((b) => b.kind !== "income").reduce((t, b) => t + b.amount, 0);
    const inc = evs.filter((b) => b.kind === "income" && !b.excludeFromBudget).reduce((t, b) => t + b.amount, 0);
    return { out, inc, net: inc - out, any: evs.length > 0 };
  };
  const sumOf = (days, kind) => days.reduce((t, day) =>
    t + (day.getMonth() === m ? eventsFor(day).filter((b) => counts(b, kind)).reduce((x, b) => x + b.amount, 0) : 0), 0);
  const monthOut = state.bills.filter((b) => b.kind !== "income").reduce((s, b) => s + occurrencesInMonth(b, y, m).length * b.amount, 0);
  const monthIn = state.bills.filter((b) => b.kind === "income" && !b.excludeFromBudget).reduce((s, b) => s + occurrencesInMonth(b, y, m).length * b.amount, 0);
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const today = new Date();

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Bills &amp; Income</h1>
        <p className="eb-sub">Bills and paychecks both land on the calendar, so you can see whether the money arrives before it's needed rather than finding out on the day.</p>
      </div>

      <div className="eb-grid" style={{ gridTemplateColumns: "1fr 320px", alignItems: "start" }}>
        <Card
          title={`${MONTHS[m]} ${y}`}
          action={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="num eb-hide-xs" style={{ fontSize: 12.5, color: "var(--soft)" }}>
                <span style={{ color: "var(--ink)" }}>−{money(monthOut, false)}</span>
                {monthIn > 0 && <> {" · "}<span style={{ color: "var(--teal)" }}>+{money(monthIn, false)}</span></>}
                {monthIn > 0 && <> {" · "}<strong style={{ color: monthIn - monthOut >= 0 ? "var(--teal)" : "var(--rose)" }}>
                  {monthIn - monthOut >= 0 ? "+" : "−"}{money(Math.abs(monthIn - monthOut), false)}
                </strong></>}
              </span>
              <button className="eb-btn quiet" style={{ padding: 6 }} aria-label="Previous month" onClick={() => setCursor(new Date(y, m - 1, 1))}><ChevronLeft size={14} /></button>
              <button className="eb-btn quiet" style={{ padding: 6 }} aria-label="Next month" onClick={() => setCursor(new Date(y, m + 1, 1))}><ChevronRight size={14} /></button>
            </div>
          }
        >
          <div className="eb-cal" style={{ marginBottom: 0 }}>
            {DOW.map((dw) => <div key={dw} className="eb-day" style={{ minHeight: 0, padding: "6px 8px", background: "#FCFAFF" }}><span className="eyebrow">{dw}</span></div>)}
            {cells.map((day, i) => {
              const evs = eventsFor(day);
              const outside = day.getMonth() !== m;
              const isToday = iso(day) === iso(today);
              const t = dayTotals(day);
              return (
                <div key={i} className={"eb-day" + (outside ? " out" : "") + (isToday ? " today" : "")}>
                  <div className="num" style={{ fontSize: 11, color: outside ? "#C9BCE0" : isToday ? "var(--violet)" : "var(--soft)", fontWeight: isToday ? 600 : 400 }}>{day.getDate()}</div>
                  {!outside && evs.slice(0, 2).map((b, k) => (
                    <div key={k}
                         className={"eb-ev" + (b.kind === "income" ? " income" : b.autopay ? "" : " soft")}
                         title={`${b.kind === "income" ? "Income" : "Bill"}: ${b.name} · ${money(b.amount)}`}>
                      {b.kind === "income" ? "+" : ""}{b.name} {money(b.amount, false)}
                    </div>
                  ))}
                  {!outside && evs.length > 2 && <div style={{ fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>+{evs.length - 2} more</div>}
                  {!outside && t.any && (
                    <div className="eb-daysum" title={`Bills ${money(t.out)} · Income ${money(t.inc)} · Net ${money(t.net)}`}>
                      {t.out > 0 && <span className="out">−{money(t.out, false)}</span>}
                      {t.inc > 0 && <span className="in">+{money(t.inc, false)}</span>}
                      {t.out > 0 && t.inc > 0 && (
                        <span className={"net " + (t.net >= 0 ? "pos" : "neg")}>{t.net >= 0 ? "+" : "−"}{money(Math.abs(t.net), false)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="eb-grid" style={{ gap: 16 }}>
          <Card title="Week totals">
            {weeks.map((w, i) => {
              if (!w.some((day) => day.getMonth() === m)) return null;
              const out = sumOf(w, "expense");
              const inc = sumOf(w, "income");
              const isCur = w.some((day) => iso(day) === iso(today));
              return (
                <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid #F3EEFE", fontSize: 13 }}>
                  <div style={{ color: isCur ? "var(--violet)" : "var(--soft)", fontWeight: isCur ? 600 : 400, marginBottom: 4 }}>
                    {MONTHS[w[0].getMonth()].slice(0, 3)} {w[0].getDate()} – {MONTHS[w[6].getMonth()].slice(0, 3)} {w[6].getDate()}
                  </div>
                  <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--soft)" }}>bills</span><span>−{money(out, false)}</span>
                  </div>
                  {inc > 0 && (
                    <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--teal)" }}>
                      <span>income</span><span>+{money(inc, false)}</span>
                    </div>
                  )}
                  {inc > 0 && (
                    <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      <span style={{ fontFamily: "Inter, sans-serif" }}>net</span>
                      <span style={{ color: inc - out >= 0 ? "var(--teal)" : "var(--rose)" }}>
                        {inc - out >= 0 ? "+" : "−"}{money(Math.abs(inc - out), false)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 600 }}>
              <span>Month bills</span><span className="num">−{money(monthOut)}</span>
            </div>
            {monthIn > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, color: "var(--teal)" }}>
                  <span>Month income</span><span className="num">+{money(monthIn)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 6, borderTop: "1px solid var(--line)", fontWeight: 600 }}>
                  <span>Net</span>
                  <span className="num" style={{ color: monthIn - monthOut >= 0 ? "var(--teal)" : "var(--rose)" }}>{money(monthIn - monthOut)}</span>
                </div>
              </>
            )}
          </Card>

          <Card title="Schedule something">
            <div className="eb-grid" style={{ gap: 8 }}>
              <select value={form.kind} onChange={(e) => {
                const kind = e.target.value;
                setForm({ ...form, kind, categoryId: kind === "income" ? incomeCatId(state) : spendCats[0]?.id });
              }}>
                <option value="expense">Money going out — a bill</option>
                <option value="income">Money coming in — a paycheck</option>
              </select>
              <input placeholder={form.kind === "income" ? "Paycheck name" : "Bill name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Amount" type="number" className="num" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              {form.kind === "expense" && (
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  {spendCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQS.map((f) => <option key={f} value={f}>{freqLabel(f)}</option>)}
              </select>
              <input type="date" value={form.anchor} onChange={(e) => setForm({ ...form, anchor: e.target.value })} />
              {form.kind === "income" && form.frequency !== "once" && (
                <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "var(--soft)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.excludeFromBudget}
                         onChange={(e) => setForm({ ...form, excludeFromBudget: e.target.checked })}
                         style={{ width: "auto", margin: "2px 0 0" }} />
                  <span>Show on the calendar, but leave out of budget totals</span>
                </label>
              )}
              <button className="eb-btn" disabled={!form.name.trim() || !form.amount} onClick={() => {
                update((s) => s.bills.push({
                  id: uid(), name: form.name.trim(), amount: Number(form.amount), kind: form.kind,
                  categoryId: form.kind === "income" ? incomeCatId(s) : form.categoryId,
                  frequency: form.frequency, anchor: form.anchor, autopay: false,
                  excludeFromBudget: form.kind === "income" && form.frequency !== "once" ? !!form.excludeFromBudget : false,
                }));
                setForm({ ...form, name: "", amount: "" });
              }}><Plus size={13} /> Schedule it</button>
              <p style={{ fontSize: 11.5, color: "var(--soft)", margin: 0, lineHeight: 1.55 }}>
                {form.frequency === "once"
                  ? "Happens on that date and never again — a tax refund, an annual premium, a one-off repair. It shows on the calendar and in the totals for that month, but never in a monthly average."
                  : form.kind === "income"
                  ? "Shows on the calendar so you can see when money lands against when it leaves. It's a forecast — your budget still counts real deposits, so nothing gets double-counted."
                  : "Lands on the calendar and in the upcoming totals."}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card title="All scheduled expenses">
        <table className="eb-stack">
          <thead><tr><th>Bill</th><th>Envelope</th><th>Repeats</th><th>Due date</th><th className="right">Amount</th><th style={{ width: 68 }} /></tr></thead>
          <tbody>
            {state.bills.map((b) => {
              const next = d.upcoming.find((u) => u.bill.id === b.id);
              if (editing === b.id) {
                return (
                  <tr key={b.id} style={{ background: "var(--pale)" }}>
                    <td>
                      <input value={b.name} onChange={(e) => setBill(b.id, "name", e.target.value)} />
                      <label style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, color: "var(--soft)", marginTop: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!b.autopay} onChange={(e) => setBill(b.id, "autopay", e.target.checked)} style={{ width: "auto", margin: 0 }} />
                        autopay
                      </label>
                    </td>
                    <td data-label="Type">
                      <select value={b.kind || "expense"} onChange={(e) => update((s) => {
                        const x = s.bills.find((z) => z.id === b.id);
                        if (!x) return;
                        x.kind = e.target.value;
                        if (x.kind === "income") x.categoryId = incomeCatId(s);
                      })}>
                        <option value="expense">Bill</option>
                        <option value="income">Income</option>
                      </select>
                      {b.kind !== "income" && (
                        <select value={b.categoryId || ""} style={{ marginTop: 6 }} onChange={(e) => setBill(b.id, "categoryId", e.target.value)}>
                          {spendCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td data-label="Repeats">
                      <select value={b.frequency} onChange={(e) => setBill(b.id, "frequency", e.target.value)}>
                        {FREQS.map((f) => <option key={f} value={f}>{freqLabel(f)}</option>)}
                      </select>
                      {b.kind === "income" && b.frequency !== "once" && (
                        <label style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11, color: "var(--soft)", marginTop: 7, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!b.excludeFromBudget}
                                 onChange={(e) => setBill(b.id, "excludeFromBudget", e.target.checked)}
                                 style={{ width: "auto", margin: "2px 0 0" }} />
                          <span>calendar only</span>
                        </label>
                      )}
                    </td>
                    <td><input type="date" value={b.anchor} onChange={(e) => setBill(b.id, "anchor", e.target.value)} /></td>
                    <td><input className="num" type="number" value={b.amount} onChange={(e) => setBill(b.id, "amount", e.target.value)} style={{ textAlign: "right" }} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="eb-btn" style={{ padding: 5, marginRight: 4 }} aria-label="Done editing" onClick={() => setEditing(null)}><Check size={13} /></button>
                      <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${b.name}`} onClick={() => { setEditing(null); update((s) => { s.bills = s.bills.filter((x) => x.id !== b.id); }); }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>
                    {b.name}
                    {b.kind === "income" && <span className="eb-pill good" style={{ marginLeft: 6 }}>income</span>}
                    {b.frequency === "once" && <span className="eb-pill" style={{ marginLeft: 6 }}>one time</span>}
                    {b.excludeFromBudget && <span className="eb-pill" style={{ marginLeft: 6 }}>calendar only</span>}
                    {b.autopay && <span className="eb-pill" style={{ marginLeft: 6 }}>autopay</span>}
                  </td>
                  <td data-label="Envelope" style={{ color: "var(--soft)" }}>{b.kind === "income" ? "—" : (state.categories.find((c) => c.id === b.categoryId)?.name || "—")}</td>
                  <td data-label="Repeats" style={{ color: "var(--soft)" }}>{freqLabel(b.frequency)}</td>
                  <td data-label="Due" className="num" style={{ color: "var(--soft)" }}>{next ? `${MONTHS[next.date.getMonth()].slice(0, 3)} ${next.date.getDate()}` : "—"}</td>
                  <td data-label="Amount" className="right num" style={{ color: b.kind === "income" ? "var(--teal)" : "var(--ink)" }}>
                    {b.kind === "income" ? "+" : ""}{money(b.amount)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="eb-btn quiet" style={{ padding: 5, marginRight: 4 }} aria-label={`Edit ${b.name}`} onClick={() => setEditing(b.id)}><Pencil size={13} /></button>
                    <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${b.name}`} onClick={() => update((s) => { s.bills = s.bills.filter((x) => x.id !== b.id); })}><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
            {state.bills.length === 0 && <tr><td colSpan={6} style={{ color: "var(--soft)" }}>Nothing scheduled yet. Add your recurring bills and paychecks above and they'll appear on the calendar.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

function Transactions({ state, update }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [note, setNote] = useState(null);
  const [ruleDraft, setRuleDraft] = useState({ match: "", categoryId: "" });
  const [showRules, setShowRules] = useState(false);
  const [form, setForm] = useState({ date: iso(new Date()), payee: "", amount: "", accountId: state.accounts[0]?.id, categoryId: "" });

  const rows = useMemo(() => {
    return [...state.transactions]
      .filter((t) => (filter === "all" ? true : filter === "uncat" ? !t.categoryId && t.amount < 0 : t.categoryId === filter))
      .filter((t) => t.payee.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, q, filter]);

  const uncategorized = state.transactions.filter((t) => !t.categoryId && t.amount < 0).length;

  const applyRules = () => {
    let filed = 0;
    let income = 0;
    update((s) => {
      const inc = incomeCatId(s);
      s.transactions.forEach((t) => {
        if (t.categoryId) return;
        if (t.amount > 0) { t.categoryId = inc; income++; return; }
        const r = matchRule(t.payee, s.rules);
        if (r) { t.categoryId = r.categoryId; filed++; }
      });
    });
    const left = state.transactions.filter((t) => !t.categoryId && t.amount < 0).length - filed;
    if (!filed && !income) {
      setNote(state.rules.length
        ? `No matches. ${state.rules.length} rule${state.rules.length === 1 ? "" : "s"} on file, none matching the ${left} uncategorized transaction${left === 1 ? "" : "s"} — set a category on a row to teach it one.`
        : "No rules yet. Set the envelope on a transaction and the app saves a rule from that merchant name.");
    } else {
      setNote(`Filed ${filed} expense${filed === 1 ? "" : "s"}${income ? ` and ${income} deposit${income === 1 ? "" : "s"}` : ""}. ${left} left uncategorized.`);
    }
  };

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Transactions</h1>
        <p className="eb-sub">Every expense belongs in an envelope. Set a category once and save it as a rule so the next one files itself.</p>
      </div>

      <Card>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Search payees" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="all">All envelopes</option>
            <option value="uncat">Uncategorized ({uncategorized})</option>
            {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="eb-btn ghost" onClick={applyRules}><Sparkles size={13} /> Auto-categorize</button>
          <span style={{ fontSize: 12, color: "var(--soft)" }}>{rows.length} shown</span>
        </div>
        {note && (
          <div style={{ fontSize: 12.5, color: "var(--violet)", marginTop: 10 }}>
            {note}
            {!showRules && /rule/i.test(note) && (
              <button onClick={() => setShowRules(true)}
                      style={{ border: "none", background: "none", font: "inherit", fontSize: 12.5,
                               color: "var(--violet)", textDecoration: "underline", cursor: "pointer", padding: "0 0 0 4px" }}>
                Show rules
              </button>
            )}
          </div>
        )}
      </Card>

      <Card>
        <button
          onClick={() => setShowRules(!showRules)}
          aria-expanded={showRules}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0,
            border: "none", background: "none", font: "inherit", fontSize: 14, fontWeight: 600,
            color: "var(--ink)", cursor: "pointer", textAlign: "left",
          }}
        >
          <ChevronRight size={14} style={{ transform: showRules ? "rotate(90deg)" : "none", transition: "transform .15s", flex: "0 0 auto", color: "var(--soft)" }} />
          Filing rules
          <span style={{ fontWeight: 400, fontSize: 12.5, color: "var(--soft)" }}>({state.rules.length})</span>
        </button>

        {showRules && (
        <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 0, lineHeight: 1.6 }}>
          Each rule matches on a fragment of the payee, not the whole thing — bank descriptions carry store numbers and dates that change every time. Shorter is better: <strong>kroger</strong> catches every Kroger, where <strong>kroger 4821</strong> catches one store.
        </p>
        <table className="eb-stack">
          <thead><tr><th>Match on</th><th style={{ width: 200 }}>Envelope</th><th className="eb-hide-xs">First seen as</th><th style={{ width: 34 }} /></tr></thead>
          <tbody>
            {state.rules.map((r) => (
              <tr key={r.id}>
                <td><input value={r.match} onChange={(e) => update((s) => { const x = s.rules.find((y) => y.id === r.id); if (x) x.match = e.target.value; })} /></td>
                <td data-label="Envelope">
                  <select value={r.categoryId || ""} onChange={(e) => update((s) => { const x = s.rules.find((y) => y.id === r.id); if (x) x.categoryId = e.target.value; })} style={{ padding: "4px 6px" }}>
                    {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td data-label="Seen as" className="eb-hide-xs" style={{ color: "var(--soft)", fontSize: 11.5 }}>{r.sample || "—"}</td>
                <td><button className="eb-btn quiet" style={{ padding: 5 }} aria-label="Delete rule" onClick={() => update((s) => { s.rules = s.rules.filter((y) => y.id !== r.id); })}><Trash2 size={13} /></button></td>
              </tr>
            ))}
            {state.rules.length === 0 && <tr><td colSpan={4} style={{ color: "var(--soft)" }}>No rules yet. Set an envelope on any transaction below and one gets saved automatically.</td></tr>}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input placeholder="Match on (e.g. kroger)" value={ruleDraft.match} onChange={(e) => setRuleDraft({ ...ruleDraft, match: e.target.value })} style={{ maxWidth: 220 }} />
          <select value={ruleDraft.categoryId} onChange={(e) => setRuleDraft({ ...ruleDraft, categoryId: e.target.value })} style={{ maxWidth: 200 }}>
            <option value="">Pick an envelope</option>
            {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="eb-btn" disabled={!ruleDraft.match.trim() || !ruleDraft.categoryId} onClick={() => {
            update((s) => s.rules.push({ id: uid(), match: ruleDraft.match.trim().toLowerCase(), categoryId: ruleDraft.categoryId }));
            setRuleDraft({ match: "", categoryId: "" });
          }}><Plus size={13} /> Add rule</button>
        </div>
        </div>
        )}
      </Card>

      <Card title="Add a transaction">
        <div className="eb-form" style={{ display: "grid", gridTemplateColumns: "130px 1fr 130px 160px 180px auto", gap: 8, alignItems: "center" }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input placeholder="Payee" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          <input className="num" placeholder="-24.50" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Uncategorized</option>
            {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="eb-btn" disabled={!form.payee.trim() || !form.amount} onClick={() => {
            update((s) => {
              const amount = Number(form.amount);
              s.transactions.push({ id: uid(), date: form.date, payee: form.payee.trim(), amount, accountId: form.accountId, categoryId: form.categoryId || (amount > 0 ? incomeCatId(s) : null) });
              const acc = s.accounts.find((a) => a.id === form.accountId);
              if (acc) acc.balance += amount;
            });
            setForm({ ...form, payee: "", amount: "" });
          }}><Plus size={13} /> Add</button>
        </div>
      </Card>

      <Card>
        <table className="eb-stack">
          <thead><tr><th style={{ width: 96 }}>Date</th><th>Payee</th><th style={{ width: 150 }}>Account</th><th style={{ width: 200 }}>Envelope</th><th className="right" style={{ width: 110 }}>Amount</th><th style={{ width: 34 }} /></tr></thead>
          <tbody>
            {rows.slice(0, 120).map((t) => (
              <tr key={t.id}>
                <td data-label="Date" className="num" style={{ color: "var(--soft)", fontSize: 12 }}>{t.date}</td>
                <td style={{ fontWeight: 500 }}>{t.payee}</td>
                <td data-label="Account" className="eb-hide-xs" style={{ color: "var(--soft)", fontSize: 12 }}>{state.accounts.find((a) => a.id === t.accountId)?.name}</td>
                <td data-label="Envelope">
                  <select
                    value={t.categoryId || ""}
                    onChange={(e) => update((s) => {
                      const tx = s.transactions.find((x) => x.id === t.id);
                      tx.categoryId = e.target.value || null;
                      if (e.target.value && tx.amount < 0) {
                        const match = merchantKey(tx.payee);
                        if (match && !s.rules.some((r) => r.match === match)) {
                          s.rules.push({ id: uid(), match, categoryId: e.target.value, sample: tx.payee });
                        }
                      }
                    })}
                    style={{ padding: "4px 6px", color: t.categoryId ? "var(--ink)" : "var(--soft)" }}
                  >
                    <option value="">Uncategorized</option>
                    {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td data-label="Amount" className="right num" style={{ color: t.amount > 0 ? "var(--teal)" : "var(--ink)", fontWeight: 500 }}>{money(t.amount)}</td>
                <td><button className="eb-btn quiet" style={{ padding: 5 }} aria-label="Delete transaction" onClick={() => update((s) => { s.transactions = s.transactions.filter((x) => x.id !== t.id); })}><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Debt snowball                                                      */
/* ------------------------------------------------------------------ */

function Debt({ state, update }) {
  const [method, setMethod] = useState("snowball");
  const extra = state.settings.extraDebtPayment;
  const snow = useMemo(() => simulatePayoff(state.debts, extra, "snowball"), [state.debts, extra]);
  const aval = useMemo(() => simulatePayoff(state.debts, extra, "avalanche"), [state.debts, extra]);
  const active = method === "snowball" ? snow : aval;
  const minimums = useMemo(() => simulatePayoff(state.debts, 0, "snowball"), [state.debts]);
  const [form, setForm] = useState({ name: "", balance: "", apr: "", min: "" });
  const total = state.debts.reduce((s, x) => s + x.balance, 0);

  const payoffDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Debt snowball</h1>
        <p className="eb-sub">Smallest balance first, minimums on the rest. The math is slightly worse than avalanche; the follow-through is much better.</p>
      </div>

      <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(178px,1fr))" }}>
        <Stat label="Total debt" value={money(total, false)} note={`${state.debts.length} balances`} tone="bad" />
        <Stat label="Debt-free by" value={payoffDate(active.months)} note={`${active.months} months`} />
        <Stat label="Interest paid" value={money(active.interest, false)} note={`vs ${money(minimums.interest, false)} on minimums only`} />
        <Stat label="Months saved" value={`${Math.max(0, minimums.months - active.months)}`} note={`from ${money(extra, false)} extra per month`} tone="good" />
      </div>

      <Card
        title="Payoff order"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="eyebrow">Extra payment</span>
            <input className="num" type="number" value={extra} onChange={(e) => update((s) => { s.settings.extraDebtPayment = Number(e.target.value) || 0; })} style={{ width: 92 }} />
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 150 }}>
              <option value="snowball">Snowball (Ramsey)</option>
              <option value="avalanche">Avalanche (rate)</option>
            </select>
          </div>
        }
      >
        <table className="eb-stack">
          <thead><tr><th style={{ width: 40 }}>#</th><th>Debt</th><th className="right">Balance</th><th className="right">APR</th><th className="right">Minimum</th><th className="right">Monthly attack</th><th className="right">Paid off</th><th style={{ width: 34 }} /></tr></thead>
          <tbody>
            {active.order.map((dd, i) => {
              const src = state.debts.find((x) => x.id === dd.id);
              return (
                <tr key={dd.id}>
                  <td className="num eb-hide-xs" style={{ color: "var(--soft)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{src.name}{i === 0 && <span className="eb-pill" style={{ marginLeft: 7 }}>attack this one</span>}</td>
                  <td data-label="Balance" className="right num">{money(src.balance)}</td>
                  <td data-label="APR" className="right num" style={{ color: "var(--soft)" }}>{src.apr}%</td>
                  <td data-label="Minimum" className="right num" style={{ color: "var(--soft)" }}>{money(src.min, false)}</td>
                  <td data-label="Attack" className="right num" style={{ fontWeight: 500 }}>{money(src.min + (i === 0 ? extra : 0), false)}</td>
                  <td data-label="Paid off" className="right num">{dd.paidMonth ? payoffDate(dd.paidMonth) : "—"}</td>
                  <td><button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${src.name}`} onClick={() => update((s) => { s.debts = s.debts.filter((x) => x.id !== dd.id); })}><Trash2 size={13} /></button></td>
                </tr>
              );
            })}
            {state.debts.length === 0 && <tr><td colSpan={8} style={{ color: "var(--soft)" }}>No debts listed. If that's accurate, the next milestone is a full emergency fund.</td></tr>}
          </tbody>
        </table>
        {state.debts.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 12, lineHeight: 1.55 }}>
            Avalanche would finish in {aval.months} months with {money(aval.interest, false)} of interest; snowball finishes in {snow.months} with {money(snow.interest, false)}.
            {snow.interest > aval.interest ? ` Snowball costs about ${money(snow.interest - aval.interest, false)} more — Ramsey's argument is that clearing a whole balance early keeps people in the plan.` : " Here the snowball order also happens to be the cheapest."}
          </div>
        )}
      </Card>

      <div className="eb-grid" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        <Card title="Balance melting down">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={active.timeline} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDebt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1E9FD" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B5A87" }} tickLine={false} axisLine={{ stroke: "#E7DDFA" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6B5A87" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
                <Tooltip formatter={(v) => money(v, false)} labelFormatter={(l) => `Month ${l}`} contentStyle={{ borderRadius: 10, border: "1px solid #E7DDFA", fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#6D28D9" strokeWidth={2} fill="url(#gDebt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Add a debt">
          <div className="eb-grid" style={{ gap: 8 }}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="num" type="number" placeholder="Balance" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            <input className="num" type="number" placeholder="APR %" value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} />
            <input className="num" type="number" placeholder="Minimum payment" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
            <button className="eb-btn" disabled={!form.name.trim() || !form.balance} onClick={() => {
              update((s) => s.debts.push({ id: uid(), name: form.name.trim(), balance: Number(form.balance), apr: Number(form.apr) || 0, min: Number(form.min) || 25 }));
              setForm({ name: "", balance: "", apr: "", min: "" });
            }}><Plus size={13} /> Add debt</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Net worth                                                          */
/* ------------------------------------------------------------------ */

function NetWorth({ state, update }) {
  const d = useDerived(state);
  const data = useMemo(() => {
    const snaps = [...state.snapshots];
    const cur = { month: d.mk, assets: Math.round(d.assets), liabilities: Math.round(d.liabilities) };
    const i = snaps.findIndex((s) => s.month === d.mk);
    if (i >= 0) snaps[i] = cur; else snaps.push(cur);
    return snaps.map((s) => ({
      label: `${MONTHS[Number(s.month.slice(5)) - 1].slice(0, 3)} ${s.month.slice(2, 4)}`,
      Assets: s.assets, Liabilities: -s.liabilities, "Net worth": s.assets - s.liabilities,
    }));
  }, [state.snapshots, d]);

  const first = data[0]?.["Net worth"] ?? 0;
  const last = data[data.length - 1]?.["Net worth"] ?? 0;
  const change = last - first;

  return (
    <div className="eb-grid" style={{ gap: 16 }}>
      <div>
        <h1 className="display">Net worth</h1>
        <p className="eb-sub">What you own minus what you owe. This is the number worth watching — the one that turns positive on the way out of debt payoff.</p>
      </div>

      <div className="eb-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(178px,1fr))" }}>
        <Stat label="Net worth today" value={money(last, false)} tone={last >= 0 ? "good" : "bad"} />
        <Stat label="Assets" value={money(d.assets, false)} />
        <Stat label="Liabilities" value={money(d.liabilities, false)} tone="bad" />
        <Stat label="Change over 13 months" value={`${change >= 0 ? "+" : ""}${money(change, false)}`} tone={change >= 0 ? "good" : "bad"} />
      </div>

      <Card title="Assets, liabilities, and the line between them" action={
        <button className="eb-btn quiet" onClick={() => update((s) => {
          const i = s.snapshots.findIndex((x) => x.month === d.mk);
          const cur = { month: d.mk, assets: Math.round(d.assets), liabilities: Math.round(d.liabilities) };
          if (i >= 0) s.snapshots[i] = cur; else s.snapshots.push(cur);
        })}><RefreshCw size={13} /> Save this month's snapshot</button>
      }>
        <div style={{ height: 330 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gL" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#C2255C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C2255C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1E9FD" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B5A87" }} tickLine={false} axisLine={{ stroke: "#E7DDFA" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B5A87" }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, n) => [money(Math.abs(v), false), n]} contentStyle={{ borderRadius: 10, border: "1px solid #E7DDFA", fontSize: 12 }} />
              <Area type="monotone" dataKey="Assets" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#gA)" />
              <Area type="monotone" dataKey="Liabilities" stroke="#C2255C" strokeWidth={1.5} fill="url(#gL)" />
              <Line type="monotone" dataKey="Net worth" stroke="#4C1D95" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="What's in the number">
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
          Set the type on each account after a sync. SimpleFIN doesn't reliably say which accounts are savings, and the emergency-fund milestones count savings balances only.
        </p>
        <table className="eb-stack">
          <thead><tr><th>Account</th><th>Institution</th><th style={{ width: 150 }}>Type</th><th className="right">Balance</th><th style={{ width: 34 }} /></tr></thead>
          <tbody>
            {state.accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 500 }}>{a.name}</td>
                <td data-label="Bank" style={{ color: "var(--soft)" }}>{a.org}</td>
                <td data-label="Type">
                  <select
                    value={a.type}
                    onChange={(e) => update((s) => { const acc = s.accounts.find((x) => x.id === a.id); if (acc) acc.type = e.target.value; })}
                    style={{ padding: "4px 6px" }}
                  >
                    {["checking", "savings", "credit", "loan", "investment", "property"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td data-label="Balance" className="right num" style={{ color: a.balance < 0 ? "var(--rose)" : "var(--ink)", fontWeight: 500 }}>{money(a.balance)}</td>
                <td>
                  <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Remove ${a.name}`} onClick={() => update((s) => { s.accounts = s.accounts.filter((x) => x.id !== a.id); })}><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
            {state.accounts.length === 0 && <tr><td colSpan={5} style={{ color: "var(--soft)" }}>No accounts yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accounts (admin)                                                   */
/* ------------------------------------------------------------------ */

function Accounts({ session }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/users", { credentials: "same-origin" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Server returned ${r.status}`);
      setUsers(await r.json());
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (u) => {
    if (!window.confirm(`Delete "${u.email}" and their entire budget? This can't be undone.`)) return;
    try {
      const r = await fetch(`/api/users/${u.id}`, { method: "DELETE", credentials: "same-origin" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Server returned ${r.status}`);
      load();
    } catch (e) { setErr(e.message); }
  };


  return (
    <div className="eb-grid" style={{ gap: 16, maxWidth: 820 }}>
      <div>
        <h1 className="display">Accounts</h1>
        <p className="eb-sub">Everyone on this server has their own budget and their own bank connection. Nothing is shared between accounts.</p>
      </div>

      <Card title="People on this server">
        {err && <div className="eb-coach warn" style={{ marginBottom: 10 }}><div style={{ fontSize: 12.5 }}>{err}</div></div>}
        {!users ? (
          <div style={{ fontSize: 13, color: "var(--soft)" }}>Loading…</div>
        ) : (
          <table className="eb-stack">
            <thead><tr><th>Email</th><th>Joined</th><th>Bank</th><th style={{ width: 34 }} /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.email}
                    {u.admin && <span className="eb-pill" style={{ marginLeft: 7 }}>admin</span>}
                    {u.email === session?.email && <span className="eb-pill" style={{ marginLeft: 7 }}>you</span>}
                  </td>
                  <td data-label="Joined" className="num" style={{ color: "var(--soft)", fontSize: 12 }}>{u.createdAt?.slice(0, 10) || "—"}</td>
                  <td data-label="Bank"><span className={"eb-pill" + (u.bankConnected ? " good" : "")}>{u.bankConnected ? "connected" : "not connected"}</span></td>
                  <td>
                    <button className="eb-btn quiet" style={{ padding: 5 }} aria-label={`Delete ${u.email}`}
                      disabled={u.email === session?.email} onClick={() => remove(u)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 12, color: "var(--soft)", marginBottom: 0, lineHeight: 1.6 }}>
          Deleting an account removes their budget and their stored bank access URL from this machine. Their SimpleFIN subscription is theirs and is unaffected — they'd revoke that from the bridge dashboard.
        </p>
      </Card>

      <Card title="Invite someone">
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 0, lineHeight: 1.6 }}>
          Send them the address of this server. They pick <strong>Create an account</strong> on the sign-in screen and enter the signup code you set in <code>ENVELOPE_SIGNUP_CODE</code>. Change that code to stop new registrations, or unset it and restart to close signup entirely.
        </p>
      </Card>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bank connection (SimpleFIN)                                        */
/* ------------------------------------------------------------------ */

function Bank({ state, update, setState }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const base = (state.settings.syncUrl || "").replace(/\/$/, "");

  const claim = async () => {
    setBusy("claim"); setMsg(null);
    try {
      const r = await fetch(`${base}/api/simplefin/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: token.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Claim failed");
      setMsg({ ok: true, text: "Connected. Run a sync to pull accounts and transactions." });
      setToken("");
    } catch (e) {
      setMsg({ ok: false, text: `${e.message}. Check that the sync server is running at ${base}.` });
    }
    setBusy(null);
  };

  const sync = async () => {
    setBusy("sync"); setMsg(null);
    try {
      const r = await fetch(`${base}/api/simplefin/accounts?days=90`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Sync failed");
      setState((s) => {
        const n = structuredClone(s);
        (j.accounts || []).forEach((sa) => {
          const bal = Number(sa.balance);
          const existing = n.accounts.find((a) => a.simplefinId === sa.id);
          if (existing) { existing.balance = bal; existing.name = sa.name; }
          else n.accounts.push({
            id: uid(), simplefinId: sa.id, name: sa.name,
            org: sa.org?.name || sa.org?.domain || "Bank",
            type: bal < 0 ? "credit" : "checking", balance: bal,
          });
          const acc = n.accounts.find((a) => a.simplefinId === sa.id);
          (sa.transactions || []).forEach((tx) => {
            if (n.transactions.some((t) => t.simplefinId === tx.id)) return;
            const payee = tx.payee || tx.description || "Transaction";
            const amount = Number(tx.amount);
            const rule = matchRule(payee, n.rules);
            n.transactions.push({
              id: uid(), simplefinId: tx.id, accountId: acc.id,
              date: iso(new Date(tx.posted * 1000)), payee, amount,
              categoryId: amount > 0 ? incomeCatId(n) : rule ? rule.categoryId : null,
            });
          });
        });
        n.settings.lastSync = Date.now();
        return n;
      });
      setMsg({ ok: true, text: `Synced ${(j.accounts || []).length} accounts.` });
    } catch (e) {
      setMsg({ ok: false, text: `${e.message}. Check that the sync server is running at ${base}.` });
    }
    setBusy(null);
  };

  return (
    <div className="eb-grid" style={{ gap: 16, maxWidth: 820 }}>
      <div>
        <h1 className="display">Bank connection</h1>
        <p className="eb-sub">SimpleFIN Bridge, read-only. Your bank credentials never touch this app — the bridge hands back an access URL, and the sync server on your machine holds it.</p>
      </div>

      <Card title="Where the bank calls go">
        <div className="eyebrow" style={{ marginBottom: 5 }}>Sync address — leave blank</div>
        <input placeholder="this server" value={state.settings.syncUrl || ""}
               onChange={(e) => update((s) => { s.settings.syncUrl = e.target.value; })} />
        <p style={{ fontSize: 12.5, color: "var(--soft)", lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
          {base
            ? `Bank calls are going to ${base} instead of this server. That only works if something is really listening there, and because it's a different origin your sign-in cookie won't be sent — clear this field unless you know you need it.`
            : "Blank is right. The server hosting this page also brokers SimpleFIN, so bank calls stay on this origin and carry your session. Your bank credentials never reach the browser — the access URL lives on the server, readable only by your account."}
        </p>
      </Card>

      <Card title="Step 1 · Claim a setup token">
        <p style={{ fontSize: 12.5, color: "var(--soft)", lineHeight: 1.6, marginTop: 0 }}>
          Create a bridge account at <strong>bridge.simplefin.org</strong>, connect your bank there, and generate a setup token. Paste the token below — it's single-use and gets exchanged for a long-lived access URL.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="aHR0cHM6Ly9iZXRhLWJyaWRnZS5zaW1wbGVmaW4ub3JnL..." value={token} onChange={(e) => setToken(e.target.value)} />
          <button className="eb-btn" disabled={!token.trim() || busy} onClick={claim}>
            {busy === "claim" ? <Loader2 size={13} /> : <ShieldCheck size={13} />} Claim
          </button>
        </div>
      </Card>

      <Card title="Step 2 · Sync">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="eb-btn" disabled={busy} onClick={sync}>
            {busy === "sync" ? <Loader2 size={13} /> : <RefreshCw size={13} />} Sync accounts and transactions
          </button>
          <span style={{ fontSize: 12.5, color: "var(--soft)" }}>
            {state.settings.lastSync ? `Last synced ${new Date(state.settings.lastSync).toLocaleString()}` : "Never synced"}
          </span>
        </div>
        {msg && (
          <div className={"eb-coach " + (msg.ok ? "good" : "warn")} style={{ marginTop: 12, marginBottom: 0 }}>
            <div style={{ fontSize: 12.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
              {msg.ok ? <Check size={14} color="#0E7C68" style={{ flex: "0 0 14px", marginTop: 2 }} /> : <AlertTriangle size={14} color="#C2255C" style={{ flex: "0 0 14px", marginTop: 2 }} />}
              <span>{msg.text}</span>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}
