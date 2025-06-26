async function generateChecklist(name, timeout = 10000){
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch('/proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: '04-mini',
          prompt: `Generate a 20-step AI-driven marketing checklist for launching the software or app named "${name}". Provide concise actionable items formatted as an HTML ordered list without additional explanation.`,
          max_tokens: 500,
          temperature: 0.7
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return (data.choices?.[0]?.text || data.text || '').trim();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function sanitizeAndRender(htmlString, container){
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const items = Array.from(doc.querySelectorAll('li'))
      .map(li => li.textContent.trim())
      .filter(Boolean);
    if (items.length === 0) {
      container.textContent = htmlString;
      return;
    }
    const ol = document.createElement('ol');
    items.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ol.appendChild(li);
    });
    container.appendChild(ol);
  }

  function init(){
    const form = document.getElementById('app-form');
    const input = document.getElementById('app-name');
    const button = document.getElementById('generate-button');
    const output = document.getElementById('checklist-container');
    if (!form || !input || !button || !output) return;

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }
      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = 'Generating...';
      output.innerHTML = '';
      try {
        const checklistHTML = await generateChecklist(name);
        sanitizeAndRender(checklistHTML, output);
        output.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        output.textContent = err.message || 'An error occurred. Please try again.';
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();