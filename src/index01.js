export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // --- 后端 API 部分 ---
    
    // 获取留言列表
    if (url.pathname === "/api/messages" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY id DESC").all();
      // 在数据发往前端前，直接在 Worker 里进行脱敏加工
      const maskedResults = results.map(m => ({
        id: m.id,
        content: m.content,
        // 脱敏姓名：超过2个字中间打码
        name: m.name.length <= 2 ? m.name[0] + "*" : m.name[0] + "*".repeat(m.name.length - 2) + m.name.slice(-1),
        // 脱敏联系方式：仅保留前3后4
        contact: /^\d{11}$/.test(m.contact) 
                 ? m.contact.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                 : (m.contact.length > 4 ? m.contact.slice(0, 2) + "****" + m.contact.slice(-2) : "****")
      }));

      return Response.json(maskedResults);
    }

    // 提交新留言
    if (url.pathname === "/api/messages" && request.method === "POST") {
      const { name, contact, content } = await request.json();
      if (!name || !content) return new Response("Missing fields", { status: 400 });
      
      await env.DB.prepare("INSERT INTO messages (name, contact, content) VALUES (?, ?, ?)")
        .bind(name, contact, content)
        .run();
      return Response.json({ success: true }, { status: 201 });
    }

    // --- 前端 UI 部分 ---
    
    // 默认返回 HTML 页面
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2026 初三毕业纪念墙</title>
        <script src="https://cdn.tailwindcss.com"></script>
       

        <style>
            /* 引入站酷快乐体 (ZCOOL KuaiLe) - 非常适合毕业活泼氛围 */
            @font-face {
                font-family: 'ZCOOL KuaiLe';
                src: url('https://lib.baomitu.com/fonts/zcool-kuaile/zcool-kuaile-regular.woff2') format('woff2');
                font-display: swap;
            }

            body { 
                background-color: #f0f2f5; 
                /* 默认字体回退机制：优先使用站酷快乐体，备用系统手写体 */
                font-family: 'ZCOOL KuaiLe', "Microsoft YaHei", "PingFang SC", sans-serif; 
            }

            .handwriting { 
                font-family: 'ZCOOL KuaiLe', cursive; 
            }

            /* 便签卡片基本样式 */
        
            .sticky-note:hover {
                transform: scale(1.4) rotate(0deg) !important;             
                box-shadow: 10px 10px 20px rgba(0,0,0,0.15);
            }
            .sticky-note {
                position: absolute;
                cursor: grab; /* 抓取手势 */
                user-select: none; /* 防止拖动时选中文字 */
                touch-action: none; /* 禁用浏览器默认触摸行为，方便自定义拖动 */
            }
            .sticky-note:active {
                cursor: grabbing;               
                transform: scale(1.3) rotate(0deg) !important;             
                box-shadow: 10px 10px 20px rgba(0,0,0,0.15);
            }
        </style>
        
    </head>
    <body class="pb-20">
    
        <div class="relative overflow-hidden bg-indigo-900 text-white py-10 px-4 mb-12 shadow-2xl">
            <div class="absolute top-0 left-0 w-full h-full opacity-20" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>
            <div class="relative z-10 max-w-5xl mx-auto text-center">
                <h1 class="text-4xl md:text-7xl font-black mb-4 animate__animated animate__fadeInDown">NEXT STATION</h1>
                <p class="text-xl md:text-2xl opacity-80 animate__animated animate__fadeInUp animate__delay-1s">2026届毕业纪念 · 青春不散场</p>
                <p class="text-xl md:text-2xl opacity-80 animate__animated animate__fadeInUp animate__delay-1s">嘿！我是 [名字]</p>
                <p class="text-xl md:text-2xl opacity-80 animate__animated animate__fadeInUp animate__delay-1s">初中三年，很高兴遇见你们。这是我为你准备的数字纪念册。</p>
            </div>
        </div>    

        <div class="max-w-6xl mx-auto px-4">
            <div class="max-w-xl mx-auto mb-16">
                <div class="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white">
                    <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                        <span class="mr-2">✍️</span> 留下你的足迹
                    </h2>
                    <div class="space-y-4">
                        <div class="flex gap-4">
                            <input id="name" type="text" placeholder="名字" class="w-1/3 p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none">
                            <input id="contact" type="text" placeholder="微信/QQ/手机" class="w-2/3 p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none">
                        </div>
                        <textarea id="content" placeholder="此时此刻，你想说什么？" class="w-full p-3 bg-gray-50 border-none rounded-xl h-24 focus:ring-2 focus:ring-indigo-400 outline-none"></textarea>
                        <button onclick="submit()" id="btn" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:opacity-90 transition transform active:scale-95">
                            把思念寄出
                        </button>
                    </div>
                </div>
            </div>
            <div id="list" class="relative w-full min-h-[1200px] mt-10">
           
            </div>
        </div>
       

        <div id="live-chat" class="fixed bottom-6 left-2 z-50 pointer-events-none space-y-2 max-w-xs">
        </div>

        <style>
            /* 直播间留言卡片样式 */
            .chat-bubble {
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(1px);
                color: white;
                padding: 8px 12px;
                border-radius: 12px;
                font-size: 0.9rem;
                animation: slideInUp 0.5s ease-out;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 5px solid #818cf8; /* 侧边亮条 */
            }
            @keyframes slideInUp {
                from {
                  transform: translateY(100%); /* Start below the viewport */
                  opacity: 0;
                }
                to {
                  transform: translateY(0); /* End at its normal position */
                  opacity: 1;
                }
              }
            
            /* 向上平滑消失的动画 */
            .fade-out {
                opacity: 0;
                transform: translateY(-100%);
                transition: all 0.5s ease;
            }
        </style>

        <script>    
            // 定义一些好看的便签背景色
            const colors = ['#FFDEE9', '#E0C3FC', '#CAF0F8', '#D8E2DC', '#FFCAD4', '#B9FBC0'];
            const emojis = ['✌', '🌟', '🎓', '🚀', '🔥', '❤️', '🌈', '🎁', '🎃', '🎈', '🎡', '🍁', '🌍'];
            function makeDraggable(element) {
                let startX, startY, initialMouseX, initialMouseY;
            
                // 同时监听鼠标和触摸
                element.addEventListener('mousedown', dragStart);
                element.addEventListener('touchstart', dragStart, { passive: false });
            
                function dragStart(e) {
                    // 提升层级：点击时让这张卡片到最前面
                    // 获取当前最大的 z-index 并加 1
                    const allNotes = document.querySelectorAll('.sticky-note');
                    let maxZ = Math.max(...Array.from(allNotes).map(el => parseInt(el.style.zIndex) || 0));
                    element.style.zIndex = maxZ + 1;                 
            
                    // 统一获取坐标
                    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
                    // 记录初始位置
                    startX = element.offsetLeft;
                    startY = element.offsetTop;
                    initialMouseX = clientX;
                    initialMouseY = clientY;
            
                    // 绑定全局事件（防止手指滑动过快脱离卡片）
                    if (e.type === 'touchstart') {
                        document.addEventListener('touchmove', dragging, { passive: false });
                        document.addEventListener('touchend', dragEnd);
                    } else {
                        document.addEventListener('mousemove', dragging);
                        document.addEventListener('mouseup', dragEnd);
                    }
                    
                    // 关键：防止手机页面滚动
                    // if (e.cancelable) e.preventDefault();
                }
            
                function dragging(e) {
                    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
                    // 计算新坐标
                    const dx = clientX - initialMouseX;
                    const dy = clientY - initialMouseY;
            
                    element.style.left = (startX + dx) + "px";
                    element.style.top = (startY + dy) + "px";
            
                    // 再次确保不触发页面滚动
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
                const res = await fetch('/api/messages');
                const data = await res.json();
                const list = document.getElementById('list');           
    
                // 获取容器宽度，用于计算随机边界
                const containerWidth = list.offsetWidth;
                
                list.innerHTML = data.map((m, index) => {
                    const rotate = (Math.random() * 10 - 6).toFixed(2);
                    const bgColor = colors[index % colors.length];
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    
                    // 随机坐标计算 (留出卡片宽度的余量，防止溢出)
                    // 移动端缩小范围，PC端分散开
                    const isMobile = window.innerWidth < 768;
                    const cardWidth = isMobile ? 160 : 250; 
                    
                    const randomX = Math.floor(Math.random() * (containerWidth - cardWidth));
                    const randomY = Math.floor(Math.random() * 800 - 150); // 在800像素高度内随机分布
            
                    return \`
                        <div id="note-\${index}" class="sticky-note absolute p-4 md:p-6 rounded-sm shadow-md animate__animated animate__fadeIn" 
                             style="
                                background-color: \${bgColor}; 
                                width: \${cardWidth}px;
                                left: \${randomX}px; 
                                top: \${randomY}px; 
                                transform: rotate(\${rotate}deg);
                                z-index:\${index};
                                transition: all 0.3s ease;
                             "
                             onmouseover="this.style.zIndex=999; this.style.transform='scale(1.1) rotate(0deg)'"
                             onmouseout="this.style.zIndex=\${index}; this.style.transform='rotate(\${rotate}deg)'">
                            
                            <div class="flex flex-col h-full">
                                <div style="text-align: center;" class="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/30 backdrop-blur-sm">🔴# \${m.id}</div>
                                
                                <p class="text-gray-800 text-base md:text-xl handwriting mb-4 leading-relaxed">\${randomEmoji}"\${m.content}"</p>
                                <div class="mt-auto border-t border-black/5 pt-2">
                                    <p class="font-bold text-gray-900 text-sm md:text-base">💎 \${m.name}</p>
                                    <p class="text-[14px] text-gray-500 font-mono italic"  > 🔐  \${m.contact}</p>
                                </div>
                            </div>
                        </div>
                    \`;
       
                }).join('');

                // 【关键步骤】渲染完成后，循环给每个便签绑定拖动函数
                data.forEach((_, index) => {
                    const el = document.getElementById(\`note-\${index}\`);
                    makeDraggable(el);
                });
                // 启动直播滚动效果
                startLiveChat(data);
            }

            // 直播间循环滚动逻辑
            function startLiveChat(messages) {
                if (messages.length === 0) return;
                
                const container = document.getElementById('live-chat');
                let index = 0;

                setInterval(() => {
                    const m = messages[index % messages.length];
                    const displayName = m.name;
                    
                    // 创建新气泡
                    const bubble = document.createElement('div');
                    bubble.className = 'chat-bubble animate__animated animate__fadeInUp';
                    bubble.innerHTML = \`
                        <span class="text-indigo-300 font-bold">\${displayName}:</span>
                        <span class="ml-1">\${m.content.substring(0, 36)}\${m.content.length > 36 ? '...' : ''}</span>
                    \`;
                    
                    container.appendChild(bubble);

                    // 保持屏幕上最多只有 3 条消息
                    if (container.children.length > 2) {
                        const first = container.children[0];
                        first.classList.add('fade-out');
                        setTimeout(() => first.remove(), 500);
                    }

                    index++;
                }, 5000); // 每 4 秒跳出一条新留言
            }

            async function submit() {
                const btn = document.getElementById('btn');
                const name = document.getElementById('name').value;
                const content = document.getElementById('content').value;
                const contact = document.getElementById('contact').value;

                if(!name || !content) return alert('名字和留言是必填的哦！');
                
                btn.disabled = true;
                btn.innerText = '正在寄出...';
                
                try {
                    await fetch('/api/messages', {
                        method: 'POST',
                        body: JSON.stringify({ name, contact, content }),
                        headers: {'Content-Type': 'application/json'}
                    });
                    location.reload();
                } catch(e) {
                    alert('发送失败，请检查网络');
                    btn.disabled = false;
                    btn.innerText = '重试';
                }
            }

            load();
        </script>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};