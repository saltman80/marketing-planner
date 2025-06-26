let _isInitAttached = false;

async function generateChecklistAI(project, { proxyEndpoint = '/api/openrouter.php', model = 'gpt-4o-mini', promptTemplate, maxProjectLength = 100 } = {}) {
  let sanitized = project.trim().replace(/\r?\n|\r/g, ' ');
  if (!sanitized) throw new Error('Project description is empty.');
  if (sanitized.length > maxProjectLength) throw new Error(`Project description too long (max ${maxProjectLength} characters).`);
  sanitized = sanitized.replace(/[^\w\s\-\.\,\'\"\(\)\!\?\;\:]/g, '');
  let prompt;
  if (typeof promptTemplate === 'function') {
    prompt = promptTemplate(sanitized);
  } else if (typeof promptTemplate === 'string') {
    prompt = promptTemplate.replace(/{project}/g, sanitized);
  } else {
    prompt = `Generate a 20-step marketing checklist for launching the software/app "${sanitized}". Provide each step numbered 1 to 20, concise and actionable.`;
  }
  const body = {
    model,
    stream: false,
    messages: [
      { role: 'system', content: 'You are an expert marketing strategist.' },
      { role: 'user', content: prompt }
    ]
  };
  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {}
    throw new Error(`API error: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => line.replace(/^\d+\.\s*/, '').trim());
}

function init({ formSelector = '#ai-form', inputSelector = '#project-input', outputSelector = '#checklist-output', proxyEndpoint = '/api/openrouter.php', model = 'gpt-4o-mini', promptTemplate, maxProjectLength = 100 } = {}) {
  const form = document.querySelector(formSelector);
  const input = document.querySelector(inputSelector);
  const output = document.querySelector(outputSelector);
  if (!form || !input || !output) return;
  if (_isInitAttached || form.dataset.aiInitAttached === 'true') return;
  _isInitAttached = true;
  form.dataset.aiInitAttached = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Generate Checklist';
    let project = input.value.trim();
    if (!project) {
      alert('Please enter your project name or description.');
      return;
    }
    if (project.length > maxProjectLength) {
      alert(`Project description too long (max ${maxProjectLength} characters).`);
      return;
    }
    project = project.replace(/\r?\n|\r/g, ' ').replace(/[^\w\s\-\.\,\'\"\(\)\!\?\;\:]/g, '');
    output.innerHTML = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';
    }
    try {
      sessionStorage.setItem('latestProject', project);
      const steps = await generateChecklistAI(project, { proxyEndpoint, model, promptTemplate, maxProjectLength });
      sessionStorage.setItem('latestChecklist', steps.join('\n'));
      const list = document.createElement('ol');
      steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        list.appendChild(li);
      });
      output.appendChild(list);
      output.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('An error occurred while generating the checklist.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}

window.generateChecklistAI = generateChecklistAI;
window.init = init;