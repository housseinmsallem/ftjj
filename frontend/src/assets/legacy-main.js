document.addEventListener('DOMContentLoaded',function(){
const more=document.querySelector('.more'), btn=document.querySelector('.more-btn');
if(btn&&more){btn.addEventListener('click',e=>{e.preventDefault();more.classList.toggle('open')})}
const t=document.querySelector('.mobile-toggle'),m=document.querySelector('.mobile-menu'),c=document.querySelector('.mobile-close');
if(t&&m)t.addEventListener('click',()=>m.classList.add('open'));
if(c&&m)c.addEventListener('click',()=>m.classList.remove('open'));
document.querySelectorAll('.table-search').forEach(input=>{input.addEventListener('input',()=>{const wrap=input.closest('.filterbar').nextElementSibling;if(!wrap)return;const table=wrap.querySelector('table');if(!table)return;const q=input.value.toLowerCase();table.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=tr.innerText.toLowerCase().includes(q)?'':'none';});});});
document.querySelectorAll('.tab-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');const p=document.getElementById('tab-'+btn.dataset.tab);if(p)p.classList.add('active');});});
});