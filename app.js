const STORAGE_KEY = 'farmnote-jobs-v1';
const games = { genshin: 'Genshin Impact', wuwa: 'Wuthering Waves' };
const dateToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const money = amount => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(amount || 0);
const configured = Boolean(window.FARMNOTE_CONFIG?.url && window.FARMNOTE_CONFIG?.publishableKey && window.supabase?.createClient);
const supabaseClient = configured ? window.supabase.createClient(window.FARMNOTE_CONFIG.url, window.FARMNOTE_CONFIG.publishableKey) : null;
let jobs = [], currentUser = null, authMode = 'signin', currentPage = 'dashboard', currentStatus = 'all', selectedJobId = null, editingJobId = null, selectedMonth = null, toastTimer;
const save = async job => {
  const { error } = await supabaseClient.from('farm_jobs').upsert({id:job.id,owner_id:currentUser.id,game:job.game,title:job.title,client:job.client,status:job.status,job_date:job.date,updates:job.updates,updated_at:new Date().toISOString()});
  if (error) throw error;
};
const fromRow = row => ({id:row.id,game:row.game,title:row.title,client:row.client||'',status:row.status,date:row.job_date,updatedAt:row.updated_at,updates:Array.isArray(row.updates)?row.updates:[]});
async function loadJobs() {
  const {data,error}=await supabaseClient.from('farm_jobs').select('*').order('updated_at',{ascending:false});
  if(error){showToast(`โหลดข้อมูลงานไม่สำเร็จ: ${error.message}`);return;}
  jobs=data.map(fromRow);render();
}
const byId = id => jobs.find(job => job.id === id);
const income = job => job.updates.reduce((sum, entry) => sum + (Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : 0), 0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
const formatDate = value => value ? new Intl.DateTimeFormat('th-TH', { day:'numeric', month:'short', year:'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';
const monthKey = value => value?.slice(0, 7);

function render() {
  const now = new Date(), thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const months = [...new Set([thisMonth, ...jobs.flatMap(job=>job.updates.map(entry=>monthKey(entry.date)).filter(key=>/^\d{4}-\d{2}$/.test(key)))])].sort().reverse();
  if (!months.includes(selectedMonth)) selectedMonth = thisMonth;
  const monthSelect = document.querySelector('#month-select');
  monthSelect.innerHTML = months.map(key=>`<option value="${key}">${new Intl.DateTimeFormat('th-TH',{month:'short',year:'numeric'}).format(new Date(`${key}-01T00:00:00`))}</option>`).join('');
  monthSelect.value = selectedMonth;
  const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthLabel = new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(monthDate);
  const monthIncome = jobs.flatMap(job => job.updates).filter(entry => monthKey(entry.date) === selectedMonth).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  document.querySelector('#month-income').textContent = money(monthIncome);
  document.querySelector('#month-caption').textContent = monthLabel;
  document.querySelector('#note-month').textContent = monthLabel;
  document.querySelector('#active-count').textContent = jobs.filter(job => job.status === 'active').length;
  document.querySelector('#total-count').textContent = jobs.length;
  document.querySelector('#count-genshin').textContent = jobs.filter(job=>job.game==='genshin').length;
  document.querySelector('#count-wuwa').textContent = jobs.filter(job=>job.game==='wuwa').length;
  const recent = [...jobs].sort((a,b)=> (b.updatedAt||b.date).localeCompare(a.updatedAt||a.date)).slice(0,5);
  document.querySelector('#recent-jobs').innerHTML = recent.map(job=>`<tr><td><span class="job-name" data-detail="${esc(job.id)}">${esc(job.title)}</span></td><td><span class="game-pill ${job.game}">${esc(games[job.game])}</span></td><td>${esc(job.client||'—')}</td><td><span class="card-status ${job.status}">${job.status==='completed'?'✓ เสร็จแล้ว':'● กำลังทำ'}</span></td><td class="income-cell">${money(income(job))}</td><td><button class="row-menu" data-detail="${esc(job.id)}" aria-label="ดูรายละเอียด">···</button></td></tr>`).join('');
  document.querySelector('#dashboard-empty').classList.toggle('hidden', jobs.length > 0);
  document.querySelector('#recent-jobs').closest('.table-wrap').classList.toggle('hidden', jobs.length === 0);
  if (currentPage !== 'dashboard') renderGame();
}

function renderGame() {
  const gameJobs = jobs.filter(job=>job.game===currentPage).sort((a,b)=>(b.updatedAt||b.date).localeCompare(a.updatedAt||a.date));
  const filtered = currentStatus === 'all' ? gameJobs : gameJobs.filter(job=>job.status===currentStatus);
  document.querySelector('#game-count-all').textContent = gameJobs.length;
  document.querySelector('#game-count-active').textContent = gameJobs.filter(job=>job.status==='active').length;
  document.querySelector('#game-count-completed').textContent = gameJobs.filter(job=>job.status==='completed').length;
  document.querySelector('#job-grid').innerHTML = filtered.map(job=>`<article class="job-card"><div class="card-top"><span class="card-status ${job.status}">${job.status==='completed'?'✓ เสร็จแล้ว':'● กำลังทำ'}</span><button class="card-more" data-detail="${esc(job.id)}" aria-label="ดูรายละเอียด">···</button></div><h3 class="card-title" data-detail="${esc(job.id)}">${esc(job.title)}</h3><div class="card-meta"><span>${esc(job.client||'ไม่ระบุลูกค้า')}</span><span>·</span><span>${formatDate(job.date)}</span></div><div class="card-divider"></div><div class="card-income-row"><div><span class="card-income-label">รายได้รวม</span><strong class="card-income">${money(income(job))}</strong></div><span class="card-date">${job.updates.length} อัปเดต</span></div><div class="card-actions"><button class="card-action" data-update="${esc(job.id)}">＋ เพิ่มความคืบหน้า</button><button class="card-action" data-edit="${esc(job.id)}">แก้ไขงาน</button></div></article>`).join('');
  document.querySelector('#game-empty').classList.toggle('hidden', filtered.length>0);
  document.querySelector('#job-grid').classList.toggle('hidden', filtered.length===0);
}

function navigate(page) {
  currentPage=page; currentStatus='all';
  document.querySelectorAll('.nav-link').forEach(button=>button.classList.toggle('active',button.dataset.page===page));
  document.querySelector('#dashboard-page').classList.toggle('hidden',page!=='dashboard');
  document.querySelector('#game-page').classList.toggle('hidden',page==='dashboard');
  document.querySelector('#breadcrumb-current').textContent=page==='dashboard'?'ภาพรวม':games[page];
  if(page!=='dashboard') { document.querySelector('#game-title').textContent=games[page]; document.querySelector('#game-subtitle').textContent=`จัดการงานและติดตามความคืบหน้า · ${games[page]}`; document.querySelectorAll('.filter-tab').forEach(tab=>tab.classList.toggle('selected',tab.dataset.status==='all')); renderGame(); }
}

function showToast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
function openJob(id) { editingJobId=id||null; const form=document.querySelector('#job-form'); form.reset(); const job=id&&byId(id); document.querySelector('#dialog-title').textContent=job?'แก้ไขงาน':'เพิ่มงานใหม่'; form.elements.date.value=job?.date||dateToday(); if(job){form.elements.title.value=job.title;form.elements.game.value=job.game;form.elements.client.value=job.client||'';form.elements.status.value=job.status;} document.querySelector('#job-dialog').showModal(); }
function openUpdate(id) { selectedJobId=id; const job=byId(id); if(!job)return; document.querySelector('#update-form').reset(); document.querySelector('#update-form').elements.date.value=dateToday(); document.querySelector('#update-job-title').textContent=job.title; document.querySelector('#update-dialog').showModal(); }
function openDetail(id) { const job=byId(id); if(!job)return; selectedJobId=id; document.querySelector('#detail-title').textContent=job.title; document.querySelector('#detail-meta').textContent=`${games[job.game]} · ${job.client||'ไม่ระบุลูกค้า'} · ${job.status==='completed'?'เสร็จแล้ว':'กำลังทำ'}`; document.querySelector('#detail-total').textContent=money(income(job)); document.querySelector('#history-list').innerHTML=job.updates.length?[...job.updates].sort((a,b)=>b.date.localeCompare(a.date)).map(entry=>`<div class="history-entry"><strong>${esc(entry.note)}</strong><p>${formatDate(entry.date)}</p><span>+ ${money(Number(entry.amount)||0)}</span></div>`).join(''):'<div class="history-empty">ยังไม่มีรายการความคืบหน้า</div>'; document.querySelector('#detail-dialog').showModal(); }

document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.goto)));
document.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',()=>{currentStatus=button.dataset.status;document.querySelectorAll('[data-status]').forEach(tab=>tab.classList.toggle('selected',tab===button));renderGame();}));
document.querySelector('#month-select').addEventListener('change',event=>{selectedMonth=event.target.value;render();});
document.querySelector('#add-job-main').addEventListener('click',()=>openJob());
document.querySelector('#add-job-empty').addEventListener('click',()=>openJob());
document.querySelector('#add-job-game').addEventListener('click',()=>openJob());
document.querySelector('#add-job-game-empty').addEventListener('click',()=>openJob());
document.querySelector('#close-dialog').addEventListener('click',()=>document.querySelector('#job-dialog').close());
document.querySelector('#cancel-dialog').addEventListener('click',()=>document.querySelector('#job-dialog').close());
document.querySelector('#job-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget.elements;const title=form.title.value.trim();if(!title)return;const previous=editingJobId?{...byId(editingJobId)}:null;const job=editingJobId?byId(editingJobId):{id:crypto.randomUUID(),updates:[]};Object.assign(job,{title,game:form.game.value,client:form.client.value.trim(),status:form.status.value,date:form.date.value,updatedAt:new Date().toISOString()});if(!editingJobId)jobs.unshift(job);try{await save(job);render();document.querySelector('#job-dialog').close();showToast(editingJobId?'อัปเดตข้อมูลงานแล้ว':'เพิ่มงานใหม่แล้ว');}catch(error){if(editingJobId)Object.assign(job,previous);else jobs=jobs.filter(item=>item.id!==job.id);showToast(`บันทึกไม่สำเร็จ: ${error.message}`);}});
document.querySelectorAll('[data-close-update]').forEach(button=>button.addEventListener('click',()=>document.querySelector('#update-dialog').close()));
document.querySelector('#update-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget.elements, amount=Number(form.amount.value),job=byId(selectedJobId);if(!job||!Number.isFinite(amount)||amount<0){showToast('กรุณากรอกรายได้เป็นจำนวนที่ถูกต้อง');return;}const entry={note:form.note.value.trim(),amount,date:form.date.value};job.updates.push(entry);job.updatedAt=new Date().toISOString();try{await save(job);render();document.querySelector('#update-dialog').close();showToast('บันทึกความคืบหน้าแล้ว');}catch(error){job.updates.pop();showToast(`บันทึกไม่สำเร็จ: ${error.message}`);}});
document.querySelectorAll('[data-close-detail]').forEach(button=>button.addEventListener('click',()=>document.querySelector('#detail-dialog').close()));
document.querySelector('#edit-job').addEventListener('click',()=>{const id=selectedJobId;document.querySelector('#detail-dialog').close();openJob(id);});
document.querySelector('#update-job').addEventListener('click',()=>{const id=selectedJobId;document.querySelector('#detail-dialog').close();openUpdate(id);});
document.addEventListener('click',event=>{const detail=event.target.closest('[data-detail]'), edit=event.target.closest('[data-edit]'), update=event.target.closest('[data-update]');if(detail)openDetail(detail.dataset.detail);else if(edit)openJob(edit.dataset.edit);else if(update)openUpdate(update.dataset.update);});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));

