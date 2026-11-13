import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "../config.js";
import genshinIcon from "../assets/genshin-icon.jpg";
import wuwaIcon from "../assets/wuwa-icon.jpg";
import MetricCard from "@/src/components/uniquel/MetricCard";
import HorizontalCard from "@/src/components/uniquel/HorizontalCard";
import { hasJobReachedCompletion } from "./jobCompletion.js";

const games = { genshin: "Genshin Impact", wuwa: "Wuthering Waves" };
const currency = { genshin: "เจม", wuwa: "แอสไตรต์" };
const ores = [
  ["iron_chunk", "แร่เหล็ก"],
  ["white_iron_chunk", "แร่เหล็กขาว"],
  ["crystal_chunk", "ผลึกคริสตัล"],
  ["magical_crystal_chunk", "ผลึกคริสตัลเวทมนตร์"],
  ["amethyst_lump", "ก้อนแอเมทิสต์"],
  ["starsilver", "แร่ดาวตก"],
  ["condessence_crystal", "ผลึกคอนเดสเซนซ์"],
];
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
  customerConditions: row.customer_conditions || "",
  status: row.status,
  service: row.service || "gem_farm",
  durationDays: Number(row.duration_days) || 0,
  targetGems: Number(row.target_gems) || 0,
  targetQuests: Number(row.target_quests) || 0,
  oreTypes: Array.isArray(row.ore_types) ? row.ore_types : [],
  oreTargets: row.ore_targets && typeof row.ore_targets === "object" && !Array.isArray(row.ore_targets) ? row.ore_targets : {},
  agreedAmount: Number(row.agreed_amount) || 0,
  completedAt:
    row.completed_at || (row.status === "completed" ? row.updated_at : null),
  date: row.job_date,
  updatedAt: row.updated_at,
  updates: row.farm_job_updates
    .sort((a, b) => a.sequence - b.sequence)
    .map((item) => item.entry),
});
const btn =
  "rounded-lg border border-[#34383a] bg-[#1b1e20] px-3 py-2 text-sm text-[#deded9] transition hover:bg-[#222526]";
