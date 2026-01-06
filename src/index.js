/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/api/messages':
				if (request.method === 'GET') {
					// API: 获取留言列表
					const { results } = await env.DB.prepare('SELECT * FROM messages ORDER BY id DESC').all();
					const masked = (results || []).map(m => {
						const name = m.name || '';
						const contact = m.contact || '';
						return {
							id: m.id,
							content: m.content,
							name: name.length <= 2 ? (name[0] ? name[0] + '*' : '') : (name[0] + '*'.repeat(Math.max(0, name.length - 2)) + name.slice(-1)),
							contact: (/^\d{11}$/.test(contact)) ? contact.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : (contact.length > 4 ? contact.slice(0, 2) + '****' + contact.slice(-2) : '****')
						};
					});

					return new Response(JSON.stringify(masked), {
						headers: { 'Content-Type': 'application/json;charset=UTF-8' }
					});
				} else if (request.method === 'POST') {
					// API: 提交留言
					try {
						const { name, contact, content } = await request.json();
						if (!name || !content) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

						await env.DB.prepare('INSERT INTO messages (name, contact, content) VALUES (?, ?, ?)')
							.bind(name, contact, content)
							.run();

						return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
					} catch (e) {
						return new Response(JSON.stringify({ error: e.message || 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
					}
				}
				break;
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};
