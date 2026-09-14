let reviewRows=[];
let continuationRows=[];
let continuationMeta=null;

function showContinuePage(){
  $('#normalPlanPage').hidden=true;
  $('#continuePlanPage').hidden=false;
  $('#copyTopBtn').textContent='คัดลอกแผนต่อ';
  $('#copyTopBtn').onclick=copyContinuePlan;
  $('#normalTabBtn').classList.remove('active');
  $('#continueTabBtn').classList.add('active');
  if(!$('#reviewText').value&&/^(?:Plan|Mx)\s*:/i.test($('#patientText').textContent))$('#reviewText').value=$('#patientText').textContent;
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
  const parsed=parsePlanText($('#reviewText').value);
  if(!parsed.length)return toast('อ่านแผนไม่ได้ กรุณาตรวจรูปแบบบรรทัด “ครั้งที่ ... click”');
  reviewRows=parsed;
  const today=todayIso();
  let suggested=0;
  parsed.forEach((item,index)=>{if(item.row.date<=today)suggested=index});
  $('#usedThrough').innerHTML=parsed.map((item,index)=>`<option value="${index}" ${index===suggested?'selected':''}>ครั้งที่ ${item.number} · ${thaiDate(item.row.date)}</option>`).join('');
  $('#priorUsedClicks').value='0';
  $('#reviewCurrentCard').hidden=false;
  $('#continueSetupCard').hidden=false;
  $('#continuationResultCard').hidden=true;
  renderReviewHistory(true);
  $('#reviewCurrentCard').scrollIntoView?.({behavior:'smooth',block:'start'});
  toast(`อ่านแผนได้ ${parsed.length} ครั้ง · กรุณาเลือกครั้งที่ฉีดจริงล่าสุด`);
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

function renderReviewHistory(syncDefaults=false){
  const usage=reviewUsage();
  if(!usage)return;
  let running=usage.prior;
  $('#reviewHistoryBody').innerHTML=reviewRows.map((item,index)=>{
    const counted=index>=usage.segmentStart&&index<=usage.through&&item.row.pen===usage.pen;
    if(counted)running+=Number(item.row.clicks||0);
    const status=index<=usage.through?'ฉีดแล้ว':'ยังไม่ฉีด';
    return `<tr data-review="${index}" class="${index<=usage.through?'used-row':'future-row'}"><td><span class="review-status">${status}</span></td><td><b>ครั้งที่ ${item.number}</b><small>${thaiDate(item.row.date)}</small></td><td><span data-review-dose>${fmt(doseForClicks(item.row.pen,item.row.clicks))} mg</span></td><td><input data-review-clicks type="number" min="1" step="1" value="${item.row.clicks}"></td><td><label class="new-pen-check"><input data-new-pen type="checkbox" ${item.row.newPen?'checked':''}><span>${item.row.newPen?'เริ่มด้ามนี้':'—'}</span></label></td><td>${counted?`${running}/${usage.capacity} click`:'—'}</td></tr>`;
  }).join('');
  const futureNote=usage.futureCount?`ไม่นับ ${usage.futureCount} นัดในอนาคตออกจากปากกา`: 'ไม่มีนัดเดิมที่รอฉีด';
  $('#reviewSummary').innerHTML=`<div><small>ปากกาปัจจุบัน</small><strong>${displayPen(usage.pen)}</strong><span>${usage.capacity} click/ด้าม</span></div><div><small>ใช้จริงถึง</small><strong>ครั้งที่ ${usage.current.number}</strong><span>${thaiDate(usage.current.row.date)}</span></div><div><small>ใช้จริงแล้ว</small><strong>${usage.used}/${usage.capacity}</strong><span>click · ${futureNote}</span></div><div class="${usage.over?'summary-over':'summary-remaining'}"><small>${usage.over?'เกินความจุ กรุณาตรวจ':'ยาคงเหลือจริง'}</small><strong>${usage.over?usage.over:usage.remaining} click</strong><span>${usage.over?'ตรวจคลิกก่อนหน้าและคลิกที่ฉีดจริง':'พร้อมนำไปวางแผนต่อ'}</span></div>`;
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
  updateContinueControls();
}

function updateContinueControls(){
  const mode=$('#continueMode').value,adjust=mode!=='constant';
  $('#continueDirectionLabel').hidden=!adjust;
  $('#continueEveryLabel').hidden=!adjust;
  $('#continueCustomStepLabel').hidden=mode!=='custom';
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
    continuationRows.push({number:usage.current.number+1+index,date:addDays(startDate,index*interval),pen:usage.pen,clicks,dose:doseForClicks(usage.pen,clicks),injector:usage.current.row.injector||'ฉีดเอง'});
    spent+=clicks;
  }
  continuationMeta={...usage,startDate,interval,mode,direction,every,spent,afterRemaining:available-spent,nextClicks:continuationClickAt(continuationRows.length,path,startClicks,mode,direction,every)};
  renderContinuation();
}

