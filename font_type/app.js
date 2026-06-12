// ══════════════════════════════════════
// ⚙️ 老師請填入 GAS Web App URL
// ══════════════════════════════════════
const GAS_URL = "https://script.google.com/macros/s/AKfycbwqta2pCqBH2hiI9fSZF5bwPAcOX8ZfmvaqAYV2FLPPYjDM088833ZUX-q-9-VRZtCf/exec"; // 例："https://script.google.com/macros/s/XXXXX/exec"

// ══════════════════════════════════════
// 防複製 / 防貼上
// ══════════════════════════════════════
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
    const tag=e.target.tagName;
    if(tag==='SELECT')return;
    if(tag==='INPUT'||tag==='TEXTAREA'){
        if((e.ctrlKey||e.metaKey)&&['c','v','x'].includes(e.key.toLowerCase()))e.preventDefault();
        return;
    }
    if((e.ctrlKey||e.metaKey)&&['c','a','u','s','p'].includes(e.key.toLowerCase()))e.preventDefault();
    if(e.key==='F12')e.preventDefault();
});
document.addEventListener('paste',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')e.preventDefault();
});
document.addEventListener('copy',e=>e.preventDefault());

// ══════════════════════════════════════
// 計時器（前往測驗才啟動）
// ══════════════════════════════════════
let timerSec=0,timerInterval=null;
function startTimer(){
    timerSec=0;
    document.getElementById('timer-display').classList.add('running');
    timerInterval=setInterval(()=>{
        timerSec++;
        const m=String(Math.floor(timerSec/60)).padStart(2,'0');
        const s=String(timerSec%60).padStart(2,'0');
        document.getElementById('timer-display').textContent=`${m}:${s}`;
    },1000);
}
function stopTimer(){clearInterval(timerInterval);}
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
    const cls=document.getElementById('sel-class').value;
    const seat=document.getElementById('sel-seat').value;
    const name=document.getElementById('inp-name').value.trim();
    if(!cls||!seat||!name){alert('請填寫班級、座號與姓名後再開始！');return;}
    studentInfo={cls,seat,name};
    initLearn();
    showPage('page-learn');
}

function goToQuiz(){
    startTimer(); // ← 前往測驗才開始計時
    initIdentify();
    initConv();
    initQuiz();
    initRepair();
    showPage('page-quiz');
}

function goToResult(){
    stopTimer();
    buildResult();
    showPage('page-result');
    submitToGAS(true);
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
    'win-ime':{text:'Windows 中英模式：使用 <b>Shift</b> 鍵在中文輸入法與英數之間切換。',keys:['Shift']}
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

// 逐字比對 HTML
function charDiff(user,correct){
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
        hint=`<div class="diff-hint">第 ${firstErr+1} 個字元：你輸入「${escH(u)}」，應為「${escH(c)}」</div>`;
    }
    return`<div class="diff-row"><span class="diff-label">你輸入：</span>${youHtml}</div>`+
           `<div class="diff-row"><span class="diff-label">正確答案：</span>${corHtml}</div>${hint}`;
}

// ══════════════════════════════════════
// 判斷測驗
// ══════════════════════════════════════
let idQs=[],idCur=0,idScore=0,idDone=false,idLog=[];

