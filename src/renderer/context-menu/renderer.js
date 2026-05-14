const menuEl = document.getElementById('menu');

// 渲染菜单
function renderMenu(items) {
  menuEl.innerHTML = '';

  items.forEach(item => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'separator';
      menuEl.appendChild(sep);
      return;
    }

    const el = document.createElement('div');
    el.className = 'menu-item';

    if (item.type === 'checkbox') {
      el.innerHTML = `
        <div class="checkbox-item">
          <div class="checkbox-box ${item.checked ? 'checked' : ''}"></div>
          <span>${item.label}</span>
        </div>
      `;
    } else if (item.isAI) {
      el.innerHTML = `
        <span>${item.label}</span>
        ${item.current ? '<span class="check">✓</span>' : ''}
      `;
      if (item.current) {
        el.classList.add('active');
      }
    } else {
      el.innerHTML = `<span>${item.label}</span>`;
    }

    if (item.click) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // checkbox 类型需要传递新的 checked 状态
        if (item.type === 'checkbox') {
          item.click(!item.checked);
        } else {
          item.click();
        }
        window.contextMenuAPI.close();
      });
    }

    menuEl.appendChild(el);
  });
}

// 监听菜单数据
window.contextMenuAPI.onMenuData((data) => {
  renderMenu(data.items);
});

// 点击空白区域关闭菜单（但不阻止穿透）
document.addEventListener('click', (e) => {
  if (!menuEl.contains(e.target)) {
    window.contextMenuAPI.close();
  }
});

// 窗口失去焦点时关闭
window.addEventListener('blur', () => {
  window.contextMenuAPI.close();
});