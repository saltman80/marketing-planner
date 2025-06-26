import Ajv from 'ajv';

const FILE_INPUT_ID = 'add-ai-file';
const STORAGE_KEY = 'aiFileData';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const emitter = new EventTarget();

const ajv = new Ajv({ allErrors: true, removeAdditional: 'all' });
const aiFileSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          completed: { type: 'boolean' }
        },
        required: ['id', 'description'],
        additionalProperties: false
      }
    }
  },
  required: ['tasks'],
  additionalProperties: false
};
const validateAiFile = ajv.compile(aiFileSchema);

function init() {
  const fileInput = document.getElementById(FILE_INPUT_ID);
  if (!fileInput) return;
  fileInput.addEventListener('change', onFileChange);
}

function onFileChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
    input.value = '';
    return;
  }
  const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
  if (!isJson) {
    alert('Please select a valid JSON file.');
    input.value = '';
    return;
  }
  if (typeof FileReader === 'undefined') {
    alert('FileReader API is not supported in your browser.');
    return;
  }
  const reader = new FileReader();
  reader.onload = onFileLoad;
  reader.onerror = onFileError;
  reader.readAsText(file);
}

function onFileLoad(event) {
  const result = event.target && event.target.result;
  let data;
  try {
    data = JSON.parse(result);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    alert('Invalid JSON file. Please upload a valid AI file.');
    return;
  }
  if (typeof data !== 'object' || data === null) {
    alert('Invalid file content. Expected an object.');
    return;
  }
  if (!validateAiFile(data)) {
    console.error('Schema validation errors:', validateAiFile.errors);
    alert('Invalid AI file structure. Please upload a compatible file.');
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to sessionStorage:', error);
    alert('Could not save file data.');
    return;
  }
  emitter.dispatchEvent(new CustomEvent('ai-file-added', { detail: data }));
  const fileInput = document.getElementById(FILE_INPUT_ID);
  if (fileInput) fileInput.value = '';
}

function onFileError(event) {
  console.error('File read error:', event);
  alert('Error reading file. Please try again.');
}

export default { init, emitter };