function initIdentify(){
    idQs=shuffle(ID_POOL).slice(0,SET_ID);
    idCur=0;idScore=0;idDone=false;idLog=[];
    document.getElementById('id-done').classList.remove('show');
    document.getElementById('id-badge').textContent='未完成';
    document.getElementById('id-badge').className='badge badge-wait';
    document.getElementById('id-total-text').textContent=SET_ID;
    renderIdentify();
}
function renderIdentify(){
    const q=idQs[idCur];
    document.getElementById('id-sentence').innerHTML=q.s.replace('{M}',`<span class="mk">${q.m}</span>`);
    document.getElementById('id-progress').textContent=`第 ${idCur+1} 題 / 共 ${SET_ID} 題`;
    document.getElementById('id-bar').style.width=`${(idCur/SET_ID)*100}%`;
    document.getElementById('id-feedback').style.display='none';
    document.getElementById('btn-id-half').disabled=false;
    document.getElementById('btn-id-full').disabled=false;
}
function answerIdentify(ans){
    if(idDone)return;
    const q=idQs[idCur];
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
    setTimeout(()=>{idCur++;idCur>=SET_ID?finishIdentify():renderIdentify();},1200);
}
function finishIdentify(){
    idDone=true;
    document.getElementById('id-bar').style.width='100%';
    document.getElementById('id-progress').textContent=`完成！得分 ${idScore} / ${SET_ID}`;
    document.getElementById('id-score-text').textContent=idScore;
    document.getElementById('id-done').classList.add('show');
    document.getElementById('id-badge').textContent='已完成';
    document.getElementById('id-badge').className='badge badge-done';
    document.getElementById('id-feedback').style.display='none';
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
    if(available.length<remaining){
        console.warn(`一般題庫僅 ${available.length} 題可用，不足 ${remaining} 題`);
    }
    const general=available.slice(0,remaining);

    // 6. 合併並再次 shuffle，讓保底題位置隨機
    return shuffle([dq,sq,nl,...general]);
}

function initQuiz(){
    quizQs=buildQuizQuestions(SET_QUIZ);
    quizCur=0;quizScore=0;quizDone=false;quizLog=[];
    document.getElementById('quiz-done').classList.remove('show');
    document.getElementById('quiz-badge').textContent='未完成';
    document.getElementById('quiz-badge').className='badge badge-wait';
    document.getElementById('quiz-total-text').textContent=SET_QUIZ;
    renderQuiz();
}
function renderQuiz(){
    const q=quizQs[quizCur];
    document.getElementById('quiz-question').innerHTML=
        `${q.q}<div class="answer-preview">${escH(q.preview)}</div>`;
    document.getElementById('quiz-progress').textContent=`第 ${quizCur+1} 題 / 共 ${SET_QUIZ} 題`;
    document.getElementById('quiz-bar').style.width=`${(quizCur/SET_QUIZ)*100}%`;
    const inp=document.getElementById('quiz-input');
    inp.value='';inp.disabled=false;
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('char-diff').style.display='none';
    inp.focus();
}
function submitQuizAnswer(){
    if(quizDone||quizSubmitting)return;
    quizSubmitting=true;
    const q=quizQs[quizCur];
    const inp=document.getElementById('quiz-input');
    const val=inp.value;
    const ok=val===q.answer;
    if(ok)quizScore++;
    quizLog.push({qNum:quizCur+1,type:'輸入題',
        question:q.q,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat});
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
    setTimeout(()=>{quizSubmitting=false;quizCur++;quizCur>=SET_QUIZ?finishQuiz():renderQuiz();},2000);
}
function finishQuiz(){
    quizDone=true;
    document.getElementById('quiz-bar').style.width='100%';
    document.getElementById('quiz-progress').textContent=`完成！得分 ${quizScore} / ${SET_QUIZ}`;
    document.getElementById('quiz-score-text').textContent=quizScore;
    document.getElementById('quiz-done').classList.add('show');
    document.getElementById('quiz-badge').textContent='已完成';
    document.getElementById('quiz-badge').className='badge badge-done';
    document.getElementById('quiz-feedback').style.display='none';
    document.getElementById('quiz-input').disabled=true;
}

