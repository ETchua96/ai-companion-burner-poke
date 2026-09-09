const fs=require('fs/promises'),fssync=require('fs'),path=require('path'),os=require('os');let DatabaseSync;try{({DatabaseSync}=require('node:sqlite'))}catch{}
const startOfTodayMs = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

async function files(root,ext){
  const a=[];
  const minMtime = startOfTodayMs();
  async function w(d,n=0){
    if(n>8)return;
    let x;
    try{x=await fs.readdir(d,{withFileTypes:true})}catch{return}
    await Promise.all(x.map(async e=>{
      const f=path.join(d,e.name);
      if(e.isDirectory())return w(f,n+1);
      if(e.isFile()&&e.name.endsWith(ext)){
        try{
          const stat=await fs.stat(f);
          if(stat.mtimeMs >= minMtime) a.push(f);
        }catch{}
      }
    }))
  }
  await w(root);
  return a;
}
const today=(v,now)=>{const d=new Date(v);return !Number.isNaN(d)&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()},n=v=>Number.isFinite(+v)&&+v>=0&&+v<1e9?+v:0,blank=name=>({name,inputTokens:0,cachedTokens:0,outputTokens:0,totalTokens:0,turns:0});
function add(p,e){p.inputTokens+=e.input;p.cachedTokens+=e.cached;p.outputTokens+=e.output;p.totalTokens+=e.total;p.turns++}
function codex(s,now,seen){try{const r=JSON.parse(s),u=r?.payload?.info?.last_token_usage;if(r?.type!=='event_msg'||r?.payload?.type!=='token_count'||!u||!today(r.timestamp,now))return;const k=`c:${r.timestamp}:${u.total_tokens}`;if(seen.has(k))return;seen.add(k);const input=n(u.input_tokens),cached=n(u.cached_input_tokens),output=n(u.output_tokens)+n(u.reasoning_output_tokens);return{provider:'Codex',input,cached,output,total:n(u.total_tokens)||input+cached+output,timestamp:r.timestamp}}catch{}}
function claude(s,now,seen){try{const r=JSON.parse(s),u=r?.message?.usage;if(r?.type!=='assistant'||!u||!today(r.timestamp,now))return;const k=`a:${r.message?.id||''}:${r.requestId||''}`;if(seen.has(k))return;seen.add(k);const input=n(u.input_tokens)+n(u.cache_creation_input_tokens),cached=n(u.cache_read_input_tokens),output=n(u.output_tokens);return{provider:'Claude Code',input,cached,output,total:input+cached+output,timestamp:r.timestamp}}catch{}}
function vr(d,i){let v=0n,q=0n;for(;i<d.length&&q<64n;i++,q+=7n){const b=BigInt(d[i]);v|=(b&127n)<<q;if(!(b&128n))return{v,i:i+1}}}function fld(d,want,msg){let i=0;while(i<d.length){const k=vr(d,i);if(!k)return;i=k.i;const f=Number(k.v>>3n),t=Number(k.v&7n);if(t===0){const x=vr(d,i);if(!x)return;if(f===want&&!msg)return x.v;i=x.i}else if(t===2){const x=vr(d,i);if(!x||Number(x.v)>d.length-x.i)return;const z=d.subarray(x.i,x.i+Number(x.v));if(f===want&&msg)return z;i=x.i+Number(x.v)}else if(t===1)i+=8;else if(t===5)i+=4;else return}}const m=(d,f)=>fld(d,f,true),v=(d,f)=>{const x=fld(d,f,false);return x&&x<1000000000n?Number(x):0},str=(d,f)=>{const x=m(d,f);return x?Buffer.from(x).toString('utf8'):''};
function anti(blob,fallback,seen,now){const chat=m(blob,1),u=chat&&m(chat,4);if(!u)return;const start=m(chat,9),stamp=start&&m(start,4),sec=stamp&&fld(stamp,1,false),date=sec&&sec>1000000000n&&sec<4102444800n?new Date(Number(sec)*1000):fallback;if(!today(date,now))return;const id=str(u,11)||`${date.valueOf()}:${blob.length}`;if(seen.has('g:'+id))return;seen.add('g:'+id);const input=v(u,2)+v(u,4),cached=v(u,5),output=v(u,3);return{provider:'Antigravity',input,cached,output,total:input+cached+output,timestamp:date.toISOString()}}
async function scan(roots,parse,now,seen){const a=[];for(const root of roots)for(const f of await files(root,'.jsonl')){let t;try{t=await fs.readFile(f,'utf8')}catch{continue}for(const s of t.split(/\r?\n/)){const e=parse(s,now,seen);if(e)a.push(e)}}return a}
const dbCache = new Map();

