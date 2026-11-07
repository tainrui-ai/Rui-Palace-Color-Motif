


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 如果请求路径以 /cdn-cgi/ 开头，绝对不能用 fetch 转发，必须让 Cloudflare 边缘原生处理
    if (url.pathname.startsWith('/cdn-cgi/')) {
      return fetch(request);
    }

    // 2. 只有以 /api/ 开头的后端请求才转发到 Vercel 部署地址
    if (url.pathname.startsWith('/api/')) {
      url.host = 'ruipalacede-glq4cmj08-tainrui-ais-projects.vercel.app';
      return fetch(url, request);
    }

    // 3. 其他所有前端静态资源和页面，走 Cloudflare 资产托管
    return env.ASSETS.fetch(request);
  }
};