// Keep month grouping easy to verify in the console.
console.assert(monthKey('2026-11-05')==='2026-11' && monthKey('2026-10-31')!=='2026-11','Month totals must use the update date.');
document.querySelector('#today-label').textContent=new Intl.DateTimeFormat('th-TH',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());

document.querySelector('#auth-form').addEventListener('submit',async event=>{event.preventDefault();if(!supabaseClient)return;const fields=event.currentTarget.elements,message=document.querySelector('#auth-message');message.textContent='กำลังเชื่อมต่อ…';const credentials={email:fields.email.value.trim(),password:fields.password.value};const result=authMode==='signin'?await supabaseClient.auth.signInWithPassword(credentials):await supabaseClient.auth.signUp({...credentials,options:{emailRedirectTo:new URL('./',window.location.href).href}});if(result.error){message.textContent=result.error.message;return;}if(authMode==='signup'&&!result.data.session)message.textContent='สมัครแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';else message.textContent='';});
document.querySelector('#auth-switch').addEventListener('click',()=>{authMode=authMode==='signin'?'signup':'signin';document.querySelector('#auth-form button[type="submit"]').textContent=authMode==='signin'?'เข้าสู่ระบบ':'สมัครใช้งาน';document.querySelector('#auth-switch').textContent=authMode==='signin'?'ยังไม่มีบัญชี? สมัครใช้งาน':'มีบัญชีแล้ว? เข้าสู่ระบบ';document.querySelector('#auth-message').textContent='';});
document.querySelector('#signout-button').addEventListener('click',async()=>{const {error}=await supabaseClient.auth.signOut();if(error)showToast(`ออกจากระบบไม่สำเร็จ: ${error.message}`);});
(async()=>{
if(!configured)document.querySelector('#auth-setup').classList.remove('hidden');
else {
  supabaseClient.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;document.querySelector('#auth-screen').classList.toggle('hidden',Boolean(currentUser));document.querySelector('.app-shell').classList.toggle('hidden',!currentUser);document.querySelector('#account-email').textContent=currentUser?.email||'';if(currentUser)queueMicrotask(()=>loadJobs());else{jobs=[];render();}});
  const {data:{session}}=await supabaseClient.auth.getSession();
  currentUser=session?.user||null;
  if(currentUser){document.querySelector('#auth-screen').classList.add('hidden');document.querySelector('.app-shell').classList.remove('hidden');document.querySelector('#account-email').textContent=currentUser.email||'';await loadJobs();}
}
})();
