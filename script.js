document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("cookie-consent");
    const acceptBtn = document.getElementById("accept-btn");
    const rejectBtn = document.getElementById("reject-btn");

    // 1. 统一检查逻辑：同时检查 Cookie 和 LocalStorage
    // 注意：我们将标识符统一为 'cookie_consent' 以保持逻辑一致
    const hasConsent = document.cookie.split('; ').find(row => row.startsWith('cookie_consent=true')) || 
                       localStorage.getItem('cookie_consent') === 'true';

    // 如果已确认，直接隐藏，不需要显示
    if (hasConsent) {
        if (modal) modal.style.display = "none";
    } else {
        // 未确认时显示
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
        };
    }

    if (rejectBtn) {
        rejectBtn.onclick = function() {
            dismiss();
        };
    }
});
