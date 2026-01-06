const colors = ['#FFDEE9', '#E0C3FC', '#CAF0F8', '#D8E2DC', '#FFCAD4', '#B9FBC0'];
const emojis = ['✌', '🌟', '🎓', '🚀', '🔥', '❤️', '🌈', '🎁', '🎃', '🎈', '🎡', '🍁', '🌍'];
let timer = null;
function makeDraggable(element) {
  if (!element) return;
  let startX, startY, initialMouseX, initialMouseY;
  element.addEventListener('mousedown', dragStart);
  element.addEventListener('touchstart', dragStart, { passive: false });
  function dragStart(e) {
    const allNotes = document.querySelectorAll('.sticky-note');
    let maxZ = Math.max(...Array.from(allNotes).map(el => parseInt(el.style.zIndex) || 0));
    element.style.zIndex = maxZ + 1;
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    startX = element.offsetLeft;
    startY = element.offsetTop;
    initialMouseX = clientX;
    initialMouseY = clientY;
    if (e.type === 'touchstart') {
      document.addEventListener('touchmove', dragging, { passive: false });
      document.addEventListener('touchend', dragEnd);
    } else {
      document.addEventListener('mousemove', dragging);
      document.addEventListener('mouseup', dragEnd);
    }
  }
  function dragging(e) {
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const dx = clientX - initialMouseX;
    const dy = clientY - initialMouseY;
    element.style.left = (startX + dx) + "px";
    element.style.top = (startY + dy) + "px";
    if (e.cancelable) e.preventDefault();
  }
  function dragEnd() {
    document.removeEventListener('mousemove', dragging);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragging);
    document.removeEventListener('touchend', dragEnd);
  }
}
async function load() {
  // SSR 注入的数据优先使用 window.__INITIAL_DATA__，否则回退到 API
  const initial = window.__INITIAL_DATA__ || null;
  const data = initial || (await (await fetch('/api/messages')).json());
  const list = document.getElementById('message-list');
  const containerWidth = list.offsetWidth;
  list.innerHTML = data.map((m, index) => {
    const rotate = (Math.random() * 30 - 15).toFixed(2);
    const bgColor = colors[index % colors.length];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const isMobile = window.innerWidth < 768;
    const cardWidth = isMobile ? 160 : 250;
    let randomX = Math.floor(Math.random() * (containerWidth - cardWidth));
    let randomY = Math.floor(Math.random() * 800 - 50);
    if (index === 0) { 
      randomY = isMobile ? -90 : -408; 
      randomX = isMobile ? 0 : 30
    } else if (index === 1) { 
      randomY = isMobile ? -90 : -408; 
      randomX = isMobile ? 204 : 920; 
    }
    return `
    <div id="note-${index}" 
      class="sticky-note absolute p-4 md:p-6 rounded-sm shadow-md" 
      style="background-color: ${bgColor}; 
      width: ${cardWidth}px; 
      left: ${randomX}px; 
      top: ${randomY}px; 
      transform: rotate(${rotate}deg); 
      z-index:${index}; 
      transition: all 0.3s ease;" 
      onmouseover="this.style.zIndex=999; this.style.transform='scale(1.1) rotate(0deg)'" 
      onmouseout="this.style.zIndex=${index}; this.style.transform='rotate(${rotate}deg)'">
        <div class="flex flex-col h-full">
          <div style="text-align: center;" 
            class="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/30 backdrop-blur-sm">
            🔴# ${m.id}
          </div>
          <p class="text-gray-800 text-base md:text-xl handwriting mb-4 leading-relaxed">${randomEmoji} "${m.content}"</p>
          <div class="mt-auto border-t border-black/20 pt-2">
            <p class="font-bold text-gray-900 text-sm md:text-base">💎 ${m.name}</p>
            <p class="text-[12px] text-gray-500 font-mono italic"> 🔐  ${m.contact}</p>
          </div>
        </div>
    </div>
    `;
  }).join('');
  data.forEach((_, index) => { 
    const el = document.getElementById(`note-${index}`); 
    makeDraggable(el); 
  });
  startLiveChat(data);
}
const container = document.getElementById('live-chat');
function startLiveChat(messages) {
  if (messages.length === 0) return;
  let index = 0; 
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const m = messages[index % messages.length];
    const displayName = m.name; 
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `
      <span class="text-indigo-300 font-bold">${displayName}:</span>
      <span class="ml-1 text-pink-200">${m.content}</span>
      `;
    container.appendChild(bubble);
    if (container.children.length > 2) {
      const first = container.children[0];
      first.classList.add('fade-out');
      setTimeout(() => first.remove(), 500);
    }
    index++;
  }, 5000);
}
async function submit() {
  const btn = document.getElementById('btn');
  const name = document.getElementById('name').value;
  const content = document.getElementById('content').value;
  const contact = document.getElementById('contact').value;
  if (!name || !content) return alert('名字和留言是必填的哦！');
  btn.disabled = true; 
  btn.innerText = '正在寄出...';
  try {
    let res = await fetch('/api/messages', { 
      method: 'POST', 
      body: JSON.stringify({ name, contact, content }), 
      headers: { 'Content-Type': 'application/json' } 
    });
    let body = await res.json();
    if (res.ok) {
      load();
      btn.disabled = false; 
      btn.innerText = '把思念寄出';
      document.getElementById('content').value = '';
      alert('发送成功！感谢你的留言～');
    } else {
      alert('发送失败，请稍后再试：' + (body.error || '')); 
      btn.disabled = false; 
      btn.innerText = '重试';
    }
    
  } catch (e) {
    alert('发送失败，请检查网络'); 
    btn.disabled = false; 
    btn.innerText = '重试';
  }
}
load();