// ══════════════════════════════════════
// 轉換測驗
// ══════════════════════════════════════
let convQs=[],convCur=0,convScore=0,convDone=false,convLog=[],convSubmitting=false;
function initConv(){
    convQs=shuffle(CONV_POOL).slice(0,SET_CONV);
    convCur=0;convScore=0;convDone=false;convLog=[];
    document.getElementById('conv-done').classList.remove('show');
    document.getElementById('conv-badge').textContent='未完成';
    document.getElementById('conv-badge').className='badge badge-wait';
    document.getElementById('conv-total-text').textContent=SET_CONV;
    renderConv();
}
function renderConv(){
    const q=convQs[convCur];
    document.getElementById('conv-label').textContent=q.q;
    document.getElementById('conv-display').textContent=q.display;
    document.getElementById('conv-progress').textContent=`第 ${convCur+1} 題 / 共 ${SET_CONV} 題`;
    document.getElementById('conv-bar').style.width=`${(convCur/SET_CONV)*100}%`;
    document.getElementById('conv-feedback').style.display='none';
    document.getElementById('conv-char-diff').style.display='none';
    const inp=document.getElementById('conv-input');
    inp.value='';inp.disabled=false;inp.focus();
}
function submitConvAnswer(){
    if(convDone||convSubmitting)return;
    convSubmitting=true;
    const q=convQs[convCur];
    const inp=document.getElementById('conv-input');
    const val=inp.value;
    const ok=val===q.answer;
    if(ok)convScore++;
    convLog.push({qNum:convCur+1,type:'轉換題',
        question:q.q+' → '+q.display,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat});
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
    setTimeout(()=>{convSubmitting=false;convCur++;convCur>=SET_CONV?finishConv():renderConv();},1500);
}
function finishConv(){
    convDone=true;
    document.getElementById('conv-bar').style.width='100%';
    document.getElementById('conv-progress').textContent=`完成！得分 ${convScore} / ${SET_CONV}`;
    document.getElementById('conv-score-text').textContent=convScore;
    document.getElementById('conv-done').classList.add('show');
    document.getElementById('conv-badge').textContent='已完成';
    document.getElementById('conv-badge').className='badge badge-done';
    document.getElementById('conv-feedback').style.display='none';
    document.getElementById('conv-input').disabled=true;
}

// ══════════════════════════════════════
// 程式修復
// ══════════════════════════════════════
let repairQs=[],repairCur=0,repairScore=0,repairDone=false,repairLog=[],repairSubmitting=false;
function initRepair(){
    repairQs=shuffle(REPAIR_POOL).slice(0,SET_REPAIR);
    repairCur=0;repairScore=0;repairDone=false;repairLog=[];
    const totalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    document.getElementById('repair-done').classList.remove('show');
    document.getElementById('repair-badge').textContent='未完成';
    document.getElementById('repair-badge').className='badge badge-wait';
    document.getElementById('repair-total-text').textContent=totalPossible;
    renderRepair();
}
function renderRepair(){
    const q=repairQs[repairCur];
    document.getElementById('repair-display').innerHTML=
        `<div style="font-family:'JetBrains Mono',monospace;font-size:1.2rem;line-height:2;word-break:break-all;">${escH(q.display)}</div>`;
    document.getElementById('repair-progress').textContent=`第 ${repairCur+1} 題 / 共 ${SET_REPAIR} 題`;
    document.getElementById('repair-bar').style.width=`${(repairCur/SET_REPAIR)*100}%`;
    const inp=document.getElementById('repair-input');
    inp.value='';inp.disabled=false;
    document.getElementById('repair-feedback').style.display='none';
    document.getElementById('repair-char-diff').style.display='none';
    document.getElementById('repair-score-detail').style.display='none';
    inp.focus();
}
function submitRepairAnswer(){
    if(repairDone||repairSubmitting)return;
    repairSubmitting=true;
    const q=repairQs[repairCur];
    const inp=document.getElementById('repair-input');
    const val=inp.value;
    // 逐字比對計算分數
    const maxLen=Math.max(val.length,q.answer.length);
    let correctCount=0;
    for(let i=0;i<maxLen;i++){
        const u=val[i]||'',c=q.answer[i]||'';
        if(u===c)correctCount++;
    }
    const totalCount=Math.max(q.answer.length,val.length);
    const pct=totalCount>0?Math.round((correctCount/totalCount)*100):0;
    const ok=val===q.answer;
    const earned=ok?q.errCount:Math.max(0,Math.floor((correctCount/totalCount)*q.errCount));
    repairScore+=earned;
    repairLog.push({qNum:repairCur+1,type:'程式修復',
        question:q.q+': '+q.display,
        userAnswer:val===''?'（未輸入）':val,
        correctAnswer:q.answer,
        isCorrect:ok,cat:q.cat,
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
    setTimeout(()=>{repairSubmitting=false;repairCur++;repairCur>=SET_REPAIR?finishRepair():renderRepair();},2500);
}
function finishRepair(){
    repairDone=true;
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
}

// ══════════════════════════════════════
// 結果頁
// ══════════════════════════════════════
function buildResult(){
    const {cls,seat,name}=studentInfo;
    const repairTotalPossible=repairQs.reduce((s,q)=>s+q.errCount,0);
    const total=idScore+convScore+quizScore+repairScore;
    const maxTotal=SET_ID+SET_CONV+SET_QUIZ+repairTotalPossible;
    document.getElementById('res-total').textContent=total;
    document.getElementById('res-denom').textContent=`/ ${maxTotal}`;
    document.getElementById('res-name').textContent=`${cls} 班 ${seat} 號 ${name}`;
    document.getElementById('res-time').textContent=`作答時間：${fmtTime(timerSec)}`;
    document.getElementById('res-id').textContent=idScore;
    document.getElementById('res-id-denom').textContent=`判斷測驗 / ${SET_ID}`;
    document.getElementById('res-conv').textContent=convScore;
    document.getElementById('res-conv-denom').textContent=`轉換測驗 / ${SET_CONV}`;
    document.getElementById('res-quiz').textContent=quizScore;
    document.getElementById('res-quiz-denom').textContent=`輸入測驗 / ${SET_QUIZ}`;
    document.getElementById('res-repair').textContent=repairScore;
    document.getElementById('res-repair-denom').textContent=`程式修復 / ${repairTotalPossible}`;

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
                <div class="wi-q">【${l.type}】${l.question}${earnInfo}</div>
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
        tr.innerHTML=`<td>${l.qNum}</td><td>${l.type}</td>
            <td>${l.question.substring(0,28)}${l.question.length>28?'…':''}</td>
            <td class="mono">${escH(l.userAnswer)}</td>
            <td class="mono">${escH(l.correctAnswer)}</td>
            <td>${l.isCorrect?'✅':'❌'}</td>`;
        tbody.appendChild(tr);
    });
}

