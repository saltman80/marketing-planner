(function () {
  const selectors = {
    form: '#plannerForm',
    nameInput: '#appName',
    descInput: '#appDesc',
    generateBtn: '#generateBtn',
    loader: '#loader',
    checklistSection: '#checklistSection',
    stepText: '#stepText',
    nextBtn: '#nextBtn',
    prevBtn: '#prevBtn',
    restartBtn: '#restartBtn',
    downloadBtn: '#downloadBtn',
    errorMsg: '#errorMsg'
  };

  const dom = {};
  const STORAGE_KEYS = {
    steps: 'sessionUI:steps',
    currentStep: 'sessionUI:currentStep'
  };

  function init() {
    document.addEventListener('DOMContentLoaded', () => {
      cacheDom();
      bindEvents();
      restoreSession();
    });
  }

  function cacheDom() {
    Object.keys(selectors).forEach(key => {
      dom[key] = document.querySelector(selectors[key]);
    });
  }

  function bindEvents() {
    if (dom.form) dom.form.addEventListener('submit', handleGenerate);
    if (dom.nextBtn) dom.nextBtn.addEventListener('click', () => handleNavigate(1));
    if (dom.prevBtn) dom.prevBtn.addEventListener('click', () => handleNavigate(-1));
    if (dom.restartBtn) dom.restartBtn.addEventListener('click', handleRestart);
    if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', handleDownload);
    window.addEventListener('appLogic:loading', handleLoading);
    window.addEventListener('appLogic:generated', handleGenerated);
    window.addEventListener('appLogic:stepChanged', handleStepChanged);
    window.addEventListener('appLogic:error', handleError);
  }

  function dispatch(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function handleGenerate(evt) {
    evt.preventDefault();
    clearError();
    const name = dom.nameInput ? dom.nameInput.value.trim() : '';
    const description = dom.descInput ? dom.descInput.value.trim() : '';
    if (!name) {
      showError('Please enter a name for your software or app.');
      if (dom.nameInput) dom.nameInput.focus();
      return;
    }
    dispatch('sessionUI:generate', { name, description });
  }

  function handleNavigate(offset) {
    dispatch('sessionUI:navigate', { offset });
  }

  function handleRestart() {
    sessionStorage.removeItem(STORAGE_KEYS.steps);
    sessionStorage.removeItem(STORAGE_KEYS.currentStep);
    dispatch('sessionUI:restart', {});
    toggleUIState(false);
    if (dom.stepText) dom.stepText.textContent = '';
    if (dom.form) dom.form.reset();
  }

  function handleDownload() {
    dispatch('sessionUI:download', {});
  }

  function handleLoading(evt) {
    if (!dom.loader) return;
    dom.loader.style.display = evt.detail === true ? 'block' : 'none';
  }

  function handleGenerated(evt) {
    const steps = Array.isArray(evt.detail.steps) ? evt.detail.steps : [];
    try {
      sessionStorage.setItem(STORAGE_KEYS.steps, JSON.stringify(steps));
    } catch (e) {
      console.error('Failed to save steps to sessionStorage', e);
      sessionStorage.setItem(STORAGE_KEYS.steps, '[]');
    }
    sessionStorage.setItem(STORAGE_KEYS.currentStep, '0');
    toggleUIState(true);
    renderStep(0);
  }

  function handleStepChanged(evt) {
    const index = evt.detail && typeof evt.detail.index === 'number' ? evt.detail.index : 0;
    sessionStorage.setItem(STORAGE_KEYS.currentStep, index.toString());
    renderStep(index);
  }

  function handleError(evt) {
    let msg = 'An error occurred. Please try again.';
    const detail = evt.detail;
    if (typeof detail === 'string') {
      msg = detail;
    } else if (detail && typeof detail.message === 'string') {
      msg = detail.message;
    } else if (detail != null) {
      msg = String(detail);
    }
    showError(msg);
  }

  function renderStep(index) {
    let steps = [];
    const stored = sessionStorage.getItem(STORAGE_KEYS.steps);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) steps = parsed;
      } catch (e) {
        console.error('Failed to parse steps from sessionStorage', e);
      }
    }
    const text = steps[index] || '';
    if (dom.stepText) dom.stepText.textContent = text;
    if (dom.prevBtn) dom.prevBtn.disabled = index <= 0;
    if (dom.nextBtn) dom.nextBtn.disabled = index >= steps.length - 1;
  }

  function toggleUIState(showChecklist) {
    if (dom.checklistSection) dom.checklistSection.style.display = showChecklist ? 'block' : 'none';
    if (dom.form) dom.form.style.display = showChecklist ? 'none' : 'block';
  }

  function restoreSession() {
    const steps = sessionStorage.getItem(STORAGE_KEYS.steps);
    const current = sessionStorage.getItem(STORAGE_KEYS.currentStep);
    if (steps) {
      toggleUIState(true);
      let index = 0;
      if (current) {
        const parsedIndex = parseInt(current, 10);
        if (!isNaN(parsedIndex)) index = parsedIndex;
      }
      renderStep(index);
    }
  }

  function showError(msg) {
    if (!dom.errorMsg) return;
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = 'block';
  }

  function clearError() {
    if (!dom.errorMsg) return;
    dom.errorMsg.textContent = '';
    dom.errorMsg.style.display = 'none';
  }

  init();
})();