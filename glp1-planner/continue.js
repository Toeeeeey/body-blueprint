let reviewRows=[];
let continuationRows=[];
let continuationMeta=null;
let continueWasCleared=false;

function showContinuePage(){
  $('#normalPlanPage').hidden=true;
  $('#continuePlanPage').hidden=false;
  $('#copyTopBtn').textContent='คัดลอกแผนต่อ';
  $('#copyTopBtn').onclick=copyContinuePlan;
  $('#normalTabBtn').classList.remove('active');
  $('#continueTabBtn').classList.add('active');
  if(!continueWasCleared&&!$('#reviewText').value&&/^(?:Plan|Mx)\s*:/i.test($('#patientText').textContent))$('#reviewText').value=$('#patientText').textContent;
  window.scrollTo({top:0});
}

function showNormalPage(){
  $('#continuePlanPage').hidden=true;
  $('#normalPlanPage').hidden=false;
  $('#copyTopBtn').textContent='คัดลอกแผน';
  $('#copyTopBtn').onclick=copyPlan;
  $('#continueTabBtn').classList.remove('active');
  $('#normalTabBtn').classList.add('active');
  window.scrollTo({top:0});
}

function todayIso(){return iso(new Date())}

function analyzeReviewPlan(){
  const {parsed}=auditImport($('#reviewText').value,'#reviewImportAudit');
  if(!parsed.length)return toast('อ่านแผนไม่ได้ กรุณาใส่อย่างน้อยวันที่และจำนวน click ในแต่ละบรรทัด');
  continueWasCleared=false;
  reviewRows=parsed;
  const today=todayIso();
  let suggested=0;
  parsed.forEach((item,index)=>{if(item.row.date<=today)suggested=index});
  $('#usedThrough').innerHTML=parsed.map((item,index)=>`<option value="${index}" ${index===suggested?'selected':''}>ครั้งที่ ${item.number} · ${thaiDate(item.row.date)}</option>`).join('');
  $('#priorUsedClicks').value='0';
  $('#reviewCurrentCard').hidden=false;
  $('#continueSetupCard').hidden=false;
  $('#continuationResultCard').hidden=true;
  syncReviewPrior();renderReviewHistory(true);
  $('#reviewCurrentCard').scrollIntoView?.({behavior:'smooth',block:'start'});
  toast(`อ่านแผนได้ ${parsed.length} ครั้ง · กรุณาเลือกครั้งที่ฉีดจริงล่าสุด`);
}

function resetContinuationPage(){
  if(($('#reviewText').value||reviewRows.length||continuationRows.length)&&!confirm('ล้างข้อมูลเฉพาะหน้าวางแผนต่อนี้? แผนใหม่และ CRM จะไม่ถูกล้าง'))return;
  reviewRows=[];continuationRows=[];continuationMeta=null;continueCrmRows=[];continueWasCleared=true;$('#continueCrmList').innerHTML='';$('#continueCrmText').textContent='';
  $('#reviewText').value='';$('#usedThrough').innerHTML='';$('#priorUsedClicks').value='0';$('#reviewSummary').innerHTML='';$('#penLedger').innerHTML='';$('#reviewImportAudit').hidden=true;$('#reviewHistoryBody').innerHTML='';$('#continueResultSummary').innerHTML='';$('#continuePatientText').textContent='';
  $('#reviewCurrentCard').hidden=true;$('#continueSetupCard').hidden=true;$('#continuationResultCard').hidden=true;
  toast('ล้างข้อมูลหน้าวางแผนต่อแล้ว');
}

function reviewUsage(){
  if(!reviewRows.length)return null;
  const through=Math.min(reviewRows.length-1,Math.max(0,Number($('#usedThrough').value)||0));
  const pen=reviewRows[through].row.pen;
  let segmentStart=through;
  while(segmentStart>0&&reviewRows[segmentStart-1].row.pen===pen&&!reviewRows[segmentStart].row.newPen)segmentStart--;
  const prior=Math.max(0,Number($('#priorUsedClicks').value)||0);
  const rowClicks=reviewRows.slice(segmentStart,through+1).reduce((sum,item)=>sum+Number(item.row.clicks||0),0);
  const capacity=derivedCapacity(pen),used=prior+rowClicks;
  return {through,pen,segmentStart,prior,rowClicks,capacity,used,remaining:Math.max(0,capacity-used),over:Math.max(0,used-capacity),current:reviewRows[through],futureCount:reviewRows.length-through-1};
}

