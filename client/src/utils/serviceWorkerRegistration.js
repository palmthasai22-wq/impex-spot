export function register() {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available; please refresh.
                  showToast('มีเวอร์ชันใหม่ กดรีเฟรชเพื่ออัปเดต', true);
                } else {
                  // Content is cached for offline use.
                  showToast('ติดตั้งแอปสำเร็จ พร้อมใช้งานออฟไลน์', false);
                }
              }
            };
          };

          // Check for updates every 60 minutes
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(error => {
          console.error('Error during service worker registration:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

function showToast(message, withRefresh = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: sans-serif;
  `;
  
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (withRefresh) {
    const btn = document.createElement('button');
    btn.textContent = 'รีเฟรช';
    btn.style.cssText = `
      background: #16a34a;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    btn.onclick = () => {
      window.location.reload();
    };
    toast.appendChild(btn);
  } else {
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  document.body.appendChild(toast);
}
