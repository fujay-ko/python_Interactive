// ══════════════════════════════════════
// ⚙️ 老師請填入 GAS Web App URL
// ══════════════════════════════════════
const GAS_URL = "https://script.google.com/macros/s/AKfycbwqta2pCqBH2hiI9fSZF5bwPAcOX8ZfmvaqAYV2FLPPYjDM088833ZUX-q-9-VRZtCf/exec"; // 例："https://script.google.com/macros/s/XXXXX/exec"

// ══════════════════════════════════════
// 防複製 / 防貼上（範圍收斂至測驗區 #page-quiz）
// 設計原則：精準攔截貼上來源，不過度封鎖全站
// ══════════════════════════════════════
function inQuizArea(el){
    const qz=document.getElementById('page-quiz');
    return !!(qz&&el&&qz.contains(el.tagName?el:el.parentElement));
}
document.addEventListener('contextmenu',e=>{
    if(inQuizArea(e.target))e.preventDefault();
});
document.addEventListener('keydown',e=>{
    const tag=e.target.tagName;
    if(tag==='SELECT')return;
    if(!inQuizArea(e.target))return;
    if(tag==='INPUT'||tag==='TEXTAREA'){
        if((e.ctrlKey||e.metaKey)&&['c','v','x'].includes(e.key.toLowerCase()))e.preventDefault();
        return;
    }
    if((e.ctrlKey||e.metaKey)&&['c','a','u','s','p'].includes(e.key.toLowerCase()))e.preventDefault();
    if(e.key==='F12')e.preventDefault();
});
document.addEventListener('paste',e=>{
    if((e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')&&inQuizArea(e.target))e.preventDefault();
});
document.addEventListener('copy',e=>{
    const sel=window.getSelection();
    const anchor=sel&&sel.anchorNode?(sel.anchorNode.parentElement||sel.anchorNode):null;
    if(anchor&&inQuizArea(anchor))e.preventDefault();
});
// 涵蓋所有貼上來源（含右鍵選單、長按、拖放）：測驗區內一律攔截
document.addEventListener('beforeinput',e=>{
    if((e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop')&&inQuizArea(e.target)){
        e.preventDefault();
        showToast('⚠️ 測驗區禁止貼上，請手動輸入');
    }
});
document.addEventListener('drop',e=>{
    if((e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')&&inQuizArea(e.target))e.preventDefault();
});
document.addEventListener('dragover',e=>{
    if((e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')&&inQuizArea(e.target))e.preventDefault();
});
let _toastTimer=null;
function showToast(msg){
    let t=document.getElementById('app-toast');
    if(!t){t=document.createElement('div');t.id='app-toast';t.className='toast';t.style.display='none';document.body.appendChild(t);}
    t.textContent=msg;t.style.display='block';
    clearTimeout(_toastTimer);
    _toastTimer=setTimeout(()=>{t.style.display='none';},1800);
}

// ══════════════════════════════════════
// 計時器（前往測驗才啟動；以 Date.now 差值計算，背景分頁不失真）
// ══════════════════════════════════════
let timerSec=0,timerInterval=null,timerStartAt=0,timerRunning=false;
function renderTimer(){
    const m=String(Math.floor(timerSec/60)).padStart(2,'0');
    const s=String(timerSec%60).padStart(2,'0');
    document.getElementById('timer-display').textContent=`${m}:${s}`;
}
function startTimer(resume){
    if(resume){
        const saved=parseInt(sessionStorage.getItem('fontTypeTimerStart')||'0',10);
        timerStartAt=saved>0?saved:Date.now();
    }else{
        timerStartAt=Date.now();
    }
    sessionStorage.setItem('fontTypeTimerStart',String(timerStartAt));
    sessionStorage.setItem('fontTypeTimerRunning','1');
    timerRunning=true;
    document.getElementById('timer-display').classList.add('running');
    clearInterval(timerInterval);
    const tick=()=>{timerSec=Math.floor((Date.now()-timerStartAt)/1000);renderTimer();};
    tick();
    timerInterval=setInterval(tick,1000);
}
function stopTimer(){
    clearInterval(timerInterval);timerInterval=null;timerRunning=false;
    sessionStorage.removeItem('fontTypeTimerRunning');
    sessionStorage.removeItem('fontTypeTimerStart');
}
function fmtTime(sec){return`${Math.floor(sec/60)} 分 ${sec%60} 秒`;}

// ══════════════════════════════════════
// 題數設定
// ══════════════════════════════════════
let SET_ID=10,SET_CONV=5,SET_QUIZ=10,SET_REPAIR=3;

function updateSettings(){
    SET_ID=parseInt(document.getElementById('slider-id').value);
    SET_CONV=parseInt(document.getElementById('slider-conv').value);
    SET_QUIZ=parseInt(document.getElementById('slider-quiz').value);
    SET_REPAIR=parseInt(document.getElementById('slider-repair').value);
    document.getElementById('val-id').textContent=SET_ID;
    document.getElementById('val-conv').textContent=SET_CONV;
    document.getElementById('val-quiz').textContent=SET_QUIZ;
    document.getElementById('val-repair').textContent=SET_REPAIR;
    const total=SET_ID+SET_CONV+SET_QUIZ+SET_REPAIR;
    document.getElementById('score-preview').innerHTML=
        `判斷測驗 <b>${SET_ID}</b> 題 × 1 分 = <b>${SET_ID}</b> 分<br>`+
        `轉換測驗 <b>${SET_CONV}</b> 題 × 1 分 = <b>${SET_CONV}</b> 分<br>`+
        `輸入測驗 <b>${SET_QUIZ}</b> 題 × 1 分 = <b>${SET_QUIZ}</b> 分<br>`+
        `程式修復 <b>${SET_REPAIR}</b> 題（依錯誤數計分）<br>`+
        `<span class="sp-total">預估總分：${total}+ 分</span>`;
}

// ══════════════════════════════════════
// 共用：反饋延遲集中 + 可跳過的自動推進
// ══════════════════════════════════════
const FEEDBACK_DELAY={identify:1200,conv:1500,quiz:2000,repair:2500};
let _pendingTimer=null,_pendingNext=null;
function cancelNext(){
    if(_pendingTimer){clearTimeout(_pendingTimer);_pendingTimer=null;}
    _pendingNext=null;
    document.querySelectorAll('.btn-next').forEach(b=>b.remove());
}
function runNext(){
    if(!_pendingNext)return;
    const f=_pendingNext;cancelNext();f();
}
function scheduleNext(fn,ms,fbEl){
    // 顯示「下一題」按鈕（可手動提前推進），ms 後自動推進作為備援
    cancelNext();
    _pendingNext=fn;
    if(fbEl){
        const btn=document.createElement('button');
        btn.type='button';btn.className='btn btn-next';
        btn.textContent='▶ 下一題（Enter／空白鍵）';
        btn.addEventListener('click',()=>runNext());
        fbEl.appendChild(btn);
    }
    _pendingTimer=setTimeout(()=>runNext(),ms);
}
document.addEventListener('keydown',e=>{
    // 反饋等待期間：焦點不在輸入框時可用 Enter/空白鍵快速推進
    if(!_pendingNext)return;
    if(e.key!=='Enter'&&e.key!==' ')return;
    const t=e.target;
    if(t===document.body||(t.classList&&t.classList.contains('btn-next'))){e.preventDefault();runNext();}
});

// ══════════════════════════════════════
// 共用：字元寬度工具 + 輸入法提示推斷（只提示類型，不洩漏答案）
// ══════════════════════════════════════
function widthType(ch){
    if(!ch)return'none';
    const c=ch.codePointAt(0);
    if(c>=32&&c<=126)return'half';                       // 半形 ASCII
    if(c===0x3000||(c>=0xFF01&&c<=0xFF5E)||(c>=0xFF61&&c<=0xFF9F))return'full'; // 全形
    return'other';                                        // 中文等其他字元
}
function widthTypeName(t){return t==='half'?'半形（1 格）':t==='full'?'全形（2 格）':t==='other'?'中文／其他字元':'（無）';}
function countWidth(s){
    let full=0,half=0,other=0;
    for(const ch of (s||'')){
        const t=widthType(ch);
        if(t==='full')full++;else if(t==='half')half++;else other++;
    }
    return{full,half,other};
}
// 依題目分類推斷應使用的輸入法（僅提示鍵盤模式）
function imeHintFor(cat){
    const c=cat||'';
    if(/全形|中文標點/.test(c))return{t:'⌨️ 請用【中文／全形】模式',cls:'ime-full'};
    if(/半形|Python|找錯|修復|抬頭|轉換/.test(c))return{t:'⌨️ 請用【英數／半形】模式',cls:'ime-half'};
    return{t:'⌨️ 英數／中文皆可',cls:''};
}
function convImeHint(q){
    const t=(q&&q.q)||'';
    if(t.includes('全形符號轉半形'))return{t:'⌨️ 中英皆會用到（符號轉半形）',cls:''};
    if(t.includes('轉換為【全形】'))return{t:'⌨️ 請用【中文／全形】模式',cls:'ime-full'};
    if(t.includes('轉換為【半形】'))return{t:'⌨️ 請用【英數／半形】模式',cls:'ime-half'};
    return{t:'⌨️ 英數／中文皆可',cls:''};
}
function setImeHint(elId,hint){
    const el=document.getElementById(elId);
    if(!el)return;
    el.textContent=hint.t;
    el.className='ime-hint '+hint.cls;
}
// 輸入框即時輔助：字數計數 + 全形/半形數量（不顯示位置、不洩漏正解）
function bindInputAssist(inputId,lenId,widthId){
    const inp=document.getElementById(inputId);
    const lenEl=document.getElementById(lenId);
    const wEl=document.getElementById(widthId);
    if(!inp)return;
    const update=()=>{
        const v=inp.value;
        const max=inp.maxLength>0?inp.maxLength:'∞';
        if(lenEl)lenEl.textContent=`字數 ${[...v].length} / ${max}`;
        if(wEl){
            const c=countWidth(v);
            wEl.textContent=`全形 ${c.full}・半形 ${c.half}`+(c.other>0?`・中文 ${c.other}`:'');
        }
    };
    if(inp.dataset.assistBound!=='1'){
        inp.dataset.assistBound='1';
        inp.addEventListener('input',update);
    }
    update();
}
// 統一送出綁定：Enter 送出（修復題 textarea 例外）+ 中文輸入法組字保護
function bindSubmit(inputId,submitFn,isTextarea){
    const el=document.getElementById(inputId);
    if(!el||el.dataset.bound==='1')return;
    el.dataset.bound='1';
    el.addEventListener('compositionstart',()=>{el.dataset.composing='1';});
    el.addEventListener('compositionend',()=>{el.dataset.composing='0';});
    el.addEventListener('keydown',e=>{
        if(el.dataset.composing==='1')return; // 候選字未確認不送出
        if(isTextarea){
            if((e.key==='Enter')&&(e.ctrlKey||e.metaKey)){e.preventDefault();submitFn();}
            return; // textarea 內 Enter 僅換行
        }
        if(e.key==='Enter'){e.preventDefault();submitFn();}
    });
}

// ══════════════════════════════════════
// 頁面切換
// ══════════════════════════════════════
const PAGES=['page-intro','page-learn','page-quiz','page-result'];
function showPage(id){
    PAGES.forEach(p=>document.getElementById(p).style.display='none');
    document.getElementById(id).style.display='block';
    window.scrollTo(0,0);
}

let studentInfo={};

function goToLearn(){
    const clsEl=document.getElementById('sel-class');
    const seatEl=document.getElementById('sel-seat');
    const nameEl=document.getElementById('inp-name');
    const errBox=document.getElementById('form-err');
    const bad=[];
    [clsEl,seatEl,nameEl].forEach(el=>el.classList.remove('input-err'));
    if(!clsEl.value)bad.push([clsEl,'班級']);
    if(!seatEl.value)bad.push([seatEl,'座號']);
    if(!nameEl.value.trim())bad.push([nameEl,'姓名']);
    if(bad.length>0){
        errBox.style.display='block';
        errBox.textContent='⚠️ 請填寫：'+bad.map(b=>b[1]).join('、');
        bad.forEach(b=>b[0].classList.add('input-err'));
        bad[0][0].focus();
        return;
    }
    errBox.style.display='none';
    studentInfo={cls:clsEl.value,seat:seatEl.value,name:nameEl.value.trim()};
    clearProgress(); // 全新開始：清除舊的進度快照
    initLearn();
    showPage('page-learn');
}

function goToQuiz(){
    cancelNext();
    startTimer(false); // ← 前往測驗才開始計時
    initIdentify();
    initConv();
    initQuiz();
    initRepair();
    showPage('page-quiz');
}

function goToResult(){
    cancelNext();
    // P0：四區完成檢查（未完成不可看成績、不可送出）
    const missing=[];
    if(!idDone)missing.push(['判斷測驗','identify-card']);
    if(!convDone)missing.push(['轉換測驗','c-conv']);
    if(!quizDone)missing.push(['輸入測驗','quiz-input-card']);
    if(!repairDone)missing.push(['程式修復','c-repair']);
    if(missing.length>0){
        showToast('⚠️ 還有 '+missing.length+' 個區塊未完成（'+missing.map(m=>m[0]).join('、')+'）');
        const card=document.querySelector('.card.'+missing[0][1]);
        if(card)card.scrollIntoView({behavior:'smooth',block:'center'});
        return;
    }
    stopTimer();
    buildResult();
    showPage('page-result');
    submitToGAS(true);
    retryPendingQueue(); // 補送本機暫存的舊成績
}

function confirmRetry(){
    if(confirm('重新作答將清除本次成績，確定要重新開始？')){
        clearProgress();
        location.reload();
    }
}

// ══════════════════════════════════════
// 學習區
// ══════════════════════════════════════
function initLearn(){
    const ci=document.getElementById('caseInput');
    let orig=ci.value;
    ci.addEventListener('input',e=>orig=e.target.value);
    window._setCase=(type,btn)=>{
        document.querySelectorAll('.btn-case').forEach(b=>b.classList.remove('active'));
        if(btn)btn.classList.add('active');
        ci.value=type==='upper'?orig.toUpperCase():type==='lower'?orig.toLowerCase():orig;
    };
    const hi=document.getElementById('halfInput');
    const fo=document.getElementById('fullOutput');
    hi.addEventListener('input',()=>fo.value=toFull(hi.value));
    fo.value=toFull(hi.value);
    showTab('win-half-full');
}
function setCase(t,el){if(window._setCase)window._setCase(t,el);}

const TAB_MAP={
    'win-half-full':{text:'Windows 切換全形/半形：通常使用 <b>Shift + 空白鍵</b>。',keys:['Shift','+','Space']},
    'win-case':{text:'按 <b>Caps Lock</b> 切換大小寫（指示燈亮=大寫）。<br>小寫狀態下 <b>Shift + 字母</b> 輸入大寫；<b>Shift + 數字鍵</b> 輸入上方符號（Shift+1=!，Shift+;=:）。',keys:['Caps Lock']},
    'win-ime':{text:'Windows 中英模式：使用 <b>Shift</b> 鍵在中文輸入法與英數之間切換。',keys:['Shift']},
    'mac-ime':{text:'macOS：按 <b>地球鍵 🌐</b>（或 Control + 空白鍵）在「注音/拼音」與「ABC 英數」之間切換。<br>寫程式時切到 <b>ABC</b> 就是半形；全形中文標點（，。！？）請在<b>中文輸入法</b>下輸入。',keys:['🌐','/','Control + Space']},
    'mobile-ime':{text:'手機/平板：點鍵盤上的 <b>「ㄅㄆㄇ / ABC」切換鍵</b> 或 <b>?123</b> 數字符號鍵。<br>全形標點（，。！？）在<b>中文鍵盤</b>；半形符號（, . ! ?）請切到<b>英文/數字鍵盤</b>。送出前請確認沒有依賴自動選字或貼上。',keys:['ㄅㄆㄇ','⇄','ABC','?123']}
};
function showTab(id){
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    const el=document.querySelector(`.tab[data-tab="${id}"]`);
    if(el)el.classList.add('active');
    const cur=TAB_MAP[id];if(!cur)return;
    document.getElementById('instruction-text').innerHTML=cur.text;
    const kv=document.getElementById('keyboard-visual');kv.innerHTML='';
    cur.keys.forEach(k=>{const d=document.createElement('div');d.className='key';d.textContent=k;kv.appendChild(d);});
    setTimeout(()=>{
        kv.querySelectorAll('.key').forEach(k=>k.classList.add('active'));
        setTimeout(()=>kv.querySelectorAll('.key').forEach(k=>k.classList.remove('active')),300);
    },50);
}

// ══════════════════════════════════════
// 分類顏色
// ══════════════════════════════════════
const CAT_COLOR={
    '半形英文':'#3b82f6','抬頭大寫':'#8b5cf6','全形英文':'#0891b2',
    '半形數字':'#f59e0b','全形數字':'#d97706','半形符號':'#10b981',
    '全形符號':'#059669','中文標點':'#ef4444','Python符號':'#6366f1',
    '程式碼找錯':'#f0883e','轉換練習':'#8b5cf6','程式碼修復':'#10b981'
};

// ══════════════════════════════════════
// 工具
// ══════════════════════════════════════
function shuffle(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
}
function toFull(str){
    return[...str].map(c=>{
        const code=c.charCodeAt(0);
        if(code>=33&&code<=126)return String.fromCharCode(code+65248);
        if(code===32)return String.fromCharCode(12288);
        return c;
    }).join('');
}
function escH(s){
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/ /g,'·').replace(/\n/g,'↵');
}

// 逐字比對 HTML（含長度差異提示 + 首次錯誤的字元寬度類型說明）
function charDiff(user,correct){
    user=user||'';correct=correct||'';
    let lenNote='';
    if(user.length!==correct.length){
        const d=user.length-correct.length;
        lenNote=`<div class="diff-hint">⚠️ 長度不同：你輸入 ${user.length} 字 ≠ 正解 ${correct.length} 字（${d>0?'多':'少'}了 ${Math.abs(d)} 字），請先檢查長度再逐字比對</div>`;
    }
    const maxLen=Math.max(user.length,correct.length);
    let youHtml='',corHtml='',firstErr=-1;
    for(let i=0;i<maxLen;i++){
        const u=user[i]||'';const c=correct[i]||'';
        if(u===c){
            youHtml+=`<span class="char-ok">${escH(u)||'▢'}</span>`;
            corHtml+=`<span class="char-ok">${escH(c)||'▢'}</span>`;
        }else{
            if(firstErr<0)firstErr=i;
            youHtml+=`<span class="char-err">${escH(u)||'▢'}</span>`;
            corHtml+=`<span class="char-ok">${escH(c)||'▢'}</span>`;
        }
    }
    let hint='';
    if(firstErr>=0){
        const u=user[firstErr]||'（無）';
        const c=correct[firstErr]||'（無）';
        hint=`<div class="diff-hint">第 ${firstErr+1} 個字元：你輸入「${escH(u)}」，應為「${escH(c)}」`;
        const tu=widthType(user[firstErr]),tc=widthType(correct[firstErr]);
        if((tu==='half'||tu==='full')&&(tc==='half'||tc==='full')&&tu!==tc){
            hint+=`<br>💡 寬度類型不同：你輸入的是${widthTypeName(tu)}，正解是${widthTypeName(tc)}`;
        }
        hint+=`</div>`;
    }
    return lenNote+
           `<div class="diff-row"><span class="diff-label">你輸入：</span>${youHtml}</div>`+
           `<div class="diff-row"><span class="diff-label">正確答案：</span>${corHtml}</div>${hint}`;
}

// ══════════════════════════════════════
// 判斷測驗
// ══════════════════════════════════════
let idQs=[],idCur=0,idScore=0,idDone=false,idLog=[];

function initIdentify(){
    idQs=shuffle(ID_POOL).slice(0,SET_ID);
    idCur=0;idScore=0;idDone=false;idLog=[];
    cancelNext();
    document.getElementById('id-done').classList.remove('show');
    document.getElementById('id-badge').textContent='未完成';
    document.getElementById('id-badge').className='badge badge-wait';
    document.getElementById('id-total-text').textContent=idQs.length;
    renderIdentify();
}
function renderIdentify(){
    cancelNext();
    const q=idQs[idCur];
    if(!q){finishIdentify();return;}
    document.getElementById('id-sentence').innerHTML=q.s.replace('{M}',`<span class="mk">${q.m}</span>`);
    document.getElementById('id-progress').textContent=`第 ${idCur+1} 題 / 共 ${idQs.length} 題`;
    document.getElementById('id-bar').style.width=`${(idCur/idQs.length)*100}%`;
    document.getElementById('id-feedback').style.display='none';
    document.getElementById('btn-id-half').disabled=false;
    document.getElementById('btn-id-full').disabled=false;
}
function answerIdentify(ans){
    if(idDone)return;
    const q=idQs[idCur];
    if(!q)return;
    const ok=ans===q.t;
    if(ok)idScore++;
    idLog.push({qNum:idCur+1,type:'判斷題',
        question:q.s.replace('{M}',`【${q.m}】`),
        userAnswer:ans==='half'?'半形':'全形',
        correctAnswer:q.t==='half'?'半形':'全形',
        isCorrect:ok,cat:q.cat});
    const fb=document.getElementById('id-feedback');
    fb.style.display='block';
    fb.className=`feedback-box ${ok?'correct':'wrong'}`;
    fb.innerHTML=ok
        ?`✅ 正確！「${q.m}」是 <b>${q.t==='half'?'半形':'全形'}</b>。`
        :`❌ 答錯了！「${q.m}」其實是 <b>${q.t==='half'?'半形':'全形'}</b>。`;
    document.getElementById('btn-id-half').disabled=true;
    document.getElementById('btn-id-full').disabled=true;
    saveProgress();
    scheduleNext(()=>{idCur++;idCur>=idQs.length?finishIdentify():renderIdentify();},FEEDBACK_DELAY.identify,fb);
}
function finishIdentify(){
    idDone=true;
    cancelNext();
    document.getElementById('id-bar').style.width='100%';
    document.getElementById('id-progress').textContent=`完成！得分 ${idScore} / ${idQs.length}`;
    document.getElementById('id-score-text').textContent=idScore;
    document.getElementById('id-done').classList.add('show');
    document.getElementById('id-badge').textContent='已完成';
    document.getElementById('id-badge').className='badge badge-done';
    document.getElementById('id-feedback').style.display='none';
    saveProgress();
}

// ══════════════════════════════════════
// 輸入測驗（含三類保底題）
// ══════════════════════════════════════
let quizQs=[],quizCur=0,quizScore=0,quizDone=false,quizLog=[],quizSubmitting=false;

function buildQuizQuestions(n){
    // 1. 保底：雙引號 1 題
    const dq=shuffle(POOL_DQUOTE)[0];
    // 2. 保底：單引號 1 題
    const sq=shuffle(POOL_SQUOTE)[0];
    // 3. 保底：\n 換行題
    const nl=ITEM_NEWLINE;

    // 4. 已使用的答案（避免重複）
    const usedAnswers=new Set([dq.answer,sq.answer,nl.answer]);

    // 5. 從一般題庫補足剩餘題數，避免與保底題重複
    const remaining=n-3; // 剩餘題數（n最小5，所以remaining最小2）
    const available=shuffle(POOL_GENERAL)
        .filter(q=>!usedAnswers.has(q.answer));
    let general=available.slice(0,remaining);
    // 題庫不足時：洗牌重抽補足，避免 quizQs[cur] 取到 undefined
    let guard=0;
    while(general.length<remaining&&available.length>0&&guard<10){
        guard++;
        general=general.concat(shuffle(available).slice(0,remaining-general.length));
    }
    if(general.length<remaining){
        console.warn(`一般題庫僅能湊出 ${general.length} 題，不足 ${remaining} 題`);
    }

    // 6. 合併並再次 shuffle，讓保底題位置隨機
    return shuffle([dq,sq,nl,...general]);
}

function initQuiz(){
    quizQs=buildQuizQuestions(SET_QUIZ);
    quizCur=0;quizScore=0;quizDone=false;quizLog=[];
    cancelNext();
    document.getElementById('quiz-done').classList.remove('show');
    document.getElementById('quiz-badge').textContent='未完成';
    document.getElementById('quiz-badge').className='badge badge-wait';
    document.getElementById('quiz-total-text').textContent=quizQs.length;
    renderQuiz();
}
function renderQuiz(){
    cancelNext();
    const q=quizQs[quizCur];
    if(!q){finishQuiz();return;}
    document.getElementById('quiz-question').innerHTML=
        `${q.q}<div class="answer-preview">${escH(q.preview)}</div>`;
    document.getElementById('quiz-progress').textContent=`第 ${quizCur+1} 題 / 共 ${quizQs.length} 題`;
    document.getElementById('quiz-bar').style.width=`${(quizCur/quizQs.length)*100}%`;
    const inp=document.getElementById('quiz-input');
    inp.maxLength=(q.answer?q.answer.length:20)+5; // 動態上限：防靜默截斷
    inp.value='';inp.disabled=false;
    setImeHint('quiz-ime',imeHintFor(q.cat));
    bindInputAssist('quiz-input','quiz-len','quiz-width');
    inp.dispatchEvent(new Event('input')); // 立即刷新字數/寬度顯示
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('char-diff').style.display='none';
    inp.focus();
}
function submitQuizAnswer(){
    if(quizDone||quizSubmitting)return;
    const q=quizQs[quizCur];
    if(!q)return;
    const inp=document.getElementById('quiz-input');
    const val=inp.value;
    // P0 空值防呆：不計分、不推進、不寫 log
    if(val===''){
        const fb0=document.getElementById('quiz-feedback');
        const ft0=document.getElementById('quiz-fb-text');
        const cd0=document.getElementById('char-diff');
        fb0.style.display='block';
        fb0.className='feedback-box wrong';
        ft0.textContent='⚠️ 請先輸入答案再送出；若不會作答，請點「跳過本題（0 分）」。';
        cd0.style.display='none';
        inp.focus();
        return;
    }
    quizSubmitting=true;
    const ok=val===q.answer;
    if(ok)quizScore++;
    quizLog.push({qNum:quizCur+1,type:'輸入題',
        question:q.q,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat,skipped:false});
    const fb=document.getElementById('quiz-feedback');
    const ft=document.getElementById('quiz-fb-text');
    const cd=document.getElementById('char-diff');
    fb.style.display='block';
    fb.className=`feedback-box ${ok?'correct':'wrong'}`;
    if(ok){
        ft.textContent='✅ 正確！';
        cd.style.display='none';
    }else{
        ft.textContent=`❌ 答錯了！提示：${q.hint}`;
        cd.innerHTML=charDiff(val===''?'':val,q.answer);
        cd.style.display='block';
    }
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{quizSubmitting=false;quizCur++;quizCur>=quizQs.length?finishQuiz():renderQuiz();},FEEDBACK_DELAY.quiz,fb);
}
function skipQuizQuestion(){
    // 明確跳過：記 skipped:true（0 分），與誤觸區分
    if(quizDone||quizSubmitting)return;
    const q=quizQs[quizCur];
    if(!q)return;
    quizSubmitting=true;
    const inp=document.getElementById('quiz-input');
    quizLog.push({qNum:quizCur+1,type:'輸入題',
        question:q.q,
        userAnswer:'（跳過）',
        correctAnswer:q.answer,
        isCorrect:false,cat:q.cat,skipped:true});
    const fb=document.getElementById('quiz-feedback');
    const ft=document.getElementById('quiz-fb-text');
    const cd=document.getElementById('char-diff');
    fb.style.display='block';
    fb.className='feedback-box wrong';
    ft.textContent=`⏭ 已跳過本題（0 分）。正確答案：${q.answer}`;
    cd.style.display='none';
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{quizSubmitting=false;quizCur++;quizCur>=quizQs.length?finishQuiz():renderQuiz();},FEEDBACK_DELAY.quiz,fb);
}
function finishQuiz(){
    quizDone=true;
    cancelNext();
    document.getElementById('quiz-bar').style.width='100%';
    document.getElementById('quiz-progress').textContent=`完成！得分 ${quizScore} / ${quizQs.length}`;
    document.getElementById('quiz-score-text').textContent=quizScore;
    document.getElementById('quiz-done').classList.add('show');
    document.getElementById('quiz-badge').textContent='已完成';
    document.getElementById('quiz-badge').className='badge badge-done';
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('quiz-input').disabled=true;
    saveProgress();
}

// ══════════════════════════════════════
// 轉換測驗
// ══════════════════════════════════════
let convQs=[],convCur=0,convScore=0,convDone=false,convLog=[],convSubmitting=false;
function initConv(){
    convQs=shuffle(CONV_POOL).slice(0,SET_CONV);
    convCur=0;convScore=0;convDone=false;convLog=[];
    cancelNext();
    document.getElementById('conv-done').classList.remove('show');
    document.getElementById('conv-badge').textContent='未完成';
    document.getElementById('conv-badge').className='badge badge-wait';
    document.getElementById('conv-total-text').textContent=convQs.length;
    renderConv();
}
function renderConv(){
    cancelNext();
    const q=convQs[convCur];
    if(!q){finishConv();return;}
    document.getElementById('conv-label').textContent=q.q;
    document.getElementById('conv-display').textContent=q.display;
    document.getElementById('conv-progress').textContent=`第 ${convCur+1} 題 / 共 ${convQs.length} 題`;
    document.getElementById('conv-bar').style.width=`${(convCur/convQs.length)*100}%`;
    document.getElementById('conv-feedback').style.display='none';
    document.getElementById('conv-char-diff').style.display='none';
    const inp=document.getElementById('conv-input');
    inp.maxLength=(q.answer?q.answer.length:10)+5;
    inp.value='';inp.disabled=false;
    setImeHint('conv-ime',convImeHint(q));
    bindInputAssist('conv-input','conv-len','conv-width');
    inp.dispatchEvent(new Event('input'));
    inp.focus();
}
function submitConvAnswer(){
    if(convDone||convSubmitting)return;
    const q=convQs[convCur];
    if(!q)return;
    const inp=document.getElementById('conv-input');
    const val=inp.value;
    if(val===''){
        const fb0=document.getElementById('conv-feedback');
        const ft0=document.getElementById('conv-fb-text');
        const cd0=document.getElementById('conv-char-diff');
        fb0.style.display='block';
        fb0.className='feedback-box wrong';
        ft0.textContent='⚠️ 請先輸入答案再送出；若不會作答，請點「跳過本題（0 分）」。';
        cd0.style.display='none';
        inp.focus();
        return;
    }
    convSubmitting=true;
    const ok=val===q.answer;
    if(ok)convScore++;
    convLog.push({qNum:convCur+1,type:'轉換題',
        question:q.q+' → '+q.display,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat,skipped:false});
    const fb=document.getElementById('conv-feedback');
    const ft=document.getElementById('conv-fb-text');
    const cd=document.getElementById('conv-char-diff');
    fb.style.display='block';
    fb.className=`feedback-box ${ok?'correct':'wrong'}`;
    if(ok){
        ft.textContent='✅ 正確！';
        cd.style.display='none';
    }else{
        ft.textContent=`❌ 答錯了！提示：${q.hint}`;
        cd.innerHTML=charDiff(val===''?'':val,q.answer);
        cd.style.display='block';
    }
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{convSubmitting=false;convCur++;convCur>=convQs.length?finishConv():renderConv();},FEEDBACK_DELAY.conv,fb);
}
function skipConvQuestion(){
    if(convDone||convSubmitting)return;
    const q=convQs[convCur];
    if(!q)return;
    convSubmitting=true;
    const inp=document.getElementById('conv-input');
    convLog.push({qNum:convCur+1,type:'轉換題',
        question:q.q+' → '+q.display,
        userAnswer:'（跳過）',
        correctAnswer:q.answer,
        isCorrect:false,cat:q.cat,skipped:true});
    const fb=document.getElementById('conv-feedback');
    const ft=document.getElementById('conv-fb-text');
    const cd=document.getElementById('conv-char-diff');
    fb.style.display='block';
    fb.className='feedback-box wrong';
    ft.textContent=`⏭ 已跳過本題（0 分）。正確答案：${q.answer}`;
    cd.style.display='none';
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{convSubmitting=false;convCur++;convCur>=convQs.length?finishConv():renderConv();},FEEDBACK_DELAY.conv,fb);
}
function finishConv(){
    convDone=true;
    cancelNext();
    document.getElementById('conv-bar').style.width='100%';
    document.getElementById('conv-progress').textContent=`完成！得分 ${convScore} / ${convQs.length}`;
    document.getElementById('conv-score-text').textContent=convScore;
    document.getElementById('conv-done').classList.add('show');
    document.getElementById('conv-badge').textContent='已完成';
    document.getElementById('conv-badge').className='badge badge-done';
    document.getElementById('conv-feedback').style.display='none';
    document.getElementById('conv-input').disabled=true;
    saveProgress();
}

// ══════════════════════════════════════
// 程式修復
// ══════════════════════════════════════
let repairQs=[],repairCur=0,repairScore=0,repairDone=false,repairLog=[],repairSubmitting=false;
function initRepair(){
    repairQs=shuffle(REPAIR_POOL).slice(0,SET_REPAIR);
    repairCur=0;repairScore=0;repairDone=false;repairLog=[];
    cancelNext();
    const totalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    document.getElementById('repair-done').classList.remove('show');
    document.getElementById('repair-badge').textContent='未完成';
    document.getElementById('repair-badge').className='badge badge-wait';
    document.getElementById('repair-total-text').textContent=totalPossible;
    renderRepair();
}
function renderRepair(){
    cancelNext();
    const q=repairQs[repairCur];
    if(!q){finishRepair();return;}
    document.getElementById('repair-display').innerHTML=
        `<div style="font-family:'JetBrains Mono',monospace;font-size:1.2rem;line-height:2;word-break:break-all;">${escH(q.display)}</div>`;
    document.getElementById('repair-progress').textContent=`第 ${repairCur+1} 題 / 共 ${repairQs.length} 題`;
    document.getElementById('repair-bar').style.width=`${(repairCur/repairQs.length)*100}%`;
    const inp=document.getElementById('repair-input');
    inp.maxLength=(q.answer?q.answer.length:40)+15;
    inp.value='';inp.disabled=false;
    setImeHint('repair-ime',imeHintFor(q.cat));
    bindInputAssist('repair-input','repair-len','repair-width');
    inp.dispatchEvent(new Event('input'));
    document.getElementById('repair-feedback').style.display='none';
    document.getElementById('repair-char-diff').style.display='none';
    document.getElementById('repair-score-detail').style.display='none';
    inp.focus();
}
// 差異位置集合：display 與 answer 不同的索引 = 本題錯誤位置
function repairErrIndices(q){
    const idx=[];
    const n=Math.min(q.display.length,q.answer.length);
    for(let i=0;i<n;i++){if(q.display[i]!==q.answer[i])idx.push(i);}
    return idx;
}
function submitRepairAnswer(){
    if(repairDone||repairSubmitting)return;
    const q=repairQs[repairCur];
    if(!q)return;
    const inp=document.getElementById('repair-input');
    const val=inp.value;
    if(val===''){
        const fb0=document.getElementById('repair-feedback');
        const ft0=document.getElementById('repair-fb-text');
        const cd0=document.getElementById('repair-char-diff');
        const sd0=document.getElementById('repair-score-detail');
        fb0.style.display='block';
        fb0.className='feedback-box wrong';
        ft0.textContent='⚠️ 請先輸入修正後的程式碼再送出；若不會作答，請點「跳過本題（0 分）」。';
        cd0.style.display='none';sd0.style.display='none';
        inp.focus();
        return;
    }
    repairSubmitting=true;
    // 整段字元正確率（顯示用）
    const maxLen=Math.max(val.length,q.answer.length);
    let correctCount=0;
    for(let i=0;i<maxLen;i++){
        const u=val[i]||'',c=q.answer[i]||'';
        if(u===c)correctCount++;
    }
    const totalCount=Math.max(q.answer.length,val.length);
    const pct=totalCount>0?Math.round((correctCount/totalCount)*100):0;
    const ok=val===q.answer;
    // 計分：以「差異位置被正確修正的數量」為準（語意 = 找出幾個錯誤）
    const errIdx=repairErrIndices(q);
    let earned;
    if(ok){
        earned=q.errCount;
    }else if(errIdx.length>0){
        let fixed=0;
        errIdx.forEach(i=>{if(val[i]===q.answer[i])fixed++;});
        earned=Math.min(q.errCount,Math.max(0,Math.round((fixed/errIdx.length)*q.errCount)));
    }else{
        earned=Math.max(0,Math.round((correctCount/totalCount)*q.errCount));
    }
    repairScore+=earned;
    repairLog.push({qNum:repairCur+1,type:'程式修復',
        question:q.q+': '+q.display,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat,skipped:false,
        earned:earned,maxEarn:q.errCount});
    const fb=document.getElementById('repair-feedback');
    const ft=document.getElementById('repair-fb-text');
    const cd=document.getElementById('repair-char-diff');
    const sd=document.getElementById('repair-score-detail');
    fb.style.display='block';
    fb.className=`feedback-box ${pct===100?'correct':'wrong'}`;
    if(ok){
        ft.textContent=`✅ 完全正確！獲得 ${q.errCount}/${q.errCount} 分`;
        cd.style.display='none';
        sd.style.display='none';
    }else{
        ft.textContent=`❌ 尚有錯誤。修正了 ${earned}/${q.errCount} 個（字元正確率 ${pct}%）`;
        cd.innerHTML=charDiff(val===''?'':val,q.answer);
        cd.style.display='block';
        sd.style.display='block';
        sd.textContent=`⚠️ 應修正 ${q.errCount} 個錯誤，你修正了 ${earned} 個。提示：${q.hint}`;
    }
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{repairSubmitting=false;repairCur++;repairCur>=repairQs.length?finishRepair():renderRepair();},FEEDBACK_DELAY.repair,fb);
}
function skipRepairQuestion(){
    if(repairDone||repairSubmitting)return;
    const q=repairQs[repairCur];
    if(!q)return;
    repairSubmitting=true;
    const inp=document.getElementById('repair-input');
    repairLog.push({qNum:repairCur+1,type:'程式修復',
        question:q.q+': '+q.display,
        userAnswer:'（跳過）',
        correctAnswer:q.answer,
        isCorrect:false,cat:q.cat,skipped:true,
        earned:0,maxEarn:q.errCount});
    const fb=document.getElementById('repair-feedback');
    const ft=document.getElementById('repair-fb-text');
    const cd=document.getElementById('repair-char-diff');
    const sd=document.getElementById('repair-score-detail');
    fb.style.display='block';
    fb.className='feedback-box wrong';
    ft.textContent=`⏭ 已跳過本題（0 分）。正確答案：${q.answer}`;
    cd.style.display='none';sd.style.display='none';
    inp.disabled=true;
    saveProgress();
    scheduleNext(()=>{repairSubmitting=false;repairCur++;repairCur>=repairQs.length?finishRepair():renderRepair();},FEEDBACK_DELAY.repair,fb);
}
function finishRepair(){
    repairDone=true;
    cancelNext();
    document.getElementById('repair-bar').style.width='100%';
    const totalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    document.getElementById('repair-progress').textContent=`完成！得分 ${repairScore} / ${totalPossible}`;
    document.getElementById('repair-score-text').textContent=repairScore;
    document.getElementById('repair-total-text').textContent=totalPossible;
    document.getElementById('repair-done').classList.add('show');
    document.getElementById('repair-badge').textContent='已完成';
    document.getElementById('repair-badge').className='badge badge-done';
    document.getElementById('repair-feedback').style.display='none';
    document.getElementById('repair-input').disabled=true;
    saveProgress();
}

// ══════════════════════════════════════
// 結果頁
// ══════════════════════════════════════
function buildResult(){
    const {cls,seat,name}=studentInfo;
    const repairTotalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    // 以實際抽題數為分母（與各區 finish 顯示一致）
    const idTotal=idQs.length,convTotal=convQs.length,quizTotal=quizQs.length;
    const total=idScore+convScore+quizScore+repairScore;
    const maxTotal=idTotal+convTotal+quizTotal+repairTotalPossible;
    document.getElementById('res-total').textContent=total;
    document.getElementById('res-denom').textContent=`/ ${maxTotal}`;
    document.getElementById('res-name').textContent=`${cls} 班 ${seat} 號 ${name}`;
    document.getElementById('res-time').textContent=`作答時間：${fmtTime(timerSec)}`;
    document.getElementById('res-id').textContent=idScore;
    document.getElementById('res-id-denom').textContent=`判斷測驗 / ${idTotal}`;
    document.getElementById('res-conv').textContent=convScore;
    document.getElementById('res-conv-denom').textContent=`轉換測驗 / ${convTotal}`;
    document.getElementById('res-quiz').textContent=quizScore;
    document.getElementById('res-quiz-denom').textContent=`輸入測驗 / ${quizTotal}`;
    document.getElementById('res-repair').textContent=repairScore;
    document.getElementById('res-repair-denom').textContent=`程式修復 / ${repairTotalPossible}`;
    const autoStatus=document.getElementById('auto-status');
    if(autoStatus)autoStatus.textContent='⏳ 成績計算完成，自動送出中…';

    // 分類統計
    const allLogs=[...idLog,...convLog,...quizLog,...repairLog];
    const cats={};
    allLogs.forEach(l=>{
        if(!cats[l.cat])cats[l.cat]={correct:0,total:0};
        if(l.type==='程式修復'){
            cats[l.cat].correct+=l.earned||0;
            cats[l.cat].total+=l.maxEarn||1;
        }else{
            cats[l.cat].total++;if(l.isCorrect)cats[l.cat].correct++;
        }
    });
    const catDiv=document.getElementById('cat-rows');catDiv.innerHTML='';
    Object.entries(cats).forEach(([cat,d])=>{
        const pct=Math.round((d.correct/d.total)*100);
        const color=CAT_COLOR[cat]||'#6b7280';
        const icon=pct===100?'✅':pct>=60?'⚠️':'❌';
        catDiv.innerHTML+=`<div class="cat-row">
            <span class="cat-icon">${icon}</span>
            <span class="cat-label">${cat}</span>
            <div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="cat-score" style="color:${color}">${d.correct}/${d.total}</span>
        </div>`;
    });

    // 錯題複習
    const wrongs=allLogs.filter(l=>!l.isCorrect);
    const ws=document.getElementById('wrong-section');
    if(wrongs.length===0){ws.style.display='none';}
    else{
        const wd=document.getElementById('wrong-items');wd.innerHTML='';
        wrongs.forEach(l=>{
            const diffHtml=(l.type==='輸入題'||l.type==='轉換題'||l.type==='程式修復')
                ?`<div class="wi-diff">${charDiff(l.userAnswer==='（未輸入）'?'':l.userAnswer,l.correctAnswer)}</div>`:'';
            const earnInfo=l.type==='程式修復'?` <span style="color:var(--accent);font-size:.8rem;">（得分 ${l.earned}/${l.maxEarn}）</span>`:'';
            wd.innerHTML+=`<div class="wrong-item">
                <div class="wi-q">【${l.type}】${escH(l.question)}${earnInfo}</div>
                <div class="wi-yours">你的答案：${escH(l.userAnswer)}</div>
                <div class="wi-correct">正確答案：${escH(l.correctAnswer)}</div>
                ${diffHtml}
            </div>`;
        });
    }

    // 逐題明細
    const tbody=document.getElementById('detail-tbody');tbody.innerHTML='';
    allLogs.forEach(l=>{
        const tr=document.createElement('tr');tr.className=l.isCorrect?'c-row':'w-row';
        const qShort=l.question.length>28?l.question.substring(0,28)+'…':l.question;
        tr.innerHTML=`<td>${l.qNum}</td><td>${l.type}</td>
            <td>${escH(qShort)}</td>
            <td class="mono">${escH(l.userAnswer)}</td>
            <td class="mono">${escH(l.correctAnswer)}</td>
            <td>${l.isCorrect?'✅':'❌'}</td>`;
        tbody.appendChild(tr);
    });
}

// ══════════════════════════════════════
// 送出 GAS（可驗證成功/失敗 + 離線佇列重試）
// ══════════════════════════════════════
function makeAttemptId(){
    return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}
function getPendingQueue(){
    try{return JSON.parse(localStorage.getItem('fontTypePending')||'[]');}
    catch(e){return[];}
}
function savePendingQueue(q){
    try{localStorage.setItem('fontTypePending',JSON.stringify(q));}catch(e){}
}
function enqueuePending(payload){
    const q=getPendingQueue();
    if(!q.some(p=>p.attemptId===payload.attemptId))q.push(payload);
    savePendingQueue(q);
}
function dequeuePending(attemptId){
    savePendingQueue(getPendingQueue().filter(p=>p.attemptId!==attemptId));
}
function setAutoStatus(text){
    const el=document.getElementById('auto-status');
    if(el)el.textContent=text;
}
async function postPayload(payload){
    // cors + text/plain（simple request）：可讀取 resp.ok 判斷是否真的成功
    const resp=await fetch(GAS_URL,{method:'POST',mode:'cors',
        headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
    if(!resp||!resp.ok)throw new Error('GAS response not ok');
    return resp;
}
async function submitToGAS(isAuto){
    const btn=document.getElementById('btn-gas');
    const msg=document.getElementById('submit-msg');
    const {cls,seat,name}=studentInfo;
    if(!GAS_URL){
        msg.className='submit-msg err';msg.style.display='block';
        msg.textContent='⚙️ GAS URL 尚未設定，請老師填入後再使用。';
        setAutoStatus('⚙️ GAS URL 尚未設定，無法自動送出');
        return;
    }
    btn.textContent=isAuto?'⏳ 自動送出中…':'⏳ 送出中…';
    btn.disabled=true;
    msg.className='submit-msg';msg.style.display='block';
    msg.textContent=isAuto?'⏳ 成績計算完成，自動送出中…':'⏳ 正在送出…';
    const repairTotalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    const allLogs=[...idLog,...convLog,...quizLog,...repairLog];
    const cats={};
    allLogs.forEach(l=>{
        if(!cats[l.cat])cats[l.cat]={correct:0,total:0};
        if(l.type==='程式修復'){
            cats[l.cat].correct+=l.earned||0;
            cats[l.cat].total+=l.maxEarn||1;
        }else{
            cats[l.cat].total++;if(l.isCorrect)cats[l.cat].correct++;
        }
    });
    const total2=idScore+convScore+quizScore+repairScore;
    const repairTotal2=repairQs.reduce((s,q)=>s+q.errCount,0);
    const maxTotal2=idQs.length+convQs.length+quizQs.length+repairTotal2;
    const payload={
        timestamp:new Date().toISOString(),
        attemptId:makeAttemptId(),
        cls,seat,name,
        idCount:idQs.length,convCount:convQs.length,quizCount:quizQs.length,repairCount:repairQs.length,
        identifyScore:idScore,convScore:convScore,quizScore:quizScore,repairScore:repairScore,
        totalScore:total2,maxScore:maxTotal2,
        timeTaken:fmtTime(timerSec),timeSeconds:timerSec,
        categoryStats:cats,
        details:allLogs.map(l=>({
            qNum:l.qNum,type:l.type,question:l.question,
            userAnswer:l.userAnswer,correctAnswer:l.correctAnswer,
            isCorrect:l.isCorrect?'正確':'錯誤',category:l.cat,
            skipped:!!l.skipped
        }))
    };
    try{
        await postPayload(payload);
        dequeuePending(payload.attemptId);
        msg.className='submit-msg ok';
        msg.textContent=`✅ 成績已成功送出！${name} 同學，總分 ${total2} / ${maxTotal2}，作答時間 ${fmtTime(timerSec)}。`;
        setAutoStatus(`✅ 成績已成功送出（${payload.timestamp}）`);
        btn.textContent='✅ 已送出';btn.disabled=true;
    }catch(err){
        enqueuePending(payload); // 保留至 localStorage，結果頁載入時自動重試
        msg.className='submit-msg err';
        msg.textContent='❌ 送出失敗（網路或 GAS 異常），成績已暫存於本機，請點擊下方按鈕重新送出。';
        setAutoStatus('❌ 自動送出失敗，成績已暫存，請點下方按鈕手動重新送出');
        btn.textContent='📤 重新送出成績';btn.disabled=false;
    }
}
// 結果頁載入時：自動重試本機暫存的未送出成績
async function retryPendingQueue(){
    const pending=getPendingQueue();
    if(pending.length===0||!GAS_URL)return;
    const msg=document.getElementById('submit-msg');
    for(const p of pending){
        try{
            await postPayload(p);
            dequeuePending(p.attemptId);
        }catch(e){/* 保留，下次再試 */}
    }
    const left=getPendingQueue().length;
    if(msg&&left<pending.length){
        msg.className='submit-msg ok';msg.style.display='block';
        msg.textContent=`✅ 本機暫存成績已補送（尚餘 ${left} 筆未送出）。`;
    }
}

// ══════════════════════════════════════
// 班級 / 座號選單（資料檔化：換學年只改 CLASS_LIST）
// ══════════════════════════════════════
const CLASS_LIST=[
    {grade:'七年級',from:701,to:715},
    {grade:'八年級',from:801,to:815},
    {grade:'九年級',from:901,to:915}
];
const MAX_SEAT=35;
function buildClassSeat(){
    const clsSel=document.getElementById('sel-class');
    CLASS_LIST.forEach(g=>{
        const og=document.createElement('optgroup');
        og.label=g.grade;
        for(let c=g.from;c<=g.to;c++){
            const op=document.createElement('option');
            op.value=String(c);op.textContent=String(c);
            og.appendChild(op);
        }
        clsSel.appendChild(og);
    });
    const seatSel=document.getElementById('sel-seat');
    for(let i=1;i<=MAX_SEAT;i++){
        const op=document.createElement('option');
        op.value=String(i);op.textContent=String(i);
        seatSel.appendChild(op);
    }
}

// ══════════════════════════════════════
// 教師模式：URL 參數鎖定題數（例：?mode=test&n=10,5,10,3）
// ══════════════════════════════════════
function applyTeacherMode(){
    let params=null;
    try{params=new URLSearchParams(location.search);}catch(e){return;}
    if(params.get('mode')!=='test')return;
    const n=(params.get('n')||'').split(',').map(x=>parseInt(x,10));
    const sliders=['slider-id','slider-conv','slider-quiz','slider-repair'];
    const keys=['SET_ID','SET_CONV','SET_QUIZ','SET_REPAIR'];
    let locked=false;
    sliders.forEach((id,i)=>{
        const el=document.getElementById(id);
        if(!el||isNaN(n[i]))return;
        const min=parseInt(el.min,10),max=parseInt(el.max,10);
        const v=Math.min(max,Math.max(min,n[i]));
        el.value=String(v);el.disabled=true;
        locked=true;
    });
    if(locked){
        updateSettings();
        const note=document.getElementById('lock-note');
        if(note)note.style.display='block';
    }
}

// ══════════════════════════════════════
// 作答進度快照（sessionStorage）：F5/斷線可續作答
// ══════════════════════════════════════
function saveProgress(){
    try{
        sessionStorage.setItem('fontTypeProgress',JSON.stringify({
            studentInfo:studentInfo,
            sets:{id:SET_ID,conv:SET_CONV,quiz:SET_QUIZ,repair:SET_REPAIR},
            timerStartAt:timerStartAt,
            id:{qs:idQs,cur:idCur,score:idScore,done:idDone,log:idLog},
            conv:{qs:convQs,cur:convCur,score:convScore,done:convDone,log:convLog},
            quiz:{qs:quizQs,cur:quizCur,score:quizScore,done:quizDone,log:quizLog},
            repair:{qs:repairQs,cur:repairCur,score:repairScore,done:repairDone,log:repairLog}
        }));
    }catch(e){/* 配額不足時略過 */}
}
function clearProgress(){
    try{
        sessionStorage.removeItem('fontTypeProgress');
        sessionStorage.removeItem('fontTypeTimerStart');
        sessionStorage.removeItem('fontTypeTimerRunning');
    }catch(e){}
}
function hasProgress(){
    try{
        const raw=sessionStorage.getItem('fontTypeProgress');
        if(!raw)return false;
        const s=JSON.parse(raw);
        return !!(s&&(s.id||s.conv||s.quiz||s.repair));
    }catch(e){return false;}
}
function restoreProgress(){
    let s=null;
    try{s=JSON.parse(sessionStorage.getItem('fontTypeProgress')||'null');}catch(e){}
    if(!s){showToast('⚠️ 沒有可恢復的作答進度');return;}
    cancelNext();
    studentInfo=s.studentInfo||{};
    // 先還原滑桿再 updateSettings（updateSettings 會從滑桿讀值）
    const sliderVals={id:s.sets.id,conv:s.sets.conv,quiz:s.sets.quiz,repair:s.sets.repair};
    Object.entries({id:'slider-id',conv:'slider-conv',quiz:'slider-quiz',repair:'slider-repair'}).forEach(([k,elId])=>{
        const el=document.getElementById(elId);
        if(el&&sliderVals[k]!=null)el.value=String(sliderVals[k]);
    });
    updateSettings();
    idQs=s.id.qs;idCur=s.id.cur;idScore=s.id.score;idDone=s.id.done;idLog=s.id.log;
    convQs=s.conv.qs;convCur=s.conv.cur;convScore=s.conv.score;convDone=s.conv.done;convLog=s.conv.log;
    quizQs=s.quiz.qs;quizCur=s.quiz.cur;quizScore=s.quiz.score;quizDone=s.quiz.done;quizLog=s.quiz.log;
    repairQs=s.repair.qs;repairCur=s.repair.cur;repairScore=s.repair.score;repairDone=s.repair.done;repairLog=s.repair.log;
    document.getElementById('id-total-text').textContent=idQs.length;
    document.getElementById('conv-total-text').textContent=convQs.length;
    document.getElementById('quiz-total-text').textContent=quizQs.length;
    if(idDone)finishIdentify();else renderIdentify();
    if(convDone)finishConv();else renderConv();
    if(quizDone)finishQuiz();else renderQuiz();
    if(repairDone)finishRepair();else renderRepair();
    showPage('page-quiz');
    startTimer(true);
    showToast('↩️ 已恢復上次作答進度');
}
function maybeShowResume(){
    const btn=document.getElementById('btn-resume');
    if(btn&&hasProgress())btn.style.display='block';
}

// ══════════════════════════════════════
// 判斷題鍵盤快捷鍵：1 = 半形、2 = 全形
// ══════════════════════════════════════
document.addEventListener('keydown',e=>{
    if(e.key!=='1'&&e.key!=='2')return;
    if(idDone)return;
    if(document.getElementById('page-quiz').style.display==='none')return;
    const t=e.target.tagName;
    if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
    if(document.getElementById('btn-id-half').disabled)return;
    e.preventDefault();
    answerIdentify(e.key==='1'?'half':'full');
});

// ══════════════════════════════════════
// 初始化
// ══════════════════════════════════════
buildClassSeat();
showPage('page-intro');
updateSettings();
applyTeacherMode();
bindSubmit('conv-input',submitConvAnswer,false);
bindSubmit('quiz-input',submitQuizAnswer,false);
bindSubmit('repair-input',submitRepairAnswer,true);
maybeShowResume();