function syncReviewPrior(){
 const usage=reviewUsage();if(!usage)return;
 $('#priorUsedClicks').value=String(reviewRows[usage.segmentStart].row.importedPrior||0);
}

function reviewLedger(){
 const usage=reviewUsage();if(!usage)return {entries:[],segments:[]};
 const entries=[],segments=[];let segment=null;
 reviewRows.forEach((item,i)=>{
  if(!segment||item.row.newPen||item.row.pen!==segment.pen){segment={number:segments.length+1,pen:item.row.pen,used:i===usage.segmentStart?0:Number(item.row.importedPrior||0),capacity:derivedCapacity(item.row.pen),start:i};segments.push(segment)}
  if(i===usage.segmentStart)segment.used+=usage.prior;
  if(i<=usage.through)segment.used+=Number(item.row.clicks||0);
  entries.push({penNumber:segment.number,total:segment.used,capacity:segment.capacity,actual:i<=usage.through});
 });
 return {entries,segments};
}
function renderReviewHistory(syncDefaults=false,preserveInput=false){
  const usage=reviewUsage();
  if(!usage)return;
  const ledger=reviewLedger();
  let running=usage.prior;
  if(!preserveInput)$('#reviewHistoryBody').innerHTML=reviewRows.map((item,index)=>{
    const counted=index>=usage.segmentStart&&index<=usage.through&&item.row.pen===usage.pen;
    if(counted)running+=Number(item.row.clicks||0);
    const status=index<=usage.through?'ฉีดแล้ว':'ยังไม่ฉีด';
    return `<tr data-review="${index}" class="${index<=usage.through?'used-row':'future-row'}"><td><span class="review-status">${status}</span></td><td><b>ครั้งที่ ${item.number}</b><small>${thaiDate(item.row.date)}</small></td><td><span data-review-dose>${fmt(doseForClicks(item.row.pen,item.row.clicks))} mg</span></td><td><input data-review-clicks type="number" min="1" step="1" value="${item.row.clicks}"></td><td><label class="new-pen-check"><input data-new-pen type="checkbox" ${item.row.newPen?'checked':''}><span>ด้าม ${ledger.entries[index].penNumber}${item.row.newPen?' · เริ่มใหม่':''}</span></label></td><td>${ledger.entries[index].actual?`${ledger.entries[index].total}/${ledger.entries[index].capacity} click`:'ยังไม่หักยอด'}</td></tr>`;
  }).join('');
  if(preserveInput){
    let total=usage.prior;
    $('#reviewHistoryBody').querySelectorAll('[data-review]').forEach(tr=>{
      const i=Number(tr.dataset.review),item=reviewRows[i],counted=i>=usage.segmentStart&&i<=usage.through;
      if(counted)total+=Number(item.row.clicks||0);
      tr.querySelector('[data-review-dose]').textContent=fmt(item.row.dose)+' mg';
      tr.lastElementChild.textContent=ledger.entries[i].actual?`${ledger.entries[i].total}/${ledger.entries[i].capacity} click`:'ยังไม่หักยอด';
    });
  }
  const futureNote=usage.futureCount?`ไม่นับ ${usage.futureCount} นัดในอนาคตออกจากปากกา`: 'ไม่มีนัดเดิมที่รอฉีด';
  $('#reviewSummary').innerHTML=`<div><small>ปากกาปัจจุบัน</small><strong>${displayPen(usage.pen)}</strong><span>${usage.capacity} click/ด้าม</span></div><div><small>ใช้จริงถึง</small><strong>ครั้งที่ ${usage.current.number}</strong><span>${thaiDate(usage.current.row.date)}</span></div><div><small>ใช้จริงแล้ว</small><strong>${usage.used}/${usage.capacity}</strong><span>click · ${futureNote}</span></div><div class="${usage.over?'summary-over':'summary-remaining'}"><small>${usage.over?'เกินความจุ กรุณาตรวจ':'ยาคงเหลือจริง'}</small><strong>${usage.over?usage.over:usage.remaining} click</strong><span>${usage.over?'ตรวจคลิกก่อนหน้าและคลิกที่ฉีดจริง':'พร้อมนำไปวางแผนต่อ'}</span></div>`;
  $('#penLedger').innerHTML='<details><summary>ยอดแยกด้าม · '+ledger.segments.length+' ด้าม</summary>'+ledger.segments.map(p=>`<p>ด้าม ${p.number} · ${displayPen(p.pen)} · ใช้จริง ${p.used}/${p.capacity} click${p.used>p.capacity?' · ยอดเกินความจุ โปรดตรวจจุดเริ่มด้ามใหม่':''}</p>`).join('')+'</details>';
  if(syncDefaults)syncContinuationDefaults(usage);
  continuationRows=[];continuationMeta=null;$('#continuationResultCard').hidden=true;
}

