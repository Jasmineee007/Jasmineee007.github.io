// 反馈页（/feedback/）表单交互
// 由 inject.bottom 加载；事件挂在 window.__fb，所有 onclick 调用走这个命名空间。
// 与 scripts/feedback-page.js 构建的 DOM 配套；样式在 source/css/feedback.css。
'use strict';

window.__fb = (function () {
  const PROJECTS = {
    seclearn: { name: 'SecLearn 刷题平台', icon: '🎓' },
    blog:     { name: 'Jasmine_Iris 博客', icon: '✍️' },
    other:    { name: '其他项目',          icon: '🧩' }
  };

  // 每个项目专属的反馈类型，切换项目时右侧按钮组随之变化
  const PROJECT_TYPES = {
    seclearn: [
      { id: 'suggest', icon: '💡', label: '功能建议' },
      { id: 'error',   icon: '🔍', label: '内容纠错' },
      { id: 'new',     icon: '📝', label: '新题推荐' },
      { id: 'bug',     icon: '🐛', label: '体验问题' },
      { id: 'other',   icon: '💬', label: '其他' },
      { id: 'praise',  icon: '🙌', label: '正向鼓励' }
    ],
    blog: [
      { id: 'layout',  icon: '🎨', label: '排版视觉' },
      { id: 'content', icon: '📝', label: '文章内容' },
      { id: 'speed',   icon: '⚡', label: '加载速度' },
      { id: 'bug',     icon: '🐛', label: '体验问题' },
      { id: 'praise',  icon: '🙌', label: '夸奖' },
      { id: 'other',   icon: '💬', label: '其他' }
    ],
    other: [
      { id: 'suggest', icon: '💡', label: '功能建议' },
      { id: 'bug',     icon: '🐛', label: '体验问题' },
      { id: 'praise',  icon: '🙌', label: '夸奖' },
      { id: 'other',   icon: '💬', label: '其他' }
    ]
  };

  const HINTS = ['', '微乎其微', '较小', '一般', '重要', '关键'];

  let selectedType = null;
  let rating = 3;
  let project = 'seclearn';

  function renderTypes() {
    const list = PROJECT_TYPES[project];
    selectedType = list[0].id;
    document.getElementById('wsIcon').textContent = PROJECTS[project].icon;
    document.getElementById('wsName').textContent = PROJECTS[project].name;
    document.getElementById('typeGrid').innerHTML = list.map(t =>
      '<div class="type-btn' + (t.id === selectedType ? ' active' : '') + '" data-type="' + t.id + '" onclick="window.__fb.selectType(this)"><span class="emoji">' + t.icon + '</span>' + t.label + '</div>'
    ).join('');
  }

  function selectType(el) {
    document.querySelectorAll('#typeGrid .type-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    selectedType = el.dataset.type;
  }

  function selectProject(el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    project = el.dataset.proj;
    const ws = document.getElementById('workspace');
    ws.classList.add('switching');
    renderTypes();
    setTimeout(() => ws.classList.remove('switching'), 180);
  }

  function setRating(v) {
    rating = v;
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('lit', parseInt(s.dataset.v, 10) <= v);
    });
    document.getElementById('ratingHint').textContent = HINTS[v];
  }

  function submit() {
    const ta = document.getElementById('detail');
    const detailErr = document.getElementById('detailErr');
    const detail = ta.value.trim();

    // 必填校验：未填写描述则红框 + 红字提醒 + 聚焦
    if (!detail) {
      ta.classList.add('err');
      detailErr.classList.add('show');
      ta.focus();
      return;
    }
    ta.classList.remove('err');
    detailErr.classList.remove('show');

    const typeLabel = PROJECT_TYPES[project].find(t => t.id === selectedType).label;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const subject = encodeURIComponent('[反馈 · ' + PROJECTS[project].name + '] ' + typeLabel + ' ' + stars);
    const contact = document.getElementById('contact').value.trim();
    const contactLine = contact ? '\n联系方式：' + contact : '';

    const body = encodeURIComponent(
      '【项目】' + PROJECTS[project].name + '\n' +
      '【反馈类型】' + typeLabel + '\n' +
      '【重要程度】' + stars + '（' + HINTS[rating] + '）\n' +
      '【详细内容】\n' + detail + contactLine + '\n\n（📎 如有截图，请直接在邮件中添加附件）\n'
    );

    const btn = document.getElementById('submitBtn');
    btn.classList.add('sending');
    btn.textContent = '⏳ 点火发射...';
    launchRocket(btn);

    // 火箭飞出后跳转邮件，并显示成功面板
    setTimeout(() => {
      btn.classList.add('success');
      btn.textContent = '✅ 已发射';
      document.getElementById('successOverlay').classList.add('show');

      window.location.href = 'mailto:3381905188@qq.com?subject=' + subject + '&body=' + body;
    }, 650);

    // 按钮恢复可再次提交
    setTimeout(() => {
      btn.classList.remove('sending');
      btn.classList.remove('success');
      btn.textContent = '🚀 提交反馈';
    }, 3500);
  }

  // 火箭从按钮位置起飞
  function launchRocket(btn) {
    const r = btn.getBoundingClientRect();
    const rocket = document.createElement('div');
    rocket.className = 'fly-rocket';
    rocket.textContent = '🚀';
    rocket.style.left = (r.left + r.width / 2) + 'px';
    rocket.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(rocket);
    requestAnimationFrame(() => rocket.classList.add('go'));
    setTimeout(() => rocket.remove(), 1000);
  }

  // 再写一条
  function resetForm() {
    document.getElementById('detail').value = '';
    document.getElementById('contact').value = '';
    document.getElementById('detail').classList.remove('err');
    document.getElementById('detailErr').classList.remove('show');
    setRating(3);
    document.getElementById('successOverlay').classList.remove('show');
    const btn = document.getElementById('submitBtn');
    btn.classList.remove('success', 'sending');
    btn.textContent = '🚀 提交反馈';
  }

  // URL ?p= 参数预选项目来源（SecLearn 入口 /feedback/?p=seclearn，博客菜单 /feedback/?p=blog）
  function init() {
    const p = new URLSearchParams(location.search).get('p');
    if (p && PROJECTS[p]) {
      project = p;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.proj === p));
    }
    renderTypes();
    setRating(3);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { selectType, selectProject, setRating, submit, resetForm };
})();