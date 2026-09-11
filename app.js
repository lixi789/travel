
(() => {
  const CONFIG = window.APP_CONFIG || {};
  const CLOUD = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
  const sb = CLOUD ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);

  const E = {
    countries:$("countries"), empty:$("emptyState"), done:$("doneCount"), total:$("totalCount"),
    bar:$("progressBar"), pct:$("percentText"), conn:$("connectionText"), authBtn:$("authBtn"),
    authDialog:$("authDialog"), authEmail:$("authEmail"), authPassword:$("authPassword"), loginBtn:$("loginBtn"),
    addCountry:$("addCountryBtn"), countryDialog:$("countryDialog"), countryId:$("countryId"),
    countryFlag:$("countryFlag"), countryName:$("countryName"), deleteCountry:$("deleteCountryBtn"),
    placeDialog:$("placeDialog"), placeId:$("placeId"), placeCountry:$("placeCountry"),
    placeName:$("placeName"), placeKind:$("placeKind"),
    album:$("album"), albumHero:$("albumHero"), albumCover:$("albumCover"), albumCountry:$("albumCountry"),
    albumTitle:$("albumTitle"), albumOneLine:$("albumOneLine"), checkin:$("checkinBtn"),
    checkinText:$("checkinText"), date:$("tripDate"), route:$("routeText"), memory:$("memoryText"),
    galleryLoader:$("galleryLoader"), gallery:$("gallery"), galleryEmpty:$("galleryEmpty"), photoInput:$("photoInput"),
    editPlace:$("editPlaceBtn"), deletePlace:$("deletePlaceBtn"), toast:$("toast")
  };

  const state = { countries:[], places:[], currentPlace:null, user:null, photos:[], canEdit:false };
  let realtimeChannel = null;
  let saveTimer = null;
  let objectUrls = [];

  // Fast-path caches
  const STATE_CACHE_KEY = "hiking.public.state.v8";
  const PHOTO_META_TTL = 5 * 60 * 1000;
  const SIGNED_URL_TTL = 45 * 60 * 1000;
  const photoMetaCache = new Map();   // placeId -> {rows, ts}
  const signedUrlCache = new Map();   // storagePath -> {url, expires}
  let coverWarmupScheduled = false;

  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (s="") => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));

  function toast(text="已保存"){
    E.toast.textContent = text;
    E.toast.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => E.toast.classList.remove("show"), 1000);
  }
  function openDialog(dialog){ if (!dialog.open) dialog.showModal(); }
  function closeDialog(id){ const d=$(id); if (d?.open) d.close(); }
  function clearObjectUrls(){ objectUrls.forEach(URL.revokeObjectURL); objectUrls=[]; }

  function setGalleryLoading(loading,text="先加载封面，再把相册慢慢带来…"){
    E.galleryLoader.classList.toggle("hidden", !loading);
    const textNode = E.galleryLoader.querySelector(".gallery-loader-text");
    if(textNode) textNode.textContent = text;
  }

  function setAlbumCover(url){
    E.albumHero.classList.toggle("has-cover", !!url);
    if(url) E.albumCover.src = url;
    else E.albumCover.removeAttribute("src");
  }

  function getCoverRow(rows){
    return (rows||[]).find(r=>r.is_cover) || (rows||[])[0] || null;
  }

  async function cloudPhotoRows(placeId,{force=false}={}){
    if(!force){
      const cached=getCachedPhotoRows(placeId);
      if(cached) return cached;
    }

    const {data,error}=await sb.from("photos")
      .select("*").eq("place_id",placeId).order("created_at");
    if(error) throw error;

    const rows=data||[];
    cachePhotoRows(placeId,rows);
    return rows;
  }

  function photoPathFor(row,mode="gallery"){
    if(mode==="cover"){
      return row.preview_path || row.thumbnail_path || row.storage_path;
    }
    return row.thumbnail_path || row.preview_path || row.storage_path;
  }

  async function cloudSignedUrls(rows,mode="gallery"){
    if(!rows?.length) return [];

    const paths=rows.map(row=>photoPathFor(row,mode)).filter(Boolean);
    const missingPaths=[...new Set(paths.filter(path=>!cachedSignedUrl(path)))];

    if(missingPaths.length){
      const {data,error}=await sb.storage
        .from("trip-photos")
        .createSignedUrls(missingPaths,3600);

      if(error){
        console.warn(error);
      }else{
        for(const item of data||[]){
          const path=item.path || item.storagePath;
          const url=item.signedUrl || item.signedURL;
          if(path && url) rememberSignedUrl(path,url);
        }
      }
    }

    return rows.map(row=>{
      const signedPath=photoPathFor(row,mode);
      return {
        ...row,
        url:cachedSignedUrl(signedPath),
        signed_path:signedPath
      };
    });
  }

  async function cloudSignedPhoto(rec,mode="cover"){
    if(!rec) return null;
    const [signed]=await cloudSignedUrls([rec],mode);
    return signed || {...rec,url:""};
  }

  async function preloadAllPhotoMetaAndCovers(){
    if(!CLOUD || coverWarmupScheduled) return;
    coverWarmupScheduled=true;

    requestIdle(async()=>{
      try{
        const {data,error}=await sb.from("photos")
          .select("*").order("created_at");
        if(error) throw error;

        const grouped=new Map();
        for(const row of data||[]){
          if(!grouped.has(row.place_id)) grouped.set(row.place_id,[]);
          grouped.get(row.place_id).push(row);
        }

        const covers=[];
        for(const [placeId,rows] of grouped){
          cachePhotoRows(placeId,rows);
          const cover=getCoverRow(rows);
          if(cover) covers.push(cover);
        }

        // Warm every album cover in one batch after the home page is already visible.
        await cloudSignedUrls(covers,"cover");
      }catch(e){
        console.warn("Background cover prefetch skipped:",e);
      }finally{
        coverWarmupScheduled=false;
      }
    });
  }


  function loadCachedPublicState(){
    try{
      const raw=localStorage.getItem(STATE_CACHE_KEY);
      if(!raw) return false;
      const cached=JSON.parse(raw);
      if(!cached?.countries || !cached?.places) return false;
      state.countries=cached.countries;
      state.places=cached.places;
      return true;
    }catch(e){
      return false;
    }
  }

  function saveCachedPublicState(){
    try{
      localStorage.setItem(STATE_CACHE_KEY,JSON.stringify({
        countries:state.countries,
        places:state.places,
        savedAt:Date.now()
      }));
    }catch(e){}
  }

  function requestIdle(fn){
    if("requestIdleCallback" in window){
      requestIdleCallback(fn,{timeout:1200});
    }else{
      setTimeout(fn,250);
    }
  }

  function cachePhotoRows(placeId,rows){
    photoMetaCache.set(placeId,{rows,ts:Date.now()});
  }

  function getCachedPhotoRows(placeId){
    const hit=photoMetaCache.get(placeId);
    if(!hit) return null;
    if(Date.now()-hit.ts>PHOTO_META_TTL){
      photoMetaCache.delete(placeId);
      return null;
    }
    return hit.rows;
  }

  function cachedSignedUrl(path){
    const hit=signedUrlCache.get(path);
    if(!hit) return "";
    if(Date.now()>=hit.expires){
      signedUrlCache.delete(path);
      return "";
    }
    return hit.url;
  }

  function rememberSignedUrl(path,url){
    if(!url) return;
    signedUrlCache.set(path,{url,expires:Date.now()+SIGNED_URL_TTL});
  }

  function assertCanEdit(){
    if(!state.canEdit) throw new Error("当前为只读浏览模式。请使用有编辑权限的账号登录。");
  }

  function applyEditMode(){
    E.addCountry.classList.toggle("hidden", !state.canEdit);
    E.editPlace.classList.toggle("hidden", !state.canEdit);
    E.deletePlace.classList.toggle("hidden", !state.canEdit);

    const upload = E.photoInput.closest(".upload-pill");
    if(upload) upload.classList.toggle("hidden", !state.canEdit);

    E.checkin.disabled = !state.canEdit;
    E.checkin.setAttribute("aria-disabled", state.canEdit ? "false" : "true");
    E.date.disabled = !state.canEdit;
    E.route.readOnly = !state.canEdit;
    E.memory.readOnly = !state.canEdit;

    const emptyAdd = E.empty.querySelector("button");
    if(emptyAdd) emptyAdd.classList.toggle("hidden", !state.canEdit);
  }

  // ---------------- Local preview backend ----------------
  const LOCAL_DATA_KEY = "hiking.shared.v3.data";

  async function localInit(){
    const saved = localStorage.getItem(LOCAL_DATA_KEY);
    if(saved){
      const parsed = JSON.parse(saved);
      state.countries = parsed.countries || [];
      state.places = parsed.places || [];
    } else {
      const seed = await fetch("./seed.json").then(r => r.json());
      state.countries = seed.map(c => ({
        id:c.id,name:c.name,flag:c.flag,sort_order:c.sort_order
      }));
      state.places = seed.flatMap(c => c.places.map(p => ({
        ...p,country_id:c.id,trip_date:null,memory_text:""
      })));
      localPersist();
    }
    state.user = { email:"本地预览" };
    state.canEdit = true;
  }
  function localPersist(){
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify({
      countries:state.countries, places:state.places
    }));
  }
  function openLocalPhotoDB(){
    return new Promise((resolve,reject) => {
      const req = indexedDB.open("HikingSharedAlbumLocal",1);
      req.onupgradeneeded = () => {
        const db=req.result;
        if(!db.objectStoreNames.contains("photos")){
          const s=db.createObjectStore("photos",{keyPath:"id"});
          s.createIndex("place_id","place_id",{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function localPhotoList(placeId){
    const db=await openLocalPhotoDB();
    const rows=await new Promise((resolve,reject)=>{
      const tx=db.transaction("photos","readonly");
      const req=tx.objectStore("photos").index("place_id").getAll(IDBKeyRange.only(placeId));
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return rows.sort((a,b)=>a.created_at-b.created_at);
  }
  async function localPhotoAdd(placeId,file){
    const db=await openLocalPhotoDB();
    const rec={id:uuid(),place_id:placeId,blob:file,name:file.name,created_at:Date.now(),is_cover:false};
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("photos","readwrite");
      tx.objectStore("photos").put(rec);
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }
  async function localPhotoDelete(id){
    const db=await openLocalPhotoDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("photos","readwrite");
      tx.objectStore("photos").delete(id);
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }
  async function localPhotoSetCover(placeId,id){
    const rows=await localPhotoList(placeId);
    const db=await openLocalPhotoDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("photos","readwrite");
      const s=tx.objectStore("photos");
      rows.forEach(r=>{r.is_cover=r.id===id;s.put(r)});
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  // ---------------- Supabase backend ----------------
  async function requireMember(){
    const {data:{session}} = await sb.auth.getSession();
    state.user = session?.user || null;
    if(!state.user) return false;

    const {data,error} = await sb.from("app_members")
      .select("user_id,display_name")
      .eq("user_id",state.user.id)
      .maybeSingle();

    if(error) throw error;
    return Boolean(data);
  }

  async function cloudLoad(){
    const [c,p] = await Promise.all([
      sb.from("countries").select("*").order("sort_order").order("created_at"),
      sb.from("places").select("*").order("sort_order").order("created_at")
    ]);
    if(c.error) throw c.error;
    if(p.error) throw p.error;
    state.countries = c.data || [];
    state.places = p.data || [];
    saveCachedPublicState();
  }

  function subscribeRealtime(){
    if(!CLOUD) return;
    if(realtimeChannel) sb.removeChannel(realtimeChannel);

    realtimeChannel = sb.channel("shared-hiking-album")
      .on("postgres_changes",{event:"*",schema:"public",table:"countries"}, refreshFromCloud)
      .on("postgres_changes",{event:"*",schema:"public",table:"places"}, async () => {
        await refreshFromCloud();
        if(state.currentPlace){
          const p=state.places.find(x=>x.id===state.currentPlace.id);
          if(p){state.currentPlace={...p};syncAlbumFields()}
        }
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"photos"}, payload => {
        const placeId=payload.new?.place_id || payload.old?.place_id;
        if(placeId) photoMetaCache.delete(placeId);
        if(state.currentPlace && (!placeId || state.currentPlace.id===placeId)) renderPhotos();
      })
      .subscribe();
  }

  async function refreshFromCloud(){
    try{ await cloudLoad(); render(); }catch(e){ console.error(e); }
  }

  // ---------------- CRUD ----------------
  async function saveCountry(id,name,flag){
    assertCanEdit();
    if(CLOUD){
      const payload={name,flag};
      if(id){
        const {error}=await sb.from("countries").update(payload).eq("id",id);
        if(error) throw error;
      }else{
        payload.sort_order=(state.countries.at(-1)?.sort_order||0)+10;
        const {error}=await sb.from("countries").insert(payload);
        if(error) throw error;
      }
      await cloudLoad();
    }else{
      if(id){
        const c=state.countries.find(x=>x.id===id);
        Object.assign(c,{name,flag});
      }else{
        state.countries.push({
          id:uuid(),name,flag,sort_order:(state.countries.at(-1)?.sort_order||0)+10
        });
      }
      localPersist();
    }
    render();
  }

  async function deleteCountry(id){
    assertCanEdit();
    if(CLOUD){
      const {error}=await sb.from("countries").delete().eq("id",id);
      if(error) throw error;
      await cloudLoad();
    }else{
      state.countries=state.countries.filter(x=>x.id!==id);
      state.places=state.places.filter(x=>x.country_id!==id);
      localPersist();
    }
    render();
  }

  async function savePlace(id,country_id,name,kind){
    assertCanEdit();
    if(CLOUD){
      const payload={country_id,name,kind};
      if(id){
        const {error}=await sb.from("places").update(payload).eq("id",id);
        if(error) throw error;
      }else{
        payload.sort_order=Math.max(0,...state.places.filter(x=>x.country_id===country_id).map(x=>x.sort_order||0))+10;
        const {error}=await sb.from("places").insert(payload);
        if(error) throw error;
      }
      await cloudLoad();
    }else{
      if(id){
        const p=state.places.find(x=>x.id===id);
        Object.assign(p,{country_id,name,kind});
      }else{
        state.places.push({
          id:uuid(),country_id,name,kind,completed:false,sort_order:10,
          trip_date:null,route_text:"",memory_text:""
        });
      }
      localPersist();
    }
    render();
  }

  async function updatePlace(id,patch,{quiet=false}={}){
    assertCanEdit();
    if(CLOUD){
      const {error}=await sb.from("places").update(patch).eq("id",id);
      if(error) throw error;
    }else{
      const p=state.places.find(x=>x.id===id);
      Object.assign(p,patch);
      localPersist();
    }

    const cached=state.places.find(x=>x.id===id);
    if(cached) Object.assign(cached,patch);
    if(state.currentPlace?.id===id) Object.assign(state.currentPlace,patch);

    render();
    if(!quiet) toast();
  }

  async function deletePlace(id){
    assertCanEdit();
    if(CLOUD){
      const {error}=await sb.from("places").delete().eq("id",id);
      if(error) throw error;
      await cloudLoad();
    }else{
      state.places=state.places.filter(x=>x.id!==id);
      localPersist();
    }
    closeAlbum();
    render();
  }

  // ---------------- Render home ----------------
  function render(){
    E.countries.innerHTML="";
    E.empty.classList.toggle("hidden", state.countries.length>0);

    for(const c of state.countries){
      const places=state.places
        .filter(p=>p.country_id===c.id)
        .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

      const card=document.createElement("article");
      card.className="country-card";
      card.innerHTML=`
        <div class="country-head">
          <div class="country-flag">${esc(c.flag||"🌍")}</div>
          <div>
            <div class="country-title">${esc(c.name)}</div>
            <div class="country-meta">${places.length} 个地点</div>
          </div>
          ${state.canEdit ? `
          <div class="country-actions">
            <button class="icon-btn add-place" title="添加路线">＋</button>
            <button class="icon-btn edit-country" title="编辑国家">⋯</button>
          </div>` : ""}
        </div>
        <div class="place-grid"></div>`;

      const addPlaceBtn=card.querySelector(".add-place");
      const editCountryBtn=card.querySelector(".edit-country");
      if(addPlaceBtn) addPlaceBtn.onclick=()=>openPlaceEditor(null,c.id);
      if(editCountryBtn) editCountryBtn.onclick=()=>openCountryEditor(c.id);

      const grid=card.querySelector(".place-grid");
      places.forEach(p=>{
        const btn=document.createElement("button");
        btn.className="place-card"+(p.completed?" done":"");
        btn.innerHTML=`
          <span class="check-dot">✓</span>
          <span class="place-main">
            <div class="place-name">${esc(p.name)}</div>
            <div class="place-kind">${esc(p.kind||"旅行地点")}</div>
          </span>
          <span class="chevron">›</span>`;
        btn.onclick=()=>openAlbum(p.id);
        grid.appendChild(btn);
      });

      E.countries.appendChild(card);
    }

    const total=state.places.length;
    const done=state.places.filter(p=>p.completed).length;
    const pct=total?Math.round(done/total*100):0;
    E.done.textContent=done;
    E.total.textContent=total;
    E.bar.style.width=pct+"%";
    E.pct.textContent=pct+"%";

    fillCountrySelect();
    applyEditMode();
  }

  function fillCountrySelect(){
    E.placeCountry.innerHTML=state.countries.map(c =>
      `<option value="${esc(c.id)}">${esc((c.flag||"🌍")+" "+c.name)}</option>`
    ).join("");
  }

  // ---------------- Editors ----------------
  function openCountryEditor(id=null){
    if(!state.canEdit) return;
    const c=id?state.countries.find(x=>x.id===id):null;
    E.countryId.value=c?.id||"";
    E.countryFlag.value=c?.flag||"";
    E.countryName.value=c?.name||"";
    $("countryDialogTitle").textContent=c?"编辑国家":"添加国家";
    E.deleteCountry.classList.toggle("hidden",!c);
    openDialog(E.countryDialog);
  }

  async function submitCountry(){
    const name=E.countryName.value.trim();
    if(!name) return;
    try{
      await saveCountry(E.countryId.value||null,name,E.countryFlag.value.trim()||"🌍");
      closeDialog("countryDialog");
      toast();
    }catch(e){alert(e.message)}
  }

  function openPlaceEditor(id=null,countryId=null){
    if(!state.canEdit) return;
    const p=id?state.places.find(x=>x.id===id):null;
    fillCountrySelect();
    E.placeId.value=p?.id||"";
    E.placeName.value=p?.name||"";
    E.placeKind.value=p?.kind||"";
    E.placeCountry.value=p?.country_id||countryId||state.countries[0]?.id||"";
    $("placeDialogTitle").textContent=p?"编辑地点":"添加地点 / 路线";
    openDialog(E.placeDialog);
  }

  async function submitPlace(){
    const name=E.placeName.value.trim();
    const cid=E.placeCountry.value;
    if(!name||!cid) return;
    try{
      await savePlace(E.placeId.value||null,cid,name,E.placeKind.value.trim());
      closeDialog("placeDialog");
      toast();
      if(state.currentPlace?.id===E.placeId.value){
        const updated=state.places.find(x=>x.id===E.placeId.value);
        if(updated){state.currentPlace={...updated};syncAlbumFields()}
      }
    }catch(e){alert(e.message)}
  }

  // ---------------- Album ----------------
  async function openAlbum(id,push=true){
    const p=state.places.find(x=>x.id===id);
    if(!p) return;
    state.currentPlace={...p};
    syncAlbumFields();
    E.album.classList.add("open");
    E.album.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    await renderPhotos();
    if(push) history.pushState({place:id},"","#place="+encodeURIComponent(id));
  }

  function syncAlbumFields(){
    const p=state.currentPlace;
    if(!p) return;
    const c=state.countries.find(x=>x.id===p.country_id);
    E.albumCountry.textContent=(c?.flag||"🌍")+"  "+(c?.name||"");
    E.albumTitle.textContent=p.name;
    E.date.value=p.trip_date||"";
    E.route.value=p.route_text||"";
    E.memory.value=p.memory_text||"";
    E.albumOneLine.textContent=p.memory_text||p.kind||"";
    E.checkin.classList.toggle("done",!!p.completed);
    E.checkinText.textContent=p.completed?"已打卡 ✓":"尚未打卡";
    applyEditMode();
  }

  function closeAlbum(push=true){
    E.album.classList.remove("open");
    E.album.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
    clearObjectUrls();
    state.currentPlace=null;
    state.photos=[];
    if(push&&location.hash.startsWith("#place=")){
      history.pushState({},"",location.pathname+location.search);
    }
  }

  function scheduleAlbumSave(){
    if(!state.currentPlace || !state.canEdit) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      const patch={
        trip_date:E.date.value||null,
        route_text:E.route.value.trim(),
        memory_text:E.memory.value.trim(),
        updated_at:new Date().toISOString()
      };
      try{
        await updatePlace(state.currentPlace.id,patch,{quiet:true});
        E.albumOneLine.textContent=patch.memory_text||state.currentPlace.kind||"";
        toast();
      }catch(e){alert(e.message)}
    },450);
  }

  async function decodeUploadImage(file){
    if("createImageBitmap" in window){
      try{
        return await createImageBitmap(file,{imageOrientation:"from-image"});
      }catch(e){
        try{return await createImageBitmap(file)}catch(_){}
      }
    }

    return await new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        reject(new Error("无法读取这张图片"));
      };
      img.src=url;
    });
  }

  async function makeOptimizedImage(file,maxEdge,quality){
    const source=await decodeUploadImage(file);
    const sourceW=source.width || source.naturalWidth;
    const sourceH=source.height || source.naturalHeight;

    if(!sourceW || !sourceH) throw new Error("图片尺寸读取失败");

    const scale=Math.min(1,maxEdge/Math.max(sourceW,sourceH));
    const width=Math.max(1,Math.round(sourceW*scale));
    const height=Math.max(1,Math.round(sourceH*scale));

    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    ctx.drawImage(source,0,0,width,height);

    if(typeof source.close==="function") source.close();

    const toBlob=(type,q)=>new Promise(resolve=>canvas.toBlob(resolve,type,q));

    let blob=await toBlob("image/webp",quality);
    let ext="webp";

    // Very old Safari fallback.
    if(!blob){
      blob=await toBlob("image/jpeg",Math.min(.78,quality+.12));
      ext="jpg";
    }

    if(!blob) throw new Error("缩略图生成失败");
    return {blob,ext,width,height};
  }

  // ---------------- Photos ----------------
  async function cloudPhotoList(placeId){
    const rows=await cloudPhotoRows(placeId);
    return cloudSignedUrls(rows);
  }

  async function cloudPhotoAdd(placeId,file){
    assertCanEdit();

    const sourceExt=(file.name.split(".").pop()||"jpg")
      .toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const id=uuid();

    const originalPath=`${placeId}/${id}.${sourceExt}`;

    // Small image for the two-column gallery.
    const thumb=await makeOptimizedImage(file,520,.56);
    const thumbnailPath=`${placeId}/thumbs/${id}.${thumb.ext}`;

    // Slightly larger but still lightweight image for the album hero.
    const preview=await makeOptimizedImage(file,1000,.64);
    const previewPath=`${placeId}/previews/${id}.${preview.ext}`;

    const uploads=await Promise.all([
      sb.storage.from("trip-photos").upload(originalPath,file,{
        cacheControl:"86400",upsert:false,contentType:file.type||undefined
      }),
      sb.storage.from("trip-photos").upload(thumbnailPath,thumb.blob,{
        cacheControl:"31536000",upsert:false,contentType:thumb.blob.type||"image/webp"
      }),
      sb.storage.from("trip-photos").upload(previewPath,preview.blob,{
        cacheControl:"31536000",upsert:false,contentType:preview.blob.type||"image/webp"
      })
    ]);

    const uploadError=uploads.find(x=>x.error)?.error;
    if(uploadError){
      await sb.storage.from("trip-photos").remove(
        [originalPath,thumbnailPath,previewPath]
      ).catch(()=>{});
      throw uploadError;
    }

    const ins=await sb.from("photos").insert({
      place_id:placeId,
      storage_path:originalPath,
      thumbnail_path:thumbnailPath,
      preview_path:previewPath,
      original_name:file.name
    });

    if(ins.error){
      await sb.storage.from("trip-photos").remove(
        [originalPath,thumbnailPath,previewPath]
      );
      throw ins.error;
    }

    photoMetaCache.delete(placeId);
  }

  async function cloudPhotoDelete(rec){
    assertCanEdit();

    const paths=[
      rec.storage_path,
      rec.thumbnail_path,
      rec.preview_path
    ].filter(Boolean);

    const s=await sb.storage.from("trip-photos").remove(paths);
    if(s.error) throw s.error;

    const d=await sb.from("photos").delete().eq("id",rec.id);
    if(d.error) throw d.error;

    photoMetaCache.delete(rec.place_id);
    paths.forEach(path=>signedUrlCache.delete(path));
  }

  async function cloudPhotoSetCover(placeId,id){
    assertCanEdit();
    const a=await sb.from("photos").update({is_cover:false}).eq("place_id",placeId);
    if(a.error) throw a.error;
    const b=await sb.from("photos").update({is_cover:true}).eq("id",id);
    if(b.error) throw b.error;
    photoMetaCache.delete(placeId);
  }

  async function renderPhotos(){
    if(!state.currentPlace) return;
    const placeId=state.currentPlace.id;
    E.gallery.innerHTML="";
    E.galleryEmpty.classList.add("hidden");
    clearObjectUrls();
    setGalleryLoading(true);

    try{
      let rows=[];
      let coverUrl="";

      if(CLOUD){
        rows = await cloudPhotoRows(placeId);

        if(!state.currentPlace||state.currentPlace.id!==placeId) return;

        const coverRow = getCoverRow(rows);
        if(coverRow){
          const signedCover = await cloudSignedPhoto(coverRow,"cover");
          if(!state.currentPlace||state.currentPlace.id!==placeId) return;
          coverUrl = signedCover.url || "";
          setAlbumCover(coverUrl);
        }else{
          setAlbumCover("");
        }

        const signedRows = await cloudSignedUrls(rows,"gallery");
        if(!state.currentPlace||state.currentPlace.id!==placeId) return;
        rows = signedRows;
      }else{
        rows = await localPhotoList(placeId);
        if(!state.currentPlace||state.currentPlace.id!==placeId) return;

        const coverRow = getCoverRow(rows);
        if(coverRow?.blob){
          coverUrl = URL.createObjectURL(coverRow.blob);
          objectUrls.push(coverUrl);
          setAlbumCover(coverUrl);
        }else{
          setAlbumCover("");
        }

        rows = rows.map(r=>{
          const url = URL.createObjectURL(r.blob);
          objectUrls.push(url);
          return {...r,url};
        });
      }

      if(!state.currentPlace||state.currentPlace.id!==placeId) return;

      state.photos=rows;
      E.gallery.innerHTML="";
      E.galleryEmpty.classList.toggle("hidden",rows.length>0);

      if(!rows.length){
        setAlbumCover("");
      }else if(!coverUrl){
        const cover=getCoverRow(rows);
        setAlbumCover(cover?.url||"");
      }

      rows.forEach(rec=>{
        const item=document.createElement("div");
        item.className="photo";
        item.innerHTML=`
          <img src="${esc(rec.url)}" alt="" loading="lazy" decoding="async">
          ${state.canEdit ? `
          <div class="photo-actions">
            <button class="cover">${rec.is_cover?"封面 ✓":"设为封面"}</button>
            <button class="del">删除</button>
          </div>` : ""}`;

        const coverBtn=item.querySelector(".cover");
        const delBtn=item.querySelector(".del");

        if(coverBtn) coverBtn.onclick=async()=>{
          try{
            CLOUD
              ? await cloudPhotoSetCover(placeId,rec.id)
              : await localPhotoSetCover(placeId,rec.id);
            toast("已设为封面");
            await renderPhotos();
          }catch(e){alert(e.message)}
        };

        if(delBtn) delBtn.onclick=async()=>{
          if(!confirm("删除这张照片吗？")) return;
          try{
            CLOUD ? await cloudPhotoDelete(rec) : await localPhotoDelete(rec.id);
            await renderPhotos();
          }catch(e){alert(e.message)}
        };

        E.gallery.appendChild(item);
      });

      if(!rows.length){
        E.galleryEmpty.textContent="还没有照片。下一次旅行，从这里开始记录。";
      }
    }catch(e){
      console.error(e);
      E.galleryEmpty.textContent="照片读取失败："+e.message;
      E.galleryEmpty.classList.remove("hidden");
    }finally{
      setGalleryLoading(false);
    }
  }

  // ---------------- Auth ----------------
  async function updateAuthUI(){
    if(!CLOUD){
      state.canEdit=true;
      E.authBtn.textContent="本地预览";
      E.conn.textContent="本地预览模式";
      render();
      return;
    }

    let canEdit=false;
    try{
      canEdit=await requireMember();
    }catch(e){
      console.warn(e);
      state.user=null;
      canEdit=false;
    }

    state.canEdit=canEdit;

    if(state.user){
      E.authBtn.textContent="退出";
      E.conn.textContent=canEdit
        ? `${state.user.email} · 可编辑`
        : `${state.user.email} · 只读`;
    }else{
      E.authBtn.textContent="登录";
      E.conn.textContent="公开浏览 · 登录后可编辑";
    }

    await cloudLoad();
    subscribeRealtime();
    render();
    preloadAllPhotoMetaAndCovers();

    if(state.currentPlace){
      const fresh=state.places.find(x=>x.id===state.currentPlace.id);
      if(fresh){
        state.currentPlace={...fresh};
        syncAlbumFields();
        await renderPhotos();
      }
    }
  }

  async function login(){
    if(!CLOUD){
      alert("现在是本地预览模式。请先在 config.js 填入 Supabase URL 和 anon key。");
      return;
    }
    E.loginBtn.disabled=true;
    try{
      const {error}=await sb.auth.signInWithPassword({
        email:E.authEmail.value.trim(),
        password:E.authPassword.value
      });
      if(error) throw error;
      closeDialog("authDialog");
      await updateAuthUI();
      if(!state.canEdit) alert("这个账号没有编辑权限，将以只读模式浏览。");
    }catch(e){alert(e.message)}
    finally{E.loginBtn.disabled=false}
  }

  async function authButton(){
    if(!CLOUD){
      alert("当前为本地预览模式。部署前在 config.js 中填入 Supabase URL 和 anon key。");
      return;
    }
    if(state.user){
      await sb.auth.signOut();
      state.user=null;
      await updateAuthUI();
    }else{
      openDialog(E.authDialog);
    }
  }

  // ---------------- Events ----------------
  E.addCountry.onclick=()=>{ if(state.canEdit) openCountryEditor(); };
  $("saveCountryBtn").onclick=submitCountry;
  $("savePlaceBtn").onclick=submitPlace;
  E.authBtn.onclick=authButton;
  E.loginBtn.onclick=login;

  E.deleteCountry.onclick=async()=>{
    const id=E.countryId.value;
    const c=state.countries.find(x=>x.id===id);
    if(!id||!c) return;
    if(!confirm(`删除「${c.name}」以及其中所有地点吗？`)) return;
    try{
      await deleteCountry(id);
      closeDialog("countryDialog");
      toast("已删除");
    }catch(e){alert(e.message)}
  };

  document.querySelectorAll("[data-close]").forEach(b=>{
    b.onclick=()=>closeDialog(b.dataset.close);
  });

  $("albumBack").onclick=()=>{
    if(location.hash.startsWith("#place=")) history.back();
    else closeAlbum();
  };

  E.checkin.onclick=async()=>{
    if(!state.currentPlace || !state.canEdit) return;
    try{
      await updatePlace(state.currentPlace.id,{completed:!state.currentPlace.completed});
      syncAlbumFields();
    }catch(e){alert(e.message)}
  };

  [E.date,E.route,E.memory].forEach(x=>x.addEventListener("input",scheduleAlbumSave));

  E.editPlace.onclick=()=>{
    if(state.currentPlace && state.canEdit) openPlaceEditor(state.currentPlace.id);
  };

  E.deletePlace.onclick=async()=>{
    if(!state.currentPlace || !state.canEdit) return;
    if(!confirm(`确定删除「${state.currentPlace.name}」吗？照片记录也会一起删除。`)) return;
    try{
      await deletePlace(state.currentPlace.id);
      toast("已删除");
    }catch(e){alert(e.message)}
  };

  E.photoInput.onchange=async e=>{
    if(!state.currentPlace || !state.canEdit) return;
    const placeId=state.currentPlace.id;
    const files=[...e.target.files];
    for(const file of files){
      if(!file.type.startsWith("image/")) continue;
      try{
        CLOUD ? await cloudPhotoAdd(placeId,file) : await localPhotoAdd(placeId,file);
      }catch(err){
        alert(`上传 ${file.name} 失败：${err.message}`);
      }
    }
    e.target.value="";
    await renderPhotos();
    toast("照片已添加");
  };

  window.addEventListener("popstate",()=>{
    const m=location.hash.match(/^#place=(.+)$/);
    if(m) openAlbum(decodeURIComponent(m[1]),false);
    else closeAlbum(false);
  });

  window.App={openCountryEditor};

  // ---------------- Boot ----------------
  async function boot(){
    if(CLOUD){
      // Show the last public state immediately; refresh silently from Supabase.
      if(loadCachedPublicState()){
        render();
        E.conn.textContent="正在同步最新内容…";
      }

      sb.auth.onAuthStateChange((event)=>{
        if(event!=="INITIAL_SESSION") setTimeout(updateAuthUI,0);
      });
      await updateAuthUI();
    }else{
      await localInit();
      render();
      await updateAuthUI();
    }

    const m=location.hash.match(/^#place=(.+)$/);
    if(m&&state.places.length){
      setTimeout(()=>openAlbum(decodeURIComponent(m[1]),false),80);
    }

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    }
  }

  boot();
})();