function syncContinuationDefaults(usage=reviewUsage()){
  if(!usage)return;
  const interval=Number($('#continueInterval').value)||7;
  const nextDate=addDays(usage.current.row.date,interval);
  $('#continueStartDate').value=thaiDate(nextDate);
  $('#continueStartDateNative').value=nextDate;
  $('#continueStartClicks').value=usage.current.row.clicks;
  $('#continuePenDisplay').value=displayPen(usage.pen);$('#continueStartNumber').value=usage.current.number+1;$('#continueInjector').value=usage.current.row.injector||'ฉีดเอง';
  updateContinueControls();
}

function updateContinueControls(){
  const mode=$('#continueMode').value,adjust=mode!=='constant';
  $('#continueDirectionLabel').hidden=!adjust;
  $('#continueEveryLabel').hidden=!adjust;
  $('#continueCustomStepLabel').hidden=mode!=='custom';
  const usage=reviewUsage();if(!usage)return;
  const custom=mode==='custom'||mode==='constant',current=Number($('#continueStartClicks').value)||usage.current.row.clicks;
  $('#continuePresetLabel').hidden=custom;$('#continueClickLabel').hidden=!custom;
  const path=continuationPath(usage.pen,mode,current,Number($('#continueCustomStep').value)||5);
  $('#continuePresetClicks').innerHTML=path.map(c=>`<option value="${c}" ${c===current?'selected':''}>${fmt(doseForClicks(usage.pen,c))} mg · ${c} click</option>`).join('');

}

function continuationPath(pen,mode,start,customStep){
  if(mode==='constant')return [start];
  if(mode==='custom'){
    const max=maxDoseClicks(pen),step=Math.max(1,customStep),values=[start];
    for(let c=start-step;c>0;c-=step)values.push(c);
    for(let c=start+step;c<=max;c+=step)values.push(c);
    return [...new Set(values)].sort((a,b)=>a-b);
  }
  return [...new Set([...(CLICK_PATHS[pen]?.[mode]||[]),start])].sort((a,b)=>a-b);
}

function continuationClickAt(index,path,start,mode,direction,every){
  if(mode==='constant')return start;
  const startIndex=path.indexOf(start),offset=Math.floor(index/every);
  const target=direction==='down'?Math.max(0,startIndex-offset):Math.min(path.length-1,startIndex+offset);
  return path[target];
}

