import { chromium } from 'playwright';
const b=await chromium.launch();
const c=await b.newContext({storageState:'C:/tmp/polaris-session.json',viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await c.addInitScript(()=>{localStorage.setItem('polaris:theme','dark');localStorage.setItem('polaris:signal','semaforo');});
const p=await c.newPage();
for(const r of process.argv.slice(2)){
  await p.goto('http://localhost:8081/'+r,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForTimeout(3000);
  const out=await p.evaluate(()=>{
    const W=window.innerWidth, bad=[];
    for(const el of document.querySelectorAll('*')){
      const rc=el.getBoundingClientRect();
      if(rc.right>W+0.5 && rc.width>0 && rc.height>0){
        const cs=getComputedStyle(el);
        if (el.children.length > 3 || (el.textContent||'').trim()) continue;
        const cadena=[]; let n=el;
        for(let i=0;i<4&&n;i++){ cadena.push(n.tagName.toLowerCase()+(n.className?'.'+String(n.className).split(' ')[0]:'')); n=n.parentElement; }
        bad.push(`x=${Math.round(rc.left)} w=${Math.round(rc.width)} pos=${cs.position} transform=${cs.transform.slice(0,30)} bg=${cs.backgroundColor} hijos=${el.children.length} | ${cadena.join(' < ')}`);
      }
    }
    return {overflow: Math.round(document.documentElement.scrollWidth-W), culpables: bad.slice(0,4)};
  });
  console.log('==', r, 'overflow', out.overflow);
  out.culpables.forEach(x=>console.log('   ', x));
}
await b.close();
