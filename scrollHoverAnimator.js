const scrollHoverAnimator = (() => {
  const hoverAnimations = new WeakMap();
  const originalTransforms = new WeakMap();
  let observer = null;
  let hoverElements = new Set();
  function init({ scrollSelector = '.scroll-anim', hoverSelector = '.hover-anim', scrollThreshold = 0.1 } = {}) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    hoverElements.forEach(el => {
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
    });
    hoverElements.clear();
    const scrollElements = document.querySelectorAll(scrollSelector);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(handleIntersect, { threshold: scrollThreshold });
      scrollElements.forEach(el => {
        el.style.opacity = el.style.opacity || '0';
        observer.observe(el);
      });
    } else {
      scrollElements.forEach(animateScrollIn);
    }
    document.querySelectorAll(hoverSelector).forEach(el => {
      el.style.willChange = 'transform';
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
      hoverElements.add(el);
    });
  }
  function handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateScrollIn(entry.target);
        if (observer) observer.unobserve(entry.target);
      }
    });
  }
  function animateScrollIn(el) {
    const d = el.dataset;
    const delay = parseDatasetInt(d.scrollDelay, 0);
    const duration = parseDatasetInt(d.scrollDuration, 600);
    const easing = d.scrollEasing || 'ease-out';
    const fromOpacity = parseDatasetFloat(d.scrollFromOpacity, 0);
    const toOpacity = parseDatasetFloat(d.scrollToOpacity, 1);
    const yOffset = parseDatasetFloat(d.scrollYOffset, 20);
    const keyframes = [
      { opacity: fromOpacity, transform: `translateY(${yOffset}px)` },
      { opacity: toOpacity, transform: 'translateY(0)' }
    ];
    const options = { duration, easing, delay, fill: 'forwards' };
    if (typeof el.animate === 'function') {
      el.animate(keyframes, options);
    } else {
      const prevTransition = el.style.transition;
      el.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;
      el.style.opacity = fromOpacity;
      el.style.transform = `translateY(${yOffset}px)`;
      requestAnimationFrame(() => {
        el.style.opacity = toOpacity;
        el.style.transform = 'translateY(0)';
      });
      const cleanup = () => {
        el.style.transition = prevTransition;
        el.removeEventListener('transitionend', cleanup);
      };
      el.addEventListener('transitionend', cleanup);
    }
  }
  function onMouseEnter(e) {
    const el = e.currentTarget;
    const d = el.dataset;
    const scale = parseDatasetFloat(d.hoverScale, 1.05);
    const duration = parseDatasetInt(d.hoverDuration, 200);
    const easing = d.hoverEasing || 'ease-out';
    let original = originalTransforms.get(el);
    if (original === undefined) {
      const computed = getComputedStyle(el).transform;
      original = computed !== 'none' ? computed : '';
      originalTransforms.set(el, original);
    }
    const from = getComputedStyle(el).transform;
    const to = `${original} scale(${scale})`;
    const keyframes = [{ transform: from }, { transform: to }];
    const options = { duration, easing, fill: 'forwards' };
    if (typeof el.animate === 'function') {
      const anim = el.animate(keyframes, options);
      hoverAnimations.set(el, anim);
    } else {
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = to;
    }
  }
  function onMouseLeave(e) {
    const el = e.currentTarget;
    const d = el.dataset;
    const duration = parseDatasetInt(d.hoverDuration, 200);
    const easing = d.hoverEasing || 'ease-in';
    const original = originalTransforms.get(el) || '';
    const from = getComputedStyle(el).transform;
    const to = original;
    const keyframes = [{ transform: from }, { transform: to }];
    const options = { duration, easing, fill: 'forwards' };
    if (typeof el.animate === 'function') {
      const prev = hoverAnimations.get(el);
      if (prev) prev.cancel();
      const anim = el.animate(keyframes, options);
      anim.onfinish = () => { el.style.transform = to; };
      hoverAnimations.set(el, anim);
    } else {
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = to;
    }
  }
  function parseDatasetInt(value, defaultValue) {
    if (value != null) {
      const n = parseInt(value, 10);
      if (!isNaN(n)) return n;
    }
    return defaultValue;
  }
  function parseDatasetFloat(value, defaultValue) {
    if (value != null) {
      const n = parseFloat(value);
      if (!isNaN(n)) return n;
    }
    return defaultValue;
  }
  return { init };
})();
window.scrollHoverAnimator = scrollHoverAnimator;