function buildContinuation(){
  const usage=reviewUsage(),startDate=parseStartDate($('#continueStartDate').value),startClicks=Math.max(1,Number($('#continueStartClicks').value)||0);
  if(!usage||!startDate)return toast('กรุณาตรวจวันฉีดครั้งถัดไปและจำนวนคลิก');
  if(usage.over)return toast('ยอดใช้จริงเกินความจุปากกา กรุณาแก้ข้อมูลก่อน');
  if(startClicks>maxDoseClicks(usage.pen))return toast(`จำนวนคลิกต่อครั้งสูงกว่าค่าสูงสุด ${maxDoseClicks(usage.pen)} click`);
  const interval=Number($('#continueInterval').value)||7,mode=$('#continueMode').value,direction=$('#continueDirection').value,every=Math.max(1,Number($('#continueEvery').value)||1),customStep=Math.max(1,Number($('#continueCustomStep').value)||1),path=continuationPath(usage.pen,mode,startClicks,customStep);
  let available=usage.remaining,spent=0;
  continuationRows=[];
  for(let index=0;index<60;index++){
    const clicks=continuationClickAt(index,path,startClicks,mode,direction,every);
    if(!clicks||spent+clicks>available)break;
    continuationRows.push({number:(Number($('#continueStartNumber').value)||usage.current.number+1)+index,date:addDays(startDate,index*interval),pen:usage.pen,clicks,dose:doseForClicks(usage.pen,clicks),injector:$('#continueInjector').value||usage.current.row.injector||'ฉีดเอง'});
    spent+=clicks;
  }
  continuationMeta={...usage,startDate,startClicks,path,injector:$('#continueInjector').value||usage.current.row.injector||'ฉีดเอง',startNumber:Number($('#continueStartNumber').value)||usage.current.number+1,interval,mode,direction,every,spent,afterRemaining:available-spent,nextClicks:continuationClickAt(continuationRows.length,path,startClicks,mode,direction,every)};
  renderContinuation();buildContinueCrm();
}

function renderContinuation(renderGrid=true,scroll=true){
  const m=continuationMeta;
  if(!m)return;
  $('#continuationResultCard').hidden=false;
  $('#continueResultSummary').innerHTML=`<div><small>ก่อนวางแผนต่อ</small><strong>${m.used}/${m.capacity} click</strong><span>คงเหลือจริง ${m.remaining} click</span></div><div><small>แผนต่อ</small><strong>${continuationRows.length} ครั้ง</strong><span>ใช้เพิ่ม ${m.spent} click</span></div><div><small>หลังจบแผนต่อ</small><strong>เหลือ ${m.afterRemaining} click</strong><span>${m.nextClicks&&m.afterRemaining<m.nextClicks?`ไม่พอสำหรับครั้งถัดไป ${m.nextClicks} click`:'ตรวจแผนก่อนใช้'}</span></div>`;
  const header=`Mx: ${displayPen(m.pen)}`;
  $('#continueTimeline').innerHTML=`<div class="history-band"><b>ฉีดแล้ว ${m.through+1} รายการ</b> · ถึง ${thaiDate(m.current.row.date)} · ด้ามปัจจุบันใช้จริง ${m.used}/${m.capacity} click · เหลือ ${m.remaining} click</div><div class="future-band"><b>วางแผนใหม่ ${continuationRows.length} รายการ</b> · ยังไม่นำไปหักยอดใช้จริง</div>`;
  const history=reviewRows.slice(0,m.through+1).map(item=>({...item.row,number:item.number}));
  const combined=[...history,...continuationRows];
  let running=0,lastPen='';
  const lines=combined.map((r,i)=>{
    if(i===0||r.newPen||r.pen!==lastPen)running=i===m.segmentStart?0:Number(r.importedPrior||0);
    if(i===m.segmentStart)running+=m.prior;
    running+=Number(r.clicks);lastPen=r.pen;
    return patientLine(r,r.number,running,derivedCapacity(r.pen),i>=Math.max(m.segmentStart,combined.length-2));
  });
  let footer=`รวมแผนต่อ ${continuationRows.length} ครั้ง (ทุก ${m.interval} วัน)\nหลังจบแผนเหลือ ${m.afterRemaining} click`;
  if(continuationRows.length>=2)footer+='\n⚠ ปากกาใกล้หมดใน 2 ครั้งสุดท้าย แนะนำทบทวนเป้าหมายน้ำหนักกับคนไข้ และพิจารณาการใช้ต่อ';
  if(!continuationRows.length)footer=`ยาคงเหลือ ${m.remaining} click ไม่พอสำหรับโดสที่เลือก ${m.nextClicks} click กรุณาปรับคลิกครั้งถัดไป`;
  $('#continuePatientText').textContent=[header,...lines,'',footer].join('\n');
  if(renderGrid)renderContinuationGrid();
  if(scroll)$('#continuationResultCard').scrollIntoView?.({behavior:'smooth',block:'start'});
}

