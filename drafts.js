/* Five local drafts; restore only after an explicit user action. */
(()=>{
 const planner=!!document.querySelector('#planBody'),scope=planner?document:document.querySelector('#inputView');
 const key=planner?'blueprint-planner-drafts':'blueprint-assessment-drafts';
 let session=Date.now()+'-'+Math.random(),restoring=false;
 const fields=()=>[...scope.querySelectorAll('input,select,textarea')].filter(x=>!x.closest('.draft-tools')&&(planner?!!x.id:true));
 const captureFields=()=>fields().map((x,i)=>({id:x.id,index:i,value:x.value,checked:x.checked}));
 const baseline=JSON.stringify(captureFields());
 const read=()=>{try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.slice(0,5):[]}catch{return []}};
 const bar=document.createElement('div');bar.className='draft-tools';
 bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:12px;margin:12px 0;background:#f1f4ed;border:1px solid #d8dfd3;border-radius:12px';
 bar.innerHTML='<button type="button" class="btn" data-save>บันทึกร่าง</button><select data-drafts aria-label="ร่างที่บันทึกไว้"></select><button type="button" class="btn" data-restore>เรียกคืนร่าง</button><button type="button" class="btn" data-delete>ลบชุดที่เลือก</button><button type="button" class="btn" data-clear>ล้างประวัติทั้งหมด</button><small style="width:100%" data-status>เก็บย้อนหลัง 5 ชุดในเบราว์เซอร์เครื่องนี้ · เปิดเว็บใหม่เริ่มว่าง กดเรียกคืนเมื่อต้องการ</small>';
 const host=planner?document.querySelector('main'):scope;if(planner)host.before(bar);else host.prepend(bar);
 const status=t=>bar.querySelector('[data-status]').textContent=t;
 bar.querySelector('[data-save]').hidden=!planner;
 status(planner?'เก็บ 5 ร่างล่าสุดเมื่อกดบันทึกร่างเท่านั้น · เปิดใหม่เริ่มว่าง':'เก็บ 5 ผล Analyze ล่าสุดที่ข้อมูลต่างกัน · ไม่บันทึกระหว่างกรอกหรือปิดหน้า · เปิดใหม่เริ่มว่าง');
 const refresh=()=>{const select=bar.querySelector('[data-drafts]'),all=read();select.innerHTML='';all.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=new Date(d.at).toLocaleString('th-TH');select.append(o)});['[data-restore]','[data-delete]','[data-clear]'].forEach(s=>bar.querySelector(s).disabled=!all.length)};
 function snapshot(){
  const data={fields:captureFields()};
  if(planner){data.state={rows,crmRows,planConfig,reviewRows,continuationRows,continuationMeta,continueCrmRows,through:document.querySelector('#usedThrough').value,mode:!document.querySelector('#continuePlanPage').hidden};}
  return JSON.parse(JSON.stringify(data));
 }
 function saveDraft(manual=false){
  if(restoring)return;
  const data=snapshot();
  const meaningful=planner?(rows.length||reviewRows.length||document.querySelector('#reviewText').value.trim()||document.querySelector('#startDate').value.trim()):JSON.stringify(data.fields)!==baseline;
  if(!meaningful){if(manual)status('ยังไม่มีข้อมูลให้บันทึก');return}
  const all=read();
  if(all.some(x=>JSON.stringify(x.data)===JSON.stringify(data))){status('ข้อมูลนี้บันทึกไว้แล้ว ไม่สร้างร่างซ้ำ');return}
  session=Date.now()+'-'+Math.random();
  const entry={id:session,at:new Date().toISOString(),label:planner?'GLP-1 / แผนต่อ':'Body Blueprint',data};
  try{localStorage.setItem(key,JSON.stringify([entry,...all.filter(x=>x.id!==session)].slice(0,5)));refresh();status('บันทึกร่างในเครื่องแล้ว · '+new Date().toLocaleTimeString('th-TH')+' · เปิดใหม่เริ่มว่างเสมอ')}catch{status('บันทึกไม่ได้ พื้นที่เบราว์เซอร์อาจเต็มหรือถูกจำกัด')}
 }
 function restoreDraft(){
  const entry=read().find(x=>x.id===bar.querySelector('[data-drafts]').value);if(!entry)return;
  if(!confirm('เรียกคืนร่างนี้แทนข้อมูลที่กำลังกรอกอยู่?'))return;
  restoring=true;
  try{
   if(!planner)clearData();
   if(planner){const st=entry.data.state;planConfig=st.planConfig;rows=st.rows||[];crmRows=st.crmRows||[];}
   const applyFields=()=>{const current=fields();entry.data.fields.forEach(f=>{const e=f.id?document.getElementById(f.id):current[f.index];if(e){e.value=f.value;if(e.type==='checkbox'||e.type==='radio')e.checked=f.checked}})};
   applyFields();
   if(planner){
    renderPens(true);applyFields();renderStartOptions(false);applyFields();updateRulePreview();calculateMeta();render();renderCrm();
    const st=entry.data.state;reviewRows=st.reviewRows||[];
    if(reviewRows.length){document.querySelector('#usedThrough').innerHTML=reviewRows.map((r,i)=>`<option value="${i}">${ordinal(r.number)} · ${thaiDate(r.row.date)}</option>`).join('');document.querySelector('#usedThrough').value=st.through;document.querySelector('#reviewCurrentCard').hidden=false;document.querySelector('#continueSetupCard').hidden=false;renderReviewHistory(false);updateContinueControls();}
    continuationRows=st.continuationRows||[];continuationMeta=st.continuationMeta||null;if(continuationMeta)renderContinuation();
    continueCrmRows=st.continueCrmRows||[];if(continueCrmRows.length)renderContinueCrm();
    continueWasCleared=true;st.mode?showContinuePage():showNormalPage();
   }else{syncSexSpecificFields();syncWeightLossHistory();currentAssessment=null;reportDraft=null;}
   session=Date.now()+'-'+Math.random();status('เรียกคืนร่างแล้ว กรุณาตรวจข้อมูลก่อนใช้งาน');
  }finally{restoring=false}
 }
 bar.querySelector('[data-save]').onclick=()=>{if(planner)saveDraft(true)};
 bar.querySelector('[data-restore]').onclick=restoreDraft;
 bar.querySelector('[data-delete]').onclick=()=>{
  const selected=bar.querySelector('[data-drafts]').value,all=read(),entry=all.find(x=>x.id===selected);if(!entry)return;
  if(!confirm('ลบร่างวันที่ '+new Date(entry.at).toLocaleString('th-TH')+'? ลบแล้วเรียกคืนไม่ได้ ข้อมูลบนหน้าจอจะยังอยู่'))return;
  try{localStorage.setItem(key,JSON.stringify(all.filter(x=>x.id!==selected)));refresh();status('ลบชุดที่เลือกแล้ว ข้อมูลบนหน้าจอยังคงอยู่')}catch{status('ลบไม่สำเร็จ กรุณาลองอีกครั้ง')}
 };
 bar.querySelector('[data-clear]').onclick=()=>{
  if(!read().length||!confirm('ล้างประวัติร่างทั้งหมดของ '+(planner?'GLP-1':'Body Blueprint')+' ในเบราว์เซอร์นี้? ลบแล้วเรียกคืนไม่ได้ ข้อมูลบนหน้าจอจะยังอยู่'))return;
  try{localStorage.setItem(key,'[]');refresh();status('ล้างประวัติร่างแล้ว ข้อมูลบนหน้าจอยังคงอยู่')}catch{status('ล้างประวัติไม่สำเร็จ กรุณาลองอีกครั้ง')}
 };
 if(!planner)window.addEventListener('blueprint-analyzed',()=>saveDraft());
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
 fields().forEach(e=>e.setAttribute('autocomplete','off'));refresh();
})();
