


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 只有以 /api/ 开头的请求才转发到 Vercel 后端
    if (url.pathname.startsWith('/api/')) {
      url.host = 'ruipalacede-glq4cmj08-tainrui-ais-projects.vercel.app';
      return fetch(url, request);
    }

    // 2. 其他所有静态资源、页面以及 Cloudflare 的 /cdn-cgi/ 统一交由 Cloudflare 边缘原生处理
    return env.ASSETS.fetch(request);
  }
};
