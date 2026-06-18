import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://asyoohmjfwcfzrydxykb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeW9vaG1qZndjZnpyeWR4eWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODA2NjAsImV4cCI6MjA5Njg1NjY2MH0.FOAZKbRGaYQpbCsYizpcNRCjfkPFp-WlljTnn2EZ7Qg";

async function sb(path, method="GET", body=null){
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": method==="POST" ? "return=representation" : method==="PATCH"||method==="DELETE" ? "return=representation" : "",
    }
  };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, opts);
  if(!r.ok){ const t=await r.text(); throw new Error(t); }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : [];
}

// Map DB row → app order
function dbToOrder(row, usersArr){
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    governorate: row.governorate||"",
    address: row.address,
    notes: row.notes||"",
    items: row.items||[],
    status: row.status,
    salesId: row.sales_id,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at||"",
    shippedBy: row.shipped_by,
    shippingCompany: row.shipping_company||"",
    shippedAt: row.shipped_at||"",
    deliveredAt: row.delivered_at||"",
    rejectReason: row.reject_reason||"",
    rejectNote: row.reject_note||"",
    rejectedAt: row.rejected_at||"",
    commission: parseFloat(row.commission)||0,
    commPaid: row.comm_paid||false,
    commSettings: row.comm_settings||{type:"percent",value:3},
    internalNotes: row.internal_notes||[],
    auditLog: row.audit_log||[],
    createdAt: row.created_at||"",
    lastActionAt: row.last_action_at||0,
    _createdTs: row._created_ts||0,
  };
}

// Map app order → DB row
function orderToDb(order){
  return {
    id: order.id,
    customer_name: order.customerName,
    phone: order.phone,
    governorate: order.governorate||"",
    address: order.address,
    notes: order.notes||"",
    items: order.items||[],
    status: order.status,
    sales_id: order.salesId||null,
    confirmed_by: order.confirmedBy||null,
    confirmed_at: order.confirmedAt||"",
    shipped_by: order.shippedBy||null,
    shipping_company: order.shippingCompany||"",
    shipped_at: order.shippedAt||"",
    delivered_at: order.deliveredAt||"",
    reject_reason: order.rejectReason||"",
    reject_note: order.rejectNote||"",
    rejected_at: order.rejectedAt||"",
    commission: order.commission||0,
    comm_paid: order.commPaid||false,
    comm_settings: order.commSettings||{type:"percent",value:3},
    internal_notes: order.internalNotes||[],
    audit_log: order.auditLog||[],
    created_at: order.createdAt||"",
    last_action_at: order.lastActionAt||0,
    _created_ts: order._createdTs||0,
  };
}

const INITIAL_USERS = [
  { id:1, name:"أحمد سالم",   username:"ahmed",   password:"1234",  roles:["sales"] },
  { id:2, name:"محمد علي",    username:"mohamed", password:"1234",  roles:["sales"] },
  { id:3, name:"سارة خالد",  username:"sara",    password:"1234",  roles:["supervisor"] },
  { id:4, name:"كريم حسن",   username:"karim",   password:"1234",  roles:["shipping"] },
  { id:5, name:"عمر — أدمن", username:"admin",   password:"admin", roles:["admin"] },
];
const INITIAL_SHIPPING = [
  { id:1, type:"company",  name:"بريد مصر",            phone:"" },
  { id:2, type:"company",  name:"Aramex",               phone:"" },
  { id:3, type:"company",  name:"J&T Express",          phone:"" },
  { id:4, type:"company",  name:"DHL",                  phone:"" },
  { id:5, type:"delegate", name:"محمد — مندوب داخلي",  phone:"01012345678" },
  { id:6, type:"delegate", name:"علي — مندوب داخلي",   phone:"01087654321" },
  { id:7, type:"other",    name:"استلام من الفرع",       phone:"" },
];
const INITIAL_PRODUCTS = [
  "مضخة سطحية 1HP","مضخة سطحية 1.5HP","مضخة سطحية 2HP",
  "غواطس عادية 0.5HP","غواطس عادية 1HP","غواطس أعماق 2HP",
  "غواطس ستانلس ستيل","غواطس Cast Iron","مضخة صرف صحي WQAS"
];
const EGYPT_GOVS = [
  "القاهرة","الجيزة","الإسكندرية","الدقهلية","البحيرة","الشرقية","المنوفية",
  "الغربية","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء",
  "جنوب سيناء","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر",
  "أسوان","البحر الأحمر","الوادي الجديد","مطروح"
];
const REJECTION_REASONS = ["العميل غير متواجد","العميل رفض الاستلام","المنتج تالف أثناء الشحن","خطأ في الطلب","سعر مختلف عن المتفق عليه","أخرى"];
const ALL_ROLES = [
  {value:"sales",      label:"مبيعات",  color:"#3b82f6", bg:"#dbeafe"},
  {value:"supervisor", label:"مشرف",    color:"#f59e0b", bg:"#fef3c7"},
  {value:"shipping",   label:"شحن",     color:"#8b5cf6", bg:"#ede9fe"},
  {value:"admin",      label:"أدمن",    color:"#ef4444", bg:"#fee2e2"},
];
const ROLE_DESC = {
  sales:"يسجل طلبات جديدة ويتابع طلباته",
  supervisor:"يؤكد الطلبات المعلقة",
  shipping:"يشحن ويسجل الاستلام أو الرفض",
  admin:"وصول كامل + تعديل أي أوردر + الإعدادات",
};
const STATUS_MAP = {
  pending:  {label:"في الانتظار",color:"#f59e0b",bg:"#fef3c7"},
  confirmed:{label:"مؤكد",       color:"#3b82f6",bg:"#dbeafe"},
  shipped:  {label:"تم الشحن",   color:"#8b5cf6",bg:"#ede9fe"},
  delivered:{label:"مُسلَّم",    color:"#10b981",bg:"#d1fae5"},
  rejected: {label:"مرتجع",      color:"#ef4444",bg:"#fee2e2"},
};

function genId(){return "HLM-"+Date.now().toString().slice(-6);}
function today(){return new Date().toLocaleDateString("ar-EG");}
function now(){return today()+" "+new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"});}
function hasRole(u,r){return u.roles?.includes(r)||u.roles?.includes("admin");}
function roleColor(roles=[]){const r=ALL_ROLES.find(x=>roles.includes(x.value));return r?r.color:"#64748b";}
function calcTotal(items){return items?.reduce((s,i)=>s+(parseFloat(i.price)||0)*(parseInt(i.qty)||1),0)||0;}
function calcComm(total,cs){if(!cs)return total*0.03;return cs.type==="fixed"?cs.value:total*(cs.value/100);}

function buildWAMessage(order,type,delegatePhone=""){
  const total=calcTotal(order.items).toLocaleString();
  const items=order.items?.map(i=>`• ${i.name} × ${i.qty}`).join("\n")||"";
  if(type==="confirmed") return `السلام عليكم ${order.customerName} 👋\n\n✅ تم تأكيد طلبك بنجاح!\n\n📋 رقم الطلب: ${order.id}\n📦 المنتجات:\n${items}\n💰 الإجمالي: ${total} ج.م\n\nسيتم التواصل معك قريباً لترتيب الشحن.\nهولمن — تكنولوجيا ألمانية 🇩🇪\nwww.holmenpump.com`;
  if(type==="shipped"){
    const shLine=delegatePhone?`📞 رقم المندوب: ${delegatePhone}`:`🚚 شركة الشحن: ${order.shippingCompany||"—"}`;
    return `السلام عليكم ${order.customerName} 👋\n\n🚚 طلبك في الطريق إليك!\n\n📋 رقم الطلب: ${order.id}\n📦 المنتجات:\n${items}\n${shLine}\n💰 الإجمالي: ${total} ج.م\n\nيرجى الاستعداد للاستلام.\nهولمن — ضمان 5 سنين ✅\nwww.holmenpump.com`;
  }
  return "";
}
function openWhatsApp(phone,message){
  const digits=phone?.replace(/\D/g,"")||"";
  const intl=digits.startsWith("0")?"2"+digits:digits;
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`,"_blank");
}

function printInvoice(order,users){
  const su=users.find(u=>u.id===order.salesId);
  const total=calcTotal(order.items);
  const stLabels={pending:"في الانتظار",confirmed:"مؤكد",shipped:"تم الشحن",delivered:"مُسلَّم",rejected:"مرتجع"};
  const stColors={pending:"#f59e0b",confirmed:"#3b82f6",shipped:"#8b5cf6",delivered:"#10b981",rejected:"#ef4444"};
  const rows=(order.items||[]).map((item,i)=>{
    const p=parseFloat(item.price)||0,q=parseInt(item.qty)||1;
    return `<tr style="background:${i%2===0?"#f8fafc":"#fff"}"><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9">${item.name||"-"}</td><td style="padding:10px 14px;text-align:center;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">${q}</td><td style="padding:10px 14px;text-align:center;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">${p.toLocaleString()} ج.م</td><td style="padding:10px 14px;text-align:left;font-size:13px;font-weight:700;color:#0f2744;border-bottom:1px solid #f1f5f9">${(p*q).toLocaleString()} ج.م</td></tr>`;
  }).join("");
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>فاتورة ${order.id}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f8fafc;padding:24px}.page{background:#fff;max-width:700px;margin:0 auto;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);overflow:hidden}.hdr{background:#0f2744;padding:24px 28px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:26px;font-weight:800;color:#fff}.logo-sub{font-size:11px;color:#94a3b8;margin-top:2px}.hdr-r{text-align:left;font-size:12px;color:#94a3b8}.hdr-r b{color:#fff;font-size:13px;display:block}.body{padding:28px}.top{display:flex;justify-content:space-between;margin-bottom:24px}.title{font-size:24px;font-weight:700;color:#0f2744}.badge{display:inline-block;padding:3px 12px;border-radius:16px;font-size:11px;font-weight:700;color:#fff;margin-top:6px;background:${stColors[order.status]||"#64748b"}}.meta{text-align:left;font-size:12px;color:#64748b;line-height:1.8}.meta b{color:#1e293b}.sec{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:8px;margin-top:20px}.info{background:#f8fafc;border-radius:8px;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.il{font-size:10px;color:#94a3b8;margin-bottom:2px}.iv{font-size:13px;color:#1e293b;font-weight:500}table{width:100%;border-collapse:collapse}th{background:#0f2744;color:#fff;padding:9px 14px;font-size:11px;text-align:right}th:last-child{text-align:left}.tot{background:#f0fdf4;padding:12px 16px;display:flex;justify-content:space-between;border-top:2px solid #0f2744}.tl{font-size:14px;font-weight:700;color:#15803d}.tv{font-size:18px;font-weight:800;color:#15803d}.comm{background:#fefce8;padding:9px 16px;display:flex;justify-content:space-between;border-top:1px solid #fef08a;font-size:12px;color:#92400e}.ftr{background:#0f2744;padding:14px;text-align:center;color:#94a3b8;font-size:11px}.btn{display:block;margin:16px auto 0;padding:11px 28px;background:#0f2744;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit}@media print{body{padding:0;background:#fff}.page{box-shadow:none;max-width:100%}.btn{display:none}}</style></head><body><div class="page"><div class="hdr"><div><div class="logo">HOLMEN</div><div class="logo-sub">Germany Technology 🇩🇪</div></div><div class="hdr-r"><b>holmenpump.com</b>ضمان 5 سنين</div></div><div class="body"><div class="top"><div><div class="title">فاتورة</div><span class="badge">${stLabels[order.status]||order.status}</span></div><div class="meta"><div><span>رقم الطلب: </span><b>${order.id}</b></div><div><span>التاريخ: </span><b>${order.createdAt||""}</b></div>${order.shippingCompany?`<div><span>الشحن: </span><b>${order.shippingCompany}</b></div>`:""}${su?`<div><span>المبيعات: </span><b>${su.name}</b></div>`:""}</div></div><div class="sec">بيانات العميل</div><div class="info"><div><div class="il">الاسم</div><div class="iv">${order.customerName||"-"}</div></div><div><div class="il">التليفون</div><div class="iv">${order.phone||"-"}</div></div>${order.governorate?`<div><div class="il">المحافظة</div><div class="iv">${order.governorate}</div></div>`:""}<div><div class="il">العنوان</div><div class="iv">${order.address||"-"}</div></div>${order.notes?`<div><div class="il">ملاحظات</div><div class="iv">${order.notes}</div></div>`:""}</div><div class="sec">المنتجات</div><table><thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:center">سعر الوحدة</th><th style="text-align:left">الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><div class="tot"><div class="tl">الإجمالي الكلي</div><div class="tv">${total.toLocaleString()} ج.م</div></div>${order.commission>0?`<div class="comm"><span>🏆 العمولة</span><span>${Math.round(order.commission).toLocaleString()} ج.م</span></div>`:""}</div><div class="ftr">Holmen — Germany Technology | www.holmenpump.com | جميع الحقوق محفوظة</div></div><button class="btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();}
  else alert("من فضلك اسمح للمتصفح بفتح نوافذ جديدة (Pop-up)");
}