const field =
  "mt-1 w-full rounded-lg border border-[#34383a] bg-[#141618] px-3 py-2.5 text-sm text-[#e9e9e4] outline-none focus:border-[#a9b08d]";

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
      .select("*, farm_job_updates(job_id, sequence, report_date, entry)")
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
        customer_conditions: job.customerConditions,
        status: job.status,
        service: job.service,
        duration_days: job.durationDays,
        target_gems: job.targetGems,
        target_quests: job.targetQuests,
        ore_types: job.oreTypes,
        ore_targets: job.oreTargets,
        agreed_amount: job.agreedAmount,
        completed_at: job.completedAt,
        job_date: job.date,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  };
  const saveUpdate = async (job, entry) => {
    const { error } = await client.rpc("record_farm_job_update", {
      p_job_id: job.id,
      p_entry: entry,
      p_status: job.status,
      p_completed_at: job.completedAt,
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
            .map((job) => job.date?.slice(0, 7))
            .filter((key) => /^\d{4}-\d{2}$/.test(key)),
        ]),
      ]
        .sort()
        .reverse(),
    [jobs],
  );
  const completedJobsInMonth = jobs.filter(
    (job) => job.status === "completed" && job.date?.slice(0, 7) === month,
  );
  const monthIncome = completedJobsInMonth.reduce(
    (sum, job) => sum + job.agreedAmount,
    0,
  );
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
      <div className="grid min-h-screen place-items-center text-sm text-[#a1a5a6]">
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
    <div
      className="min-h-screen bg-[#090a0b] text-[#e9e9e4] md:flex"
      style={{
        "--color-card": "#141618",
        "--color-border": "#2a2d30",
        "--color-card-foreground": "#e9e9e4",
        "--color-muted-foreground": "#a1a5a6",
        "--color-primary": "#a9b08d",
        "--color-primary-foreground": "#11130e",
        "--color-ring": "#a9b08d",
      }}
    >
      <aside className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] items-center justify-around border-t border-[#2a2d30] bg-[#0e0f10] px-2 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:self-start md:flex-col md:items-stretch md:justify-start md:overflow-y-auto md:border-r md:border-t-0 md:px-5 md:py-7">
        <Brand />
        <p className="hidden px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[.16em] text-[#929697] md:block">
          เมนูหลัก
        </p>
        <NavButton
          active={page === "dashboard"}
          onClick={() => {
            setPage("dashboard");
            setStatusFilter("all");
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="12" y="3" width="5" height="5" rx="1" /><rect x="3" y="12" width="5" height="5" rx="1" /><rect x="12" y="12" width="5" height="5" rx="1" /></svg><span className="md:ml-2">ภาพรวม</span>
        </NavButton>
        <p className="hidden px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[.16em] text-[#929697] md:block">
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
              src={key === "genshin" ? genshinIcon : wuwaIcon}
              alt=""
            />
            <span className="md:ml-1">{name}</span>
            <span className="hidden md:ml-auto md:block">
              {jobs.filter((job) => job.game === key).length}
            </span>
          </NavButton>
        ))}
        <div className="mt-auto hidden pt-8 md:block">
          <div className="rounded-lg border border-[#2c3032] px-3 py-2 text-xs text-[#a1a5a6]">
            บันทึกบน Supabase
          </div>
          <button
            className={`${btn} mt-3 w-full`}
            onClick={() => client.auth.signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="mx-auto min-h-screen w-full min-w-0 max-w-[1500px] px-4 pb-24 md:ml-0 md:flex-1 md:px-10 md:pb-8 xl:px-14">
        <header className="flex h-14 items-center justify-between border-b border-[#2a2d30] md:h-[70px]">
          <div className="text-xs text-[#a1a5a6]">
            งานของฉัน <span className="px-2 text-[#686d70]">/</span>{" "}
            <strong className="font-medium text-[#deded9]">
              {page === "dashboard" ? "ภาพรวม" : games[page]}
            </strong>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#a1a5a6]">
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
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 4H4.8A1.8 1.8 0 0 0 3 5.8v8.4A1.8 1.8 0 0 0 4.8 16H8" /><path d="M10 13l3-3-3-3M6 10h7" /></svg>
            </button>
          </div>
        </header>
        {page === "dashboard" ? (
          <section className="mx-auto max-w-6xl py-6 md:py-10">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  ภาพรวมงาน
                </h1>
                <p className="mt-1 text-sm text-[#a1a5a6]">
                  รายได้ที่ปิดงานแล้วและงานที่กำลังทำ
                </p>
              </div>
              <button
                className="rounded-lg bg-[#a9b08d] px-4 py-2.5 text-sm font-semibold text-[#11130e] transition hover:bg-[#bcc59f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9b08d]"
                onClick={() => openJob()}
              >
                เพิ่มงาน
              </button>
            </div>
            <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4">
              <div className="col-span-2 flex min-w-0 flex-col gap-2 md:col-span-1">
                <select
                  aria-label="เลือกเดือน"
                  value={months.includes(month) ? month : months[0]}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-md border border-[#34383a] bg-[#1b1e20] px-2 py-1 text-xs"
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
                <MetricCard
                  label="รายได้เดือนที่เลือก"
                  value={money(monthIncome)}
                  change={`${completedJobsInMonth.length} งาน`}
                  detail="นับเฉพาะงานที่ปิดแล้ว"
                  className="farmnote-metric max-w-none min-w-0 flex-1 px-0"
                />
              </div>
              <Metric
                title="กำลังทำ"
                value={jobs.filter((job) => job.status === "active").length}
              />
              <Metric title="งานทั้งหมด" value={jobs.length} />
            </div>
            <section className="mt-8 overflow-hidden border-y border-[#2a2d30]">
              <div className="flex items-center justify-between border-b border-[#2a2d30] px-1 py-4">
                <div>
                  <h2 className="font-semibold">งานล่าสุด</h2>
                  <p className="mt-1 text-xs text-[#a1a5a6]">
                    รายได้จะนับเมื่อปิดงานแล้วเท่านั้น
                  </p>
                </div>
                <button
                  className="text-sm text-[#cad2b2]"
                  onClick={() => setPage("genshin")}
                >
                  ดูเกม
                </button>
              </div>
              {sorted.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="text-xs text-[#a1a5a6]">
                      <tr>
                        {["ชื่องาน", "เกม", "ลูกค้า", "สถานะ", "รายงานล่าสุด", "รายได้"].map(
                          (x) => (
                            <th key={x} className={`px-2 py-3 font-medium sm:px-3 lg:px-5 ${x === "เกม" || x === "ลูกค้า" || x === "รายงานล่าสุด" ? "hidden lg:table-cell" : ""}`}>
                              {x}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.slice(0, 6).map((job) => (
                        <tr key={job.id} className="border-t border-[#2a2d30] transition-colors hover:bg-white/[.025]">
                          <td className="px-2 py-3 sm:px-3 lg:px-5">
                            <button
                              className="text-left hover:text-[#cad2b2]"
                              onClick={() => openDetail(job)}
                            >
                              {job.title}
                            </button>
                            <span className="mt-1 block text-[10px] text-[#a1a5a6] lg:hidden">
                              {games[job.game]} · {job.client || "ไม่ระบุลูกค้า"}
                            </span>
                            <span className="block text-[10px] text-[#848889] lg:hidden">
                              รายงานล่าสุด {job.updates.at(-1)?.date ? dateText(job.updates.at(-1).date) : "ยังไม่มี"}
                            </span>
                          </td>
                          <td className="hidden px-5 py-3 text-[#a1a5a6] lg:table-cell">
                            {games[job.game]}
                          </td>
                          <td className="hidden px-5 py-3 text-[#a1a5a6] lg:table-cell">
                            {job.client || "—"}
                          </td>
                          <td className="px-2 py-3 sm:px-3 lg:px-5">
                            <Status status={job.status} />
                          </td>
                          <td className="hidden px-5 py-3 text-[#a1a5a6] lg:table-cell">
                            {job.updates.at(-1)?.date ? dateText(job.updates.at(-1).date) : "ยังไม่มี"}
                          </td>
                          <td className="px-2 py-3 text-right tabular-nums sm:px-3 lg:px-5">
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
                <h1 className="text-2xl font-semibold md:text-3xl">
                  {games[page]}
                </h1>
                <p className="mt-1 text-sm text-[#a1a5a6]">
                  {gameJobs.length} รายการ · งานเสร็จแล้ว{" "}
                  {gameJobs.filter((job) => job.status === "completed").length}
                </p>
              </div>
              <button
                className="rounded-lg bg-[#a9b08d] px-4 py-2.5 text-sm font-semibold text-[#11130e]"
                onClick={() => openJob()}
              >
                เพิ่มงาน
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
                  className={`rounded-lg border px-3 py-2 text-sm transition ${statusFilter === key ? "border-[#80896b] bg-[#212523] text-[#d0d6c3]" : "border-[#2c3032] text-[#a1a5a6] hover:bg-[#181a1c]"}`}
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
        <footer className="border-t border-[#2a2d30] py-5 text-xs text-[#848889]">
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
            const autoCompleted = job.status === "active" && hasJobReachedCompletion(job);
            if (autoCompleted) {
              job.status = "completed";
              job.completedAt = new Date().toISOString();
            }
            try {
              await save(job);
              setJobs((items) =>
                old
                  ? items.map((item) => (item.id === job.id ? job : item))
                  : [job, ...items],
              );
              setModal("");
              notify(autoCompleted
                ? "ครบเงื่อนไขแล้ว ปิดงานเรียบร้อย"
                : old ? "อัปเดตงานแล้ว" : "เพิ่มงานแล้ว");
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
            if (old.status === "active" && hasJobReachedCompletion(next)) {
              next.status = "completed";
              next.completedAt = new Date().toISOString();
            }
            setBusy(true);
            try {
              await saveUpdate(next, entry);
              updateSaved(
                next,
                next.status === "completed" && old.status === "active"
                  ? "ครบเงื่อนไขแล้ว ปิดงานเรียบร้อย"
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
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#deded9] px-4 py-3 text-sm text-[#0e0f10] shadow-xl md:bottom-6"
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
      className="hidden items-center text-lg font-semibold tracking-tight text-[#e9e9e4] md:flex"
    >
      <span>
        Farmnote
        <small className="block text-[9px] font-medium tracking-[.13em] text-[#929697]">
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
      className={`flex h-11 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[10px] transition md:my-0.5 md:flex-none md:justify-start md:gap-2 md:px-3 md:text-xs ${active ? "bg-[#212523] font-semibold text-[#d0d6c3]" : "text-[#a1a5a6] hover:bg-[#1b1e20] hover:text-[#e9e9e4]"}`}
    >
      {children}
    </button>
  );
}
function Metric({ title, value, children }) {
  return (
    <article className="min-h-28 border-b border-[#2a2d30] bg-transparent px-0 py-4 md:min-h-32 md:px-4">
      <div className="flex items-center justify-between gap-2 text-xs text-[#a1a5a6]">
        <span>{title}</span>
        {children}
      </div>
      <strong className="mt-3 block text-xl font-semibold tracking-tight tabular-nums text-[#e9e9e4] md:text-2xl">
        {value}
      </strong>
    </article>
  );
}
function Status({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs ${status === "completed" ? "bg-[#202823] text-[#b5c7ba]" : "bg-[#212523] text-[#c1c9a3]"}`}
    >
      {status === "completed" ? "เสร็จแล้ว" : "กำลังทำ"}
    </span>
  );
}
function Empty({ title, action }) {
  return (
    <div className="px-5 py-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#a1a5a6]">
        เพิ่มงานเพื่อเริ่มติดตามความคืบหน้า
      </p>
      <button className={`${btn} mt-4`} onClick={action}>
        เพิ่มงานแรก
      </button>
    </div>
  );
}
function JobCard({ job, onDetail, onEdit, onUpdate }) {
  const gems = job.service === 'gem_farm' ? job.updates.reduce((sum, item) => sum + (Number(item.gemsEarned) || 0), 0) : 0;
  const oreTotals = job.updates.reduce((totals, entry) => {
    for (const log of entry.oreLogs || []) totals[log.oreType] = (totals[log.oreType] || 0) + (Number(log.earned) || 0);
    return totals;
  }, {});
  const progress = job.targetGems ? Math.min(100, Math.round((gems / job.targetGems) * 100)) : 0;
  const reportDates = [...new Set(job.updates.map((item) => item.date).filter(Boolean))].sort();
  const detail = job.service === 'gem_farm'
    ? gems.toLocaleString('th-TH') + ' / ' + job.targetGems.toLocaleString('th-TH') + ' ' + currency[job.game] + ' (' + progress + '%)'
    : job.service === 'ore_farm'
      ? `ครบเป้า ${job.oreTypes.filter((type) => Number(job.oreTargets?.[type]) > 0 && (oreTotals[type] || 0) >= Number(job.oreTargets[type])).length}/${job.oreTypes.length} ชนิด · ${reportDates.length} วัน`
      : job.service === 'world_quest' || job.service === 'story_quest'
        ? `${job.updates.reduce((sum, entry) => sum + (Number(entry.questsCompleted) || 0), 0)} / ${job.targetQuests} เควส`
      : job.durationDays + ' วัน · บันทึกแล้ว ' + reportDates.length + ' วัน';
  const description = [job.client || 'ไม่ระบุลูกค้า', dateText(job.date), detail].join(' · ');
  return (
    <div id={'job-' + job.id} className='overflow-hidden rounded-xl border border-[#292c2f] bg-[#141618] transition hover:border-[#4a4e42]' onClick={(event) => {
      if (event.target.closest('a')) { event.preventDefault(); onDetail(); }
    }}>
      <HorizontalCard
        image={job.game === 'genshin' ? genshinIcon : wuwaIcon}
        imageAlt={games[job.game]}
        label={job.status === 'completed' ? 'เสร็จแล้ว' : 'กำลังทำ'}
        title={job.title}
        description={description}
        price={money(job.agreedAmount)}
        actionLabel='ดูรายละเอียด'
        href={'#job-' + job.id}
        className='!max-w-none !rounded-none !border-0 !shadow-none'
      />
      {job.service === 'gem_farm' && (
        <div className='flex items-center gap-2 px-4 pt-1'>
          <div className='h-1 flex-1 rounded-full bg-[#2c3032]'><div className='h-full rounded-full bg-[#a9b08d]' style={{ width: progress + '%' }} /></div>
          <span className='text-[10px] tabular-nums text-[#a1a5a6]'>{progress}%</span>
        </div>
      )}
      <div className='mx-4 mt-3 border-t border-[#2a2d30] py-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <span className='text-xs text-[#a1a5a6]'>บันทึกแล้ว {reportDates.length} วัน</span>
          {reportDates.length ? (
            <div className='flex flex-wrap gap-1.5' aria-label={`รายงาน ${reportDates.length} วัน`}>
              {reportDates.slice(-5).map((date) => (
                <time key={date} dateTime={date} className='rounded-md border border-[#34383a] px-2 py-1 text-[10px] tabular-nums text-[#deded9]'>
                  {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`))}
                </time>
              ))}
            </div>
          ) : <span className='text-xs text-[#848889]'>ยังไม่มีบันทึก</span>}
        </div>
      </div>
      <div className='flex gap-2 px-4 pb-4'>
        <button onClick={onUpdate} className='flex-1 rounded-lg border border-[#34383a] bg-[#1b1e20] px-2 py-2 text-xs text-[#deded9] transition hover:bg-[#222526]'>บันทึกรายวัน</button>
        <button onClick={onEdit} className={btn + ' px-3 py-2 text-xs'}>แก้ไข</button>
      </div>
    </div>
  );
}
function Modal({ title, close, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto max-h-[calc(100dvh-1.5rem)] w-full ${wide ? "max-w-2xl" : "max-w-lg"} overscroll-contain overflow-y-auto rounded-2xl border border-[#34383a] bg-[#141618] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] md:p-6`}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={close}
            className="rounded px-2 text-xl text-[#a1a5a6] hover:bg-[#222526]"
            aria-label="ปิด"
          >
            ปิด
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
    customerConditions: job?.customerConditions || "",
    agreedAmount: job?.agreedAmount ?? "",
    targetGems: job?.targetGems || "",
    targetQuests: job?.targetQuests || "",
    oreTypes: job?.oreTypes || [],
    oreTargets: job?.oreTargets || {},
    durationDays: job?.durationDays || "",
    status: job?.status || "active",
    date: job?.date || today(),
  }));
  const [formError, setFormError] = useState("");
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const input = (label, key, props = {}) => (
    <label className="block text-sm text-[#adb0b0]">
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
          if (form.service === "ore_farm") {
            if (!form.oreTypes.length) {
              setFormError("เลือกแร่ที่รับฟาร์มอย่างน้อย 1 ชนิด");
              return;
            }
            if (form.oreTypes.some((oreType) => {
              const target = Number(form.oreTargets[oreType]);
              return !Number.isInteger(target) || target < 1;
            })) {
              setFormError("ใส่เป้าหมายเป็นจำนวนเต็มอย่างน้อย 1 สำหรับแร่ที่เลือกทุกชนิด");
              return;
            }
          }
          if (["world_quest", "story_quest"].includes(form.service) && (!Number.isInteger(Number(form.targetQuests)) || Number(form.targetQuests) < 1)) {
            setFormError("ระบุจำนวนเควสเป้าหมายอย่างน้อย 1 เควส");
            return;
          }
          save({
            ...form,
            customerConditions: form.customerConditions.trim(),
            targetGems:
              form.service === "gem_farm" ? Number(form.targetGems) : 0,
            targetQuests: ["world_quest", "story_quest"].includes(form.service) ? Number(form.targetQuests) : 0,
            oreTypes: form.service === "ore_farm" ? form.oreTypes : [],
            oreTargets: form.service === "ore_farm"
              ? Object.fromEntries(form.oreTypes.map((oreType) => [oreType, Number(form.oreTargets[oreType])]))
              : {},
            durationDays:
              form.service === "account_care" ? Number(form.durationDays) : 0,
            agreedAmount: Number(form.agreedAmount),
          });
        }}
      >
        <label className="block text-sm text-[#adb0b0]">
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
          <label className="text-sm text-[#adb0b0]">
            เกม
            <select
              className={field}
              value={form.game}
              onChange={(e) => {
                set("game", e.target.value);
                if (e.target.value !== "genshin" && ["ore_farm", "world_quest", "story_quest"].includes(form.service)) {
                  set("service", "gem_farm");
                  set("oreTypes", []);
                  set("oreTargets", {});
                }
              }}
            >
              <option value="genshin">Genshin Impact</option>
              <option value="wuwa">Wuthering Waves</option>
            </select>
          </label>
          <label className="text-sm text-[#adb0b0]">
            ประเภทงาน
            <select
              className={field}
              value={form.service}
              onChange={(e) => {
                setFormError("");
                set("service", e.target.value);
              }}
            >
              <option value="gem_farm">ฟาร์มเจม</option>
              {form.game === "genshin" && <>
                <option value="ore_farm">ฟาร์มแร่</option>
                <option value="world_quest">เควสโลก</option>
                <option value="story_quest">เควสเทพ / เควสตัวละคร</option>
              </>}
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
          <label className="block text-sm text-[#adb0b0]">
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
              <small className="text-xs text-[#929697]">
                ค่าจ้างกำหนดตอนเพิ่มงานและแก้ไขไม่ได้
              </small>
            )}
          </label>
        </div>
        <label className="block text-sm text-[#adb0b0]">
          เงื่อนไขของลูกค้า
          <textarea
            className={`${field} min-h-24 resize-y`}
            maxLength={1000}
            rows={3}
            value={form.customerConditions}
            onChange={(e) => set("customerConditions", e.target.value)}
            placeholder="เช่น งานที่ต้องทำเป็นพิเศษ หรือข้อตกลงในการส่งมอบ"
          />
          <small className="text-xs text-[#929697]">ไม่เกิน 1,000 ตัวอักษร</small>
        </label>
        {form.service === "gem_farm"
          ? input("เป้าหมายเจม / แอสไตรต์", "targetGems", {
              type: "number",
              min: 1,
              step: 1,
              required: true,
            })
          : ["world_quest", "story_quest"].includes(form.service)
            ? <>
                {input("จำนวนเควสทั้งหมดตามที่ตกลง", "targetQuests", {
                  type: "number",
                  min: 1,
                  step: 1,
                  required: true,
                  placeholder: "เช่น 12",
                })}
                {formError && <p role="alert" className="text-xs text-[#dfa197]">{formError}</p>}
              </>
          : form.service === "ore_farm" ? (
            <fieldset className="grid gap-2">
              <legend className="text-sm text-[#adb0b0]">แร่ที่ลูกค้าจ้างให้ฟาร์ม</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ores.map(([value, label]) => (
                  <div key={value} className="grid grid-cols-[1fr_7rem] items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-[#deded9]">
                      <input
                        type="checkbox"
                        checked={form.oreTypes.includes(value)}
                        onChange={(e) => {
                          setFormError("");
                          set("oreTypes", e.target.checked
                            ? [...form.oreTypes, value]
                            : form.oreTypes.filter((item) => item !== value));
                          if (!e.target.checked) {
                            const nextTargets = { ...form.oreTargets };
                            delete nextTargets[value];
                            set("oreTargets", nextTargets);
                          }
                        }}
                        className="accent-[#a9b08d]"
                      />
                      {label}
                    </label>
                    {form.oreTypes.includes(value) && (
                      <label className="text-xs text-[#a1a5a6]">
                        เป้าหมาย
                        <input
                          className={field}
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={form.oreTargets[value] ?? ""}
                          onChange={(e) => set("oreTargets", { ...form.oreTargets, [value]: e.target.value })}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              {formError && <p role="alert" className="text-xs text-[#dfa197]">{formError}</p>}
            </fieldset>
          ) : input("ระยะเวลางาน (วัน)", "durationDays", {
              type: "number",
              min: 1,
              step: 1,
              required: true,
            })}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-[#adb0b0]">
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
            className="rounded-lg bg-[#a9b08d] px-4 py-2 text-sm font-semibold text-[#11130e] disabled:opacity-60"
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
    questsCompleted: "",
    note: "",
    date: today(),
  });
  const [checks, setChecks] = useState({});
  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const gem = job.service === "gem_farm";
  const oreFarm = job.service === "ore_farm";
  const questFarm = job.service === "world_quest" || job.service === "story_quest";
  const oreValues = Object.fromEntries(job.oreTypes.map((type) => {
    const previous = [...job.updates].reverse().find((entry) => entry.oreLogs?.some((log) => log.oreType === type));
    return [type, { start: previous?.oreLogs?.find((log) => log.oreType === type)?.end ?? 0, end: "" }];
  }));
  const [oreCounts, setOreCounts] = useState(oreValues);
  return (
    <Modal
      title={gem ? "บันทึกยอดฟาร์มรายวัน" : oreFarm ? "บันทึกจำนวนแร่รายวัน" : questFarm ? "บันทึกจำนวนเควสรายวัน" : "เช็กลิสต์ดูแลไอดีรายวัน"}
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
          } else if (oreFarm) {
            const oreLogs = job.oreTypes.map((oreType) => {
              const start = Number(oreCounts[oreType]?.start);
              const end = Number(oreCounts[oreType]?.end);
              return { oreType, start, end, earned: end - start };
            });
            if (oreLogs.some(({ start, end }) => !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start)) return;
            entry.oreLogs = oreLogs;
          } else if (questFarm) {
            const count = Number(values.questsCompleted);
            if (!Number.isInteger(count) || count < 1) return;
            entry.questsCompleted = count;
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
              <label key={key} className="text-sm text-[#adb0b0]">
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
        ) : oreFarm ? (
          <div className="grid gap-3">
            {job.oreTypes.map((oreType) => {
              const label = ores.find(([value]) => value === oreType)?.[1] || oreType;
              return (
                <fieldset key={oreType} className="grid grid-cols-2 gap-3 rounded-lg border border-[#2c3032] p-3">
                  <legend className="px-1 text-sm text-[#deded9]">{label}</legend>
                  {[["start", "เริ่มต้น"], ["end", "สิ้นวัน"]].map(([key, text]) => (
                    <label key={key} className="text-sm text-[#adb0b0]">
                      {text}
                      <input className={field} type="number" min={key === "end" ? oreCounts[oreType].start : 0} step="1" required value={oreCounts[oreType][key]} onChange={(e) => setOreCounts((prev) => ({ ...prev, [oreType]: { ...prev[oreType], [key]: e.target.value } }))} />
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
        ) : questFarm ? (
          <label className="text-sm text-[#adb0b0]">
            จำนวนเควสที่ทำวันนี้ (เป้าหมาย {job.targetQuests} เควส)
            <input className={field} type="number" min="1" step="1" required value={values.questsCompleted} onChange={(e) => set("questsCompleted", e.target.value)} />
          </label>
        ) : (
          <div className="rounded-xl border border-[#2c3032] bg-[#181a1c] p-4">
            <p className="mb-3 text-sm text-[#adb0b0]">
              เช็กลิสต์วันนี้{" "}
              <span className="float-right">
                {Object.values(checks).filter(Boolean).length}/
                {tasksFor(job.game).length}
              </span>
            </p>
            {tasksFor(job.game).map((task, i) => (
              <label
                key={task}
                className="flex items-center gap-3 border-t border-[#292c2f] py-2.5 text-sm text-[#deded9]"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checks[i])}
                  onChange={(e) =>
                    setChecks((prev) => ({ ...prev, [i]: e.target.checked }))
                  }
                  className="accent-[#a9b08d]"
                />
                {task}
              </label>
            ))}
          </div>
        )}
        <label className="text-sm text-[#adb0b0]">
          รายละเอียดเพิ่มเติม
          <input
            className={field}
            maxLength="120"
            value={values.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
          />
        </label>
        <label className="text-sm text-[#adb0b0]">
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
            className="rounded-lg bg-[#a9b08d] px-4 py-2 text-sm font-semibold text-[#11130e]"
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
  const oreFarm = job.service === "ore_farm";
  const questFarm = job.service === "world_quest" || job.service === "story_quest";
  const reportedDays = new Set(job.updates.map((entry) => entry.date).filter(Boolean)).size;
  const gems = job.updates.reduce(
    (sum, entry) => sum + (Number(entry.gemsEarned) || 0),
    0,
  );
  const oreTotals = job.updates.reduce((totals, entry) => {
    for (const log of entry.oreLogs || []) totals[log.oreType] = (totals[log.oreType] || 0) + (Number(log.earned) || 0);
    return totals;
  }, {});
  const completedQuests = job.updates.reduce(
    (sum, entry) => sum + (Number(entry.questsCompleted) || 0),
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
      <p className="-mt-3 mb-4 text-sm text-[#a1a5a6]">
        {games[job.game]} · {job.client || "ไม่ระบุลูกค้า"} ·{" "}
        {job.status === "completed" ? "เสร็จแล้ว" : "กำลังทำ"}
      </p>
      <div className="rounded-xl border border-[#34383a] bg-[#191b1d] p-4">
        <p className="text-xs text-[#a1a5a6]">
          {job.status === "completed" ? "รายได้ที่นับแล้ว" : "รายได้หลังปิดงาน"}
        </p>
        <strong className="mt-1 block text-2xl text-[#d0d6c3]">
          {money(job.status === "completed" ? job.agreedAmount : 0)}
        </strong>
      </div>
      <p className="mt-3 text-sm text-[#a1a5a6]">
        ค่าจ้างที่ตกลง: {money(job.agreedAmount)}
      </p>
      <section className="mt-4 rounded-xl border border-[#2c3032] bg-[#181a1c] p-4">
        <h3 className="text-xs font-medium text-[#a1a5a6]">เงื่อนไขของลูกค้า</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#deded9]">
          {job.customerConditions?.trim() || "ไม่มีเงื่อนไขเพิ่มเติม"}
        </p>
      </section>
      <p className="mt-1 text-sm text-[#a1a5a6]">
        {gem
          ? `ฟาร์มแล้ว ${gems.toLocaleString("th-TH")} / ${job.targetGems.toLocaleString("th-TH")} ${currency[job.game]}`
          : oreFarm ? `ครบเป้า ${job.oreTypes.filter((type) => Number(job.oreTargets?.[type]) > 0 && (oreTotals[type] || 0) >= Number(job.oreTargets[type])).length}/${job.oreTypes.length} ชนิด · บันทึกแล้ว ${reportedDays} วัน`
            : questFarm ? `ทำแล้ว ${completedQuests.toLocaleString("th-TH")} / ${job.targetQuests.toLocaleString("th-TH")} เควส`
            : `บันทึกดูแลแล้ว ${reportedDays} วัน · ระยะเวลางาน ${job.durationDays} วัน`}
      </p>
      <h3 className="mb-3 mt-5 font-semibold">
        {gem ? "ประวัติยอดฟาร์มรายวัน" : oreFarm ? "ประวัติฟาร์มแร่รายวัน" : questFarm ? "ประวัติการทำเควส" : "ปฏิทินเช็กลิสต์รายวัน"}
      </h3>
      {gem ? (
        <div className="max-h-64 space-y-2 overflow-auto">
          {[...job.updates]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className="rounded-lg border border-[#2c3032] p-3 text-sm"
              >
                <strong>
                  {dateText(entry.date)} · +
                  {Number(entry.gemsEarned || 0).toLocaleString("th-TH")}{" "}
                  {currency[job.game]} · +{Number(entry.rollsEarned || 0)} โรล
                </strong>
                <p className="mt-1 text-xs text-[#a1a5a6]">
                  {entry.currencyStart} → {entry.currencyEnd}{" "}
                  {currency[job.game]} · {entry.rollsStart} → {entry.rollsEnd}{" "}
                  โรล {entry.note && `· ${entry.note}`}
                </p>
              </div>
            ))}
          {!job.updates.length && (
            <p className="text-sm text-[#a1a5a6]">ยังไม่มีรายการบันทึก</p>
          )}
        </div>
      ) : oreFarm ? (
        <div className="grid gap-3">
          <ul className="grid gap-1 rounded-lg border border-[#2c3032] p-3 text-xs text-[#a1a5a6] sm:grid-cols-2">
            {job.oreTypes.map((type) => (
              <li key={type}>
                {ores.find(([value]) => value === type)?.[1] || type}: {(oreTotals[type] || 0).toLocaleString("th-TH")} / {Number(job.oreTargets?.[type] || 0).toLocaleString("th-TH")}
              </li>
            ))}
          </ul>
          <div className="max-h-64 space-y-2 overflow-auto">
            {[...job.updates].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
            <div key={`${entry.date}-${i}`} className="rounded-lg border border-[#2c3032] p-3 text-sm">
              <strong>{dateText(entry.date)}</strong>
              <ul className="mt-2 grid gap-1 text-xs text-[#a1a5a6] sm:grid-cols-2">
                {(entry.oreLogs || []).map((log) => (
                  <li key={log.oreType}>{ores.find(([value]) => value === log.oreType)?.[1] || log.oreType}: {log.start} → {log.end} · +{log.earned}</li>
                ))}
              </ul>
              {entry.note && <p className="mt-2 text-xs text-[#a1a5a6]">{entry.note}</p>}
            </div>
          ))}
          {!job.updates.length && <p className="text-sm text-[#a1a5a6]">ยังไม่มีรายการบันทึก</p>}
          </div>
        </div>
      ) : questFarm ? (
        <div className="max-h-64 space-y-2 overflow-auto">
          {[...job.updates].sort((a, b) => b.date.localeCompare(a.date)).map((entry, i) => (
            <div key={`${entry.date}-${i}`} className="rounded-lg border border-[#2c3032] p-3 text-sm">
              <strong>{dateText(entry.date)} · +{Number(entry.questsCompleted || 0).toLocaleString("th-TH")} เควส</strong>
              {entry.note && <p className="mt-1 text-xs text-[#a1a5a6]">{entry.note}</p>}
            </div>
          ))}
          {!job.updates.length && <p className="text-sm text-[#a1a5a6]">ยังไม่มีรายการบันทึก</p>}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[#2c3032] p-3">
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
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#a1a5a6]">
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
                    className={`flex min-h-10 flex-col items-center justify-center rounded-md text-xs ${careDate === date ? "bg-[#343a2a] text-[#e1e6d1]" : records.length ? "border border-[#3b4033] bg-[#191b1d]" : "text-[#deded9] hover:bg-[#222526]"}`}
                  >
                    {i + 1}
                    {records.length > 0 && (
                      <small className="text-[9px] text-[#c5cdb0]">
                        {done}/{checks.length}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-[#2c3032] p-3">
            <strong className="text-sm">{dateText(careDate)}</strong>
            {selectedEntries.length ? (
              selectedEntries.map((entry, i) => (
                <div key={i} className="mt-2">
                  <p className="text-xs text-[#c5cdb0]">
                    {entry.checklist.filter((item) => item.done).length}/
                    {entry.checklist.length} รายการ
                  </p>
                  {entry.note && (
                    <p className="text-xs text-[#a1a5a6]">{entry.note}</p>
                  )}
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {entry.checklist.map((item) => (
                      <li
                        key={item.label}
                        className={`text-xs ${item.done ? "text-[#d0d6c3]" : "text-[#929697]"}`}
                      >
                        {item.done ? "✓" : "·"} {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="mt-2 text-xs text-[#a1a5a6]">ไม่มีบันทึกในวันนี้</p>
            )}
          </div>
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          className="rounded-lg border border-[#57352f] bg-[#251918] px-3 py-2 text-sm text-[#dfa197]"
          onClick={onDelete}
        >
          ลบงาน
        </button>
        <button className={btn} onClick={onEdit}>
          แก้ไขงาน
        </button>
        <button
          className="rounded-lg bg-[#a9b08d] px-3 py-2 text-sm font-semibold text-[#11130e]"
          onClick={onUpdate}
        >
          {gem ? "บันทึกยอดวันนี้" : oreFarm ? "บันทึกจำนวนแร่วันนี้" : questFarm ? "บันทึกจำนวนเควสวันนี้" : "เช็กลิสต์วันนี้"}
        </button>
      </div>
    </Modal>
  );
}

function Auth({ client, authMode, setAuthMode, message, setMessage }) {
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  return (
    <main className="grid min-h-screen place-items-center bg-[#090a0b] px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-[#2c3032] bg-[#141618] p-6 md:p-8">
        <BrandAuth />
        <h1 className="mt-8 text-2xl font-semibold">
          {authMode === "signin" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
        </h1>
        <p className="mt-2 text-sm text-[#a1a5a6]">
          ลงชื่อเข้าใช้เพื่อดูแลและบันทึกข้อมูลงานของคุณ
        </p>
        {!client && (
          <p className="mt-4 rounded-lg bg-[#29241b] p-3 text-sm text-[#d7c18f]">
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
          <label className="text-sm text-[#adb0b0]">
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
          <label className="text-sm text-[#adb0b0]">
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
            className="rounded-lg bg-[#a9b08d] py-3 text-sm font-semibold text-[#11130e] disabled:opacity-60"
          >
            {busy
              ? "กำลังดำเนินการ…"
              : authMode === "signin"
                ? "เข้าสู่ระบบ"
                : "สมัครใช้งาน"}
          </button>
        </form>
        <button
          className="mt-4 w-full text-sm text-[#cad2b2]"
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
          className="mt-3 min-h-5 text-center text-sm text-[#deded9]"
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
      <span>
        Farmnote
        <small className="block text-[9px] font-medium tracking-[.13em] text-[#929697]">
          บันทึกงานฟาร์ม
        </small>
      </span>
    </a>
  );
}

export default App;