async function antigravity(now,seen){
  if(!DatabaseSync)return[];
  const a=[];
  const minMtime = startOfTodayMs();
  for(const kind of ['antigravity','antigravity-cli','antigravity-ide']){
    const dir = path.join(os.homedir(),'.gemini',kind,'conversations');
    if(!fssync.existsSync(dir)) continue;
    let list;
    try{ list = fssync.readdirSync(dir); }catch{ continue; }
    for(const name of list){
      if(!name.endsWith('.db')) continue;
      const f = path.join(dir, name);
      let stat;
      try{ stat = fssync.statSync(f); }catch{ continue; }
      if(stat.mtimeMs < minMtime) continue;

      const cached = dbCache.get(f);
      if(cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size){
        for(const item of cached.rawEvents){
          if(today(item.timestamp, now)){
            const id = item.id;
            if(!seen.has('g:'+id)){
              seen.add('g:'+id);
              a.push(item.event);
            }
          }
        }
        continue;
      }

      let db;
      try{
        db=new DatabaseSync(f,{readOnly:true});
        const fallback=stat.mtime;
        const rawEvents = [];
        for(const r of db.prepare('SELECT data FROM gen_metadata WHERE data IS NOT NULL').all()){
          const blob = Buffer.from(r.data);
          const chat = m(blob, 1), u = chat && m(chat, 4);
          if(!u) continue;
          const start = m(chat, 9), stamp = start && m(start, 4), sec = stamp && fld(stamp, 1, false);
          const date = sec && sec > 1000000000n && sec < 4102444800n ? new Date(Number(sec)*1000) : fallback;
          const id = str(u, 11) || `${date.valueOf()}:${blob.length}`;
          const input = v(u, 2) + v(u, 4), cachedTokens = v(u, 5), output = v(u, 3);
          const event = { provider: 'Antigravity', input, cached: cachedTokens, output, total: input + cachedTokens + output, timestamp: date.toISOString() };
          rawEvents.push({ id, timestamp: date, event });
          if(today(date, now) && !seen.has('g:'+id)){
            seen.add('g:'+id);
            a.push(event);
          }
        }
        db.close();
        dbCache.set(f, { mtimeMs: stat.mtimeMs, size: stat.size, rawEvents });
      }catch{
        try{db?.close()}catch{}
      }
    }
  }
  return a;
}
async function readUsage(){const now=new Date(),seen=new Set(),home=os.homedir(),cowork=path.join(process.env.APPDATA||path.join(home,'AppData','Roaming'),'Claude'),[c,cl,a]=await Promise.all([scan([path.join(home,'.codex','sessions')],codex,now,seen),scan([path.join(home,'.claude','projects'),path.join(home,'.config','claude','projects'),cowork],claude,now,seen),antigravity(now,seen)]),providers={Codex:blank('Codex'),'Claude Code / Cowork':blank('Claude Code / Cowork'),Antigravity:blank('Antigravity')},events=[...c,...cl,...a];for(const e of events)add(e.provider==='Claude Code'?providers['Claude Code / Cowork']:providers[e.provider],e);events.sort((x,y)=>new Date(y.timestamp)-new Date(x.timestamp));const t=Object.values(providers).reduce((z,p)=>({input:z.input+p.inputTokens,cached:z.cached+p.cachedTokens,output:z.output+p.outputTokens,total:z.total+p.totalTokens,turns:z.turns+p.turns}),{input:0,cached:0,output:0,total:0,turns:0});return{source:path.join(home,'.codex','sessions'),totalTokens:t.total,inputTokens:t.input,cachedTokens:t.cached,outputTokens:t.output,turns:t.turns,events:events.slice(0,8),providers}}
module.exports={readUsage};