async function copyContinuePlan(){
  if(continuationEditTimer){clearTimeout(continuationEditTimer);rebalanceContinuation();continuationEditTimer=null}
  const text=$('#continuePatientText').textContent;
  if(!text)return toast('ยังไม่มีแผนต่อให้คัดลอก');
  try{await navigator.clipboard.writeText(text);toast('คัดลอกแผนต่อแล้ว')}catch{toast('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความด้วยตนเอง')}
}

$('#normalTabBtn').onclick=showNormalPage;
$('#resetContinueBtn').onclick=resetContinuationPage;
$('#analyzeReviewBtn').onclick=analyzeReviewPlan;
$('#usedThrough').onchange=()=>{syncReviewPrior();renderReviewHistory(true)};
$('#priorUsedClicks').oninput=()=>renderReviewHistory(false);
$('#reviewHistoryBody').addEventListener('change',event=>{const tr=event.target.closest('[data-review]');if(!tr)return;const index=Number(tr.dataset.review),clickInput=event.target.closest('[data-review-clicks]'),newPenInput=event.target.closest('[data-new-pen]');if(clickInput){const clicks=Math.max(1,Number(clickInput.value)||1);reviewRows[index].row.clicks=clicks;reviewRows[index].row.dose=doseForClicks(reviewRows[index].row.pen,clicks)}else if(newPenInput)reviewRows[index].row.newPen=newPenInput.checked;else return;renderReviewHistory(false)});
$('#continueMode').onchange=updateContinueControls;
$('#continueInterval').onchange=()=>syncContinuationDefaults();
$('#continueCalendarBtn').onclick=()=>{const native=$('#continueStartDateNative');if(native.showPicker)native.showPicker();else native.click()};
$('#continueStartDateNative').onchange=()=>{if($('#continueStartDateNative').value)$('#continueStartDate').value=thaiDate($('#continueStartDateNative').value)};
$('#continueStartDate').onblur=()=>{const parsed=parseStartDate($('#continueStartDate').value);if(parsed){$('#continueStartDate').value=thaiDate(parsed);$('#continueStartDateNative').value=parsed}};
$('#buildContinueBtn').onclick=buildContinuation;
$('#copyContinueBtn').onclick=copyContinuePlan;
$('#printContinueBtn').onclick=()=>{if(!continuationMeta)return toast('ยังไม่มีแผนต่อให้พิมพ์');document.body.classList.add('printing-continuation');window.print();setTimeout(()=>document.body.classList.remove('printing-continuation'),300)};
window.addEventListener('message',event=>{if(event.data?.type!=='glp-planner-mode')return;event.data.mode==='continue'?showContinuePage():showNormalPage()});
let continueCrmRows=[];
function buildContinueCrm(){
 const first=reviewRows[0]?.row.date;if(!first)return;
 continueCrmRows=crmOffsets().map(day=>({date:addDays(first,day)}));renderContinueCrm();
}
function renderContinueCrm(){
 $('#continueCrmList').innerHTML=continueCrmRows.map((r,i)=>`<label>วันที่ติดตาม<div class="date-picker"><input data-cc="${i}" value="${thaiDate(r.date)}" placeholder="dd/mm/yyyy"><button type="button" class="calendar-btn" data-cc-calendar="${i}">▦</button><input type="date" class="native-calendar" data-cc-native="${i}" value="${r.date}"></div></label>`).join('');
 updateContinueCrmText();
}
function updateContinueCrmText(){$('#continueCrmText').textContent=['CRM Follow-up · 3 เดือน',...continueCrmRows.map(r=>'-'+thaiDate(r.date))].join('\n')}
$('#continueCrmList').addEventListener('input',e=>{
 const i=e.target.dataset.cc??e.target.dataset.ccNative;if(i===undefined)return;
 const date=parseStartDate(e.target.value);if(!date)return;continueCrmRows[Number(i)].date=date;
 const group=e.target.parentElement;
 if(e.target.dataset.ccNative!==undefined)group.querySelector('[data-cc]').value=thaiDate(date);
 else group.querySelector('[data-cc-native]').value=date;
 updateContinueCrmText();
});
$('#continueCrmList').addEventListener('click',e=>{if(e.target.dataset.ccCalendar===undefined)return;const n=e.target.parentElement.querySelector('[type=date]');if(n.showPicker)n.showPicker();else n.click()});
$('#copyContinueCrmBtn').onclick=async()=>{if(!continueCrmRows.length)return;try{await navigator.clipboard.writeText($('#continueCrmText').textContent);toast('คัดลอก CRM แล้ว')}catch{toast('กรุณาเลือกข้อความเพื่อคัดลอก')}};
$('#continuePresetClicks').onchange=()=>{$('#continueStartClicks').value=$('#continuePresetClicks').value};
$('#reviewHistoryBody').addEventListener('input',e=>{
 const tr=e.target.closest('[data-review]');if(!tr||!e.target.matches('[data-review-clicks]'))return;
 const clicks=Number(e.target.value);if(!Number.isInteger(clicks)||clicks<1)return;
 const r=reviewRows[Number(tr.dataset.review)].row;r.clicks=clicks;r.dose=doseForClicks(r.pen,clicks);renderReviewHistory(false,true);
});
function continuationNextClicks(index){
 const m=continuationMeta;
 if(m.mode==='constant')return Number(continuationRows.at(-1)?.clicks||m.startClicks||m.current.row.clicks);
 return continuationClickAt(index,m.path||continuationPath(m.pen,m.mode,m.startClicks||m.current.row.clicks,5),m.startClicks||m.current.row.clicks,m.mode,m.direction,m.every);
}
function refreshContinuationMeta(){
 const m=continuationMeta;if(!m)return;
 m.spent=continuationRows.reduce((sum,r)=>sum+Number(r.clicks||0),0);
 m.afterRemaining=m.remaining-m.spent;
 m.nextClicks=continuationNextClicks(continuationRows.length);
}
function rebalanceContinuation(){
 const m=continuationMeta;if(!m)return;
 let spent=0,keep=[];
 for(const row of continuationRows){
  const n=Number(row.clicks);
  if(!Number.isInteger(n)||n<=0||spent+n>m.remaining)break;
  keep.push(row);spent+=n;
 }
 continuationRows=keep;
 while(continuationRows.length<60){
  const clicks=continuationNextClicks(continuationRows.length);
  if(!clicks||spent+clicks>m.remaining)break;
  const previous=continuationRows.at(-1);
  continuationRows.push({number:previous?previous.number+1:(m.startNumber||m.current.number+1),date:previous?addDays(previous.date,m.interval):m.startDate,pen:m.pen,clicks,dose:doseForClicks(m.pen,clicks),injector:m.injector||'ฉีดเอง',weight:'',milestone:'',note:''});
  spent+=clicks;
 }
 refreshContinuationMeta();renderContinuation(true,false);
}
function renderContinuationGrid(){
 const m=continuationMeta;if(!m)return;
 let total=m.used;
 $('#continuePlanBody').innerHTML=continuationRows.map((r,i)=>{
  total+=Number(r.clicks);const near=i>=Math.max(0,continuationRows.length-2);
  return '<tr data-cont="'+i+'" class="'+(near?'near-end-row':'')+'"><td><b>'+ordinal(r.number)+'</b><div class="date-picker"><input data-cont-field="dateDisplay" value="'+thaiDate(r.date)+'" placeholder="dd/mm/yyyy"><button type="button" class="calendar-btn" data-cont-action="calendar">▦</button><input type="date" class="native-calendar" data-cont-field="dateNative" value="'+r.date+'"></div></td><td>'+displayPen(r.pen)+'</td><td><input data-cont-dose class="dose-input calculated" readonly value="'+fmt(r.dose)+'"></td><td><input class="dose-input" data-cont-field="clicks" type="number" min="1" step="1" value="'+r.clicks+'"><span data-cont-total class="click-progress">'+total+'/'+m.capacity+' click</span>'+(near?'<span class="near-end-label">ปากกาใกล้หมด</span>':'')+'</td><td><select data-cont-field="injector">'+optionList(INJECTORS,r.injector)+'</select></td><td><input class="weight-input" data-cont-field="weight" type="number" min="0" step=".1" value="'+esc(r.weight??'')+'"></td><td><select data-cont-field="milestone">'+optionList(MILESTONES,r.milestone||'')+'</select></td><td><input data-cont-field="note" value="'+esc(r.note||'')+'"></td><td><button type="button" data-cont-action="copy">↙</button><button type="button" data-cont-action="fill4">+4</button></td></tr>';
 }).join('');
}
let continuationEditTimer;
function commitContinuationEdit(){
 clearTimeout(continuationEditTimer);
 const active=document.activeElement,tr=active?.closest?.('[data-cont]'),i=tr?.dataset.cont,field=active?.dataset.contField;
 rebalanceContinuation();
 if(i!==undefined&&field)$('#continuePlanBody').querySelector('[data-cont="'+i+'"] [data-cont-field="'+field+'"]')?.focus?.();
}
$('#continuePlanBody').addEventListener('input',e=>{
 const tr=e.target.closest('[data-cont]'),field=e.target.dataset.contField;if(!tr||!field)return;
 const row=continuationRows[Number(tr.dataset.cont)];
 if(field==='clicks'){
  const clicks=Number(e.target.value);if(!Number.isInteger(clicks)||clicks<=0){clearTimeout(continuationEditTimer);return;}
  row.clicks=clicks;row.dose=doseForClicks(row.pen,clicks);tr.querySelector('[data-cont-dose]').value=fmt(row.dose);
  let total=continuationMeta.used;
  $('#continuePlanBody').querySelectorAll('[data-cont]').forEach(t=>{total+=Number(continuationRows[Number(t.dataset.cont)].clicks);t.querySelector('[data-cont-total]').textContent=total+'/'+continuationMeta.capacity+' click'});
  clearTimeout(continuationEditTimer);continuationEditTimer=setTimeout(commitContinuationEdit,550);
 }else if(field==='dateDisplay'||field==='dateNative'){
  const date=parseStartDate(e.target.value);if(!date)return;row.date=date;
  tr.querySelector('[data-cont-field="'+(field==='dateDisplay'?'dateNative':'dateDisplay')+'"]').value=field==='dateDisplay'?date:thaiDate(date);
 }else row[field]=e.target.value;
 refreshContinuationMeta();renderContinuation(false,false);
});
$('#continuePlanBody').addEventListener('change',e=>{if(e.target.dataset.contField==='clicks')commitContinuationEdit()});
$('#continuePlanBody').addEventListener('click',e=>{
 const action=e.target.dataset.contAction,tr=e.target.closest('[data-cont]');if(!action||!tr)return;
 const i=Number(tr.dataset.cont);
 if(action==='calendar'){const n=tr.querySelector('[type=date]');if(n.showPicker)n.showPicker();else n.click();return}
 clearTimeout(continuationEditTimer);
 if(action==='copy'&&i>0){const {date,number}=continuationRows[i];continuationRows[i]={...clone(continuationRows[i-1]),date,number}}
 if(action==='fill4')for(let j=i+1;j<Math.min(i+5,continuationRows.length);j++){const {date,number}=continuationRows[j];continuationRows[j]={...clone(continuationRows[i]),date,number}}
 rebalanceContinuation();
});
