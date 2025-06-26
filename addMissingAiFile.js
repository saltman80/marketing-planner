const API_URL = window.OPENROUTER_API_URL || '/proxy.php';
const MODEL = 'openrouter-04-mini';
const TEMPERATURE = 0.7;

function init() {
  const form = document.querySelector('#ai-form');
  const input = document.querySelector('#project-input');
  const button = document.querySelector('#generate-button');
  const outputContainer = document.querySelector('#checklist-container');
  const loadingIndicator = document.querySelector('#loading-indicator');

  if (!form || !input || !button || !outputContainer) return;

  form.addEventListener('submit', function(event) {
    handleSubmit(event, input, outputContainer, button, loadingIndicator);
  });
}

async function handleSubmit(event, input, outputContainer, button, loadingIndicator) {
  event.preventDefault();
  const projectName = input.value.trim();
  if (!projectName) {
    alert('Please enter a project name.');
    return;
  }
  toggleLoading(loadingIndicator, true);
  clearOutput(outputContainer);
  button.disabled = true;
  try {
    const checklist = await fetchChecklist(projectName);
    renderChecklist(checklist, outputContainer);
  } catch (error) {
    renderError(error, outputContainer);
  } finally {
    toggleLoading(loadingIndicator, false);
    button.disabled = false;
  }
}

async function fetchChecklist(projectName) {
  const systemMessage = 'You are a marketing planner assistant.';
  const userMessage = `Generate a 20-step AI-driven marketing checklist for a software or app launch named "${projectName}". Return the result as a JSON array of strings.`;
  const payload = {
    model: MODEL,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]
  };
  const headers = { 'Content-Type': 'application/json' };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    const jsonString = extractJsonArray(content);
    if (jsonString) {
      try {
        const arr = JSON.parse(jsonString);
        if (Array.isArray(arr)) return arr;
      } catch {}
    }
    return content
      .split(/\r?\n/)
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }
  return null;
}

function renderChecklist(items, container) {
  if (!items.length) {
    container.textContent = 'No items generated.';
    return;
  }
  const ul = document.createElement('ul');
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function renderError(error, container) {
  const div = document.createElement('div');
  div.className = 'error';
  div.textContent = error.message || 'An error occurred.';
  container.appendChild(div);
}

function clearOutput(container) {
  container.innerHTML = '';
}

function toggleLoading(indicator, show) {
  if (!indicator) return;
  indicator.style.display = show ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', init);