export default function App(){
  const [users,setUsers]=useState([]);
  const [shipping,setShipping]=useState([]);
  const [products,setProducts]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [orders,setOrders]=useState([]);
  const [page,setPage]=useState("orders");
  const [toast,setToast]=useState(null);
  const [commSettings,setCommSettings]=useState({type:"percent",value:3});
  const [reminderSettings,setReminderSettings]=useState({pending:24,confirmed:12,shipped:48});
  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(null);

  // ── Load all data from Supabase on start
  useEffect(()=>{
    async function loadAll(){
      try{
        setLoading(true);
        const [u,s,p,o,sets]=await Promise.all([
          sb("users?select=*&order=id"),
          sb("shipping_options?select=*&order=id"),
          sb("products?select=*&order=id"),
          sb("orders?select=*&order=created_at.desc"),
          sb("settings?select=*"),
        ]);
        const loadedUsers = u.length > 0 ? u.map(x=>({...x,roles:x.roles||["sales"]})) : INITIAL_USERS;
        setUsers(loadedUsers);
        setShipping(s.length > 0 ? s : INITIAL_SHIPPING);
        setProducts(p.length > 0 ? p.map(x=>x.name) : INITIAL_PRODUCTS);
        setOrders(o.map(row=>dbToOrder(row,loadedUsers)));
        const cs=sets.find(x=>x.key==="comm_settings");
        const rs=sets.find(x=>x.key==="reminder_settings");
        if(cs)setCommSettings(cs.value);
        if(rs)setReminderSettings(rs.value);
        setDbError(null);
      }catch(e){
        setDbError("تعذر الاتصال بقاعدة البيانات: "+e.message);
      }finally{
        setLoading(false);
      }
    }
    loadAll();
  },[]);

  // ── Auto-sync every 10 seconds — sync across devices + notifications
  useEffect(()=>{
    if(!currentUser) return;
    const interval = setInterval(async ()=>{
      try{
        const o = await sb("orders?select=*&order=created_at.desc");
        setUsers(prev=>{
          const newOrders = o.map(row=>dbToOrder(row,prev));
          // Detect changes and create notifications
          setOrders(prevOrders=>{
            const newNotifs=[];
            newOrders.forEach(newO=>{
              const oldO=prevOrders.find(x=>x.id===newO.id);
              if(!oldO) return; // skip brand new orders in notification
              // Status changed
              if(oldO.status!==newO.status){
                newNotifs.push({id:Date.now()+Math.random(),orderId:newO.id,customerName:newO.customerName,text:`تغيرت حالة الأوردر إلى "${STATUS_MAP[newO.status]?.label}"`,time:now(),read:false});
              }
              // New internal note added
              const oldNotes=(oldO.internalNotes||[]).length;
              const newNotes=(newO.internalNotes||[]).length;
              if(newNotes>oldNotes){
                const lastNote=newO.internalNotes[newNotes-1];
                if(lastNote?.by!==currentUser?.name){
                  newNotifs.push({id:Date.now()+Math.random(),orderId:newO.id,customerName:newO.customerName,text:`ملاحظة جديدة من ${lastNote?.by}: "${lastNote?.text?.slice(0,40)}..."`,time:now(),read:false});
                }
              }
            });
            if(newNotifs.length>0) setNotifications(prev=>[...newNotifs,...prev].slice(0,50));
            return newOrders;
          });
          return prev;
        });
      }catch{}
    }, 10000);
    return ()=>clearInterval(interval);
  },[currentUser]);

  // ── Alert checker
  useEffect(()=>{
    function checkAlerts(){
      const now=Date.now();
      const newAlerts=[];
      orders.forEach(o=>{
        if(!["pending","confirmed","shipped"].includes(o.status))return;
        const limit=reminderSettings[o.status]||24;
        const created=o.lastActionAt||o._createdTs||now;
        const hoursElapsed=(now-created)/(1000*60*60);
        if(hoursElapsed>=limit) newAlerts.push({orderId:o.id,status:o.status,hours:Math.round(hoursElapsed),customerName:o.customerName,limit});
      });
      setAlerts(newAlerts);
    }
    checkAlerts();
    const interval=setInterval(checkAlerts,60000);
    return()=>clearInterval(interval);
  },[orders,reminderSettings]);

  // ── Supabase CRUD helpers exposed to child components
  async function dbAddOrder(order){
    try{
      const rows=await sb("orders","POST",orderToDb(order));
      const saved=rows[0]?dbToOrder(rows[0],users):order;
      setOrders(p=>[saved,...p]);
    }catch(e){ showToast("خطأ في حفظ الطلب: "+e.message,"error"); }
  }

  async function dbUpdateOrder(order){
    try{
      await sb("orders?id=eq."+order.id,"PATCH",orderToDb(order));
      setOrders(p=>p.map(o=>o.id===order.id?order:o));
    }catch(e){ showToast("خطأ في تحديث الطلب: "+e.message,"error"); }
  }

  async function dbAddUser(user){
    try{
      const rows=await sb("users","POST",{name:user.name,username:user.username,password:user.password,roles:user.roles});
      if(rows[0])setUsers(p=>[...p,{...rows[0],roles:rows[0].roles||["sales"]}]);
    }catch(e){ throw e; }
  }

  async function dbUpdateUser(user){
    try{
      await sb("users?id=eq."+user.id,"PATCH",{name:user.name,username:user.username,password:user.password,roles:user.roles});
      setUsers(p=>p.map(u=>u.id===user.id?user:u));
    }catch(e){ throw e; }
  }

  async function dbDeleteUser(id){
    try{
      await sb("users?id=eq."+id,"DELETE");
      setUsers(p=>p.filter(u=>u.id!==id));
    }catch(e){ throw e; }
  }

  async function dbAddShipping(item){
    try{
      const rows=await sb("shipping_options","POST",{name:item.name,type:item.type,phone:item.phone||""});
      if(rows[0])setShipping(p=>[...p,rows[0]]);
    }catch(e){ throw e; }
  }

  async function dbDeleteShipping(id){
    try{
      await sb("shipping_options?id=eq."+id,"DELETE");
      setShipping(p=>p.filter(s=>s.id!==id));
    }catch(e){ throw e; }
  }

  async function dbAddProduct(name){
    try{
      await sb("products","POST",{name});
      setProducts(p=>[...p,name]);
    }catch(e){ throw e; }
  }

  async function dbDeleteProduct(name){
    try{
      await sb("products?name=eq."+encodeURIComponent(name),"DELETE");
      setProducts(p=>p.filter(x=>x!==name));
    }catch(e){ throw e; }
  }

  async function dbSaveSettings(key,value){
    try{ await sb("settings?key=eq."+key,"PATCH",{value}); }
    catch(e){ console.error("settings save error",e); }
  }

  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [notifications,setNotifications]=useState([]);
  const [notifOpen,setNotifOpen]=useState(false);
  const prevOrdersRef = useState({})[0];

  // Inject responsive CSS
  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      @media (min-width: 768px) {
        .sidebar { transform: translateX(0) !important; position: fixed !important; }
        .close-sidebar { display: none !important; }
        .mobile-topbar { display: none !important; }
        main { margin-right: 220px !important; }
      }
      @media (max-width: 767px) {
        .mobile-topbar { display: flex !important; }
        main { padding-top: 52px !important; }
        .sidebar { transform: translateX(100%); }
        .sidebar.open { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);
  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3000);}

  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",fontFamily:"Cairo,sans-serif",flexDirection:"column",gap:16}}>
      <div style={{width:48,height:48,background:"#0f4c81",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:24,fontWeight:800}}>H</div>
      <div style={{fontSize:15,color:"#64748b"}}>جارٍ تحميل البيانات...</div>
      {dbError&&<div style={{fontSize:13,color:"#ef4444",maxWidth:400,textAlign:"center",padding:"0 20px"}}>{dbError}</div>}
    </div>
  );

  if(!currentUser)return <Login users={users} onLogin={u=>{setCurrentUser(u);setPage("orders");}}/>;
  const liveUser=users.find(u=>u.id===currentUser.id)||currentUser;
  return(
    <div style={S.app}>
      <Sidebar user={liveUser} page={page} setPage={p=>{setPage(p);setSidebarOpen(false);}} onLogout={()=>setCurrentUser(null)} alerts={alerts} isOpen={sidebarOpen} onClose={()=>setSidebarOpen(false)} onBell={()=>{setNotifOpen(p=>!p);setNotifications(p=>p.map(n=>({...n,read:true})));}} unreadCount={notifications.filter(n=>!n.read).length}/>
      {/* Notifications Panel */}
      {notifOpen&&(
        <div style={{position:"fixed",top:0,left:220,width:320,height:"100vh",background:"var(--bg,#fff)",boxShadow:"4px 0 20px rgba(0,0,0,.15)",zIndex:98,display:"flex",flexDirection:"column",direction:"rtl",fontFamily:"Cairo,sans-serif"}} className="notif-panel">
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:600,color:"#0f2744"}}>الإشعارات</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setNotifications([])} style={{fontSize:11,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>مسح الكل</button>
              <button onClick={()=>setNotifOpen(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#94a3b8"}}>✕</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
            {notifications.length===0?(
              <div style={{textAlign:"center",color:"#94a3b8",padding:40,fontSize:13}}>🔔 لا توجد إشعارات</div>
            ):(
              notifications.map((n,i)=>(
                <div key={n.id||i} style={{padding:"12px 20px",borderBottom:"0.5px solid #f8fafc",background:n.read?"transparent":"#f0fdf4"}}>
                  <div style={{fontSize:12,fontWeight:500,color:"#0f2744",marginBottom:3}}>{n.customerName} — <span style={{fontFamily:"monospace",fontSize:11,color:"#94a3b8"}}>{n.orderId}</span></div>
                  <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{n.text}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{n.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {notifOpen&&<div onClick={()=>setNotifOpen(false)} style={{position:"fixed",inset:0,zIndex:97}}/>}
      {/* Mobile overlay */}
      {sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:98,display:"block"}}/>}
      {/* Mobile top bar */}
      <div style={{display:"none",position:"fixed",top:0,right:0,left:0,height:52,background:"#0f2744",alignItems:"center",justifyContent:"space-between",padding:"0 16px",zIndex:97,}} className="mobile-topbar">
        <button onClick={()=>setSidebarOpen(p=>!p)} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:4}}>☰</button>
        <span style={{color:"#fff",fontWeight:700,fontSize:16}}>هولمن</span>
        <div style={{width:30}}/>
      </div>
      <main style={S.main}>
        {page==="orders"    &&<OrdersPage user={liveUser} orders={orders} setOrders={setOrders} showToast={showToast} users={users} shipping={shipping} alerts={alerts} dbUpdateOrder={dbUpdateOrder} setNotifications={setNotifications} notifications={notifications}/>}
        {page==="new-order" &&hasRole(liveUser,"sales")&&<NewOrderPage user={liveUser} orders={orders} setOrders={setOrders} showToast={showToast} setPage={setPage} products={products} commSettings={commSettings} dbAddOrder={dbAddOrder} setNotifications={setNotifications}/>}
        {page==="dashboard" &&hasRole(liveUser,"admin")&&<Dashboard orders={orders} users={users} setOrders={setOrders} dbUpdateOrder={dbUpdateOrder}/>}
        {page==="users"     &&hasRole(liveUser,"admin")&&<UsersPage users={users} setUsers={setUsers} currentUser={liveUser} showToast={showToast} dbAddUser={dbAddUser} dbUpdateUser={dbUpdateUser} dbDeleteUser={dbDeleteUser}/>}
        {page==="customers" &&<CustomersPage orders={orders} users={users} setPage={setPage}/> }
        {page==="performance"&&hasRole(liveUser,"admin")&&<PerformancePage orders={orders} users={users}/> }
        {page==="analytics"   &&hasRole(liveUser,"admin")&&<AnalyticsPage orders={orders}/> }
        {page==="settings"  &&hasRole(liveUser,"admin")&&<SettingsPage shipping={shipping} setShipping={setShipping} products={products} setProducts={setProducts} commSettings={commSettings} setCommSettings={setCommSettings} reminderSettings={reminderSettings} setReminderSettings={setReminderSettings} showToast={showToast} dbAddShipping={dbAddShipping} dbDeleteShipping={dbDeleteShipping} dbAddProduct={dbAddProduct} dbDeleteProduct={dbDeleteProduct} dbSaveSettings={dbSaveSettings}/>}
      </main>
      {toast&&<div style={{...S.toast,background:toast.type==="success"?"#10b981":"#ef4444"}}>{toast.msg}</div>}
    </div>
  );
}

function Login({users,onLogin}){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState("");
  function handle(){const u=users.find(u=>u.username===username&&u.password===password);if(u){setErr("");onLogin(u);}else setErr("اسم المستخدم أو الباسورد غلط");}
  return(
    <div style={S.loginWrap}><div style={S.loginCard}>
      <div style={S.loginLogo}><span style={S.logoMark}>H</span><div><div style={S.logoName}>هولمن</div><div style={S.logoSub}>نظام إدارة الطلبات</div></div></div>
      <input style={S.input} placeholder="اسم المستخدم" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
      <input style={S.input} placeholder="الباسورد" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
      {err&&<div style={S.err}>{err}</div>}
      <button style={S.btn} onClick={handle}>دخول</button>
      <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",marginTop:4,lineHeight:1.8}}>💰 كل أوردر بتسجله = عمولة في جيبك<br/>بيع أكتر، اكسب أكتر 🚀</div>
    </div></div>
  );
}

function Sidebar({user,page,setPage,onLogout,alerts=[],isOpen,onClose,onBell,unreadCount=0}){
  const nav=[
    {id:"orders",    label:"الطلبات",          icon:"📋",check:"any",alertCount:true},
    {id:"new-order", label:"طلب جديد",         icon:"➕",check:"sales"},
    {id:"dashboard", label:"لوحة التحكم",      icon:"📊",check:"admin"},
    {id:"users",     label:"المستخدمين",        icon:"👥",check:"admin"},
    {id:"customers", label:"العملاء",            icon:"👥",check:"any"},
    {id:"performance",label:"أداء الفريق",      icon:"🏆",check:"admin"},
    {id:"analytics",   label:"تحليلات",            icon:"📈",check:"admin"},
    {id:"settings",  label:"الإعدادات",         icon:"⚙️",check:"admin"},
  ].filter(n=>n.check==="any"||hasRole(user,n.check));
  const pr=ALL_ROLES.find(r=>user.roles?.includes(r.value));
  return(
    <aside style={{
      ...S.sidebar,
      position:"fixed", top:0, right:0, height:"100vh", zIndex:99,
      transition:"transform .25s ease",
    }} className={"sidebar"+(isOpen?" open":"")}>
      <div style={S.sideTop}>
        <div style={{...S.sideLogoWrap,justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{...S.logoMark,fontSize:18,width:36,height:36}}>H</span>
            <span style={{color:"#fff",fontWeight:700,fontSize:16}}>هولمن</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={onBell} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer",padding:4,position:"relative"}}>
              🔔{unreadCount>0&&<span style={{position:"absolute",top:-2,right:-2,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unreadCount>9?"9+":unreadCount}</span>}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer",padding:4}} className="close-sidebar">✕</button>
          </div>
        </div>
        <div style={S.userBadge}>
          <div style={{...S.avatar,background:pr?.color||"#475569"}}>{user.name[0]}</div>
          <div>
            <div style={{color:"#fff",fontSize:13,fontWeight:600}}>{user.name}</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>{user.roles?.map(r=>{const rd=ALL_ROLES.find(x=>x.value===r);return <span key={r} style={{background:"rgba(255,255,255,.12)",padding:"1px 6px",borderRadius:8,fontSize:10,color:"#e2e8f0"}}>{rd?.label}</span>;})}</div>
          </div>
        </div>
        <nav>{nav.map(n=><button key={n.id} style={{...S.navBtn,...(page===n.id?S.navBtnActive:{})}} onClick={()=>setPage(n.id)}>
          <span>{n.icon}</span>{n.label}
          {n.alertCount&&alerts.length>0&&<span style={{marginRight:"auto",background:"#ef4444",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{alerts.length}</span>}
        </button>)}</nav>
      </div>
      <button style={S.logoutBtn} onClick={onLogout}>خروج ↩</button>
    </aside>
  );
}


function SettingsPage({shipping,setShipping,products,setProducts,commSettings,setCommSettings,reminderSettings,setReminderSettings,showToast,dbAddShipping,dbDeleteShipping,dbAddProduct,dbDeleteProduct,dbSaveSettings}){
  const [shForm,setShForm]=useState({name:"",type:"company",phone:""});
  const [shErr,setShErr]=useState("");
  const [pForm,setPForm]=useState("");
  const [pErr,setPErr]=useState("");
  async function addShipping(){
    if(!shForm.name.trim()){setShErr("اكتب الاسم");return;}
    if(shipping.find(s=>s.name===shForm.name.trim())){setShErr("موجود بالفعل");return;}
    try{await dbAddShipping({name:shForm.name.trim(),type:shForm.type,phone:shForm.phone.trim()});setShForm({name:"",type:"company",phone:""});setShErr("");showToast("تمت الإضافة ✅");}catch(e){setShErr("خطأ: "+e.message);}
  }
  async function delShipping(id){try{await dbDeleteShipping(id);showToast("تم الحذف");}catch(e){showToast("خطأ في الحذف","error");}}
  async function addProduct(){
    if(!pForm.trim()){setPErr("اكتب اسم المنتج");return;}
    if(products.includes(pForm.trim())){setPErr("المنتج موجود بالفعل");return;}
    try{await dbAddProduct(pForm.trim());setPForm("");setPErr("");showToast("تمت إضافة المنتج ✅");}catch(e){setPErr("خطأ: "+e.message);}
  }
  async function delProduct(name){try{await dbDeleteProduct(name);showToast("تم الحذف");}catch(e){showToast("خطأ في الحذف","error");}}
  const TL={company:"شركة شحن",delegate:"مندوب",other:"أخرى"};
  const TC={company:"#3b82f6",delegate:"#10b981",other:"#94a3b8"};
  const TB={company:"#dbeafe",delegate:"#d1fae5",other:"#f1f5f9"};
  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}><h1 style={S.pageTitle}>الإعدادات</h1></div>
      <div style={{maxWidth:900}}>
        <div style={{...S.dashCard,marginBottom:16}}>
          <div style={S.dashCardTitle}>⏰ إعدادات التذكيرات</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>تنبيه لما أوردر يتجاوز الوقت المحدد من غير حركة</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
            {[{key:"pending",label:"في الانتظار",color:"#f59e0b"},{key:"confirmed",label:"مؤكد",color:"#3b82f6"},{key:"shipped",label:"تم الشحن",color:"#8b5cf6"}].map(item=>(
              <div key={item.key} style={{background:"#f8fafc",borderRadius:8,padding:"12px 14px",border:"0.5px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{...S.statusBadge,color:item.color,background:"#f8fafc",border:"1px solid "+item.color,fontSize:10}}>{item.label}</span>
                </div>
                <div style={S.subLabel}>حد التنبيه (ساعات)</div>
                <input style={S.input} type="number" min="1" max="168" value={reminderSettings[item.key]} onChange={e=>{const v={...reminderSettings,[item.key]:parseInt(e.target.value)||24};setReminderSettings(v);dbSaveSettings("reminder_settings",v);}}/>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>لو عدى {reminderSettings[item.key]} ساعة بيظهر تنبيه</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{...S.dashCard,marginBottom:16}}>
          <div style={S.dashCardTitle}>💰 إعدادات العمولة</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:160}}>
              <div style={S.subLabel}>نوع العمولة</div>
              <select style={S.input} value={commSettings.type} onChange={e=>{const v={...commSettings,type:e.target.value};setCommSettings(v);dbSaveSettings("comm_settings",v);}}>
                <option value="percent">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ج.م)</option>
              </select>
            </div>
            <div style={{flex:1,minWidth:120}}>
              <div style={S.subLabel}>{commSettings.type==="percent"?"النسبة %":"المبلغ ج.م"}</div>
              <input style={S.input} type="number" min="0" value={commSettings.value} onChange={e=>{const v={...commSettings,value:parseFloat(e.target.value)||0};setCommSettings(v);dbSaveSettings("comm_settings",v);}}/>
            </div>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#15803d"}}>
              {commSettings.type==="percent"?"مثال: 1000 ج.م → "+Math.round(1000*commSettings.value/100)+" ج.م":"كل أوردر → "+commSettings.value+" ج.م ثابت"}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
          <div style={S.dashCard}>
            <div style={S.dashCardTitle}>📦 إدارة المنتجات</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...S.input,flex:1}} placeholder="اسم المنتج..." value={pForm} onChange={e=>setPForm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProduct()}/>
              <button style={{...S.btn,width:"auto",padding:"10px 14px"}} onClick={addProduct}>+ إضافة</button>
            </div>
            {pErr&&<div style={{...S.err,marginBottom:8}}>{pErr}</div>}
            <div style={{maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
              {products.map(p=>(
                <div key={p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f8fafc",borderRadius:7,border:"0.5px solid #e2e8f0"}}>
                  <span style={{fontSize:13,color:"#374151"}}>📦 {p}</span>
                  <button style={{...S.iconBtn,color:"#ef4444",borderColor:"#fecaca",padding:"3px 8px",fontSize:11}} onClick={()=>delProduct(p)}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
          <div style={S.dashCard}>
            <div style={S.dashCardTitle}>🚚 شركات الشحن والمناديب</div>
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
              <select style={{...S.input,width:"auto",flex:"0 0 110px"}} value={shForm.type} onChange={e=>setShForm(p=>({...p,type:e.target.value,phone:""}))}>
                <option value="company">شركة شحن</option>
                <option value="delegate">مندوب</option>
                <option value="other">أخرى</option>
              </select>
              <input style={{...S.input,flex:1,minWidth:110}} placeholder="الاسم..." value={shForm.name} onChange={e=>setShForm(p=>({...p,name:e.target.value}))}/>
              {shForm.type==="delegate"&&<input style={{...S.input,flex:"0 0 120px"}} placeholder="رقم التليفون" value={shForm.phone} onChange={e=>setShForm(p=>({...p,phone:e.target.value}))}/>}
              <button style={{...S.btn,width:"auto",padding:"10px 12px"}} onClick={addShipping}>+ إضافة</button>
            </div>
            {shErr&&<div style={{...S.err,marginBottom:8}}>{shErr}</div>}
            <div style={{maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
              {shipping.map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f8fafc",borderRadius:7,border:"0.5px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{...S.statusBadge,color:TC[s.type],background:TB[s.type],fontSize:10}}>{TL[s.type]}</span>
                    <span style={{fontSize:13,color:"#374151"}}>{s.name}</span>
                    {s.type==="delegate"&&s.phone&&<span style={{fontSize:11,color:"#64748b"}}>📞 {s.phone}</span>}
                  </div>
                  <button style={{...S.iconBtn,color:"#ef4444",borderColor:"#fecaca",padding:"3px 8px",fontSize:11}} onClick={()=>delShipping(s.id)}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPage({users,setUsers,currentUser,showToast,dbAddUser,dbUpdateUser,dbDeleteUser}){
  const [showForm,setShowForm]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [form,setForm]=useState({name:"",username:"",password:"",roles:["sales"]});
  const [err,setErr]=useState("");
  function openAdd(){setEditUser(null);setForm({name:"",username:"",password:"",roles:["sales"]});setErr("");setShowForm(true);}
  function openEdit(u){setEditUser(u);setForm({name:u.name,username:u.username,password:u.password,roles:[...u.roles]});setErr("");setShowForm(true);}
  function toggleRole(r){setForm(p=>{const has=p.roles.includes(r);if(has&&p.roles.length===1)return p;return{...p,roles:has?p.roles.filter(x=>x!==r):[...p.roles,r]};});}
  async function save(){
    if(!form.name.trim()||!form.username.trim()||!form.password.trim()){setErr("من فضلك املأ كل الحقول");return;}
    if(users.find(u=>u.username===form.username.trim()&&u.id!==editUser?.id)){setErr("اسم المستخدم موجود بالفعل");return;}
    try{
      if(editUser){await dbUpdateUser({...editUser,...form,username:form.username.trim()});showToast("تم تعديل المستخدم ✅");}
      else{await dbAddUser({...form,username:form.username.trim()});showToast("تم إضافة المستخدم ✅");}
      setShowForm(false);
    }catch(e){setErr("خطأ: "+e.message);}
  }
  async function del(u){
    if(u.id===currentUser.id){showToast("مش تقدر تمسح نفسك","error");return;}
    if(!window.confirm("هتمسح "+u.name+"؟"))return;
    try{await dbDeleteUser(u.id);showToast("تم مسح المستخدم");}catch(e){showToast("خطأ في المسح","error");}
  }
  return(
    <div style={S.pageWrap}>
      <div style={{...S.pageHeader,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <h1 style={S.pageTitle}>إدارة المستخدمين</h1>
        <button style={{...S.btn,width:"auto",padding:"10px 20px"}} onClick={openAdd}>+ إضافة مستخدم</button>
      </div>
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden"}}>
        <table style={{...S.table,width:"100%"}}>
          <thead><tr style={{background:"#f8fafc"}}>{["المستخدم","يوزرنيم","الصلاحيات","إجراءات"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id} style={{background:u.id===currentUser.id?"#f0fdf4":"#fff"}}>
              <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{...S.avatar,background:roleColor(u.roles)}}>{u.name[0]}</div><div><div style={{fontWeight:600,fontSize:13,color:"#0f2744"}}>{u.name}</div>{u.id===currentUser.id&&<div style={{fontSize:11,color:"#10b981"}}>حسابك الحالي</div>}</div></div></td>
              <td style={S.td}><code style={{background:"#f1f5f9",padding:"2px 8px",borderRadius:6,fontSize:12}}>{u.username}</code></td>
              <td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{u.roles.map(r=>{const rd=ALL_ROLES.find(x=>x.value===r);return <span key={r} style={{...S.statusBadge,color:rd?.color,background:rd?.bg,fontSize:10}}>{rd?.label}</span>;})}</div></td>
              <td style={S.td}><div style={{display:"flex",gap:6}}><button style={S.iconBtn} onClick={()=>openEdit(u)}>✏️ تعديل</button><button style={{...S.iconBtn,color:"#ef4444",borderColor:"#fecaca"}} onClick={()=>del(u)} disabled={u.id===currentUser.id}>🗑️ مسح</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showForm&&(
        <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={{...S.modal,maxWidth:440}}>
            <div style={S.modalHeader}><div style={{fontSize:16,fontWeight:700,color:"#0f2744"}}>{editUser?"تعديل مستخدم":"إضافة مستخدم جديد"}</div><button style={S.closeBtn} onClick={()=>setShowForm(false)}>✕</button></div>
            <div style={S.modalBody}>
              {err&&<div style={S.err}>{err}</div>}
              <Field label="الاسم الكامل *"><input style={S.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="مثال: أحمد سالم"/></Field>
              <Field label="اسم المستخدم *"><input style={S.input} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} placeholder="مثال: ahmed" dir="ltr"/></Field>
              <Field label="الباسورد *"><input style={S.input} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="الباسورد"/></Field>
              <Field label="الصلاحيات * (ممكن أكتر من واحدة)">
                <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
                  {ALL_ROLES.map(r=>{const active=form.roles.includes(r.value);return(
                    <div key={r.value} onClick={()=>toggleRole(r.value)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",borderRadius:8,border:"1.5px solid "+(active?r.color:"#e2e8f0"),background:active?r.bg:"#fff",cursor:"pointer"}}>
                      <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(active?r.color:"#cbd5e1"),background:active?r.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{active&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}</div>
                      <div><div style={{fontSize:13,fontWeight:600,color:active?r.color:"#374151"}}>{r.label}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{ROLE_DESC[r.value]}</div></div>
                    </div>
                  );})}
                </div>
              </Field>
              <button style={{...S.btn,marginTop:12}} onClick={save}>{editUser?"حفظ التعديلات":"إضافة المستخدم"} ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersPage({user,orders,setOrders,showToast,users,shipping,alerts=[],dbUpdateOrder,setNotifications,notifications}){
  const [filter,setFilter]=useState("all");
  const [myOrders,setMyOrders]=useState(false);
  const [search,setSearch]=useState("");
  const [govFilter,setGovFilter]=useState("all");
  const [salesFilter,setSalesFilter]=useState("all");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [showFilters,setShowFilters]=useState(false);
  const [selected,setSelected]=useState(null);
  const isAdmin=hasRole(user,"admin");

  const salesUsers=users.filter(u=>u.roles?.includes("sales"));
  const allGovs=[...new Set(orders.map(o=>o.governorate).filter(Boolean))].sort();

  const q=search.trim().toLowerCase();
  const visible=orders.filter(o=>{
    // All users see all orders (permissions control actions, not visibility)
    // My orders filter
    if(myOrders&&o.salesId!==user.id)return false;
    // Status filter
    if(filter!=="all"&&o.status!==filter)return false;
    // Governorate filter
    if(govFilter!=="all"&&o.governorate!==govFilter)return false;
    // Sales filter (admin only)
    if(isAdmin&&salesFilter!=="all"&&o.salesId!==parseInt(salesFilter))return false;
    // Date range
    if(dateFrom||dateTo){
      const parts=o.createdAt?.split("/");
      if(parts&&parts.length===3){
        const d=new Date(parts[2],parts[1]-1,parts[0]);
        if(dateFrom&&d<new Date(dateFrom))return false;
        if(dateTo&&d>new Date(dateTo))return false;
      }
    }
    // Text search
    if(q){
      const su=users.find(u=>u.id===o.salesId);
      const haystack=[o.id,o.customerName,o.phone,o.governorate,o.address,su?.name,o.shippingCompany,...(o.items||[]).map(i=>i.name)].join(" ").toLowerCase();
      if(!haystack.includes(q))return false;
    }
    return true;
  });

  const activeFilters=(govFilter!=="all"?1:0)+(salesFilter!=="all"?1:0)+(dateFrom||dateTo?1:0);

  function clearAll(){setSearch("");setFilter("all");setGovFilter("all");setSalesFilter("all");setDateFrom("");setDateTo("");}

  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h1 style={{...S.pageTitle,marginBottom:0}}>الطلبات</h1>
          <div style={{fontSize:13,color:visible.length===orders.length?"#94a3b8":"#3b82f6",fontWeight:500}}>{visible.length} من {orders.length}</div>
        </div>

        {/* Search bar */}
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#94a3b8",pointerEvents:"none"}}>🔍</span>
          <input
            style={{...S.input,paddingRight:38,paddingLeft:search?38:14}}
            placeholder="ابحث بالاسم، رقم الأوردر، التليفون، المنتج، المندوب..."
            value={search} onChange={e=>setSearch(e.target.value)}
          />
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,cursor:"pointer",color:"#94a3b8"}}>✕</button>}
        </div>

        {/* My orders toggle */}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button style={{...S.filterBtn,...(myOrders?{background:"#0f2744",color:"#fff",borderColor:"#0f2744"}:{})}} onClick={()=>setMyOrders(p=>!p)}>
            👤 {myOrders?"طلباتي فقط ✓":"طلباتي فقط"}
          </button>
        </div>
        {/* Status pills */}
        <div style={{...S.filterRow,marginBottom:10}}>
          {["all","pending","confirmed","shipped","delivered","rejected"].map(f=>(
            <button key={f} style={{...S.filterBtn,...(filter===f?S.filterBtnActive:{})}} onClick={()=>setFilter(f)}>
              {f==="all"?"الكل":STATUS_MAP[f]?.label}
              <span style={S.filterCount}>{orders.filter(o=>f==="all"?true:o.status===f).length}</span>
            </button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowFilters(p=>!p)} style={{...S.iconBtn,fontSize:12,color:activeFilters>0?"#3b82f6":"#64748b",borderColor:activeFilters>0?"#bfdbfe":"#e2e8f0",background:activeFilters>0?"#eff6ff":"#fff"}}>
            ⚙️ فلاتر متقدمة {activeFilters>0&&<span style={{background:"#3b82f6",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,marginRight:4}}>{activeFilters}</span>}
          </button>
          {(q||filter!=="all"||activeFilters>0)&&<button onClick={clearAll} style={{...S.iconBtn,fontSize:12,color:"#ef4444",borderColor:"#fecaca"}}>✕ مسح الكل</button>}
        </div>

        {/* Advanced filters panel */}
        {showFilters&&(
          <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginTop:10,border:"0.5px solid #e2e8f0",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <div>
              <div style={S.subLabel}>المحافظة</div>
              <select style={S.input} value={govFilter} onChange={e=>setGovFilter(e.target.value)}>
                <option value="all">كل المحافظات</option>
                {allGovs.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {isAdmin&&(
              <div>
                <div style={S.subLabel}>الموظف</div>
                <select style={S.input} value={salesFilter} onChange={e=>setSalesFilter(e.target.value)}>
                  <option value="all">كل الموظفين</option>
                  {salesUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <div style={S.subLabel}>من تاريخ</div>
              <input style={S.input} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
            </div>
            <div>
              <div style={S.subLabel}>إلى تاريخ</div>
              <input style={S.input} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      {alerts.length>0&&(
        <div style={{background:"#fff7ed",border:"0.5px solid #fed7aa",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:500,color:"#c2410c",marginBottom:8}}>⏰ {alerts.length} أوردر تجاوز وقت المتابعة</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {alerts.map((a,i)=>{
              const st=STATUS_MAP[a.status];
              return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",borderRadius:8,padding:"8px 12px",border:"0.5px solid #fed7aa"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:"#1e293b"}}>{a.customerName}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>منذ {a.hours} ساعة — تجاوز حد {a.limit} ساعة</div>
                    </div>
                  </div>
                  <span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>⚠️ عاجل</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {visible.length===0?(
        <div style={{...S.empty,flexDirection:"column",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:32}}>🔍</span>
          <div>{q||activeFilters>0?"مفيش نتائج تطابق البحث":"لا توجد طلبات"}</div>
          {(q||activeFilters>0)&&<button onClick={clearAll} style={{...S.iconBtn,fontSize:12,color:"#3b82f6",borderColor:"#bfdbfe",background:"#eff6ff",marginTop:4}}>مسح الفلاتر</button>}
        </div>
      ):(
        <div style={S.orderList}>{visible.map(o=><OrderCard key={o.id} order={o} users={users} onSelect={()=>setSelected(o)}/>)}</div>
      )}
      {selected&&<OrderModal order={selected} user={user} users={users} shipping={shipping} onClose={()=>setSelected(null)} onUpdate={async u=>{
  await dbUpdateOrder(u);
  setSelected(u);
  showToast("تم تحديث الطلب ✅");
  // Push immediate notification to all
  if(u.status !== selected?.status){
    setNotifications(prev=>[{
      id:Date.now(),
      orderId:u.id,
      customerName:u.customerName,
      text:`${user.name} غيّر حالة الأوردر إلى "${STATUS_MAP[u.status]?.label}"`,
      time:now(),
      read:false
    },...prev].slice(0,50));
  }
}}/>}
    </div>
  );
}

function OrderCard({order,users,onSelect}){
  const st=STATUS_MAP[order.status];
  const su=users.find(u=>u.id===order.salesId);
  return(
    <div style={S.orderCard} onClick={onSelect}>
      <div style={S.orderCardTop}><span style={S.orderId}>{order.id}</span><span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span></div>
      <div style={S.orderCustomer}>{order.customerName}</div>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
        {order.governorate&&<span style={{fontSize:11,color:"#3b82f6"}}>📍 {order.governorate}</span>}
        {order.orderType&&order.orderType!=="delivery"&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:600,color:order.orderType==="return"?"#ef4444":"#f59e0b",background:order.orderType==="return"?"#fee2e2":"#fef3c7"}}>{order.orderType==="return"?"↩️ مرتجع":"🔄 تبديل"}</span>}
      </div>
      <div style={S.orderMeta}><span>📦 {order.items?.length||0} منتج</span><span>💰 {calcTotal(order.items).toLocaleString()} ج.م</span></div>
      {order.source&&order.source!=="phone"&&<div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>
        {order.source==="whatsapp"?"💬 واتساب":order.source==="facebook"?"📘 فيسبوك":order.source==="instagram"?"📸 انستجرام":order.source==="tiktok"?"🎵 تيكتوك":order.source==="website"?"🌐 الموقع":"📞 مكالمة"}
      </div>}
      <div style={S.orderMeta}><span>👤 {su?.name||"—"}</span><span style={{color:"#94a3b8",fontSize:11}}>{order.createdAt}</span></div>
      {order.internalNotes?.length>0&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>💬 {order.internalNotes.length} ملاحظة داخلية</div>}
      <button style={{...S.waBtn,marginTop:8}} onClick={e=>{e.stopPropagation();printInvoice(order,users);}}>🖨️ فاتورة PDF</button>
    </div>
  );
}

function OrderModal({order,user,users,shipping,onClose,onUpdate}){
  const isAdmin=hasRole(user,"admin");
  const [tab,setTab]=useState("action");
  const [shippingCompany,setShippingCompany]=useState(order.shippingCompany||"");
  const [rejectReason,setRejectReason]=useState(order.rejectReason||"");
  const [rejectNote,setRejectNote]=useState(order.rejectNote||"");
  const [showReject,setShowReject]=useState(false);
  const [noteText,setNoteText]=useState("");
  const [editForm,setEditForm]=useState({customerName:order.customerName,phone:order.phone,address:order.address,notes:order.notes||"",status:order.status,salesId:order.salesId,items:JSON.parse(JSON.stringify(order.items||[]))});
  function setEF(k,v){setEditForm(p=>({...p,[k]:v}));}

  function withAudit(updated,action,details=""){
    const entry={by:user.name,at:now(),action,details};
    return{...updated,lastActionAt:Date.now(),auditLog:[...(order.auditLog||[]),entry]};
  }
  function auditUpdate(updated,action,details=""){onUpdate(withAudit(updated,action,details));}

  function addNote(){
    if(!noteText.trim())return;
    const note={id:Date.now(),by:user.name,role:user.roles?.[0]||"sales",at:now(),text:noteText.trim()};
    const updated={...order,internalNotes:[...(order.internalNotes||[]),note]};
    onUpdate(updated);
    setNoteText("");
  }

  function deleteNote(noteId){
    onUpdate({...order,internalNotes:(order.internalNotes||[]).filter(n=>n.id!==noteId)});
  }

  function saveEdit(){
    const total=calcTotal(editForm.items);
    const commission=editForm.status==="delivered"?calcComm(total,order.commSettings):editForm.status==="rejected"?0:order.commission;
    const changes=[];
    const FL={customerName:"اسم العميل",phone:"التليفون",address:"العنوان",notes:"ملاحظات",status:"الحالة",salesId:"الموظف"};
    Object.keys(FL).forEach(k=>{
      const ov=k==="salesId"?(users.find(u=>u.id===order[k])?.name||order[k]):(k==="status"?STATUS_MAP[order[k]]?.label:order[k]||"");
      const nv=k==="salesId"?(users.find(u=>u.id===editForm[k])?.name||editForm[k]):(k==="status"?STATUS_MAP[editForm[k]]?.label:editForm[k]||"");
      if(String(order[k])!==String(editForm[k]))changes.push(`${FL[k]}: "${ov}" ← "${nv}"`);
    });
    if(JSON.stringify(order.items)!==JSON.stringify(editForm.items))changes.push("المنتجات: تم تعديل قائمة المنتجات");
    auditUpdate({...order,...editForm,commission},"تعديل إداري",changes.length?changes.join(" | "):"لا تغييرات");
  }

  const st=STATUS_MAP[order.status];
  const su=users.find(u=>u.id===order.salesId);
  const cu=users.find(u=>u.id===order.confirmedBy);
  const shu=users.find(u=>u.id===order.shippedBy);
  const salesUsers=users.filter(u=>u.roles?.includes("sales"));
  const total=calcTotal(order.items);

  return(
    <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <div><div style={S.orderId}>{order.id}</div><span style={{...S.statusBadge,color:st.color,background:st.bg,fontSize:13}}>{st.label}</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              <button style={{...S.tabBtn,...(tab==="action"?S.tabBtnActive:{})}} onClick={()=>setTab("action")}>تفاصيل</button>
              <button style={{...S.tabBtn,...(tab==="notes"?S.tabBtnActive:{})}} onClick={()=>setTab("notes")}>💬 ملاحظات{order.internalNotes?.length>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:9,marginRight:3}}>{order.internalNotes.length}</span>}</button>
              {isAdmin&&<button style={{...S.tabBtn,...(tab==="edit"?S.tabBtnActive:{})}} onClick={()=>setTab("edit")}>✏️ تعديل</button>}
              {isAdmin&&<button style={{...S.tabBtn,...(tab==="audit"?S.tabBtnActive:{})}} onClick={()=>setTab("audit")}>🕐 سجل</button>}
            </div>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={S.modalBody}>

          {tab==="action"&&<>
            <button style={{...S.waBtn,marginBottom:14}} onClick={()=>printInvoice(order,users)}>🖨️ تحميل فاتورة PDF</button>
            <Section title="بيانات الطلب">
              <Row label="العميل" value={order.customerName}/><Row label="التليفون" value={order.phone}/>
              {order.governorate&&<Row label="المحافظة" value={order.governorate}/>}
              <Row label="العنوان" value={order.address}/>{order.notes&&<Row label="ملاحظات" value={order.notes}/>}
            </Section>
            <Section title="المنتجات">
              {order.items?.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f8fafc",fontSize:13}}>
                  <span style={{color:"#374151"}}>📦 {item.name} <span style={{color:"#94a3b8"}}>× {item.qty}</span></span>
                  <span style={{fontWeight:500,color:"#0f2744"}}>{((parseFloat(item.price)||0)*(parseInt(item.qty)||1)).toLocaleString()} ج.م</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:14,borderTop:"1.5px solid #e2e8f0",marginTop:4}}>
                <span style={{color:"#94a3b8"}}>الإجمالي</span><span style={{color:"#0f2744"}}>{total.toLocaleString()} ج.م</span>
              </div>
            </Section>
            <Section title="تتبع الطلب">
              <Row label="المبيعات" value={su?.name||"—"} tag={su?.name?.[0]}/><Row label="تاريخ الإنشاء" value={order.createdAt}/>
              {cu&&<Row label="أُكِّد بواسطة" value={cu.name} sub={order.confirmedAt}/>}
              {shu&&<Row label="شُحن بواسطة" value={shu.name} sub={order.shippingCompany+" — "+order.shippedAt}/>}
              {order.status==="delivered"&&<Row label="تاريخ الاستلام" value={order.deliveredAt}/>}
              {order.status==="rejected"&&<Row label="سبب الرفض" value={order.rejectReason} sub={order.rejectNote}/>}
            </Section>
            {order.commission>0&&<div style={S.commissionBox}><span>🏆 العمولة المستحقة</span><span style={{fontWeight:700,fontSize:18}}>{Math.round(order.commission).toLocaleString()} ج.م</span></div>}

            {hasRole(user,"supervisor")&&order.status==="pending"&&(
              <ActionBox title="تأكيد الطلب">
                <button style={S.actionBtn} onClick={()=>auditUpdate({...order,status:"confirmed",confirmedBy:user.id,confirmedAt:today()},"تأكيد الطلب")}>✅ تأكيد الطلب</button>
                <button style={{...S.waBtn,marginTop:8}} onClick={()=>openWhatsApp(order.phone,buildWAMessage({...order,status:"confirmed"},"confirmed"))}>📲 إرسال إشعار واتساب للعميل</button>
              </ActionBox>
            )}
            {hasRole(user,"shipping")&&order.status==="confirmed"&&(
              <ActionBox title="تسليم للشحن">
                <div style={S.subLabel}>اختار شركة الشحن أو المندوب *</div>
                <select style={S.input} value={shippingCompany} onChange={e=>setShippingCompany(e.target.value)}>
                  <option value="">— اختار —</option>
                  {["company","delegate","other"].map(t=>{const items=shipping.filter(s=>s.type===t);if(!items.length)return null;return <optgroup key={t} label={t==="company"?"شركات الشحن":t==="delegate"?"مناديب":"أخرى"}>{items.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</optgroup>;})}
                </select>
                {shippingCompany&&<div style={{fontSize:12,color:"#10b981",marginTop:4}}>✓ اخترت: {shippingCompany}</div>}
                <button style={{...S.actionBtn,marginTop:8}} onClick={()=>{if(!shippingCompany)return alert("لازم تختار أولاً");auditUpdate({...order,status:"shipped",shippedBy:user.id,shippingCompany,shippedAt:today()},"تسليم للشحن","مع: "+shippingCompany);}}>🚚 تسليم للشحن</button>
                {shippingCompany&&<button style={{...S.waBtn,marginTop:8}} onClick={()=>{const del=shipping.find(s=>s.name===shippingCompany&&s.type==="delegate");openWhatsApp(order.phone,buildWAMessage({...order,shippingCompany},"shipped",del?.phone||""));}}>📲 إرسال إشعار الشحن للعميل</button>}
              </ActionBox>
            )}
            {hasRole(user,"shipping")&&order.status==="shipped"&&(
              <ActionBox title="تسجيل نتيجة التسليم">
                <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#64748b",marginBottom:10}}>شُحن مع: <strong>{order.shippingCompany}</strong></div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <button style={{...S.actionBtn,flex:1}} onClick={()=>auditUpdate({...order,status:"delivered",deliveredAt:today(),commission:order.orderType==="delivery"||!order.orderType?calcComm(calcTotal(order.items),order.commSettings):0},"تسجيل الاستلام")}>✅ تم الاستلام</button>
                  <button style={{...S.actionBtn,flex:1,background:"#fee2e2",color:"#ef4444",borderColor:"#fecaca"}} onClick={()=>setShowReject(r=>!r)}>❌ مرتجع</button>
                </div>
                {showReject&&(
                  <div style={{background:"#fff5f5",borderRadius:8,padding:12,border:"1px solid #fecaca"}}>
                    <div style={S.subLabel}>سبب الرفض *</div>
                    <select style={S.input} value={rejectReason} onChange={e=>setRejectReason(e.target.value)}><option value="">اختار السبب</option>{REJECTION_REASONS.map(r=><option key={r} value={r}>{r}</option>)}</select>
                    <input style={{...S.input,marginTop:8}} placeholder="ملاحظة إضافية (اختياري)" value={rejectNote} onChange={e=>setRejectNote(e.target.value)}/>
                    {rejectReason&&<button style={{...S.actionBtn,background:"#fee2e2",color:"#ef4444",borderColor:"#fecaca",marginTop:8}} onClick={()=>auditUpdate({...order,status:"rejected",rejectReason,rejectNote,rejectedAt:today(),commission:0},"تسجيل مرتجع",rejectReason)}>تأكيد المرتجع</button>}
                  </div>
                )}
              </ActionBox>
            )}
          </>}

          {tab==="audit"&&isAdmin&&(
            <div>
              <div style={{...S.sectionTitle,marginBottom:14}}>سجل التعديلات</div>
              {(!order.auditLog||order.auditLog.length===0)?<div style={S.empty}>لا توجد تسجيلات</div>:
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[...order.auditLog].reverse().map((log,i)=>(
                    <div key={i} style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e2e8f0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#0f2744"}}>{log.by}</span>
                        <span style={{fontSize:11,color:"#94a3b8"}}>{log.at}</span>
                      </div>
                      <div style={{fontSize:12,color:"#374151",fontWeight:500}}>{log.action}</div>
                      {log.details&&<div style={{fontSize:11,color:"#64748b",marginTop:3}}>{log.details}</div>}
                    </div>
                  ))}
                </div>}
            </div>
          )}

          {tab==="notes"&&(
            <div>
              <div style={{...S.sectionTitle,marginBottom:14}}>ملاحظات داخلية (مش بيشوفها العميل)</div>

              {/* Add note */}
              <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:16,border:"0.5px solid #e2e8f0"}}>
                <textarea
                  style={{...S.input,height:80,resize:"vertical",marginBottom:8,fontSize:13}}
                  placeholder="اكتب ملاحظة للفريق... مثال: العميل طلب التوصيل الصبح، أو في مشكلة في العنوان"
                  value={noteText}
                  onChange={e=>setNoteText(e.target.value)}
                  onKeyDown={e=>{if(e.ctrlKey&&e.key==="Enter")addNote();}}
                />
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#94a3b8"}}>Ctrl+Enter للإرسال</span>
                  <button style={{...S.btn,width:"auto",padding:"8px 18px",fontSize:13}} onClick={addNote} disabled={!noteText.trim()}>إضافة ملاحظة 💬</button>
                </div>
              </div>

              {/* Notes list */}
              {(!order.internalNotes||order.internalNotes.length===0)?(
                <div style={{...S.empty,padding:24}}>لا توجد ملاحظات — كن أول من يضيف ملاحظة</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[...order.internalNotes].reverse().map((note,i)=>{
                    const rd=ALL_ROLES.find(r=>r.value===note.role);
                    const isOwn=note.by===user.name;
                    return(
                      <div key={note.id||i} style={{background:isOwn?"#f0fdf4":"#fff",borderRadius:10,padding:"12px 14px",border:"0.5px solid "+(isOwn?"#bbf7d0":"#e2e8f0"),position:"relative"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:26,height:26,borderRadius:"50%",background:rd?.color||"#64748b",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{note.by?.[0]||"؟"}</div>
                            <div>
                              <span style={{fontSize:12,fontWeight:600,color:"#0f2744"}}>{note.by}</span>
                              <span style={{...S.statusBadge,color:rd?.color||"#64748b",background:rd?.bg||"#f1f5f9",fontSize:9,marginRight:6}}>{rd?.label||note.role}</span>
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11,color:"#94a3b8"}}>{note.at}</span>
                            {(isOwn||isAdmin)&&<button onClick={()=>deleteNote(note.id||i)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:13,padding:2}} title="مسح الملاحظة">🗑️</button>}
                          </div>
                        </div>
                        <div style={{fontSize:13,color:"#374151",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{note.text}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab==="edit"&&isAdmin&&(
            <>
              <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#c2410c",marginBottom:16}}>⚠️ وضع التعديل — التغييرات تتطبق فوراً وتُسجَّل في السجل</div>
              <Section title="بيانات العميل">
                <Field label="اسم العميل"><input style={S.input} value={editForm.customerName} onChange={e=>setEF("customerName",e.target.value)}/></Field>
                <Field label="التليفون"><input style={S.input} value={editForm.phone} onChange={e=>setEF("phone",e.target.value)}/></Field>
                <Field label="العنوان"><input style={S.input} value={editForm.address} onChange={e=>setEF("address",e.target.value)}/></Field>
                <Field label="ملاحظات"><input style={S.input} value={editForm.notes} onChange={e=>setEF("notes",e.target.value)}/></Field>
              </Section>
              <Section title="المنتجات">
                {editForm.items.map((item,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 55px 85px 28px",gap:5,marginBottom:6,alignItems:"center"}}>
                    <input style={{...S.input,fontSize:12,padding:"7px 10px"}} value={item.name} onChange={e=>{const n=[...editForm.items];n[i]={...n[i],name:e.target.value};setEF("items",n);}} placeholder="اسم المنتج"/>
                    <input style={{...S.input,fontSize:12,padding:"7px 6px"}} type="number" min="1" value={item.qty} onChange={e=>{const n=[...editForm.items];n[i]={...n[i],qty:e.target.value};setEF("items",n);}}/>
                    <input style={{...S.input,fontSize:12,padding:"7px 8px"}} type="number" value={item.price} onChange={e=>{const n=[...editForm.items];n[i]={...n[i],price:e.target.value};setEF("items",n);}} placeholder="سعر"/>
                    <button style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#ef4444",fontSize:13,padding:"6px 7px"}} onClick={()=>setEF("items",editForm.items.filter((_,j)=>j!==i))}>✕</button>
                  </div>
                ))}
                <button style={{...S.iconBtn,width:"100%",padding:"7px",fontSize:12,color:"#3b82f6",borderColor:"#bfdbfe",background:"#eff6ff"}} onClick={()=>setEF("items",[...editForm.items,{name:"",qty:1,price:""}])}>+ إضافة منتج</button>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:13,color:"#64748b"}}>
                  <span>الإجمالي الجديد</span><span style={{fontWeight:700,color:"#0f2744"}}>{calcTotal(editForm.items).toLocaleString()} ج.م</span>
                </div>
              </Section>
              <Section title="التحكم الإداري">
                <Field label="نوع الطلب">
                  <select style={S.input} value={editForm.orderType||"delivery"} onChange={e=>setEF("orderType",e.target.value)}>
                    <option value="delivery">📦 تسليم</option>
                    <option value="return">↩️ مرتجع</option>
                    <option value="exchange">🔄 تبديل</option>
                  </select>
                </Field>
                <Field label="نقل العمولة إلى"><select style={S.input} value={editForm.salesId} onChange={e=>setEF("salesId",parseInt(e.target.value))}>{salesUsers.map(u=><option key={u.id} value={u.id}>{u.name}{u.id===order.salesId?" (الحالي)":""}</option>)}</select></Field>
                <Field label="تغيير حالة الأوردر"><select style={S.input} value={editForm.status} onChange={e=>setEF("status",e.target.value)}>{Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
              </Section>
              <button style={{...S.btn,background:"#f59e0b"}} onClick={saveEdit}>💾 حفظ التعديلات</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NewOrderPage({user,orders,setOrders,showToast,setPage,products,commSettings,dbAddOrder,setNotifications}){
  const [customerName,setCustomerName]=useState("");
  const [phone,setPhone]=useState("");
  const [governorate,setGovernorate]=useState("");
  const [address,setAddress]=useState("");
  const [notes,setNotes]=useState("");
  const [orderType,setOrderType]=useState("delivery");
  const [source,setSource]=useState("phone"); // delivery | return | exchange
  const [existingCustomer,setExistingCustomer]=useState(null);

  function lookupCustomer(phoneVal){
    const digits = phoneVal.replace(/\D/g,"");
    if(digits.length < 8){ setExistingCustomer(null); return; }
    // Search in existing orders
    const customerOrders = orders.filter(o=>o.phone?.replace(/\D/g,"")===digits);
    if(customerOrders.length===0){ setExistingCustomer(null); return; }
    const delivered = customerOrders.filter(o=>o.status==="delivered").length;
    const returned  = customerOrders.filter(o=>o.status==="rejected").length;
    const lastOrder = customerOrders[0];
    setExistingCustomer({
      name: lastOrder.customerName,
      governorate: lastOrder.governorate||"",
      address: lastOrder.address||"",
      total: customerOrders.length,
      delivered,
      returned,
    });
  }
  const [items,setItems]=useState([{name:"",qty:1,price:""}]);
  const [err,setErr]=useState("");
  function updateItem(i,k,v){const n=[...items];n[i]={...n[i],[k]:v};setItems(n);}
  function removeItem(i){if(items.length===1)return;setItems(items.filter((_,j)=>j!==i));}
  async function submit(){
    if(!customerName.trim()){setErr("من فضلك اكتب اسم العميل");return;}
    const digits=phone.replace(/\D/g,"");
    if(!phone.trim()){setErr("من فضلك اكتب رقم التليفون");return;}
    if(digits.length!==11){setErr("رقم التليفون لازم يكون 11 رقم (الرقم المكتوب: "+digits.length+" أرقام)");return;}
    if(!governorate){setErr("من فضلك اختار المحافظة");return;}
    if(!address.trim()){setErr("من فضلك اكتب العنوان التفصيلي");return;}
    if(items.some(i=>!i.name?.trim())){setErr("في منتج ناقص اسمه");return;}
    if(items.some(i=>!i.price||parseFloat(i.price)<=0)){setErr("في منتج ناقص سعره");return;}
    const orderTime = today()+" "+new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"});
    const order={id:genId(),customerName:customerName.trim(),phone:phone.trim(),governorate,address:address.trim(),notes,items,status:"pending",orderType,source,salesId:user.id,createdAt:orderTime,commission:0,commPaid:false,commSettings,_createdTs:Date.now(),lastActionAt:Date.now(),auditLog:[{by:user.name,at:now(),action:"تسجيل الطلب",details:"نوع الطلب: "+(orderType==="delivery"?"تسليم":orderType==="return"?"مرتجع":"تبديل")+" | المصدر: "+source}]};
    await dbAddOrder(order);
    setNotifications(prev=>[{
      id:Date.now(),
      orderId:order.id,
      customerName:order.customerName,
      text:`${user.name} سجّل أوردر جديد`,
      time:now(),
      read:false
    },...prev].slice(0,50));
    showToast("تم تسجيل الطلب ✅");setPage("orders");
  }
  const total=calcTotal(items);
  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}><h1 style={S.pageTitle}>تسجيل طلب جديد</h1></div>
      <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:640,border:"1px solid #e2e8f0"}}>
        {err&&<div style={S.err}>{err}</div>}
        <div style={S.formGrid}>
          <Field label="اسم العميل *"><input style={S.input} value={customerName} onChange={e=>setCustomerName(e.target.value)}/></Field>
          <Field label="رقم التليفون * (11 رقم)">
            <input style={{...S.input,borderColor:phone&&phone.replace(/\D/g,"").length!==11&&phone.length>0?"#ef4444":"#e2e8f0"}}
              value={phone}
              onChange={e=>{setPhone(e.target.value);lookupCustomer(e.target.value);}}
              placeholder="01012345678" maxLength={14}/>
            {phone&&phone.replace(/\D/g,"").length!==11&&phone.length>0&&<div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{phone.replace(/\D/g,"").length<11?"ناقص "+(11-phone.replace(/\D/g,"").length)+" أرقام":"زيادة "+(phone.replace(/\D/g,"").length-11)+" أرقام"}</div>}
            {phone&&phone.replace(/\D/g,"").length===11&&<div style={{fontSize:11,color:"#10b981",marginTop:3}}>✓ الرقم صح</div>}
            {existingCustomer&&(
              <div style={{marginTop:8,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:12,color:"#3b82f6",fontWeight:600,marginBottom:4}}>✅ عميل موجود — {existingCustomer.name}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>
                      📦 {existingCustomer.total} طلب سابق &nbsp;|&nbsp;
                      <span style={{color:"#10b981"}}>✅ {existingCustomer.delivered} مُسلَّم</span>
                      {existingCustomer.returned>0&&<span style={{color:"#ef4444"}}> &nbsp;|&nbsp; ↩️ {existingCustomer.returned} مرتجع</span>}
                    </div>
                  </div>
                  <button type="button"
                    style={{fontSize:11,padding:"5px 10px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginRight:8}}
                    onClick={()=>{
                      setCustomerName(existingCustomer.name);
                      if(existingCustomer.governorate)setGovernorate(existingCustomer.governorate);
                      if(existingCustomer.address)setAddress(existingCustomer.address);
                    }}>
                    تعبئة تلقائية ↗
                  </button>
                </div>
              </div>
            )}
          </Field>
        </div>
        <div style={S.formGrid}>
          <Field label="المحافظة *">
            <select style={S.input} value={governorate} onChange={e=>setGovernorate(e.target.value)}>
              <option value="">— اختار المحافظة —</option>
              {EGYPT_GOVS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="العنوان التفصيلي *"><textarea style={{...S.input,height:72,resize:"vertical"}} value={address} onChange={e=>setAddress(e.target.value)} placeholder="الشارع، الحي، رقم المبنى..."/></Field>
        </div>
        <Field label="نوع الطلب">
          <div style={{display:"flex",gap:8}}>
            {[{v:"delivery",l:"📦 تسليم",c:"#10b981",bg:"#d1fae5"},{v:"return",l:"↩️ مرتجع",c:"#ef4444",bg:"#fee2e2"},{v:"exchange",l:"🔄 تبديل",c:"#f59e0b",bg:"#fef3c7"}].map(t=>(
              <button key={t.v} type="button"
                style={{flex:1,padding:"10px 8px",borderRadius:8,border:"2px solid "+(orderType===t.v?t.c:"#e2e8f0"),background:orderType===t.v?t.bg:"#fff",color:orderType===t.v?t.c:"#64748b",fontSize:13,fontWeight:orderType===t.v?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                onClick={()=>setOrderType(t.v)}>
                {t.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="مصدر الأوردر">
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {[
              {v:"phone",l:"📞 مكالمة",c:"#0f2744"},
              {v:"whatsapp",l:"💬 واتساب",c:"#10b981"},
              {v:"facebook",l:"📘 فيسبوك",c:"#3b82f6"},
              {v:"instagram",l:"📸 انستجرام",c:"#8b5cf6"},
              {v:"tiktok",l:"🎵 تيكتوك",c:"#0f2744"},
              {v:"website",l:"🌐 الموقع",c:"#f59e0b"},
            ].map(t=>(
              <button key={t.v} type="button"
                style={{padding:"8px 4px",borderRadius:8,border:"2px solid "+(source===t.v?t.c:"#e2e8f0"),background:source===t.v?t.c+"15":"#fff",color:source===t.v?t.c:"#64748b",fontSize:12,fontWeight:source===t.v?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                onClick={()=>setSource(t.v)}>
                {t.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="ملاحظات"><input style={S.input} value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
        <div style={{borderTop:"1px solid #f1f5f9",paddingTop:16,marginTop:4}}>
          <div style={{...S.dashCardTitle,marginBottom:12}}>📦 المنتجات</div>
          {items.map((item,i)=>(
            <div key={i} style={{background:"#f8fafc",borderRadius:8,padding:10,marginBottom:8,border:"0.5px solid #e2e8f0"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 60px 100px 30px",gap:6,alignItems:"start"}}>
                <div>
                  <select style={{...S.input,fontSize:13,padding:"7px 10px",marginBottom:4}} value={products.includes(item.name)?item.name:"__custom__"} onChange={e=>{if(e.target.value!=="__custom__")updateItem(i,"name",e.target.value);else updateItem(i,"name","");}}>
                    <option value="__custom__">— اختار أو اكتب —</option>
                    {products.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  {(!products.includes(item.name)||item.name==="")&&<input style={{...S.input,fontSize:12,padding:"6px 10px"}} value={item.name} onChange={e=>updateItem(i,"name",e.target.value)} placeholder="اكتب اسم المنتج..."/>}
                </div>
                <input style={{...S.input,fontSize:12,padding:"7px 6px",textAlign:"center"}} type="number" min="1" value={item.qty} onChange={e=>updateItem(i,"qty",e.target.value)} placeholder="كمية"/>
                <input style={{...S.input,fontSize:12,padding:"7px 8px"}} type="number" value={item.price} onChange={e=>updateItem(i,"price",e.target.value)} placeholder="سعر ج.م"/>
                <button style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:6,cursor:"pointer",color:"#ef4444",fontSize:14,padding:"7px 8px",marginTop:4}} onClick={()=>removeItem(i)} disabled={items.length===1}>✕</button>
              </div>
              {item.name&&item.price&&<div style={{fontSize:11,color:"#10b981",marginTop:4,textAlign:"left"}}>إجمالي: {((parseFloat(item.price)||0)*(parseInt(item.qty)||1)).toLocaleString()} ج.م</div>}
            </div>
          ))}
          <button style={{...S.iconBtn,width:"100%",padding:"8px",fontSize:13,color:"#3b82f6",borderColor:"#bfdbfe",background:"#eff6ff",marginBottom:12}} onClick={()=>setItems(p=>[...p,{name:"",qty:1,price:""}])}>+ إضافة منتج آخر</button>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",fontWeight:700,fontSize:15}}>
            <span style={{color:"#15803d"}}>الإجمالي</span><span style={{color:"#15803d"}}>{total.toLocaleString()} ج.م</span>
          </div>
        </div>
        <button style={{...S.btn,marginTop:16}} onClick={submit}>تسجيل الطلب ✅</button>
      </div>
    </div>
  );
}

function CustomersPage({orders,users,setPage}){
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("total_desc");
  const [selected,setSelected]=useState(null);

  // Build customer list from orders
  const customerMap={};
  orders.forEach(o=>{
    const key=o.phone?.replace(/\D/g,"")||o.customerName;
    if(!customerMap[key]){
      customerMap[key]={
        phone:o.phone, name:o.customerName,
        governorate:o.governorate||"",
        firstOrder:o.createdAt, lastOrder:o.createdAt,
        orders:[], totalSpent:0, deliveredCount:0,
      };
    }
    const c=customerMap[key];
    c.orders.push(o);
    if(o.status==="delivered"){
      c.totalSpent+=calcTotal(o.items);
      c.deliveredCount++;
    }
    // keep latest name / gov in case updated
    c.name=o.customerName;
    if(o.governorate)c.governorate=o.governorate;
    c.lastOrder=o.createdAt;
  });

  let customers=Object.values(customerMap);

  // Search
  const q=search.trim().toLowerCase();
  if(q) customers=customers.filter(c=>[c.name,c.phone,c.governorate].join(" ").toLowerCase().includes(q));

  // Sort
  customers.sort((a,b)=>{
    if(sort==="total_desc") return b.totalSpent-a.totalSpent;
    if(sort==="orders_desc") return b.orders.length-a.orders.length;
    if(sort==="name_asc") return a.name.localeCompare(b.name,"ar");
    if(sort==="last_order") return (b.lastOrder||"").localeCompare(a.lastOrder||"");
    return 0;
  });

  // VIP threshold — top 20% by spend
  const sorted=[...customers].sort((a,b)=>b.totalSpent-a.totalSpent);
  const vipThreshold=sorted[Math.floor(sorted.length*0.2)]?.totalSpent||0;

  const totalCustomers=customers.length;
  const totalRevenue=customers.reduce((s,c)=>s+c.totalSpent,0);
  const avgSpend=totalCustomers>0?Math.round(totalRevenue/totalCustomers):0;
  const vipCount=customers.filter(c=>c.totalSpent>=vipThreshold&&vipThreshold>0).length;

  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>قاعدة بيانات العملاء</h1>
        <div style={S.metricsRow}>
          <Metric label="إجمالي العملاء" value={totalCustomers} icon="👥"/>
          <Metric label="إجمالي الإيرادات" value={totalRevenue.toLocaleString()+" ج.م"} icon="💰" color="#10b981"/>
          <Metric label="متوسط الإنفاق" value={avgSpend.toLocaleString()+" ج.م"} icon="📊" color="#3b82f6"/>
          <Metric label="عملاء VIP" value={vipCount} icon="⭐" color="#f59e0b"/>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:200}}>
            <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#94a3b8",pointerEvents:"none"}}>🔍</span>
            <input style={{...S.input,paddingRight:38}} placeholder="ابحث بالاسم أو التليفون أو المحافظة..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select style={{...S.input,width:"auto",minWidth:160}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="total_desc">الأعلى إنفاقاً</option>
            <option value="orders_desc">الأكثر طلبات</option>
            <option value="last_order">آخر طلب</option>
            <option value="name_asc">الاسم أبجدياً</option>
          </select>
          <div style={{fontSize:13,color:"#94a3b8"}}>{customers.length} عميل</div>
        </div>
      </div>

      {customers.length===0?(
        <div style={S.empty}>
          {q?"مفيش عملاء يطابقوا البحث":"لا توجد بيانات عملاء — ابدأ بتسجيل طلبات"}
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {customers.map((c,i)=>{
            const isVip=c.totalSpent>=vipThreshold&&vipThreshold>0&&c.totalSpent>0;
            const pendingOrders=c.orders.filter(o=>["pending","confirmed","shipped"].includes(o.status)).length;
            return(
              <div key={i} style={{...S.orderCard,cursor:"pointer",border:isVip?"1px solid #fcd34d":"0.5px solid #e2e8f0",background:isVip?"#fffbeb":"#fff"}} onClick={()=>setSelected(c)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:isVip?"#fcd34d":"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:isVip?"#92400e":"#475569",flexShrink:0}}>{c.name?.[0]||"؟"}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#0f2744"}}>{c.name}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{c.phone}</div>
                    </div>
                  </div>
                  {isVip&&<span style={{...S.statusBadge,color:"#92400e",background:"#fef3c7",fontSize:10}}>⭐ VIP</span>}
                </div>
                {c.governorate&&<div style={{fontSize:11,color:"#3b82f6",marginBottom:6}}>📍 {c.governorate}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
                  <div style={{background:"#f8fafc",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#94a3b8"}}>الطلبات</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#0f2744"}}>{c.orders.length}</div>
                  </div>
                  <div style={{background:"#f0fdf4",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#94a3b8"}}>الإنفاق</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#10b981"}}>{c.totalSpent.toLocaleString()}</div>
                  </div>
                  <div style={{background:pendingOrders>0?"#fff7ed":"#f8fafc",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#94a3b8"}}>نشط</div>
                    <div style={{fontSize:14,fontWeight:600,color:pendingOrders>0?"#f59e0b":"#94a3b8"}}>{pendingOrders}</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:8}}>آخر طلب: {c.lastOrder}</div>
              </div>
            );
          })}
        </div>
      )}

      {selected&&(
        <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#475569"}}>{selected.name?.[0]||"؟"}</div>
                <div>
                  <div style={{fontSize:16,fontWeight:600,color:"#0f2744"}}>{selected.name}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{selected.phone} {selected.governorate&&"· "+selected.governorate}</div>
                </div>
              </div>
              <button style={S.closeBtn} onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
                <div style={{background:"#f8fafc",borderRadius:8,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>إجمالي الطلبات</div><div style={{fontSize:18,fontWeight:700,color:"#0f2744"}}>{selected.orders.length}</div></div>
                <div style={{background:"#f0fdf4",borderRadius:8,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>إجمالي الإنفاق</div><div style={{fontSize:15,fontWeight:700,color:"#10b981"}}>{selected.totalSpent.toLocaleString()} ج.م</div></div>
                <div style={{background:"#eff6ff",borderRadius:8,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>مُسلَّم</div><div style={{fontSize:18,fontWeight:700,color:"#3b82f6"}}>{selected.deliveredCount}</div></div>
              </div>

              <div style={{...S.sectionTitle,marginBottom:10}}>تاريخ الطلبات</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto"}}>
                {[...selected.orders].reverse().map((o,i)=>{
                  const st=STATUS_MAP[o.status];
                  return(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:"0.5px solid #e2e8f0"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span style={S.orderId}>{o.id}</span>
                          <span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span>
                        </div>
                        <div style={{fontSize:11,color:"#64748b"}}>{o.items?.map(i=>i.name).join(" + ")||"—"}</div>
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{o.createdAt}</div>
                      </div>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#0f2744"}}>{calcTotal(o.items).toLocaleString()} ج.م</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{marginTop:14,display:"flex",gap:8}}>
                <button style={{...S.waBtn,flex:1}} onClick={()=>{const msg="السلام عليكم "+selected.name+" 👋\nعايزين نطمن عليك ونعرف رأيك في المنتج 🙏\nهولمن — ضمان 5 سنين\nwww.holmenpump.com";const d=selected.phone?.replace(/\D/g,"");const intl=d?.startsWith("0")?"2"+d:d;window.open("https://wa.me/"+intl+"?text="+encodeURIComponent(msg),"_blank");}}>
                  📲 تواصل واتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Dashboard({orders,users,setOrders,dbUpdateOrder}){
  const [activeTab,setActiveTab]=useState("overview");
  const [selectedSales,setSelectedSales]=useState("all");
  const delivered=orders.filter(o=>o.status==="delivered");
  const rejected=orders.filter(o=>o.status==="rejected");
  const totalSales=delivered.reduce((s,o)=>s+calcTotal(o.items),0);
  const paidComm=delivered.filter(o=>o.commPaid).reduce((s,o)=>s+o.commission,0);
  const unpaidComm=delivered.filter(o=>!o.commPaid).reduce((s,o)=>s+o.commission,0);
  const salesUsers=users.filter(u=>u.roles?.includes("sales"));
  const userStats=salesUsers.map(u=>{const uo=orders.filter(o=>o.salesId===u.id);const ud=uo.filter(o=>o.status==="delivered");return{user:u,total:uo.length,delivered:ud.length,commission:ud.reduce((s,o)=>s+o.commission,0),paid:ud.filter(o=>o.commPaid).reduce((s,o)=>s+o.commission,0),unpaid:ud.filter(o=>!o.commPaid).reduce((s,o)=>s+o.commission,0)};});
  const reasons={};rejected.forEach(o=>{reasons[o.rejectReason]=(reasons[o.rejectReason]||0)+1;});
  const commOrders=delivered.filter(o=>selectedSales==="all"||o.salesId===parseInt(selectedSales));
  async function togglePaid(id){const o=orders.find(x=>x.id===id);if(!o)return;const updated={...o,commPaid:!o.commPaid};await dbUpdateOrder(updated);}
  function exportCSV(){
    const rows=[["رقم الأوردر","العميل","المحافظة","الإجمالي","العمولة","حالة الدفع","الموظف","التاريخ"]];
    commOrders.forEach(o=>{const su=users.find(u=>u.id===o.salesId);rows.push([o.id,o.customerName,o.governorate||"",calcTotal(o.items),Math.round(o.commission),o.commPaid?"مدفوعة":"معلقة",su?.name||"",o.createdAt]);});
    const csv=rows.map(r=>r.map(c=>'"'+String(c||"").replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="holmen-commissions.csv";a.click();
  }
  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}><h1 style={S.pageTitle}>لوحة التحكم</h1></div>
      <div style={S.metricsRow}>
        <Metric label="إجمالي الطلبات" value={orders.length} icon="📋"/>
        <Metric label="مُسلَّم" value={delivered.length} icon="✅" color="#10b981"/>
        <Metric label="مرتجع" value={rejected.length} icon="↩️" color="#ef4444"/>
        <Metric label="إجمالي المبيعات" value={totalSales.toLocaleString()+" ج.م"} icon="💰" color="#3b82f6"/>
        <Metric label="عمولات مدفوعة" value={Math.round(paidComm).toLocaleString()+" ج.م"} icon="✅" color="#10b981"/>
        <Metric label="عمولات معلقة" value={Math.round(unpaidComm).toLocaleString()+" ج.م"} icon="⏳" color="#f59e0b"/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:"1px solid #e2e8f0"}}>
        {[{id:"overview",label:"نظرة عامة"},{id:"commissions",label:"العمولات"},{id:"orders_table",label:"كل الطلبات"}].map(t=>(
          <button key={t.id} style={{...S.tabBtn,padding:"9px 18px",borderRadius:"8px 8px 0 0",borderBottom:"none",...(activeTab===t.id?{...S.tabBtnActive}:{})}} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {activeTab==="overview"&&(
        <div style={S.dashGrid}>
          <div style={S.dashCard}>
            <div style={S.dashCardTitle}>عمولات الفريق</div>
            <table style={S.table}><thead><tr>{["الموظف","الطلبات","مُسلَّم","الكل","مدفوع","معلق"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{userStats.map(s=><tr key={s.user.id}><td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{...S.avatar,background:roleColor(s.user.roles)}}>{s.user.name[0]}</span>{s.user.name}</div></td><td style={S.td}>{s.total}</td><td style={S.td}>{s.delivered}</td><td style={{...S.td,fontWeight:700,color:"#0f2744"}}>{Math.round(s.commission).toLocaleString()}</td><td style={{...S.td,color:"#10b981",fontWeight:600}}>{Math.round(s.paid).toLocaleString()}</td><td style={{...S.td,color:"#f59e0b",fontWeight:600}}>{Math.round(s.unpaid).toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={S.dashCard}>
            <div style={S.dashCardTitle}>أسباب المرتجعات</div>
            {Object.keys(reasons).length===0?<div style={S.empty}>لا توجد مرتجعات</div>:Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([r,c])=><div key={r} style={S.reasonRow}><span style={{fontSize:13,color:"#374151"}}>{r}</span><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:Math.max(c*30,20),height:6,background:"#ef4444",borderRadius:3,opacity:.7}}/><span style={{fontWeight:600,fontSize:13,color:"#ef4444"}}>{c}</span></div></div>)}
          </div>
        </div>
      )}
      {activeTab==="commissions"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <select style={{...S.input,width:"auto",minWidth:160}} value={selectedSales} onChange={e=>setSelectedSales(e.target.value)}>
              <option value="all">كل الموظفين</option>
              {salesUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"#64748b"}}>إجمالي: <b style={{color:"#0f2744"}}>{Math.round(commOrders.reduce((s,o)=>s+o.commission,0)).toLocaleString()} ج.م</b> | مدفوع: <b style={{color:"#10b981"}}>{Math.round(commOrders.filter(o=>o.commPaid).reduce((s,o)=>s+o.commission,0)).toLocaleString()} ج.م</b> | معلق: <b style={{color:"#f59e0b"}}>{Math.round(commOrders.filter(o=>!o.commPaid).reduce((s,o)=>s+o.commission,0)).toLocaleString()} ج.م</b></span>
              <button style={{...S.btn,width:"auto",padding:"8px 14px",fontSize:13,background:"#10b981"}} onClick={exportCSV}>⬇️ تصدير CSV</button>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{...S.table,width:"100%",minWidth:700}}>
                <thead><tr style={{background:"#f8fafc"}}>{["رقم الأوردر","العميل","الموظف","الإجمالي","العمولة","حالة الدفع","تحديد"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{commOrders.length===0?<tr><td colSpan={7} style={{...S.td,textAlign:"center",color:"#94a3b8"}}>لا توجد أوردرات</td></tr>:commOrders.map(o=>{const su=users.find(u=>u.id===o.salesId);return(
                  <tr key={o.id} style={{background:o.commPaid?"#f0fdf4":"#fff"}}>
                    <td style={S.td}><span style={S.orderId}>{o.id}</span></td>
                    <td style={S.td}><div style={{fontSize:13}}>{o.customerName}</div><div style={{fontSize:11,color:"#94a3b8"}}>{o.createdAt}</div></td>
                    <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{...S.avatar,width:22,height:22,fontSize:10,background:roleColor(su?.roles||[])}}>{su?.name?.[0]}</span>{su?.name}</div></td>
                    <td style={S.td}>{calcTotal(o.items).toLocaleString()} ج.م</td>
                    <td style={{...S.td,fontWeight:700,color:"#f59e0b"}}>{Math.round(o.commission).toLocaleString()} ج.م</td>
                    <td style={S.td}><span style={{...S.statusBadge,color:o.commPaid?"#10b981":"#f59e0b",background:o.commPaid?"#d1fae5":"#fef3c7"}}>{o.commPaid?"✅ مدفوعة":"⏳ معلقة"}</span></td>
                    <td style={S.td}><button onClick={()=>togglePaid(o.id)} style={{...S.iconBtn,fontSize:12,color:o.commPaid?"#ef4444":"#10b981",borderColor:o.commPaid?"#fecaca":"#bbf7d0",background:o.commPaid?"#fff5f5":"#f0fdf4"}}>{o.commPaid?"↩️ إلغاء":"✅ سُدِّدت"}</button></td>
                  </tr>
                );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab==="orders_table"&&(
        <div style={S.dashCard}>
          <div style={S.dashCardTitle}>كل الطلبات</div>
          <div style={{overflowX:"auto"}}>
            <table style={{...S.table,width:"100%",minWidth:800}}>
              <thead><tr>{["رقم الطلب","العميل","المحافظة","المنتجات","الإجمالي","الحالة","المبيعات","الشحن","العمولة"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{orders.length===0?<tr><td colSpan={9} style={{...S.td,textAlign:"center",color:"#94a3b8"}}>لا توجد طلبات</td></tr>:orders.map(o=>{const st=STATUS_MAP[o.status];const su=users.find(u=>u.id===o.salesId);return(<tr key={o.id}><td style={S.td}><span style={S.orderId}>{o.id}</span></td><td style={S.td}>{o.customerName}</td><td style={S.td}>{o.governorate||"—"}</td><td style={S.td}><span style={{fontSize:11,color:"#64748b"}}>{o.items?.length||0} منتج</span></td><td style={S.td}>{calcTotal(o.items).toLocaleString()}</td><td style={S.td}><span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span></td><td style={S.td}>{su?.name||"—"}</td><td style={S.td}>{o.shippingCompany||"—"}</td><td style={{...S.td,color:"#10b981",fontWeight:600}}>{o.commission?Math.round(o.commission).toLocaleString()+" ج.م":"—"}</td></tr>);})}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({title,children}){return <div style={{marginBottom:20}}><div style={S.sectionTitle}>{title}</div>{children}</div>;}
function Row({label,value,tag,sub}){return <div style={S.row}><span style={S.rowLabel}>{label}</span><span style={S.rowValue}>{tag&&<span style={{...S.avatar,width:20,height:20,fontSize:10,marginLeft:6}}>{tag}</span>}{value}{sub&&<span style={{color:"#94a3b8",fontSize:11,display:"block"}}>{sub}</span>}</span></div>;}
function Field({label,children}){return <div style={{marginBottom:12}}><div style={S.subLabel}>{label}</div>{children}</div>;}
function ActionBox({title,children}){return <div style={S.actionBox}><div style={S.sectionTitle}>{title}</div>{children}</div>;}
function Metric({label,value,icon,color="#374151"}){return <div style={S.metricCard}><div style={S.metricIcon}>{icon}</div><div style={{...S.metricVal,color}}>{value}</div><div style={S.metricLabel}>{label}</div></div>;}

function AnalyticsPage({orders}){
  const delivered = orders.filter(o=>o.status==="delivered");
  const total = orders.length;

  // Source breakdown
  const sources = {};
  const sourceLabels = {phone:"📞 مكالمة",whatsapp:"💬 واتساب",facebook:"📘 فيسبوك",instagram:"📸 انستجرام",tiktok:"🎵 تيكتوك",website:"🌐 الموقع"};
  orders.forEach(o=>{const s=o.source||"phone";sources[s]=(sources[s]||0)+1;});
  const sourceData=Object.entries(sources).sort((a,b)=>b[1]-a[1]);
  const maxSource=sourceData[0]?.[1]||1;

  // Governorate breakdown
  const govs={};
  orders.forEach(o=>{if(o.governorate)govs[o.governorate]=(govs[o.governorate]||0)+1;});
  const govData=Object.entries(govs).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxGov=govData[0]?.[1]||1;

  // Shipping breakdown
  const ships={};
  delivered.forEach(o=>{if(o.shippingCompany)ships[o.shippingCompany]=(ships[o.shippingCompany]||0)+1;});
  const shipData=Object.entries(ships).sort((a,b)=>b[1]-a[1]);
  const maxShip=shipData[0]?.[1]||1;

  // Delivery rate by source
  const sourceDelivery={};
  Object.keys(sources).forEach(s=>{
    const sOrders=orders.filter(o=>(o.source||"phone")===s);
    const sDel=sOrders.filter(o=>o.status==="delivered").length;
    sourceDelivery[s]=sOrders.length>0?Math.round((sDel/sOrders.length)*100):0;
  });

  // Order type breakdown
  const types={delivery:0,return:0,exchange:0};
  orders.forEach(o=>{const t=o.orderType||"delivery";types[t]=(types[t]||0)+1;});

  // Revenue by source
  const sourceRevenue={};
  delivered.forEach(o=>{const s=o.source||"phone";sourceRevenue[s]=(sourceRevenue[s]||0)+calcTotal(o.items);});

  const totalRevenue=delivered.reduce((s,o)=>s+calcTotal(o.items),0);
  const deliveryRate=total>0?Math.round((delivered.length/total)*100):0;
  const returnRate=total>0?Math.round((orders.filter(o=>o.status==="rejected").length/total)*100):0;

  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}><h1 style={S.pageTitle}>📈 تحليلات المبيعات</h1></div>

      {/* Overview metrics */}
      <div style={S.metricsRow}>
        <Metric label="إجمالي الطلبات" value={total} icon="📋"/>
        <Metric label="مُسلَّم" value={delivered.length} icon="✅" color="#10b981"/>
        <Metric label="معدل التسليم" value={deliveryRate+"%"} icon="📊" color={deliveryRate>=70?"#10b981":"#f59e0b"}/>
        <Metric label="معدل المرتجع" value={returnRate+"%"} icon="↩️" color={returnRate>20?"#ef4444":"#64748b"}/>
        <Metric label="إجمالي الإيرادات" value={totalRevenue.toLocaleString()+" ج.م"} icon="💰" color="#3b82f6"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:16}}>

        {/* Source breakdown */}
        <div style={S.dashCard}>
          <div style={S.dashCardTitle}>📡 مصادر الطلبات</div>
          {sourceData.length===0?<div style={S.empty}>لا بيانات</div>:sourceData.map(([s,c])=>(
            <div key={s} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#374151"}}>{sourceLabels[s]||s}</span>
                <div style={{display:"flex",gap:10,fontSize:12}}>
                  <span style={{color:"#64748b"}}>{c} طلب ({Math.round(c/total*100)}%)</span>
                  <span style={{color:"#10b981"}}>تسليم: {sourceDelivery[s]}%</span>
                </div>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
                <div style={{height:6,width:(c/maxSource*100)+"%",background:"#3b82f6",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Governorate breakdown */}
        <div style={S.dashCard}>
          <div style={S.dashCardTitle}>📍 توزيع المحافظات</div>
          {govData.length===0?<div style={S.empty}>لا بيانات</div>:govData.map(([g,c])=>(
            <div key={g} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#374151"}}>{g}</span>
                <span style={{fontSize:12,color:"#64748b"}}>{c} طلب ({Math.round(c/total*100)}%)</span>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
                <div style={{height:6,width:(c/maxGov*100)+"%",background:"#10b981",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Shipping breakdown */}
        <div style={S.dashCard}>
          <div style={S.dashCardTitle}>🚚 شركات الشحن والمناديب</div>
          {shipData.length===0?<div style={S.empty}>لا توجد بيانات شحن بعد</div>:shipData.map(([s,c])=>(
            <div key={s} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#374151"}}>{s}</span>
                <span style={{fontSize:12,color:"#64748b"}}>{c} تسليم ({Math.round(c/delivered.length*100)}%)</span>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
                <div style={{height:6,width:(c/maxShip*100)+"%",background:"#8b5cf6",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Order type breakdown */}
        <div style={S.dashCard}>
          <div style={S.dashCardTitle}>📦 أنواع الطلبات</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            {[{k:"delivery",l:"تسليم",c:"#10b981",i:"📦"},{k:"return",l:"مرتجع",c:"#ef4444",i:"↩️"},{k:"exchange",l:"تبديل",c:"#f59e0b",i:"🔄"}].map(t=>(
              <div key={t.k} style={{flex:1,minWidth:80,background:t.c+"15",borderRadius:10,padding:"12px 8px",textAlign:"center",border:"1px solid "+t.c+"30"}}>
                <div style={{fontSize:20}}>{t.i}</div>
                <div style={{fontSize:18,fontWeight:700,color:t.c,marginTop:4}}>{types[t.k]||0}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{t.l}</div>
                <div style={{fontSize:11,color:t.c}}>{total>0?Math.round(((types[t.k]||0)/total)*100):0}%</div>
              </div>
            ))}
          </div>

          {/* Revenue by source */}
          <div style={{...S.sectionTitle,marginBottom:10}}>إيرادات حسب المصدر</div>
          {Object.entries(sourceRevenue).sort((a,b)=>b[1]-a[1]).map(([s,rev])=>(
            <div key={s} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid #f8fafc",fontSize:13}}>
              <span style={{color:"#374151"}}>{sourceLabels[s]||s}</span>
              <span style={{fontWeight:600,color:"#10b981"}}>{rev.toLocaleString()} ج.م</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformancePage({orders,users}){
  const salesUsers=users.filter(u=>u.roles?.includes("sales"));
  const nowTs=Date.now(), day=86400000;
  function uStats(u){
    const my=orders.filter(o=>o.salesId===u.id);
    const del=my.filter(o=>o.status==="delivered");
    const rej=my.filter(o=>o.status==="rejected");
    const pen=my.filter(o=>o.status==="pending");
    const revenue=del.reduce((s,o)=>s+calcTotal(o.items),0);
    const commission=del.reduce((s,o)=>s+o.commission,0);
    const dRate=my.length>0?Math.round((del.length/my.length)*100):0;
    const recent=my.filter(o=>o._createdTs&&(nowTs-o._createdTs)<7*day).length;
    const last30=my.filter(o=>o._createdTs&&(nowTs-o._createdTs)<30*day).length;
    const score=Math.min(100,Math.round(dRate*0.5+Math.min(recent*10,30)+Math.min(del.length*2,20)));
    return{u,total:my.length,del:del.length,rej:rej.length,pen:pen.length,revenue,commission,dRate,recent,avg:(last30/30).toFixed(1),score};
  }
  const stats=salesUsers.map(uStats).sort((a,b)=>b.score-a.score);
  const sc=s=>s>=80?"#10b981":s>=60?"#f59e0b":"#ef4444";
  const sl=s=>s>=80?"ممتاز 🌟":s>=60?"جيد 👍":s>=40?"متوسط ⚠️":"يحتاج تحسين 🔴";
  const totDel=orders.filter(o=>o.status==="delivered").length;
  const totRev=orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+calcTotal(o.items),0);
  const teamRate=orders.length>0?Math.round((totDel/orders.length)*100):0;
  return(
    <div style={S.pageWrap}>
      <div style={S.pageHeader}><h1 style={S.pageTitle}>🏆 أداء الفريق</h1></div>
      <div style={S.metricsRow}>
        <Metric label="الفريق" value={salesUsers.length+" موظف"} icon="👥"/>
        <Metric label="إجمالي الطلبات" value={orders.length} icon="📋"/>
        <Metric label="مُسلَّم" value={totDel} icon="✅" color="#10b981"/>
        <Metric label="معدل التسليم" value={teamRate+"%"} icon="📊" color={teamRate>=70?"#10b981":"#f59e0b"}/>
        <Metric label="إجمالي الإيرادات" value={totRev.toLocaleString()+" ج.م"} icon="💰" color="#3b82f6"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {stats.length===0?<div style={S.empty}>لا يوجد موظفو مبيعات</div>:stats.map((s,rank)=>(
          <div key={s.u.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:"1px solid #f1f5f9"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:sc(s.score),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>
                {rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":rank+1}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:600,color:"#0f2744"}}>{s.u.name}</div>
                <div style={{fontSize:12,color:"#64748b"}}>آخر ٧ أيام: {s.recent} طلب | متوسط يومي: {s.avg}</div>
              </div>
              <div style={{textAlign:"center",minWidth:60}}>
                <div style={{fontSize:24,fontWeight:800,color:sc(s.score)}}>{s.score}</div>
                <div style={{fontSize:11,color:sc(s.score),fontWeight:500}}>{sl(s.score)}</div>
              </div>
            </div>
            <div style={{height:4,background:"#f1f5f9"}}>
              <div style={{height:4,width:s.score+"%",background:sc(s.score)}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))"}}>
              {[
                {l:"الطلبات",v:s.total,i:"📋",c:"#0f2744"},
                {l:"مُسلَّم",v:s.del,i:"✅",c:"#10b981"},
                {l:"مرتجع",v:s.rej,i:"↩️",c:"#ef4444"},
                {l:"معلق",v:s.pen,i:"⏳",c:"#f59e0b"},
                {l:"معدل التسليم",v:s.dRate+"%",i:"📊",c:s.dRate>=70?"#10b981":"#f59e0b"},
                {l:"الإيرادات",v:s.revenue.toLocaleString()+" ج.م",i:"💰",c:"#3b82f6"},
                {l:"العمولات",v:Math.round(s.commission).toLocaleString()+" ج.م",i:"🏆",c:"#8b5cf6"},
              ].map((item,i)=>(
                <div key={i} style={{padding:"12px 10px",textAlign:"center",borderRight:i<6?"0.5px solid #f1f5f9":"none"}}>
                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>{item.i} {item.l}</div>
                  <div style={{fontSize:12,fontWeight:600,color:item.c}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


const S={
  app:{display:"block",minHeight:"100vh",fontFamily:"'Cairo',sans-serif",direction:"rtl",background:"#f8fafc"},
  main:{minHeight:"100vh",overflow:"auto"},
  loginWrap:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc"},
  loginCard:{width:360,background:"#fff",borderRadius:16,padding:32,boxShadow:"0 4px 24px rgba(0,0,0,.08)",display:"flex",flexDirection:"column",gap:12},
  loginLogo:{display:"flex",alignItems:"center",gap:14,marginBottom:12},
  logoMark:{width:44,height:44,background:"#0f4c81",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:22},
  logoName:{fontSize:22,fontWeight:800,color:"#0f4c81"},
  logoSub:{fontSize:12,color:"#94a3b8"},
  loginHint:{fontSize:11,color:"#94a3b8",textAlign:"center",marginTop:4},
  sidebar:{width:220,background:"#0f2744",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:20,minHeight:"100vh",flexShrink:0},
  sideTop:{display:"flex",flexDirection:"column",gap:20},
  sideLogoWrap:{display:"flex",alignItems:"center",gap:10,paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,.1)"},
  userBadge:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,.07)",borderRadius:10},
  avatar:{width:28,height:28,borderRadius:"50%",background:"#0f4c81",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0},
  navBtn:{width:"100%",padding:"10px 14px",borderRadius:8,border:"none",background:"transparent",color:"#94a3b8",fontSize:14,textAlign:"right",cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:4},
  navBtnActive:{background:"rgba(255,255,255,.1)",color:"#fff"},
  logoutBtn:{background:"rgba(255,255,255,.05)",border:"none",color:"#94a3b8",padding:"10px 14px",borderRadius:8,cursor:"pointer",fontSize:13,textAlign:"right"},
  pageWrap:{padding:"16px 16px 80px 16px"},
  pageHeader:{marginBottom:24},
  pageTitle:{fontSize:22,fontWeight:700,color:"#0f2744",marginBottom:16},
  filterRow:{display:"flex",gap:8,flexWrap:"wrap"},
  filterBtn:{padding:"6px 14px",borderRadius:20,border:"1px solid #e2e8f0",background:"#fff",fontSize:13,color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center",gap:6},
  filterBtnActive:{background:"#0f2744",color:"#fff",borderColor:"#0f2744"},
  filterCount:{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"1px 7px",fontSize:11},
  orderList:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12},
  orderCard:{background:"#fff",borderRadius:12,padding:16,border:"1px solid #e2e8f0",cursor:"pointer"},
  orderCardTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},
  orderId:{fontFamily:"monospace",fontSize:12,background:"#f1f5f9",padding:"2px 8px",borderRadius:6,color:"#475569"},
  statusBadge:{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600},
  orderCustomer:{fontSize:15,fontWeight:600,color:"#0f2744",marginBottom:6},
  orderMeta:{display:"flex",gap:16,fontSize:12,color:"#64748b",marginTop:4},
  empty:{textAlign:"center",color:"#94a3b8",padding:48,fontSize:14},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16},
  modal:{background:"#fff",borderRadius:16,width:"100%",maxWidth:540,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"},
  modalHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px 16px",borderBottom:"1px solid #f1f5f9"},
  modalBody:{padding:24},
  closeBtn:{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#94a3b8",padding:4},
  tabBtn:{padding:"5px 14px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,cursor:"pointer",color:"#64748b",fontFamily:"inherit"},
  tabBtnActive:{background:"#0f2744",color:"#fff",borderColor:"#0f2744"},
  sectionTitle:{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:10},
  row:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:"1px solid #f8fafc"},
  rowLabel:{fontSize:13,color:"#94a3b8"},
  rowValue:{fontSize:13,color:"#1e293b",fontWeight:500,textAlign:"left"},
  commissionBox:{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,color:"#15803d"},
  actionBox:{background:"#f8fafc",borderRadius:10,padding:16,marginTop:8},
  subLabel:{fontSize:12,color:"#64748b",marginBottom:6,fontWeight:500},
  formGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12},
  input:{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:16,background:"#fff",color:"#1e293b",fontFamily:"inherit",outline:"none",boxSizing:"border-box"},
  btn:{width:"100%",padding:"12px",background:"#0f2744",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  actionBtn:{width:"100%",padding:"10px",background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  waBtn:{width:"100%",padding:"9px",background:"#dcfce7",color:"#15803d",border:"1px solid #86efac",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6},
  iconBtn:{padding:"5px 12px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,cursor:"pointer",color:"#475569",fontFamily:"inherit"},
  err:{background:"#fee2e2",color:"#ef4444",padding:"8px 12px",borderRadius:8,fontSize:13,marginBottom:8},
  metricsRow:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20},
  metricCard:{background:"#fff",borderRadius:12,padding:16,textAlign:"center",border:"1px solid #e2e8f0"},
  metricIcon:{fontSize:22,marginBottom:4},
  metricVal:{fontSize:20,fontWeight:700,marginBottom:2},
  metricLabel:{fontSize:12,color:"#94a3b8"},
  dashGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:20},
  dashCard:{background:"#fff",borderRadius:12,padding:20,border:"1px solid #e2e8f0"},
  dashCardTitle:{fontSize:14,fontWeight:700,color:"#0f2744",marginBottom:14},
  table:{width:"100%",borderCollapse:"collapse"},
  th:{fontSize:12,color:"#94a3b8",textAlign:"right",padding:"6px 10px",borderBottom:"1px solid #f1f5f9",fontWeight:600},
  td:{fontSize:13,color:"#374151",padding:"10px",borderBottom:"1px solid #f8fafc"},
  reasonRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f8fafc"},
  toast:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",color:"#fff",padding:"10px 24px",borderRadius:24,fontSize:14,fontWeight:600,zIndex:200,boxShadow:"0 4px 16px rgba(0,0,0,.15)"},
};
