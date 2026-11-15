'use strict';
function refreshProgress(){for(const mode of ['classic','chain']) {
  try {
    const raw=localStorage.getItem(mode==='classic'?'bubble-orbit':'bubble-orbit-chain');
    const progress=JSON.parse(raw||'{}');
    const level=Math.max(1,Math.min(999,Number(progress?.level)||1));
    document.getElementById(mode+'Progress').textContent=level>1?'Weiter mit Level '+level:'Starte mit Level 1';
  } catch {}
}}
refreshProgress();
window.addEventListener('pageshow',refreshProgress);
