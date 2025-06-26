;(function(window, document) {
  function init(options = {}) {
    const selector = typeof options.selector === 'string' ? options.selector : '#checklist-items';
    const handle = typeof options.handle === 'string' ? options.handle : '.drag-handle';
    const numberSelector = typeof options.numberSelector === 'string' ? options.numberSelector : '.step-number';
    const animation = typeof options.animation === 'number' ? options.animation : 150;
    const onReorder = typeof options.onReorder === 'function' ? options.onReorder : null;
    let container;

    try {
      container = document.querySelector(selector);
    } catch (e) {
      console.error(`dragDropChecklistReorder.init: Invalid selector "${selector}"`, e);
      return null;
    }

    if (!container) {
      console.warn(`dragDropChecklistReorder.init: Container not found for selector "${selector}"`);
      return null;
    }

    if (typeof window.Sortable !== 'function' && typeof window.Sortable !== 'object') {
      console.error('dragDropChecklistReorder.init: Sortable library not found. Include SortableJS before initializing.');
      return null;
    }

    let instance;
    try {
      instance = new Sortable(container, {
        animation,
        handle,
        onEnd(evt) {
          const order = [];
          Array.from(container.children).forEach((item, index) => {
            item.dataset.index = index;
            try {
              const numEl = item.querySelector(numberSelector);
              if (numEl) numEl.textContent = index + 1;
            } catch (err) {
              console.error(`dragDropChecklistReorder.init: Invalid numberSelector "${numberSelector}"`, err);
            }
            order.push(item.dataset.id || item.id || index);
          });
          if (onReorder) {
            try {
              onReorder(order, evt);
            } catch (err) {
              console.error('dragDropChecklistReorder.init: Error in onReorder callback', err);
            }
          }
        }
      });
    } catch (err) {
      console.error('dragDropChecklistReorder.init: Failed to initialize Sortable', err);
      return null;
    }

    return instance;
  }

  window.dragDropChecklistReorder = { init };
})(window, document);