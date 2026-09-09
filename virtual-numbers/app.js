const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const configured = !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_ANON_KEY.startsWith('YOUR_');
const sb = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = id => document.getElementById(id);
const authCard = $('authCard'), dashboard = $('dashboard');

function msg(text){ $('authMsg').textContent = text; }
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function signIn(){
  if(!sb) return msg('Add your Supabase URL and anon key in app.js first.');
  const {error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value});
  msg(error?error.message:'Signed in.');
}
async function signUp(){
  if(!sb) return msg('Add your Supabase URL and anon key in app.js first.');
  const {error}=await sb.auth.signUp({email:$('email').value,password:$('password').value});
  msg(error?error.message:'Account created. Check your email if confirmation is enabled.');
}
async function loadNumbers(){
  if(!sb) return;
  const {data,error}=await sb.from('phone_numbers').select('id,phone_number,status,created_at').order('created_at',{ascending:false});
  if(error) return $('numbersList').textContent=error.message;
  $('numberCount').textContent=data.length;
  const list=$('numbersList'); list.className='list'; list.innerHTML=data.length?data.map(n=>`<div class="item" data-id="${n.id}"><strong>${escapeHtml(n.phone_number)}</strong><small>${escapeHtml(n.status||'active')}</small></div>`).join(''):'No numbers assigned yet.';
  list.querySelectorAll('.item').forEach(el=>el.onclick=()=>loadMessages(el.dataset.id));
}
async function loadMessages(numberId){
  const {data,error}=await sb.from('sms_messages').select('id,sender,body,received_at,read_at').eq('phone_number_id',numberId).order('received_at',{ascending:false}).limit(50);
  if(error) return $('messagesList').textContent=error.message;
  $('unreadCount').textContent=data.filter(x=>!x.read_at).length;
  const list=$('messagesList'); list.className='list'; list.innerHTML=data.length?data.map(m=>`<div class="item sms"><strong>${escapeHtml(m.sender||'Unknown sender')}</strong><p>${escapeHtml(m.body||'')}</p><span class="code">${m.body&&/^\d{4,8}$/.test(m.body.trim())?escapeHtml(m.body.trim()):''}</span><small>${new Date(m.received_at).toLocaleString()}</small></div>`).join(''):'No SMS messages yet.';
}
async function boot(){
  if(!sb) return;
  const {data:{session}}=await sb.auth.getSession(); render(session);
  sb.auth.onAuthStateChange((_event,s)=>render(s));
}
async function render(session){
  const signedIn=!!session; authCard.hidden=signedIn; dashboard.hidden=!signedIn; $('logoutBtn').hidden=!signedIn;
  if(signedIn) await loadNumbers();
}
$('signInBtn').onclick=signIn; $('signUpBtn').onclick=signUp; $('refreshBtn').onclick=loadNumbers;
$('logoutBtn').onclick=async()=>{if(sb) await sb.auth.signOut();};
boot();
