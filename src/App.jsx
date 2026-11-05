import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "../config.js";

const games = { genshin: "Genshin Impact", wuwa: "Wuthering Waves" };
const currency = { genshin: "เจม", wuwa: "แอสไตรต์" };
const tasksFor = (game) => [
  "ไทต์รายวัน",
  "ไดอารี่",
  "ใช้พลังงาน",
  "BP",
  "กิจกรรมจำกัดเวลา",
  "ลงหอรายอาทิตย์",
  ...(game === "wuwa" ? ["ฟาร์มแอคโค่รายวัน"] : []),
];
const today = () => new Date().toLocaleDateString("en-CA");
const money = (n) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(n || 0);
const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "—";
const fromRow = (row) => ({
  id: row.id,
  game: row.game,
  title: row.title,
  client: row.client || "",
  status: row.status,
  service: row.service || "gem_farm",
  durationDays: Number(row.duration_days) || 0,
  targetGems: Number(row.target_gems) || 0,
  agreedAmount: Number(row.agreed_amount) || 0,
  completedAt:
    row.completed_at || (row.status === "completed" ? row.updated_at : null),
  date: row.job_date,
  updatedAt: row.updated_at,
  updates: Array.isArray(row.updates) ? row.updates : [],
});
const btn =
  "rounded-lg border border-[#373a31] bg-[#20211d] px-3 py-2 text-sm text-[#d5d5c9] transition hover:bg-[#2a2c25]";
const field =
  "mt-1 w-full rounded-lg border border-[#373a31] bg-[#1a1b18] px-3 py-2.5 text-sm text-[#e5e4dc] outline-none focus:border-[#9aa977]";

