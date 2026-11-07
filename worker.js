export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🔴 关键：如果请求路径以 /cdn-cgi/ 开头，绝对不转发给 Vercel
    if (url.pathname.startsWith('/cdn-cgi/')) {
      return fetch(request);
    }

    // 将其余流量转发到你的 Vercel 后端部署地址
    url.host = 'ruipalacede-glq4cmj08-tainrui-ais-projects.vercel.app';
    return fetch(url, request);
  }
};