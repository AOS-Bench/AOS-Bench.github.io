const $ = s => document.querySelector(s);
const zh = document.documentElement.lang.startsWith('zh');
const tr = (en,cn) => zh ? cn : en;
const tierName = tier => tier==='all' ? tr('Both tiers','两个档位') : tier==='Medium' ? tr('Medium','中负载') : tr('Heavy','重负载');
const seriesLabel = s => zh ? {medium_ind:'中负载·独立',medium_str:'中负载·流式',heavy_ind:'重负载·独立',heavy_str:'重负载·流式'}[s.key] : s.label;
let clock, resultData;
let mode = 'stream';
const modeCopy = {
  stream: tr('Tasks arrive over time; one agent system manages the shared workload.','任务随时间到达，由同一个智能体系统管理共享工作负载。'),
  burst: tr('All tasks are released at once into the same shared environment.','所有任务一次性释放到同一个共享环境中。'),
  individual: tr('Each task runs in its own environment: the isolated capability reference.','每个任务在独立环境中运行，作为单任务能力的参考。')
};
function replay() {
  clearInterval(clock);
  const items = [...document.querySelectorAll('#queue div')];
  items.forEach(x => x.classList.remove('arrived'));
  let step = 0;
  $('#sim-label').textContent = zh ? {stream:'流式到达',burst:'一次性到达',individual:'独立执行'}[mode] : `${mode.toUpperCase()} ${mode === 'individual' ? 'EXECUTION' : 'ARRIVALS'}`;
  $('#mode-description').textContent = modeCopy[mode];
  $('#sim-budget').textContent = mode === 'individual' ? tr('Each task has its own environment · 4 CPUs · 8 GiB','每个任务独立环境 · 4 CPU 核心 · 8 GiB') : tr('Shared workspace · 4 CPUs · 8 GiB','共享工作空间 · 4 CPU 核心 · 8 GiB');
  $('.sim-agent').innerHTML = mode === 'individual' ? tr('Independent agent sessions <span>each task executes alone</span>','独立智能体会话 <span>每个任务单独执行</span>') : tr('Agent system <span>claim · delegate · check progress</span>','智能体系统 <span>领取 · 委派 · 检查进展</span>');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    step++;
    items.forEach((el,i) => el.classList.toggle('arrived', reduced || mode !== 'stream' || step > i * 2));
    $('.sim-progress i').style.width = `${Math.min(100,step / 10 * 100)}%`;
    if (step >= 10 || reduced) clearInterval(clock);
  };
  clock = setInterval(tick, 650); tick();
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button)); });
  replay();
}));
$('#replay').addEventListener('click', replay); replay();
const NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attrs={}, text) {
  const node = document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v));
  if (text !== undefined) node.textContent = text;
  return node;
}
function drawResults(tier='all') {
  const svg = svgNode('svg',{viewBox:'0 0 1080 465',role:'presentation'});
  const series = resultData.series.filter(s => tier==='all' || s.tier===tier);
  const top=65, bottom=372, left=70, group=196, width=series.length===4?31:48;
  for(let value=0;value<=100;value+=20){
    const y=bottom-value/100*(bottom-top);
    svg.append(svgNode('line',{x1:left,x2:1060,y1:y,y2:y,stroke:'#e2dce9'}));
    svg.append(svgNode('text',{x:55,y:y+5,'text-anchor':'end',fill:'#716678','font-size':16},String(value)));
  }
  svg.append(svgNode('text',{x:14,y:210,transform:'rotate(-90 14 210)','text-anchor':'middle','font-size':18,fill:'#52445e'},'SR (%)'));
  series.forEach((s,i)=>{
    const start= (1080-series.length*215)/2 + i*215;
    svg.append(svgNode('rect',{x:start,y:14,width:17,height:17,fill:s.color,rx:2}));
    svg.append(svgNode('text',{x:start+25,y:29,'font-size':17,fill:'#44354f'},seriesLabel(s)));
  });
  resultData.models.forEach((model,i)=>{
    const cx=left+group*i+group/2;
    series.forEach((s,j)=>{
      const v=model[s.key], h=v/100*(bottom-top);
      const rect=svgNode('rect',{x:cx-series.length*width/2+j*width,y:bottom-h,width:width-2,height:h,fill:s.color,rx:1});
      rect.append(svgNode('title',{},`${model.name} · ${seriesLabel(s)}: ${v.toFixed(1)}%`)); svg.append(rect);
      if(series.length===2) svg.append(svgNode('text',{x:cx-series.length*width/2+j*width+(width-2)/2,y:bottom-h-8,'text-anchor':'middle','font-size':16,fill:'#4b3f55'},v.toFixed(1)));
    });
    model.label.split('\n').forEach((line,j)=>svg.append(svgNode('text',{x:cx,y:405+j*23,'text-anchor':'middle','font-size':17,fill:'#44354f'},line)));
  });
  $('#results-chart').replaceChildren(svg);
  $('#results-chart').setAttribute('aria-label',tr(`${tierName(tier)} SR by model. Exact values are available in the table below.`,`${tierName(tier)}：按模型比较 SR，精确数值见下方表格。`));
}
fetch('assets/results.json').then(r=>{if(!r.ok)throw Error('Result data unavailable');return r.json();}).then(data=>{
  resultData=data;drawResults();
  data.models.forEach(m=>{
    const row=document.createElement('tr');
    [m.name,...data.series.map(s=>m[s.key].toFixed(1)+'%')].forEach(v=>{const td=document.createElement('td');td.textContent=v;row.append(td);});
    $('#results-table tbody').append(row);
  });
}).catch(()=>{$('#results-chart').textContent=tr('Chart could not load. Please see the paper PDF for the full results.','图表加载失败，请查看论文 PDF 中的完整结果。');});
document.querySelectorAll('[data-tier]').forEach(button=>button.addEventListener('click',()=>{
  if(!resultData)return;
  document.querySelectorAll('[data-tier]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  drawResults(button.dataset.tier);
}));
$('#copy-citation').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#citation').textContent);$('#copy-status').textContent=tr('Copied','已复制');}
  catch{const range=document.createRange();range.selectNodeContents($('#citation'));getSelection().removeAllRanges();getSelection().addRange(range);$('#copy-status').textContent=tr('Selected — copy to clipboard','已选中，请复制到剪贴板');}
});
if(window.AOS_CONFIG){
  $('#tasks-link').href=AOS_CONFIG.tasks;$('#harness-link').href=AOS_CONFIG.harness;
  if(AOS_CONFIG.repositoriesPublic){$('#tasks-link').textContent=tr('View task repository ↗','查看任务仓库 ↗');$('#harness-link').textContent=tr('View harness repository ↗','查看执行框架仓库 ↗');$('#release-note').textContent=tr('Task assets and evaluation harness are available on GitHub.','任务资源与评测框架已在 GitHub 开放。');}
}
fetch(zh?'assets/failure-cases.zh.json':'assets/failure-cases.json').then(r=>{if(!r.ok)throw Error('Cases unavailable');return r.json();}).then(data=>{
  data.cases.forEach(c=>{
    const article=document.createElement('article');article.className='case-card';article.id='case-'+c.id;
    const add=(tag,content,cls)=>{const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;article.append(el);return el;};
    add('p',`${c.model} / ${c.harness}`,'case-model');add('h3',c.title);
    const img=document.createElement('img');img.src=`assets/failure-${c.id}.png`;img.alt=tr(`Illustration of ${c.model}: ${c.title}`,`${c.model} 案例示意：${c.title}（视频英文画面）`);img.loading='lazy';article.append(img);
    add('strong',c.metric,'case-metric');add('p',c.metric_label,'case-metric-label');add('p',c.summary);
    add('p',c.takeaway,'case-takeaway');
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=tr('Evidence & interpretation','证据与解释边界');details.append(summary);
    [c.tier,c.trial,c.evidence,c.boundary].forEach(s=>{const p=document.createElement('p');p.textContent=s;details.append(p);});article.append(details);
    const button=add('button',`${tr('Watch case','观看案例')} · ${Math.floor(c.start/60)}:${String(c.start%60).padStart(2,'0')} ↗`,'text-button');
    button.type='button';button.dataset.seek=String(c.start);
    button.addEventListener('click',async()=>{
      const video=$('video');$('#demo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      if(video.readyState===0){video.load();await new Promise(resolve=>video.addEventListener('loadedmetadata',resolve,{once:true}));}
      video.currentTime=c.start;try{await video.play();}catch{video.focus();}
    });
    $('#case-cards').append(article);
  });
}).catch(()=>{$('#case-cards').textContent=tr('Case summaries could not load. Please reload the page.','案例摘要加载失败，请刷新页面。');});
document.querySelectorAll('.language-switch a').forEach(link=>{
  link.addEventListener('click',()=>{link.href=link.getAttribute('href').split('#')[0]+location.hash;});
});
