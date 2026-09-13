document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("cookie-consent");
    const acceptBtn = document.getElementById("accept-btn");
    const rejectBtn = document.getElementById("reject-btn");

    // 1. 统一检查逻辑：同时检查 Cookie 和 LocalStorage
    const hasConsent = document.cookie.split('; ').find(row => row.startsWith('cookie_consent=true')) || 
                       localStorage.getItem('cookie_consent') === 'true';

    // 如果已确认，直接隐藏，并初始化水墨动画引擎
    if (hasConsent) {
        if (modal) modal.style.display = "none";
        initInkAnimationEngine();
    } else {
        // 未确认时显示隐私弹窗
        if (modal) modal.style.display = "flex";
    }

    // 2. 淡出动画函数
    function dismiss() {
        if (modal) {
            modal.style.transition = "opacity 0.5s ease";
            modal.style.opacity = "0";
            setTimeout(() => {
                modal.style.display = "none";
            }, 500);
        }
    }

    // 3. 绑定点击逻辑
    if (acceptBtn) {
        acceptBtn.onclick = function() {
            // 写入跨子域 Cookie 和 LocalStorage
            document.cookie = "cookie_consent=true; domain=rui-palace.com; path=/; max-age=31536000; SameSite=Lax";
            localStorage.setItem("cookie_consent", "true");
            dismiss();
            initInkAnimationEngine();
        };
    }

    if (rejectBtn) {
        rejectBtn.onclick = function() {
            document.cookie = "cookie_consent=false; domain=rui-palace.com; path=/; max-age=31536000; SameSite=Lax";
            localStorage.setItem("cookie_consent", "false");
            dismiss();
            enforcePrivacyLockdown();
        };
    }
});

// 隐私锁定执行函数：当用户拒绝时调用
function enforcePrivacyLockdown() {
    console.log("Privacy Lockdown Active: Non-essential tracking and storage blocked.");
    window.__RUI_PRIVACY_LOCKED__ = true;
    if (window.animationId) {
        cancelAnimationFrame(window.animationId);
    }
}

/* ==========================================
   灵犀鉴：水墨 Canvas 交互与即刻变色晕染引擎
   ========================================== */
function initInkAnimationEngine() {
    const canvas = document.getElementById('inkCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let drops = [], ripples = [], backgroundFlows = [];

    // 天然色池样本库（供点击页面任意位置生成水滴时随机调用）
    const samplePalettes = [
        { name: "暮山紫", hex: "#8670A0" },
        { name: "艾青", hex: "#4A6741" },
        { name: "芭蕉橙", hex: "#D97706" },
        { name: "紫菀", hex: "#A68BBD" },
        { name: "帝青", hex: "#1E3A8A" },
        { name: "天青", hex: "#4B6674" },
        { name: "朱砂红", hex: "#B12224" },
        { name: "桃花红", hex: "#E05263" },
        { name: "玄武黑", hex: "#1A1A1A" },
        { name: "琥珀金", hex: "#D4A017" }
    ];

    // 水滴类
    class WaterDrop {
        constructor(x, y, colorData) {
            this.x = x;
            this.y = 0;
            this.targetY = y;
            this.speed = 0;
            this.gravity = 0.3;
            this.size = 3;
            this.colorData = colorData;
        }
        update() {
            this.speed += this.gravity;
            this.y += this.speed;
            if (this.y >= this.targetY) {
                createImpact(this.x, this.targetY, this.colorData);
                return false;
            }
            return true;
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = this.colorData.hex;
            ctx.ellipse(this.x, this.y, this.size, this.size * 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 涟漪类
    class ColorRipple {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = 1;
            this.maxRadius = 180;
            this.alpha = 0.8;
        }
        update() {
            this.radius += (this.maxRadius - this.radius) * 0.05;
            this.alpha -= 0.008;
            return this.alpha > 0;
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.lineWidth = 3;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 色彩晕染流动类（【核心优化】：触地瞬间即刻改变背景色，达到水滴入水色彩立刻同步晕开的效果）
    class LiquidFlow {
        constructor(x, y, colorData) {
            this.x = x;
            this.y = y;
            this.color = colorData.hex;
            this.radius = 0;
            this.maxRadius = Math.max(canvas.width, canvas.height) * 1.2;
            this.speed = 12;
            this.alpha = 0.6;

            // 触地瞬间立刻触发背景色平滑过渡
            document.body.style.backgroundColor = this.color;
        }
        update() {
            this.radius += this.speed;
            this.alpha -= 0.012;
            return this.alpha > 0;
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            let g = ctx.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
            g.addColorStop(0, this.color);
            g.addColorStop(0.5, this.color + "66");
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.globalAlpha = this.alpha;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function createImpact(x, y, colorData) {
        ripples.push(new ColorRipple(x, y, colorData.hex));
        backgroundFlows.push(new LiquidFlow(x, y, colorData));
    }

    // 监听全局点击事件：点击非弹窗或按钮区域时，生成动态水滴
    window.addEventListener('click', (e) => {
        if (window.__RUI_PRIVACY_LOCKED__) return;
        const consentBanner = document.getElementById('cookie-consent');
        if (consentBanner && consentBanner.style.display === "flex") return;

        // 排除两侧面板或导航栏点击产生的误触
        if (e.clientX > 450 && e.clientX < window.innerWidth - 450 && e.clientY < window.innerHeight - 100) {
            const randomColor = samplePalettes[Math.floor(Math.random() * samplePalettes.length)];
            drops.push(new WaterDrop(e.clientX, e.clientY, randomColor));
        }
    });

    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        backgroundFlows = backgroundFlows.filter(f => { let active = f.update(); if (active) f.draw(); return active; });
        ripples = ripples.filter(r => { let active = r.update(); if (active) r.draw(); return active; });
        drops = drops.filter(d => { let active = d.update(); if (active) d.draw(); return active; });
        window.animationId = requestAnimationFrame(animate);
    }

    animate();
}

// 初始化商店卡片轮播预览
document.querySelectorAll('.product-card').forEach(card => {
  const slides = card.querySelectorAll('.preview-slideshow img');
  if (slides.length <= 1) return;
  
  let currentIndex = 0;
  let intervalId = null;

  // 鼠标悬停时加速轮播预览
  card.addEventListener('mouseenter', () => {
    intervalId = setInterval(() => {
      slides[currentIndex].style.opacity = '0';
      currentIndex = (currentIndex + 1) % slides.length;
      slides[currentIndex].style.opacity = '1';
    }, 1500);
  });

  // 鼠标移出时恢复初始状态
  card.addEventListener('mouseleave', () => {
    clearInterval(intervalId);
    slides.forEach((slide, idx) => {
      slide.style.opacity = idx === 0 ? '1' : '0';
    });
    currentIndex = 0;
  });
});
