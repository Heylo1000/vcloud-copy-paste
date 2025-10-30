// ==UserScript==
// @name         vcloud-copy-paste.user.js (UX Turbo v2.0.1 + Indent-Safe)
// @author       adryd (+Heylo1000)
// @namespace    https://github.com/adryd325/vcloud-copy-paste.user.js
// @version      v2.0.1-indent
// @description  v2.0.0-style panel but with sticky footer, export (.doc), delete-all, copy help, BIG delay slider + multiplier, and INDENT-SAFE sending (spaces/tabs slowed down).
// @match        https://fast-vcloud.humber.ca/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- Keystroke conversion (targets #mainCanvas) ----------------
  const EN_US_CONVERSION_TABLE = {
    "\n":[13,"Enter",false]," ":[32,"Space",false],"`":[192,"Backquote",false],"~":[192,"Backquote",true],
    "1":[49,"Digit1",false],"!":[49,"Digit1",true],"2":[50,"Digit2",false],"@":[50,"Digit2",true],
    "3":[51,"Digit3",false],"#":[51,"Digit3",true],"4":[52,"Digit4",false],"$":[52,"Digit4",true],
    "5":[53,"Digit5",false],"%":[53,"Digit5",true],"6":[54,"Digit6",false],"^":[54,"Digit6",true],
    "7":[55,"Digit7",false],"&":[55,"Digit7",true],"8":[56,"Digit8",false],"*":[56,"Digit8",true],
    "9":[57,"Digit9",false],"(":[57,"Digit9",true],"0":[48,"Digit0",false],")":[48,"Digit0",true],
    "-":[173,"Minus",false],"–":[173,"Minus",false],"_":[173,"Minus",true],"=":[61,"Equal",false],"+":[61,"Equal",true],
    "q":[81,"KeyQ",false],"Q":[81,"KeyQ",true],"w":[87,"KeyW",false],"W":[87,"KeyW",true],
    "e":[69,"KeyE",false],"E":[69,"KeyE",true],"r":[82,"KeyR",false],"R":[82,"KeyR",true],
    "t":[84,"KeyT",false],"T":[84,"KeyT",true],"y":[89,"KeyY",false],"Y":[89,"KeyY",true],
    "u":[85,"KeyU",false],"U":[85,"KeyU",true],"i":[73,"KeyI",false],"I":[73,"KeyI",true],
    "o":[79,"KeyO",false],"O":[79,"KeyO",true],"p":[80,"KeyP",false],"P":[80,"KeyP",true],
    "[":[219,"BracketLeft",false],"{":[219,"BracketLeft",true],"]":[221,"BracketRight",false],"}":[221,"BracketRight",true],
    "\\":[220,"Backslash",false],"|":[220,"Backslash",true],
    "a":[65,"KeyA",false],"A":[65,"KeyA",true],"s":[83,"KeyS",false],"S":[83,"KeyS",true],
    "d":[68,"KeyD",false],"D":[68,"KeyD",true],"f":[70,"KeyF",false],"F":[70,"KeyF",true],
    "g":[71,"KeyG",false],"G":[71,"KeyG",true],"h":[72,"KeyH",false],"H":[72,"KeyH",true],
    "j":[74,"KeyJ",false],"J":[74,"KeyJ",true],"k":[75,"KeyK",false],"K":[75,"KeyK",true],
    "l":[76,"KeyL",false],"L":[76,"KeyL",true],";":[59,"Semicolon",false],":":[59,"Semicolon",true],
    "'":[222,"Quote",false],"\"":[222,"Quote",true],
    "z":[90,"KeyZ",false],"Z":[90,"KeyZ",true],"x":[88,"KeyX",false],"X":[88,"KeyX",true],
    "c":[67,"KeyC",false],"C":[67,"KeyC",true],"v":[86,"KeyV",false],"V":[86,"KeyV",true],
    "b":[66,"KeyB",false],"B":[66,"KeyB",true],"n":[78,"KeyN",false],"N":[78,"KeyN",true],
    "m":[77,"KeyM",false],"M":[77,"KeyM",true],",":[188,"Comma",false],"<":[188,"Comma",true],
    ".":[190,"Period",false],">":[190,"Period",true],"/":[191,"Slash",false],"?":[191,"Slash",true],
  };
  const KEY_DATA_TEMPLATE = {
    bubbles:true, cancelable:true, charCode:0,
    altKey:false, ctrlKey:false, metaKey:false, repeat:false,
    location:KeyboardEvent.DOM_KEY_LOCATION_STANDARD
  };

  let shiftHeld = false;
  let abortSend = false;
  let keyDelay = 10; // will be computed from slider × multiplier

  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));
  const getCanvas = ()=>document.getElementById("mainCanvas");

  function createEvents(ch){
    const e=[], d=EN_US_CONVERSION_TABLE[ch]; if(!d) return e;
    // shift handling
    if (d[2] && !shiftHeld){
      e.push("sleep");
      e.push(new KeyboardEvent("keydown",{...KEY_DATA_TEMPLATE,code:"ShiftLeft",key:"ShiftLeft",keyCode:16,shiftKey:true}));
      e.push("sleep");
      shiftHeld = true;
    }
    if (!d[2] && shiftHeld){
      e.push("sleep");
      e.push(new KeyboardEvent("keyup",{...KEY_DATA_TEMPLATE,code:"ShiftLeft",key:"ShiftLeft",keyCode:16,shiftKey:false}));
      e.push("sleep");
      shiftHeld = false;
    }
    e.push(new KeyboardEvent("keydown",{...KEY_DATA_TEMPLATE,code:d[1],key:d[1],keyCode:d[0],shiftKey:d[2]}));
    e.push(new KeyboardEvent("keyup"  ,{...KEY_DATA_TEMPLATE,code:d[1],key:d[1],keyCode:d[0],shiftKey:d[2]}));
    return e;
  }

  // ---------------- Prefs & history ----------------
  const PREF_KEY='vcloud_prefs', HIST_KEY='vcloud_hist';
  const prefs = {
    delayMs:10,
    delayMul:1,              // existing multiplier
    indentSafe:true,         // NEW: slow down spaces/tabs
    perLine:false, perLineDelay:250,
    sticky:false,
    monospace:false, fontSize:14,
    normalizeQuotes:true, normalizeNewlines:true, trimTrailing:true,
    highContrast:false,
    ...JSON.parse(localStorage.getItem(PREF_KEY)||'{}'),
  };
  let history = JSON.parse(localStorage.getItem(HIST_KEY)||'[]'); // {t,ts}[]
  const savePrefs=()=>localStorage.setItem(PREF_KEY,JSON.stringify(prefs));
  function pushHistory(t){ if(!t) return; history.unshift({t,ts:Date.now()}); history=history.slice(0,200); localStorage.setItem(HIST_KEY,JSON.stringify(history)); }

  function applyDelay(){
    const base = prefs.delayMs ?? 10;
    const mul  = prefs.delayMul ?? 1;
    // default minimum 5ms just so we don't go crazy-fast
    keyDelay   = Math.max(5, Math.round(base * mul));
  }

  // ---------------- UI helper bits ----------------
  function toast(msg){
    const t=document.createElement('div'); t.textContent=msg;
    Object.assign(t.style,{
      position:'fixed',right:'16px',bottom:'16px',padding:'8px 12px',
      background:prefs.highContrast?'#000':'#111',
      color:prefs.highContrast?'#0f0':'#fff',
      borderRadius:'8px',zIndex:2147483647,font:'13px system-ui, sans-serif',
      boxShadow:'0 8px 24px rgba(0,0,0,0.28)'
    });
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),1400);
  }

  function normalizeText(s){
    if(prefs.normalizeQuotes) s=s.replace(/\u2018|\u2019/g,"'").replace(/\u201C|\u201D/g,'"');
    if(prefs.normalizeNewlines) s=s.replace(/\r\n?/g,"\n");
    if(prefs.trimTrailing) s=s.replace(/[ \t]+\n/g,"\n").replace(/[ \t]+$/g,"");
    return s;
  }

  // ---------------- INDENT-SAFE send ----------------
  async function kpressChars(str){
    const el=getCanvas(); if(!el){ toast('VM surface (#mainCanvas) not found'); return; }
    abortSend=false;
    for(const ch of str){
      if(abortSend) break;

      // if indentSafe: slow down spaces and tabs
      const isIndentChar = (ch === " " || ch === "\t");
      const charDelay = (prefs.indentSafe && isIndentChar) ? Math.max(15, keyDelay * 3) : keyDelay;

      for(const ev of createEvents(ch)){
        if(ev==="sleep"){
          await sleep(250);
          if(abortSend) break;
          continue;
        }
        el.dispatchEvent(ev);
        if(abortSend) break;
        await sleep(charDelay);
      }
    }
    // release shift if we ended with it down
    if(shiftHeld){
      await sleep(10);
      shiftHeld=false;
      el.dispatchEvent(new KeyboardEvent("keyup",{...KEY_DATA_TEMPLATE,code:"ShiftLeft",key:"ShiftLeft",keyCode:16,shiftKey:false}));
    }
  }

  async function kpressLines(block, perLineDelay=250){
    const lines=block.split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      if(abortSend) break;
      await kpressChars(lines[i]+"\n");
      if(abortSend) break;
      await sleep(perLineDelay);
    }
  }

  // ---------------- Copy Help (same as before) ----------------
  function buildCopyHelpModal() {
    const modal=document.createElement("div");
    Object.assign(modal.style,{position:"fixed",inset:"0",background:"rgba(0,0,0,0.45)",display:"none",zIndex:"2147483647"});
    modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true");
    const card=document.createElement("div");
    Object.assign(card.style,{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(720px,92vw)",maxHeight:"80vh",overflow:"auto",background:"#fff",color:"#222",borderRadius:"12px",boxShadow:"0 12px 30px rgba(0,0,0,0.25)",padding:"16px 18px"});
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <h2 style="margin:0;font:600 18px system-ui, sans-serif;">How to Copy from the VM (no OCR)</h2>
        <button id="close-modal" type="button" class="cp-btn">Close</button>
      </div>
      <ol style="padding-left:18px; line-height:1.5;">
        <li><b>Windows</b>: PowerToys Text Extractor — <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd>.</li>
        <li><b>macOS</b>: Live Text via Screenshot (⌘+Shift+4) or Preview.</li>
        <li><b>Chrome/Edge</b>: Right-click the canvas → <i>Search image with Google Lens</i> → select → copy.</li>
        <li><b>Inside the VM</b>: export/save to a file and move it out.</li>
      </ol>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button id="open-guide" type="button" class="cp-btn">Open Screen-Selection Guide</button>
        <a href="https://learn.microsoft.com/windows/powertoys/text-extractor" target="_blank" rel="noopener" class="cp-btn" style="text-decoration:none;border:1px solid #ddd;background:#fff;color:#111;">PowerToys docs</a>
      </div>`;
    modal.appendChild(card);
    const openModal=()=>{ modal.style.display="block"; };
    const closeModal=()=>{ modal.style.display="none"; };
    modal.addEventListener("click",e=>{ if(e.target===modal) closeModal();});
    card.querySelector("#close-modal").addEventListener("click",closeModal);
    return {modal, openModal};
  }

  function buildSelectionOverlay() {
    const overlay=document.createElement("div");
    Object.assign(overlay.style,{position:"fixed",inset:"0",background:"rgba(0,0,0,0.35)",display:"none",zIndex:"2147483647"});
    const bar=document.createElement("div");
    bar.textContent="Drag/resize the box, then use OS tool (Win+Shift+T, Live Text, Lens) to copy.";
    Object.assign(bar.style,{position:"absolute",left:"50%",transform:"translateX(-50%)",top:"16px",background:"#111",color:"#fff",padding:"8px 12px",borderRadius:"999px",font:"13px system-ui, sans-serif",boxShadow:"0 6px 20px rgba(0,0,0,0.25)"});
    const close=document.createElement("button");
    close.textContent="Close"; Object.assign(close.style,{position:"absolute",right:"16px",top:"16px",padding:"6px 10px",cursor:"pointer",font:"13px system-ui, sans-serif",borderRadius:"8px",border:"1px solid #ddd",background:"#fff"});
    const box=document.createElement("div");
    Object.assign(box.style,{position:"absolute",left:"10%",top:"20%",width:"60%",height:"40%",border:"2px dashed #fff",boxShadow:"0 0 0 9999px rgba(0,0,0,0.35)",cursor:"move"});
    const handles=["nw","ne","sw","se"].map(corner=>{const h=document.createElement("div"); h.dataset.corner=corner; Object.assign(h.style,{position:"absolute",width:"12px",height:"12px",background:"#fff",border:"1px solid #000",borderRadius:"2px",cursor:`${corner}-resize`}); return h;});
    const setHandlePositions=()=>{const w=box.offsetWidth,h=box.offsetHeight; handles.forEach(hd=>{const c=hd.dataset.corner; hd.style.left=(c.includes("w")?"-6px":(c.includes("e")?`${w-6}px`:"0")); hd.style.top=(c.includes("n")?"-6px":(c.includes("s")?`${h-6}px`:"0"));});};
    handles.forEach(h=>box.appendChild(h));
    overlay.append(bar,close,box);
    let mode=null,startX=0,startY=0,startLeft=0,startTop=0,startW=0,startH=0;
    const begin=(e,newMode)=>{e.preventDefault(); mode=newMode; const r=box.getBoundingClientRect(); startX=e.clientX; startY=e.clientY; startLeft=r.left; startTop=r.top; startW=r.width; startH=r.height; document.addEventListener("mousemove",move); document.addEventListener("mouseup",end);};
    const move=(e)=>{ if(!mode) return; const dx=e.clientX-startX, dy=e.clientY-startY;
      if(mode==="move"){ box.style.left=Math.max(0,startLeft+dx)+"px"; box.style.top=Math.max(0,startTop+dy)+"px"; }
      else { const rect=overlay.getBoundingClientRect();
        let nl=startLeft, nt=startTop, nw=startW, nh=startH;
        if(mode.includes("e")) nw=Math.max(20,startW+dx);
        if(mode.includes("s")) nh=Math.max(20,startH+dy);
        if(mode.includes("w")){ nw=Math.max(20,startW-dx); nl=startLeft+dx; }
        if(mode.includes("n")){ nh=Math.max(20,startH-dy); nt=startTop+dy; }
        nl=Math.max(0,Math.min(nl,rect.width-nw)); nt=Math.max(0,Math.min(nt,rect.height-nh));
        box.style.left=nl+"px"; box.style.top=nt+"px"; box.style.width=nw+"px"; box.style.height=nh+"px";
      }
      setHandlePositions();
    };
    const end=()=>{ mode=null; document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",end); };
    box.addEventListener("mousedown",e=>{ if(e.target.dataset.corner) begin(e,e.target.dataset.corner); else begin(e,"move"); });
    close.addEventListener("click",()=>toggleOverlay(false));
    window.addEventListener("resize",setHandlePositions); setTimeout(setHandlePositions,50);
    const toggleOverlay=(on)=>{ overlay.style.display=on?"block":"none"; if(on) setHandlePositions(); };
    return {overlay, toggleOverlay};
  }

  // ---------------- UI construction ----------------
  function createInputElement() {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;

    const container = document.createElement("div");
    Object.assign(container.style,{
      maxWidth:"1000px",margin:"12px auto",padding:"10px 12px",boxSizing:"border-box",
      display:"grid",gridTemplateColumns:"1fr auto auto auto auto",gap:"8px",alignItems:"center",
      borderRadius:"10px",backdropFilter:"saturate(1.2) blur(2px)",
      border:dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.08)",
      background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"
    });
    if (prefs.sticky){
      Object.assign(container.style,{position:'fixed',left:'0',right:'0',bottom:'0',margin:'0',zIndex:'999999'});
      const ro=new ResizeObserver(()=>{ const h=container.offsetHeight||0; document.documentElement.style.scrollPaddingBottom=h+'px'; document.body.style.paddingBottom=h+'px'; });
      ro.observe(container);
    }

    // Textarea
    const textarea = document.createElement("textarea");
    Object.assign(textarea.style,{
      gridColumn:"1 / 6",display:"block",width:"100%",minWidth:"320px",height:"120px",minHeight:"40px",
      boxSizing:"border-box",overflow:"auto",borderRadius:"8px",padding:"10px 12px",outline:"none",
      border:dark?"1px solid rgba(255,255,255,0.18)":"1px solid rgba(0,0,0,0.18)",
      background:dark?"#101214":"#ffffff",color:dark?"#e8e8e8":"#111",
      fontFamily:prefs.monospace?'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace':'system-ui, sans-serif',
      fontSize:prefs.fontSize+"px"
    });
    textarea.style.setProperty("resize","both","important");
    textarea.placeholder = 'Type here… then click “Send To VM”.';

    // Buttons
    const sendBtn = button("Send To VM");
    const clearBtn = button("Clear");
    const copyBtn  = button("Copy");
    const stopBtn  = button("Stop");
    const helpBtn  = button("How to Copy");

    // Counter + ETA
    const counter = smallSpan();
    const eta     = smallSpan();

    // Settings row (now 7 items inc. indent-safe)
    const controls = rowGrid("auto auto auto auto auto auto auto 1fr");

    // Delay (0–500)
    const delayWrap = labelled("Delay");
    const delay = range(prefs.delayMs??10,0,500,(v)=>{ prefs.delayMs=+v; savePrefs(); applyDelay(); updateETA(); });
    const delayVal = smallSpan(`${prefs.delayMs??10} ms`);
    delay.oninput = ()=>{ delayVal.textContent = `${delay.value} ms`; };
    delayWrap.append(delay, delayVal);

    // Delay multiplier
    const multWrap = labelled("Delay ×");
    const multSel = document.createElement("select");
    ["1","1.5","2","3"].forEach(v=>{
      const o=new Option(v+"×",v);
      if (parseFloat(v) === (prefs.delayMul ?? 1)) o.selected=true;
      multSel.appendChild(o);
    });
    multSel.onchange=()=>{ prefs.delayMul=parseFloat(multSel.value)||1; savePrefs(); applyDelay(); updateETA(); };
    multWrap.append(multSel);

    // Per-line
    const perLineWrap = labelled("Send by lines");
    const perLine = document.createElement("input"); perLine.type="checkbox"; perLine.checked=!!prefs.perLine;
    perLine.onchange = ()=>{ prefs.perLine=perLine.checked; savePrefs(); };
    const lineDelay = document.createElement("input");
    lineDelay.type="number"; lineDelay.min="0"; lineDelay.value=String(prefs.perLineDelay??250);
    lineDelay.style.width="72px"; lineDelay.title="ms between lines";
    lineDelay.onchange = ()=>{ prefs.perLineDelay=+lineDelay.value||0; savePrefs(); };
    perLineWrap.append(perLine, lineDelay);

    // Monospace
    const monoWrap = labelled("Monospace");
    const mono = document.createElement("input"); mono.type="checkbox"; mono.checked=!!prefs.monospace;
    mono.onchange = ()=>{ prefs.monospace=mono.checked; savePrefs(); textarea.style.fontFamily=prefs.monospace?'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace':'system-ui, sans-serif'; };
    monoWrap.append(mono);

    // Font
    const sizeWrap = labelled("Font");
    const size = range(prefs.fontSize??14,11,22,(v)=>{ prefs.fontSize=+v; savePrefs(); textarea.style.fontSize=prefs.fontSize+"px"; });
    const sizeVal = smallSpan(`${prefs.fontSize??14} px`);
    size.oninput = ()=> sizeVal.textContent = `${size.value} px`;
    sizeWrap.append(size, sizeVal);

    // Sticky toggle
    const stickyWrap = labelled("Sticky footer");
    const sticky = document.createElement("input"); sticky.type="checkbox"; sticky.checked=!!prefs.sticky;
    sticky.onchange = ()=>{
      prefs.sticky=sticky.checked; savePrefs();
      if(prefs.sticky){ Object.assign(container.style,{position:'fixed',left:0,right:0,bottom:0,margin:0,zIndex:999999}); }
      else { Object.assign(container.style,{position:'static',margin:'12px auto'}); document.documentElement.style.scrollPaddingBottom=''; document.body.style.paddingBottom=''; }
    };
    stickyWrap.append(sticky);

    // NEW: Indent-safe toggle
    const indentWrap = labelled("Indent-safe");
    const indentCb = document.createElement("input"); indentCb.type="checkbox"; indentCb.checked=!!prefs.indentSafe;
    indentCb.onchange=()=>{ prefs.indentSafe=indentCb.checked; savePrefs(); };
    indentWrap.append(indentCb);

    controls.append(delayWrap, multWrap, perLineWrap, monoWrap, sizeWrap, stickyWrap, indentWrap);

    // Transforms
    const transforms = rowGrid("auto auto auto auto auto 1fr");
    const normQuotes = check("Straight quotes",prefs.normalizeQuotes,v=>{ prefs.normalizeQuotes=v; savePrefs(); });
    const normNL     = check("Normalize \\n",prefs.normalizeNewlines,v=>{ prefs.normalizeNewlines=v; savePrefs(); });
    const trimTrail  = check("Trim trailing",prefs.trimTrailing,v=>{ prefs.trimTrailing=v; savePrefs(); });
    const hiContrast = check("High contrast toasts",prefs.highContrast,v=>{ prefs.highContrast=v; savePrefs(); });
    const collapseBtn = button("Collapse");
    collapseBtn.onclick=()=>{ textarea.style.display = textarea.style.display==='none' ? 'block' : 'none'; };
    transforms.append(normQuotes, normNL, trimTrail, hiContrast, collapseBtn);

    // History row
    const histBar = rowGrid("auto 1fr auto auto auto auto");
    const histLabel = smallSpan("History:"); histLabel.style.justifySelf="start";
    const histSelect = document.createElement("select"); histSelect.style.width="100%"; histSelect.title="Pick a previous send";
    function refreshHistoryOptions(){
      histSelect.innerHTML=""; const blank=new Option("(select a previous item)",""); histSelect.appendChild(blank);
      history.forEach((h,idx)=>{ const o=new Option(`${new Date(h.ts).toLocaleTimeString()} – ${h.t.replace(/\s+/g,' ').slice(0,80)}${h.t.length>80?'…':''}`, String(idx)); histSelect.appendChild(o);});
    }
    refreshHistoryOptions();
    const loadBtn = button("Load");
    loadBtn.onclick=()=>{ const idx=+histSelect.value; if(Number.isNaN(idx))return; const item=history[idx]; if(item){ textarea.value=item.t; updateCounter(); toast("Loaded from history"); } };
    const delBtn  = button("Delete");
    delBtn.onclick=()=>{ const idx=+histSelect.value; if(Number.isNaN(idx))return; history.splice(idx,1); localStorage.setItem(HIST_KEY,JSON.stringify(history)); refreshHistoryOptions(); toast("Deleted from history"); };
    const exportBtn = button("Export (.doc)");
    exportBtn.onclick = exportHistoryDoc;
    const delAllBtn  = button("Delete All");
    delAllBtn.onclick = deleteAllHistory;
    histBar.append(histLabel, histSelect, loadBtn, delBtn, exportBtn, delAllBtn);

    // Wire main buttons
    sendBtn.onclick = async ()=>{
      let text=textarea.value; const rawLen=text.length; if(!rawLen) return;
      if(rawLen>5000 && !confirm(`Send ${rawLen} characters? This may take a while.`)) return;
      text=normalizeText(text); pushHistory(text); refreshHistoryOptions();
      abortSend=false; sendBtn.disabled=clearBtn.disabled=copyBtn.disabled=true; toast(`Sending ${text.length} chars${prefs.perLine?" (line-by-line)":""}`);
      try{
        if(prefs.perLine) await kpressLines(text, prefs.perLineDelay??250);
        else await kpressChars(text);
        toast("Done");
      } finally {
        sendBtn.disabled=clearBtn.disabled=copyBtn.disabled=false;
      }
      textarea.value=""; updateCounter(); textarea.focus();
    };
    clearBtn.onclick = ()=>{ textarea.value=""; updateCounter(); textarea.focus(); toast("Cleared"); };
    copyBtn.onclick  = async ()=>{ try{ await navigator.clipboard.writeText(textarea.value); toast("Copied locally"); } catch{ toast("Copy failed"); } };
    stopBtn.onclick  = ()=>{ abortSend=true; toast("Stopping…"); };

    // Copy Help
    const {modal, openModal}=buildCopyHelpModal();
    const {overlay, toggleOverlay}=buildSelectionOverlay();
    document.body.append(modal, overlay);
    helpBtn.onclick=openModal;
    setTimeout(()=>{ const openGuide=modal.querySelector("#open-guide"); if(openGuide) openGuide.addEventListener("click",()=>toggleOverlay(true)); },0);

    // Stats / events
    function updateETA(){
      const actual = Math.max(5, Math.round((prefs.delayMs ?? 10) * (prefs.delayMul ?? 1)));
      const ms = textarea.value.length * (prefs.perLine ? 1 : actual);
      eta.textContent = prefs.perLine ? `${(prefs.perLineDelay??250)}ms/line` : `~${Math.ceil(ms/1000)}s`;
    }
    function updateCounter(){
      const len=textarea.value.length;
      counter.textContent=`${len} ${len===1?'char':'chars'}`;
      sendBtn.disabled = clearBtn.disabled = len===0;
      updateETA();
    }
    textarea.addEventListener('input',updateCounter);

    // stop keystrokes from bubbling to VMware console
    ["keydown","keypress","keyup"].forEach(t=>textarea.addEventListener(t,e=>e.stopPropagation(),{capture:true}));

    // hotkey to focus
    window.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='l'){
        e.preventDefault(); textarea.focus();
      }
    },{capture:true});

    // Assemble
    container.append(
      textarea, sendBtn, clearBtn, copyBtn, stopBtn, counter, eta,
      controls, transforms, histBar, helpBtn
    );

    // Insert in page
    const canvas=getCanvas();
    if(canvas&&canvas.parentNode) canvas.insertAdjacentElement("afterend", container);
    else document.body.appendChild(container);

    // Init
    applyDelay();
    updateCounter();

    // Export / Delete All
    function exportHistoryDoc(){
      const draft = (textarea.value||"").trim();
      const items = JSON.parse(localStorage.getItem(HIST_KEY)||'[]');
      if(!items.length && !draft){ toast("No inputs to export"); return; }
      const title = "vCloud Commands History";
      const dateStr = new Date().toLocaleString();
      const esc = (s)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      let sections='';
      if(draft){ sections += `<h2>Current Draft (not yet sent)</h2><pre>${esc(draft)}</pre><hr />`; }
      sections += items.map((it,i)=>`<h2>#${items.length - i} — ${new Date(it.ts).toLocaleString()}</h2><pre>${esc(it.t)}</pre>`).join('<hr />');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.4;color:#111}
h1{font-size:20px;margin:0 0 8px 0}h2{font-size:16px;margin:18px 0 6px 0}
pre{white-space:pre-wrap;word-wrap:break-word;background:#f6f6f6;padding:10px;border-radius:8px;border:1px solid #ddd}
hr{border:0;border-top:1px solid #ddd;margin:14px 0}.meta{font-size:12px;opacity:.7;margin-bottom:10px}
</style></head><body>
<h1>${esc(title)}</h1><div class="meta">Exported ${esc(dateStr)} — ${items.length} item(s)${draft?" + draft":""}</div>
${sections || '<p>(empty)</p>'}
</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `vcloud-commands_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      toast("Exported .doc");
    }

    function deleteAllHistory(){
      if(!history.length){ toast("History already empty"); return; }
      if(!confirm(`Delete all ${history.length} saved inputs? This cannot be undone.`)) return;
      history=[]; localStorage.setItem(HIST_KEY,JSON.stringify(history));
      refreshHistoryOptions();
      toast("All history deleted");
    }

    // small builders
    function button(t){ const b=document.createElement("button"); b.type="button"; b.textContent=t; Object.assign(b.style,{padding:"6px 12px",font:"14px system-ui, sans-serif",cursor:"pointer",borderRadius:"8px"}); return b; }
    function smallSpan(t=""){ const s=document.createElement("span"); s.textContent=t; Object.assign(s.style,{justifySelf:"end",font:"12px system-ui, sans-serif",opacity:"0.8"}); return s; }
    function rowGrid(cols){ const d=document.createElement("div"); Object.assign(d.style,{gridColumn:"1 / 6",display:"grid",gridTemplateColumns:cols,gap:"10px",alignItems:"center"}); return d; }
    function labelled(title){ const wrap=document.createElement("label"); Object.assign(wrap.style,{display:"flex",alignItems:"center",gap:"6px"}); const s=smallSpan(title); s.style.justifySelf="start"; wrap.appendChild(s); return wrap; }
    function range(val,min,max,on){ const r=document.createElement("input"); r.type="range"; r.min=String(min); r.max=String(max); r.value=String(val); r.oninput=()=>on(r.value); return r; }
    function check(title,init,on){ const w=labelled(title); const cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!init; cb.onchange=()=>on(cb.checked); w.appendChild(cb); return w; }
  }

  // Build UI
  createInputElement();
})();
