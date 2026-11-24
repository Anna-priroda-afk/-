(function () {
  'use strict';

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Отправка заявок в Google Таблицу ---------- */
  // Замените этот адрес на URL веб-приложения из Apps Script (развёртывание «Все» / «Я»).
  const LEAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyy_c8MfLkUXfnn7RrB2FS20D_wbLk1yQT-uwhko860A2OQS8A58-fgrR0tsypqhJQPmw/exec';
  const leadAnswers = new Array(4).fill('');

  /* ---------- Шапка, прогресс и мобильное меню ---------- */
  const header = $('.site-header');
  const progressBar = $('.scroll-progress span');
  const nav = $('#site-nav');
  const burger = $('.burger');

  function onScrollChrome() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
  }
  onScrollChrome();
  window.addEventListener('scroll', onScrollChrome, { passive: true });

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
  }
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    $$('a', nav).forEach((link) => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) closeNav(); });
  }

  /* ---------- Появление блоков при скролле ---------- */
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Параллакс ---------- */
  const parallaxItems = $$('[data-parallax]').map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.1,
    base: 0,
    height: 0
  }));
  function measureParallax() {
    parallaxItems.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      item.base = rect.top + window.scrollY;
      item.height = rect.height;
    });
  }
  function updateParallax() {
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    parallaxItems.forEach((item) => {
      const center = item.base + item.height / 2;
      const offset = Math.max(-180, Math.min(180, (center - viewportCenter) * -item.speed));
      item.el.style.setProperty('--py', offset.toFixed(1) + 'px');
    });
  }
  if (parallaxItems.length && !reduceMotion) {
    measureParallax();
    updateParallax();
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { updateParallax(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', () => { measureParallax(); updateParallax(); });
    window.addEventListener('load', () => { measureParallax(); updateParallax(); });
  }

  /* ---------- Счётчики в строке доверия ---------- */
  const counters = $$('[data-count]');
  function animateCounter(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  const trustGrid = $('.trust-grid');
  if (trustGrid && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$('[data-count]', entry.target).forEach(animateCounter);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counterObserver.observe(trustGrid);
  }

  /* ---------- Отзывы: стрелки, точки, клавиатура ---------- */
  const reviewTrack = $('#review-track');
  const dotsWrap = $('#review-dots');
  if (reviewTrack && dotsWrap) {
    const cards = $$('.review', reviewTrack);
    dotsWrap.innerHTML = cards.map((_, index) =>
      '<button type="button" data-index="' + index + '" aria-label="Показать отзыв ' + (index + 1) + '"></button>'
    ).join('');
    const dots = $$('button', dotsWrap);

    function currentReview() {
      const first = cards[0];
      if (!first) return 0;
      const gap = parseFloat(getComputedStyle(reviewTrack).columnGap || getComputedStyle(reviewTrack).gap) || 20;
      return Math.round(reviewTrack.scrollLeft / (first.getBoundingClientRect().width + gap));
    }
    function updateDots() {
      const active = Math.max(0, Math.min(cards.length - 1, currentReview()));
      dots.forEach((dot, index) => dot.classList.toggle('is-active', index === active));
    }
    function goToReview(index) {
      const target = Math.max(0, Math.min(index, cards.length - 1));
      const card = cards[target];
      if (!card) return;
      reviewTrack.scrollTo({ left: card.offsetLeft - reviewTrack.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      updateDots();
    }
    updateDots();
    reviewTrack.addEventListener('scroll', updateDots, { passive: true });
    dotsWrap.addEventListener('click', (event) => {
      const dot = event.target.closest('button[data-index]');
      if (dot) goToReview(Number(dot.dataset.index));
    });
    const prev = $('#review-prev');
    const next = $('#review-next');
    if (prev) prev.addEventListener('click', () => goToReview(currentReview() - 1));
    if (next) next.addEventListener('click', () => goToReview(currentReview() + 1));
    reviewTrack.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); goToReview(currentReview() + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToReview(currentReview() - 1); }
    });
  }

  /* ---------- FAQ: только один открытый ответ ---------- */
  const faqItems = $$('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => { if (other !== item) other.open = false; });
    });
  });

  /* ---------- Маска телефона и валидация форм ---------- */
  function formatPhone(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8') || digits.startsWith('7')) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (!digits) return '';
    let out = '+7 (' + digits.slice(0, 3);
    if (digits.length >= 3) out += ')';
    if (digits.length > 3) out += ' ' + digits.slice(3, 6);
    if (digits.length > 6) out += '-' + digits.slice(6, 8);
    if (digits.length > 8) out += '-' + digits.slice(8, 10);
    return out;
  }
  $$('input[type="tel"]').forEach((input) => {
    input.addEventListener('input', () => { input.value = formatPhone(input.value); });
  });

  // Google Таблицы трактуют значение, начинающееся с "+", как формулу и выдают
  // #ERROR! Синтаксическая ошибка. Отправляем номер без плюса: "+7..." / "8..." → "7...".
  function phoneForSheet(value) {
    return String(value || '')
      .trim()
      .replace(/^(?:\+7|8)/, '7')
      .replace(/^[+=\-@]+/, '')
      .trim();
  }

  function sendLead(form, payload) {
    const status = $('.form-status', form);
    const button = $('button[type="submit"]', form);

    if (!LEAD_ENDPOINT || LEAD_ENDPOINT.indexOf('ВСТАВЬТЕ') !== -1) {
      if (status) {
        status.classList.add('is-error');
        status.textContent = 'Подключите Google Таблицу: замените LEAD_ENDPOINT в script.js на адрес веб-приложения.';
      }
      return;
    }

    const originalLabel = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Отправляем...';
    }
    if (status) { status.textContent = ''; status.classList.remove('is-error'); }

    fetch(LEAD_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    }).then(() => {
      if (form.dataset.leadForm === 'quiz') {
        // В квизе вместо очищенных полей показываем одно сообщение об успехе.
        const finalStep = form.closest('.quiz-final');
        const quizCard = finalStep ? finalStep.closest('#quiz') : null;
        if (finalStep) {
          finalStep.innerHTML = '<div class="quiz-success" role="status" aria-live="polite">Заявка отправлена</div>';
        }
        if (quizCard) {
          const top = quizCard.querySelector('.quiz-top');
          const progress = quizCard.querySelector('.quiz-progress');
          const controls = quizCard.querySelector('.quiz-controls');
          if (top) top.hidden = true;
          if (progress) progress.hidden = true;
          if (controls) controls.hidden = true;
        }
      } else if (form.closest('.short-form')) {
        // В альтернативе квизу тоже убираем поля и показываем только успех.
        const card = form.closest('.short-form');
        form.innerHTML = '<div class="quiz-success" role="status" aria-live="polite">Заявка отправлена</div>';
        $$(':scope > h3, :scope > p, :scope > .short-form-contacts', card).forEach((el) => { el.hidden = true; });
      } else {
        if (status) {
          status.classList.remove('is-error');
          status.textContent = 'Заявка отправлена';
        }
        form.reset();
      }
    }).catch(() => {
      if (status) {
        status.classList.add('is-error');
        status.textContent = 'Не удалось отправить заявку. Позвоните нам: +7 (351) XXX-XX-XX.';
      }
    }).finally(() => {
      if (button) { button.disabled = false; button.innerHTML = originalLabel; }
    });
  }

  $$('[data-lead-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameField = form.elements.name;
      const phoneField = form.elements.phone;
      const status = $('.form-status', form);
      const name = nameField.value.trim();
      const phone = phoneField.value.trim();
      const invalid = [];
      if (name.length < 2) invalid.push(nameField);
      if (phone.replace(/\D/g, '').length < 10) invalid.push(phoneField);

      $$('input', form).forEach((field) => { field.style.borderColor = ''; });
      if (invalid.length) {
        invalid.forEach((field) => { field.style.borderColor = 'var(--accent)'; });
        if (status) {
          status.textContent = 'Укажите имя и телефон — мы перезвоним за 15 минут.';
          status.classList.add('is-error');
        }
        invalid[0].focus();
        return;
      }

      const isQuiz = form.dataset.leadForm === 'quiz';
      const utm = new URLSearchParams(window.location.search).toString();
      sendLead(form, {
        date: new Date().toISOString(),
        name: name,
        phone: phoneForSheet(phone),
        area: isQuiz ? leadAnswers[0] : '',
        budget: isQuiz ? leadAnswers[1] : '',
        plot: isQuiz ? leadAnswers[2] : '',
        moveIn: isQuiz ? leadAnswers[3] : '',
        source: isQuiz ? 'Квиз' : 'Короткая форма',
        page: window.location.href,
        utm: utm
      });
    });
    $$('input', form).forEach((field) => {
      field.addEventListener('input', () => { field.style.borderColor = ''; });
    });
  });

  /* ---------- Квиз ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const steps = $$('.quiz-step', quiz);
    const options = $$('.quiz-option', quiz);
    const nextBtn = $('#quiz-next');
    const backBtn = $('#quiz-back');
    const progressBarQuiz = $('#quiz-progress-bar');
    const stepCounter = $('#quiz-step');
    const summary = $('#quiz-summary');
    const answers = leadAnswers;
    let current = 0;
    let advancing = false;

    function renderStep() {
      steps.forEach((step, index) => step.classList.toggle('is-active', index === current));
      progressBarQuiz.style.width = (((current + 1) / steps.length) * 100) + '%';
      stepCounter.textContent = Math.min(current + 1, steps.length - 1);
      backBtn.hidden = current === 0;
      nextBtn.hidden = current === steps.length - 1;
      if (current < steps.length - 1) {
        nextBtn.textContent = '';
        nextBtn.append(document.createTextNode(current === steps.length - 2 ? 'Показать форму ' : 'Дальше '));
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        nextBtn.appendChild(arrow);
        nextBtn.disabled = !answers[current];
      }
      if (current === steps.length - 1) {
        summary.innerHTML = '<strong>Ваш выбор:</strong> ' + answers.filter(Boolean).join(' · ');
      }
    }

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const step = option.closest('.quiz-step');
        const index = Number(step.dataset.step);
        $$('.quiz-option', step).forEach((other) => other.classList.toggle('is-selected', other === option));
        answers[index] = option.dataset.value;
        nextBtn.disabled = false;
        if (advancing) return;
        advancing = true;
        window.setTimeout(() => {
          advancing = false;
          if (current === index && current < steps.length - 1) {
            current += 1;
            renderStep();
          }
        }, 260);
      });
    });

    nextBtn.addEventListener('click', () => {
      if (!answers[current] || current >= steps.length - 1) return;
      current += 1;
      renderStep();
    });
    backBtn.addEventListener('click', () => {
      if (current > 0) { current -= 1; renderStep(); }
    });
    renderStep();
  }

  /* ---------- Год в подвале ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