function renderContinuation(){
  const m=continuationMeta;
  if(!m)return;
  $('#continuationResultCard').hidden=false;
  $('#continueResultSummary').innerHTML=`<div><small>ก่อนวางแผนต่อ</small><strong>${m.used}/${m.capacity} click</strong><span>คงเหลือจริง ${m.remaining} click</span></div><div><small>แผนต่อ</small><strong>${continuationRows.length} ครั้ง</strong><span>ใช้เพิ่ม ${m.spent} click</span></div><div><small>หลังจบแผนต่อ</small><strong>เหลือ ${m.afterRemaining} click</strong><span>${m.nextClicks&&m.afterRemaining<m.nextClicks?`ไม่พอสำหรับครั้งถัดไป ${m.nextClicks} click`:'ตรวจแผนก่อนใช้'}</span></div>`;
  const header=`Mx: ${displayPen(m.pen)}`;
  const current=`สรุปปัจจุบัน: ฉีดจริงถึงครั้งที่ ${m.current.number} ${thaiDate(m.current.row.date)} · ใช้สะสม ${m.used}/${m.capacity} click · คงเหลือ ${m.remaining} click`;
  const lines=continuationRows.map(r=>`-ครั้งที่ ${r.number} ${thaiDate(r.date)} ${displayPen(r.pen)} ${r.injector} ${fmt(r.dose)} mg คือ ${r.clicks} click (ใช้สะสม ${m.used+continuationRows.filter(x=>x.number<=r.number).reduce((sum,x)=>sum+x.clicks,0)}/${m.capacity} click)`);
  let footer=`รวมแผนต่อ ${continuationRows.length} ครั้ง (ทุก ${m.interval} วัน)\nหลังจบแผนเหลือ ${m.afterRemaining} click`;
  if(continuationRows.length>=2)footer+='\n⚠ ปากกาใกล้หมดใน 2 ครั้งสุดท้าย แนะนำทบทวนเป้าหมายน้ำหนักกับคนไข้ และพิจารณาการใช้ต่อ';
  if(!continuationRows.length)footer=`ยาคงเหลือ ${m.remaining} click ไม่พอสำหรับโดสที่เลือก ${m.nextClicks} click กรุณาปรับคลิกครั้งถัดไป`;
  $('#continuePatientText').textContent=[header,current,'',...lines,'',footer].join('\n');
  $('#continuationResultCard').scrollIntoView?.({behavior:'smooth',block:'start'});
}

async function copyContinuePlan(){
  const text=$('#continuePatientText').textContent;
  if(!text)return toast('ยังไม่มีแผนต่อให้คัดลอก');
  try{await navigator.clipboard.writeText(text);toast('คัดลอกแผนต่อแล้ว')}catch{toast('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความด้วยตนเอง')}
}

$('#normalTabBtn').onclick=showNormalPage;
$('#analyzeReviewBtn').onclick=analyzeReviewPlan;
$('#usedThrough').onchange=()=>renderReviewHistory(true);
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