function App() {
  const config = window.FARMNOTE_CONFIG;
  const client = useMemo(
    () =>
      config?.url && config?.publishableKey
        ? createClient(config.url, config.publishableKey)
        : null,
    [config],
  );
  const [user, setUser] = useState(null),
    [jobs, setJobs] = useState([]),
    [ready, setReady] = useState(false);
  const [page, setPage] = useState("dashboard"),
    [statusFilter, setStatusFilter] = useState("all"),
    [month, setMonth] = useState(today().slice(0, 7));
  const [modal, setModal] = useState(""),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(false),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState("signin"),
    [authMessage, setAuthMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7)),
    [careDate, setCareDate] = useState(today());

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };
  const loadJobs = async () => {
    const { data, error } = await client
      .from("farm_jobs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      notify(`โหลดข้อมูลงานไม่สำเร็จ: ${error.message}`);
      return;
    }
    setJobs(data.map(fromRow));
  };
  useEffect(() => {
    if (!client) {
      setReady(true);
      return;
    }
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser) queueMicrotask(() => active && loadJobs());
      else setJobs([]);
      setReady(true);
    });
    client.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user || null);
        setReady(true);
        if (data.session?.user) loadJobs();
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const save = async (job) => {
    const { error } = await client
      .from("farm_jobs")
      .upsert({
        id: job.id,
        owner_id: user.id,
        game: job.game,
        title: job.title,
        client: job.client,
        status: job.status,
        service: job.service,
        duration_days: job.durationDays,
        target_gems: job.targetGems,
        agreed_amount: job.agreedAmount,
        completed_at: job.completedAt,
        job_date: job.date,
        updates: job.updates,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  };
  const openJob = (job = null) => {
    setSelected(job);
    setEditing(Boolean(job));
    setModal("job");
  };
  const openDetail = (job) => {
    setSelected(job);
    if (job.service === "account_care") {
      const dates = job.updates
        .map((entry) => entry.date)
        .filter(Boolean)
        .sort();
      const initialMonth = dates.at(-1)?.slice(0, 7) || today().slice(0, 7);
      setCalendarMonth(initialMonth);
      setCareDate(dates.at(-1) || today());
    }
    setModal("detail");
  };
  const openUpdate = (job) => {
    setSelected(job);
    setModal("update");
  };
  const updateSaved = (next, message) => {
    setJobs((items) =>
      items.map((item) => (item.id === next.id ? next : item)),
    );
    setModal("");
    notify(message);
  };

  const months = useMemo(
    () =>
      [
        ...new Set([
          today().slice(0, 7),
          ...jobs
            .filter((job) => job.status === "completed")
            .map((job) => (job.completedAt || job.updatedAt || "").slice(0, 7))
            .filter((key) => /^\d{4}-\d{2}$/.test(key)),
        ]),
      ]
        .sort()
        .reverse(),
    [jobs],
  );
  const monthIncome = jobs
    .filter(
      (job) =>
        job.status === "completed" &&
        (job.completedAt || job.updatedAt || "").slice(0, 7) === month,
    )
    .reduce((sum, job) => sum + job.agreedAmount, 0);
  const sorted = [...jobs].sort((a, b) =>
    (b.updatedAt || b.date || "").localeCompare(a.updatedAt || a.date || ""),
  );
  const gameJobs = sorted.filter((job) => job.game === page),
    visibleJobs =
      statusFilter === "all"
        ? gameJobs
        : gameJobs.filter((job) => job.status === statusFilter);

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#a8aa9d]">
        กำลังเชื่อมต่อ…
      </div>
    );
  if (!user)
    return (
      <Auth
        client={client}
        authMode={authMode}
        setAuthMode={setAuthMode}
        message={authMessage}
        setMessage={setAuthMessage}
      />
    );

  return (
    <div className="min-h-screen bg-[#111210] text-[#e5e4dc]">
      <aside className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] items-center justify-around border-t border-[#292b26] bg-[#171815] px-2 md:inset-y-0 md:right-auto md:h-auto md:w-60 md:flex-col md:items-stretch md:justify-start md:border-r md:border-t-0 md:px-5 md:py-7">
        <Brand />
        <p className="hidden px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[.16em] text-[#85877e] md:block">
          เมนูหลัก
        </p>
        <NavButton
          active={page === "dashboard"}
          onClick={() => {
            setPage("dashboard");
            setStatusFilter("all");
          }}
        >
          ▦ <span className="md:ml-2">ภาพรวม</span>
        </NavButton>
        <p className="hidden px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[.16em] text-[#85877e] md:block">
          เกมของฉัน
        </p>
        {Object.entries(games).map(([key, name]) => (
          <NavButton
            key={key}
            active={page === key}
            onClick={() => {
              setPage(key);
              setStatusFilter("all");
            }}
          >
            <img
              className="h-5 w-5 rounded-md object-cover"
              src={`${import.meta.env.BASE_URL}assets/${key === "genshin" ? "genshin-icon.jpg" : "wuwa-icon.jpg"}`}
              alt=""
            />
            <span className="md:ml-1">{name}</span>
            <span className="hidden md:ml-auto md:block">
              {jobs.filter((job) => job.game === key).length}
            </span>
          </NavButton>
        ))}
        <div className="mt-auto hidden pt-8 md:block">
          <div className="rounded-lg border border-[#30322c] px-3 py-2 text-xs text-[#a5a69b]">
            ● บันทึกบน Supabase
          </div>
          <button
            className={`${btn} mt-3 w-full`}
            onClick={() => client.auth.signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-24 md:ml-60 md:px-10 md:pb-8 xl:px-14">
        <header className="flex h-14 items-center justify-between border-b border-[#292b26] md:h-[70px]">
          <div className="text-xs text-[#9a9c91]">
            งานของฉัน <span className="px-2 text-[#55574f]">/</span>{" "}
            <strong className="font-medium text-[#d6d5ca]">
              {page === "dashboard" ? "ภาพรวม" : games[page]}
            </strong>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#93958a]">
            <span className="hidden sm:block">
              {new Intl.DateTimeFormat("th-TH", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
            <span className="hidden max-w-40 truncate lg:block">
              {user.email}
            </span>
            <button
              className={`${btn} px-2 py-1 md:hidden`}
              onClick={() => client.auth.signOut()}
              aria-label="ออกจากระบบ"
            >
              ↪
            </button>
          </div>
        </header>
        {page === "dashboard" ? (
          <section className="mx-auto max-w-6xl py-6 md:py-10">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#92977c]">
                  Farmnote / งานส่วนตัว
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                  ภาพรวมงาน
                </h1>
                <p className="mt-1 text-sm text-[#96988f]">
                  รายได้ที่ปิดงานแล้วและงานที่กำลังทำ
                </p>
              </div>
              <button
                className="rounded-lg bg-[#8d9969] px-4 py-2.5 text-sm font-semibold text-[#151610] hover:bg-[#a1ad7b]"
                onClick={() => openJob()}
              >
                ＋ เพิ่มงาน
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              <Metric title="รายได้เดือนนี้" value={money(monthIncome)}>
                <select
                  aria-label="เลือกเดือน"
                  value={months.includes(month) ? month : months[0]}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-md border border-[#3a3b31] bg-[#20211d] px-2 py-1 text-xs"
                >
                  {months.map((key) => (
                    <option key={key} value={key}>
                      {new Intl.DateTimeFormat("th-TH", {
                        month: "short",
                        year: "numeric",
                      }).format(new Date(`${key}-01T00:00:00`))}
                    </option>
                  ))}
                </select>
              </Metric>
              <Metric
                title="กำลังทำ"
                value={jobs.filter((job) => job.status === "active").length}
              />
              <Metric title="งานทั้งหมด" value={jobs.length} />
            </div>
            <section className="mt-5 overflow-hidden rounded-xl border border-[#292b26] bg-[#181916]">
              <div className="flex items-center justify-between border-b border-[#292b26] px-5 py-4">
                <div>
                  <h2 className="font-semibold">งานล่าสุด</h2>
                  <p className="mt-1 text-xs text-[#92948b]">
                    รายได้จะนับเมื่อปิดงานแล้วเท่านั้น
                  </p>
                </div>
                <button
                  className="text-sm text-[#bac68e]"
                  onClick={() => setPage("genshin")}
                >
                  ดูเกม →
                </button>
              </div>
              {sorted.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-[#1b1c19] text-xs text-[#92948b]">
                      <tr>
                        {["ชื่องาน", "เกม", "ลูกค้า", "สถานะ", "รายได้"].map(
                          (x) => (
                            <th key={x} className="px-5 py-3 font-medium">
                              {x}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.slice(0, 6).map((job) => (
                        <tr key={job.id} className="border-t border-[#292b26]">
                          <td className="px-5 py-3">
                            <button
                              className="text-left hover:text-[#bac68e]"
                              onClick={() => openDetail(job)}
                            >
                              {job.title}
                            </button>
                          </td>
                          <td className="px-5 py-3 text-[#a5a69b]">
                            {games[job.game]}
                          </td>
                          <td className="px-5 py-3 text-[#a5a69b]">
                            {job.client || "—"}
                          </td>
                          <td className="px-5 py-3">
                            <Status status={job.status} />
                          </td>
                          <td className="px-5 py-3">
                            {money(
                              job.status === "completed" ? job.agreedAmount : 0,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="เริ่มบันทึกงานแรกของคุณ"
                  action={() => openJob()}
                />
              )}
            </section>
          </section>
        ) : (
          <section className="mx-auto max-w-6xl py-6 md:py-10">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#92977c]">
                  จัดการงานและติดตามความคืบหน้า
                </p>
                <h1 className="mt-2 text-2xl font-semibold md:text-3xl">
                  {games[page]}
                </h1>
                <p className="mt-1 text-sm text-[#96988f]">
                  {gameJobs.length} รายการ · งานเสร็จแล้ว{" "}
                  {gameJobs.filter((job) => job.status === "completed").length}
                </p>
              </div>
              <button
                className="rounded-lg bg-[#8d9969] px-4 py-2.5 text-sm font-semibold text-[#151610]"
                onClick={() => openJob()}
              >
                ＋ เพิ่มงาน
              </button>
            </div>
            <div className="mb-5 flex gap-2">
              {[
                ["all", "ทั้งหมด"],
                ["active", "กำลังทำ"],
                ["completed", "เสร็จแล้ว"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-lg border px-3 py-2 text-sm ${statusFilter === key ? "border-[#858f5d] bg-[#292d22] text-[#c2cd9c]" : "border-[#30322c] text-[#9a9c91]"}`}
                >
                  {label}{" "}
                  <span className="ml-1 text-xs">
                    {key === "all"
                      ? gameJobs.length
                      : gameJobs.filter((job) => job.status === key).length}
                  </span>
                </button>
              ))}
            </div>
            {visibleJobs.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDetail={() => openDetail(job)}
                    onEdit={() => openJob(job)}
                    onUpdate={() => openUpdate(job)}
                  />
                ))}
              </div>
            ) : (
              <Empty title="ยังไม่มีงานในหมวดนี้" action={() => openJob()} />
            )}
          </section>
        )}
        <footer className="border-t border-[#292b26] py-5 text-xs text-[#777970]">
          Farmnote · บันทึกงานส่วนตัว
        </footer>
      </main>
      {modal === "job" && (
        <JobModal
          job={selected}
          editing={editing}
          close={() => setModal("")}
          save={async (values) => {
            setBusy(true);
            const old = selected;
            const job = old
              ? {
                  ...old,
                  ...values,
                  completedAt:
                    values.status === "completed"
                      ? old.completedAt || new Date().toISOString()
                      : null,
                  agreedAmount: old.agreedAmount,
                }
              : {
                  ...values,
                  id: crypto.randomUUID(),
                  updates: [],
                  completedAt:
                    values.status === "completed"
                      ? new Date().toISOString()
                      : null,
                  agreedAmount: Number(values.agreedAmount),
                };
            try {
              await save(job);
              setJobs((items) =>
                old
                  ? items.map((item) => (item.id === job.id ? job : item))
                  : [job, ...items],
              );
              setModal("");
              notify(old ? "อัปเดตงานแล้ว" : "เพิ่มงานแล้ว");
            } catch (error) {
              notify(`บันทึกไม่สำเร็จ: ${error.message}`);
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      )}
      {modal === "update" && selected && (
        <UpdateModal
          job={selected}
          close={() => setModal("")}
          busy={busy}
          save={async (entry) => {
            const old = selected;
            const next = {
              ...old,
              updates: [...old.updates, entry],
              updatedAt: new Date().toISOString(),
            };
            if (
              old.service === "gem_farm" &&
              old.status === "active" &&
              next.updates.reduce(
                (sum, item) => sum + (Number(item.gemsEarned) || 0),
                0,
              ) >= old.targetGems
            ) {
              next.status = "completed";
              next.completedAt = new Date().toISOString();
            }
            setBusy(true);
            try {
              await save(next);
              updateSaved(
                next,
                next.status === "completed" && old.status === "active"
                  ? "ถึงเป้าหมายแล้ว ปิดงานเรียบร้อย"
                  : "บันทึกความคืบหน้าแล้ว",
              );
            } catch (error) {
              notify(`บันทึกไม่สำเร็จ: ${error.message}`);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {modal === "detail" && selected && (
        <DetailModal
          job={jobs.find((job) => job.id === selected.id) || selected}
          close={() => setModal("")}
          onEdit={() =>
            openJob(jobs.find((job) => job.id === selected.id) || selected)
          }
          onUpdate={() =>
            openUpdate(jobs.find((job) => job.id === selected.id) || selected)
          }
          onDelete={async () => {
            const job = jobs.find((item) => item.id === selected.id);
            if (
              !job ||
              !window.confirm(`ลบงาน “${job.title}” และประวัติทั้งหมดใช่ไหม?`)
            )
              return;
            const { error } = await client
              .from("farm_jobs")
              .delete()
              .eq("id", job.id);
            if (error) {
              notify(`ลบงานไม่สำเร็จ: ${error.message}`);
              return;
            }
            setJobs((items) => items.filter((item) => item.id !== job.id));
            setModal("");
            notify("ลบงานแล้ว");
          }}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          careDate={careDate}
          setCareDate={setCareDate}
        />
      )}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#d1d2bf] px-4 py-3 text-sm text-[#171812] shadow-xl md:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <a
      href="#dashboard"
      className="hidden items-center gap-3 text-lg font-bold tracking-tight text-[#e3e3d9] md:flex"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#78845a] text-2xl leading-none text-white">
        f<span className="text-[#ced99f]">.</span>
      </span>
      <span>
        farmnote
        <small className="block text-[9px] font-medium tracking-[.13em] text-[#85877e]">
          บันทึกงานส่วนตัว
        </small>
      </span>
    </a>
  );
}
function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[10px] transition md:my-0.5 md:flex-none md:justify-start md:gap-2 md:px-3 md:text-xs ${active ? "bg-[#292d22] font-semibold text-[#c2cd9c]" : "text-[#a2a399] hover:bg-[#20211d] hover:text-[#e5e4dc]"}`}
    >
      {children}
    </button>
  );
}
function Metric({ title, value, children }) {
  return (
    <article className="min-h-28 rounded-xl border border-[#292b26] bg-[#181916] p-4 md:min-h-32 md:p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-[#999b90]">
        <span>{title}</span>
        {children}
      </div>
      <strong className="mt-4 block text-xl font-semibold tracking-tight text-[#c1cd98] md:text-2xl">
        {value}
      </strong>
    </article>
  );
}
function Status({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs ${status === "completed" ? "bg-[#243029] text-[#9cb8a5]" : "bg-[#292d22] text-[#b2be8e]"}`}
    >
      {status === "completed" ? "✓ เสร็จแล้ว" : "● กำลังทำ"}
    </span>
  );
}
function Empty({ title, action }) {
  return (
    <div className="px-5 py-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#92948b]">
        เพิ่มงานเพื่อเริ่มติดตามความคืบหน้า
      </p>
      <button className={`${btn} mt-4`} onClick={action}>
        ＋ เพิ่มงานแรก
      </button>
    </div>
  );
}
function JobCard({ job, onDetail, onEdit, onUpdate }) {
  const gems =
    job.service === "gem_farm"
      ? job.updates.reduce(
          (sum, item) => sum + (Number(item.gemsEarned) || 0),
          0,
        )
      : 0;
  const progress = job.targetGems
    ? Math.min(100, Math.round((gems / job.targetGems) * 100))
    : 0;
  return (
    <article className="rounded-xl border border-[#2b2d27] bg-[#181916] p-4 transition hover:border-[#484a3c] md:p-5">
      <div className="flex items-center justify-between">
        <Status status={job.status} />
        <button
          aria-label="ดูรายละเอียด"
          onClick={onDetail}
          className="rounded px-2 text-lg text-[#999b90] hover:bg-[#282a24]"
        >
          ···
        </button>
      </div>
      <button
        onClick={onDetail}
        className="mt-3 block text-left text-base font-semibold hover:text-[#c2cd9c]"
      >
        {job.title}
      </button>
      <p className="mt-1 text-xs text-[#92948b]">
        {job.client || "ไม่ระบุลูกค้า"} · {dateText(job.date)}
      </p>
      <div className="my-4 border-t border-[#2a2c27]" />
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-[#92948b]">
            {job.service === "gem_farm"
              ? `${currency[job.game]} สะสม`
              : "ระยะเวลางาน"}
          </p>
          <strong className="mt-1 block text-sm font-semibold">
            {job.service === "gem_farm"
              ? `${gems.toLocaleString("th-TH")} / ${job.targetGems.toLocaleString("th-TH")}`
              : `${job.durationDays} วัน · บันทึกแล้ว ${job.updates.length} วัน`}
          </strong>
        </div>
        <span className="text-xs text-[#a5a69b]">
          ค่าจ้าง {money(job.agreedAmount)}
        </span>
      </div>
      {job.service === "gem_farm" && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#30322c]">
            <div
              className="h-full rounded-full bg-[#9aa977]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-[#a5a69b]">{progress}%</span>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onUpdate}
          className="flex-1 rounded-lg border border-[#373a31] bg-[#20211d] px-2 py-2 text-xs text-[#d5d5c9] hover:bg-[#292b24]"
        >
          ＋{" "}
          {job.service === "gem_farm" ? "บันทึกยอดรายวัน" : "เช็กลิสต์รายวัน"}
        </button>
        <button onClick={onEdit} className={`${btn} px-3 py-2 text-xs`}>
          แก้ไข
        </button>
      </div>
    </article>
  );
}

function Modal({ title, close, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto max-h-[95vh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-y-auto rounded-2xl border border-[#34362f] bg-[#181916] p-5 shadow-2xl md:p-6`}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={close}
            className="rounded px-2 text-xl text-[#a1a297] hover:bg-[#292b24]"
            aria-label="ปิด"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function JobModal({ job, editing, close, save, busy }) {
  const [form, setForm] = useState(() => ({
    title: job?.title || "",
    game: job?.game || "genshin",
    service: job?.service || "gem_farm",
    client: job?.client || "",
    agreedAmount: job?.agreedAmount ?? "",
    targetGems: job?.targetGems || "",
    durationDays: job?.durationDays || "",
    status: job?.status || "active",
    date: job?.date || today(),
  }));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const input = (label, key, props = {}) => (
    <label className="block text-sm text-[#b1b2a8]">
      {label}
      <input
        className={field}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        {...props}
      />
    </label>
  );
  return (
    <Modal title={editing ? "แก้ไขงาน" : "เพิ่มงานใหม่"} close={close}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save({
            ...form,
            targetGems:
              form.service === "gem_farm" ? Number(form.targetGems) : 0,
            durationDays:
              form.service === "account_care" ? Number(form.durationDays) : 0,
            agreedAmount: Number(form.agreedAmount),
          });
        }}
      >
        <label className="block text-sm text-[#b1b2a8]">
          ชื่องาน
          <input
            className={field}
            required
            maxLength="80"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="เช่น ฟาร์ม 6,400 เจม"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-[#b1b2a8]">
            เกม
            <select
              className={field}
              value={form.game}
              onChange={(e) => set("game", e.target.value)}
            >
              <option value="genshin">Genshin Impact</option>
              <option value="wuwa">Wuthering Waves</option>
            </select>
          </label>
          <label className="text-sm text-[#b1b2a8]">
            ประเภทงาน
            <select
              className={field}
              value={form.service}
              onChange={(e) => set("service", e.target.value)}
            >
              <option value="gem_farm">ฟาร์มเจม</option>
              <option value="account_care">ดูแลไอดี</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("ลูกค้า", "client", {
            maxLength: 60,
            required: form.service === "account_care",
            placeholder: "ชื่อลูกค้า",
          })}
          <label className="block text-sm text-[#b1b2a8]">
            ค่าจ้างที่ตกลง (บาท)
            <input
              className={field}
              type="number"
              min="0"
              step="0.01"
              required
              readOnly={editing}
              value={form.agreedAmount}
              onChange={(e) => set("agreedAmount", e.target.value)}
            />
            {editing && (
              <small className="text-xs text-[#85877e]">
                ค่าจ้างกำหนดตอนเพิ่มงานและแก้ไขไม่ได้
              </small>
            )}
          </label>
        </div>
        {form.service === "gem_farm"
          ? input("เป้าหมายเจม / แอสไตรต์", "targetGems", {
              type: "number",
              min: 1,
              step: 1,
              required: true,
            })
          : input("ระยะเวลางาน (วัน)", "durationDays", {
              type: "number",
              min: 1,
              step: 1,
              required: true,
            })}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-[#b1b2a8]">
            สถานะ
            <select
              className={field}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="active">กำลังทำ</option>
              <option value="completed">เสร็จแล้ว</option>
            </select>
          </label>
          {input("วันที่เริ่ม", "date", { type: "date", required: true })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btn} onClick={close}>
            ยกเลิก
          </button>
          <button
            disabled={busy}
            className="rounded-lg bg-[#8d9969] px-4 py-2 text-sm font-semibold text-[#151610] disabled:opacity-60"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกงาน"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UpdateModal({ job, close, save, busy }) {
  const last = job.updates.at(-1);
  const [values, setValues] = useState({
    currencyStart: last?.currencyEnd || 0,
    rollsStart: last?.rollsEnd || 0,
    currencyEnd: "",
    rollsEnd: "",
    note: "",
    date: today(),
  });
  const [checks, setChecks] = useState({});
  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const gem = job.service === "gem_farm";
  return (
    <Modal
      title={gem ? "บันทึกยอดฟาร์มรายวัน" : "เช็กลิสต์ดูแลไอดีรายวัน"}
      close={close}
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const entry = { date: values.date, note: values.note.trim() };
          if (gem) {
            const start = Number(values.currencyStart),
              end = Number(values.currencyEnd),
              rollsStart = Number(values.rollsStart),
              rollsEnd = Number(values.rollsEnd);
            if (
              [start, end, rollsStart, rollsEnd].some(
                (value) => !Number.isInteger(value) || value < 0,
              )
            )
              return;
            Object.assign(entry, {
              currencyStart: start,
              currencyEnd: end,
              rollsStart,
              rollsEnd,
              gemsEarned: end - start + (rollsEnd - rollsStart) * 160,
              rollsEarned: rollsEnd - rollsStart,
            });
          } else
            entry.checklist = tasksFor(job.game).map((label, i) => ({
              label,
              done: Boolean(checks[i]),
            }));
          save(entry);
        }}
      >
        {gem ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              ["currencyStart", `${currency[job.game]} เริ่มต้น`],
              ["rollsStart", "โรลเริ่มต้น"],
              ["currencyEnd", `${currency[job.game]} สิ้นวัน`],
              ["rollsEnd", "โรลสิ้นวัน"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm text-[#b1b2a8]">
                {label}
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#30322c] bg-[#1d1e1a] p-4">
            <p className="mb-3 text-sm text-[#b1b2a8]">
              เช็กลิสต์วันนี้{" "}
              <span className="float-right">
                {Object.values(checks).filter(Boolean).length}/
                {tasksFor(job.game).length}
              </span>
            </p>
            {tasksFor(job.game).map((task, i) => (
              <label
                key={task}
                className="flex items-center gap-3 border-t border-[#2b2d27] py-2.5 text-sm text-[#d0d0c6]"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checks[i])}
                  onChange={(e) =>
                    setChecks((prev) => ({ ...prev, [i]: e.target.checked }))
                  }
                  className="accent-[#9aa977]"
                />
                {task}
              </label>
            ))}
          </div>
        )}
        <label className="text-sm text-[#b1b2a8]">
          รายละเอียดเพิ่มเติม
          <input
            className={field}
            maxLength="120"
            value={values.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
          />
        </label>
        <label className="text-sm text-[#b1b2a8]">
          วันที่
          <input
            className={field}
            type="date"
            required
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={close}>
            ยกเลิก
          </button>
          <button
            disabled={busy}
            className="rounded-lg bg-[#8d9969] px-4 py-2 text-sm font-semibold text-[#151610]"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({
  job,
  close,
  onEdit,
  onUpdate,
  onDelete,
  calendarMonth,
  setCalendarMonth,
  careDate,
  setCareDate,
}) {
  const gem = job.service === "gem_farm";
  const gems = job.updates.reduce(
    (sum, entry) => sum + (Number(entry.gemsEarned) || 0),
    0,
  );
  const days = new Date(`${calendarMonth}-01T00:00:00`),
    monthEntries = job.updates.filter((entry) =>
      entry.date?.startsWith(calendarMonth),
    );
  const entries = monthEntries.reduce(
    (map, entry) => ((map[entry.date] ||= []).push(entry), map),
    {},
  );
  const startOffset = days.getDay(),
    count = new Date(days.getFullYear(), days.getMonth() + 1, 0).getDate();
  const moveMonth = (amount) => {
    const next = new Date(days.getFullYear(), days.getMonth() + amount, 1);
    setCalendarMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const selectedEntries = entries[careDate] || [];
  return (
    <Modal title={job.title} close={close} wide>
      <p className="-mt-3 mb-4 text-sm text-[#96988f]">
        {games[job.game]} · {job.client || "ไม่ระบุลูกค้า"} ·{" "}
        {job.status === "completed" ? "เสร็จแล้ว" : "กำลังทำ"}
      </p>
      <div className="rounded-xl border border-[#34392b] bg-[#20241c] p-4">
        <p className="text-xs text-[#aaad9e]">
          {job.status === "completed" ? "รายได้ที่นับแล้ว" : "รายได้หลังปิดงาน"}
        </p>
        <strong className="mt-1 block text-2xl text-[#c0cd95]">
          {money(job.status === "completed" ? job.agreedAmount : 0)}
        </strong>
      </div>
      <p className="mt-3 text-sm text-[#a8aa9d]">
        ค่าจ้างที่ตกลง: {money(job.agreedAmount)}
      </p>
      <p className="mt-1 text-sm text-[#a8aa9d]">
        {gem
          ? `ฟาร์มแล้ว ${gems.toLocaleString("th-TH")} / ${job.targetGems.toLocaleString("th-TH")} ${currency[job.game]}`
          : `บันทึกดูแลแล้ว ${job.updates.length} วัน · ระยะเวลางาน ${job.durationDays} วัน`}
      </p>
      <h3 className="mb-3 mt-5 font-semibold">
        {gem ? "ประวัติยอดฟาร์มรายวัน" : "ปฏิทินเช็กลิสต์รายวัน"}
      </h3>
      {gem ? (
        <div className="max-h-64 space-y-2 overflow-auto">
          {[...job.updates]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className="rounded-lg border border-[#30322c] p-3 text-sm"
              >
                <strong>
                  {dateText(entry.date)} · +
                  {Number(entry.gemsEarned || 0).toLocaleString("th-TH")}{" "}
                  {currency[job.game]} · +{Number(entry.rollsEarned || 0)} โรล
                </strong>
                <p className="mt-1 text-xs text-[#999b90]">
                  {entry.currencyStart} → {entry.currencyEnd}{" "}
                  {currency[job.game]} · {entry.rollsStart} → {entry.rollsEnd}{" "}
                  โรล {entry.note && `· ${entry.note}`}
                </p>
              </div>
            ))}
          {!job.updates.length && (
            <p className="text-sm text-[#999b90]">ยังไม่มีรายการบันทึก</p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[#30322c] p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                className={btn}
                aria-label="เดือนก่อน"
                onClick={() => moveMonth(-1)}
              >
                ‹
              </button>
              <strong className="text-sm">
                {new Intl.DateTimeFormat("th-TH", {
                  month: "long",
                  year: "numeric",
                }).format(days)}
              </strong>
              <button
                className={btn}
                aria-label="เดือนถัดไป"
                onClick={() => moveMonth(1)}
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#92948b]">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }, (_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${calendarMonth}-${String(i + 1).padStart(2, "0")}`,
                  records = entries[date] || [],
                  checks = records.flatMap((record) => record.checklist || []),
                  done = checks.filter((check) => check.done).length;
                return (
                  <button
                    key={date}
                    aria-pressed={careDate === date}
                    onClick={() => setCareDate(date)}
                    className={`flex min-h-10 flex-col items-center justify-center rounded-md text-xs ${careDate === date ? "bg-[#3b432d] text-[#d8e0b9]" : records.length ? "border border-[#434735] bg-[#20231c]" : "text-[#c4c4b9] hover:bg-[#25271f]"}`}
                  >
                    {i + 1}
                    {records.length > 0 && (
                      <small className="text-[9px] text-[#bbc891]">
                        {done}/{checks.length}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-[#30322c] p-3">
            <strong className="text-sm">{dateText(careDate)}</strong>
            {selectedEntries.length ? (
              selectedEntries.map((entry, i) => (
                <div key={i} className="mt-2">
                  <p className="text-xs text-[#bbc891]">
                    {entry.checklist.filter((item) => item.done).length}/
                    {entry.checklist.length} รายการ
                  </p>
                  {entry.note && (
                    <p className="text-xs text-[#96988f]">{entry.note}</p>
                  )}
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {entry.checklist.map((item) => (
                      <li
                        key={item.label}
                        className={`text-xs ${item.done ? "text-[#c0ca9c]" : "text-[#85877f]"}`}
                      >
                        {item.done ? "✓" : "·"} {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="mt-2 text-xs text-[#96988f]">ไม่มีบันทึกในวันนี้</p>
            )}
          </div>
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          className="rounded-lg border border-[#57352f] bg-[#281c19] px-3 py-2 text-sm text-[#dfa197]"
          onClick={onDelete}
        >
          ลบงาน
        </button>
        <button className={btn} onClick={onEdit}>
          แก้ไขงาน
        </button>
        <button
          className="rounded-lg bg-[#8d9969] px-3 py-2 text-sm font-semibold text-[#151610]"
          onClick={onUpdate}
        >
          ＋ {gem ? "บันทึกยอดวันนี้" : "เช็กลิสต์วันนี้"}
        </button>
      </div>
    </Modal>
  );
}

function Auth({ client, authMode, setAuthMode, message, setMessage }) {
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  return (
    <main className="grid min-h-screen place-items-center bg-[#111210] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-[#30322c] bg-[#181916] p-6 shadow-2xl md:p-8">
        <BrandAuth />
        <h1 className="mt-8 text-2xl font-semibold">
          {authMode === "signin" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
        </h1>
        <p className="mt-2 text-sm text-[#96988f]">
          ลงชื่อเข้าใช้เพื่อดูแลและบันทึกข้อมูลงานของคุณ
        </p>
        {!client && (
          <p className="mt-4 rounded-lg bg-[#29251d] p-3 text-sm text-[#d3bd8d]">
            ตั้งค่า URL และ Publishable key ใน config.js ก่อนใช้งาน
          </p>
        )}
        <form
          className="mt-6 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!client) return;
            setBusy(true);
            setMessage("กำลังเชื่อมต่อ…");
            const result =
              authMode === "signin"
                ? await client.auth.signInWithPassword(credentials)
                : await client.auth.signUp({
                    ...credentials,
                    options: {
                      emailRedirectTo: new URL(
                        import.meta.env.BASE_URL,
                        window.location.href,
                      ).href,
                    },
                  });
            setBusy(false);
            setMessage(
              result.error?.message ||
                (authMode === "signup" && !result.data.session
                  ? "สมัครแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
                  : ""),
            );
          }}
        >
          <label className="text-sm text-[#b1b2a8]">
            อีเมล
            <input
              className={field}
              type="email"
              autoComplete="email"
              required
              value={credentials.email}
              onChange={(e) =>
                setCredentials({ ...credentials, email: e.target.value })
              }
              placeholder="you@example.com"
            />
          </label>
          <label className="text-sm text-[#b1b2a8]">
            รหัสผ่าน
            <input
              className={field}
              type="password"
              minLength="8"
              autoComplete={
                authMode === "signin" ? "current-password" : "new-password"
              }
              required
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              placeholder="อย่างน้อย 8 ตัวอักษร"
            />
          </label>
          <button
            disabled={busy || !client}
            className="rounded-lg bg-[#8d9969] py-3 text-sm font-semibold text-[#151610] disabled:opacity-60"
          >
            {busy
              ? "กำลังดำเนินการ…"
              : authMode === "signin"
                ? "เข้าสู่ระบบ"
                : "สมัครใช้งาน"}
          </button>
        </form>
        <button
          className="mt-4 w-full text-sm text-[#bac68e]"
          onClick={() => {
            setAuthMode(authMode === "signin" ? "signup" : "signin");
            setMessage("");
          }}
        >
          {authMode === "signin"
            ? "ยังไม่มีบัญชี? สมัครใช้งาน"
            : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
        <p
          role="status"
          className="mt-3 min-h-5 text-center text-sm text-[#c4c7b7]"
        >
          {message}
        </p>
      </section>
    </main>
  );
}
function BrandAuth() {
  return (
    <a href="#" className="flex items-center gap-3 text-lg font-bold">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#78845a] text-2xl leading-none">
        f<span className="text-[#ced99f]">.</span>
      </span>
      <span>
        farmnote
        <small className="block text-[9px] font-medium tracking-[.13em] text-[#85877e]">
          บันทึกงานฟาร์ม
        </small>
      </span>
    </a>
  );
}

export default App;