// ══════════════════════════════════════
// 送出 GAS
// ══════════════════════════════════════
async function submitToGAS(isAuto){
    const btn=document.getElementById('btn-gas');
    const msg=document.getElementById('submit-msg');
    const {cls,seat,name}=studentInfo;
    if(!GAS_URL){
        msg.className='submit-msg err';msg.style.display='block';
        msg.textContent='⚙️ GAS URL 尚未設定，請老師填入後再使用。';return;
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
    const maxTotal2=SET_ID+SET_CONV+SET_QUIZ+repairTotal2;
    const payload={
        timestamp:new Date().toLocaleString('zh-TW'),
        cls,seat,name,
        idCount:SET_ID,convCount:SET_CONV,quizCount:SET_QUIZ,repairCount:SET_REPAIR,
        identifyScore:idScore,convScore:convScore,quizScore:quizScore,repairScore:repairScore,
        totalScore:total2,maxScore:maxTotal2,
        timeTaken:fmtTime(timerSec),timeSeconds:timerSec,
        categoryStats:cats,
        details:allLogs.map(l=>({
            qNum:l.qNum,type:l.type,question:l.question,
            userAnswer:l.userAnswer,correctAnswer:l.correctAnswer,
            isCorrect:l.isCorrect?'正確':'錯誤',category:l.cat
        }))
    };
    try{
        await fetch(GAS_URL,{method:'POST',mode:'no-cors',
            headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});
        msg.className='submit-msg ok';
        msg.textContent=`✅ 成績已送出！${name} 同學，總分 ${total2} / ${maxTotal2}，作答時間 ${fmtTime(timerSec)}。`;
        btn.textContent='✅ 已送出';btn.disabled=true;
    }catch(err){
        msg.className='submit-msg err';
        msg.textContent='❌ 送出失敗，請點擊下方按鈕重新送出。';
        btn.textContent='📤 重新送出成績';btn.disabled=false;
    }
}

// ══════════════════════════════════════
// 初始化
// ══════════════════════════════════════
showPage('page-intro');
updateSettings();
