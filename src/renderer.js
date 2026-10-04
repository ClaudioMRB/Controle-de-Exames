const listElement = document.querySelector('#exam-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search');
const examDialog = document.querySelector('#exam-dialog');
const examForm = document.querySelector('#exam-form');
const confirmDialog = document.querySelector('#confirm-dialog');
const toast = document.querySelector('#toast');
const examOptions = document.querySelector('#exam-options');
const selectedExamsElement = document.querySelector('#selected-exams');

let exams = [];
let pendingDeleteId = null;
let toastTimer;
const selectedExamOccurrences = [];
document.querySelector('#order-date').value = localDateInputValue(new Date());

const editIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12.8 4.2 3 3M4 16l3.2-.7 8.4-8.4a1.4 1.4 0 0 0-2-2l-8.4 8.4L4 16Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const deleteIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 6h11m-9.8 0 .6 9.2c.1.8.7 1.3 1.5 1.3h4.4c.8 0 1.4-.5 1.5-1.3l.6-9.2M8 6V4.7c0-.7.6-1.2 1.3-1.2h1.4c.7 0 1.3.5 1.3 1.2V6m-4 2.5.3 5m3.4-5-.3 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderExams() {
  const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = exams
    .filter((exam) => `${exam.code} ${exam.description}`.toLocaleLowerCase('pt-BR').includes(query))
    .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true, sensitivity: 'base' }));

  document.querySelector('#exam-count').textContent = exams.length;
  document.querySelector('#result-count').textContent = query
    ? `Mostrando ${filtered.length} de ${exams.length} exames`
    : `Mostrando ${filtered.length} exames`;
  listElement.innerHTML = filtered.map((exam) => `
    <tr>
      <td class="code-cell">${escapeHtml(exam.code)}</td>
      <td class="description-cell" title="${escapeHtml(exam.description)}">${escapeHtml(exam.description)}</td>
      <td class="actions-cell"><span class="row-actions">
        <button class="icon-button edit-action" type="button" data-action="edit" data-id="${escapeHtml(exam.id)}" aria-label="Editar ${escapeHtml(exam.code)}" title="Editar">${editIcon}</button>
        <button class="icon-button delete-action" type="button" data-action="delete" data-id="${escapeHtml(exam.id)}" aria-label="Excluir ${escapeHtml(exam.code)}" title="Excluir">${deleteIcon}</button>
      </span></td>
    </tr>`).join('');

  const showEmpty = filtered.length === 0;
  emptyState.hidden = !showEmpty;
  document.querySelector('table').hidden = showEmpty;
  document.querySelector('#empty-title').textContent = query ? 'Nenhum resultado encontrado' : 'Sua lista começa aqui';
  document.querySelector('#empty-copy').textContent = query
    ? 'Tente buscar por outro código ou descrição.'
    : 'Cadastre o primeiro exame para manter seus códigos à mão.';
  document.querySelector('#empty-add').hidden = Boolean(query);
}

function renderExamOptions() {
  const query = document.querySelector('#recipe-search').value.trim().toLocaleLowerCase('pt-BR');
  const available = exams.filter((exam) =>
    `${exam.code} ${exam.description}`.toLocaleLowerCase('pt-BR').includes(query)
  );

  if (exams.length === 0) {
    examOptions.innerHTML = '<p class="picker-empty">O catálogo ainda está vazio.</p>';
  } else if (available.length === 0) {
    examOptions.innerHTML = '<p class="picker-empty">Nenhum exame encontrado.</p>';
  } else {
    examOptions.innerHTML = available.map((exam) => `
      <div class="exam-option">
        <span class="option-copy"><span class="option-code">${escapeHtml(exam.code)}</span><span class="option-description">${escapeHtml(exam.description)}</span></span>
        <button class="button button-secondary option-add" type="button" data-exam-id="${escapeHtml(exam.id)}" aria-label="Adicionar ${escapeHtml(exam.code)} à receita">Adicionar</button>
      </div>`).join('');
  }

  renderSelectedExamOccurrences();
}

function renderSelectedExamOccurrences() {
  const selectedCount = selectedExamOccurrences.length;
  document.querySelector('#selected-count').textContent = selectedCount === 0
    ? 'Nenhum exame adicionado'
    : `${selectedCount} ${selectedCount === 1 ? 'ocorrência adicionada' : 'ocorrências adicionadas'}`;

  selectedExamsElement.innerHTML = selectedExamOccurrences.map((occurrence, index) => {
    const exam = exams.find((item) => item.id === occurrence.examId);
    if (!exam) return '';
    return `
      <div class="selected-exam">
        <div class="selected-exam-heading">
          <span class="option-copy"><span class="option-code">${escapeHtml(exam.code)}</span><span class="option-description">${escapeHtml(exam.description)}</span></span>
          <button class="icon-button remove-occurrence" type="button" data-occurrence-id="${escapeHtml(occurrence.id)}" aria-label="Remover ocorrência ${index + 1}" title="Remover">×</button>
        </div>
        <label class="visually-hidden" for="occurrence-note-${escapeHtml(occurrence.id)}">Observação para ${escapeHtml(exam.code)}, ocorrência ${index + 1}</label>
        <textarea class="occurrence-note" id="occurrence-note-${escapeHtml(occurrence.id)}" data-occurrence-id="${escapeHtml(occurrence.id)}" rows="2" maxlength="300" placeholder="Observação específica desta ocorrência">${escapeHtml(occurrence.note)}</textarea>
      </div>`;
  }).join('');
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

function formatLongDate(dateValue) {
  if (!dateValue) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function localDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateRecipePreview() {
  const patientName = document.querySelector('#patient-name').value.trim();
  const patientDocument = document.querySelector('#patient-document').value.trim();
  const selected = selectedExamOccurrences
    .map((occurrence) => ({ ...occurrence, exam: exams.find((exam) => exam.id === occurrence.examId) }))
    .filter((occurrence) => occurrence.exam)
    .sort((a, b) => a.exam.code.localeCompare(b.exam.code, 'pt-BR', { numeric: true, sensitivity: 'base' }));

  document.querySelector('#print-patient-name').textContent = patientName || 'Nome do paciente';
  document.querySelector('#print-patient-meta').textContent = patientDocument ? `CPF: ${patientDocument}` : '';
  document.querySelector('#paper-exam-list').innerHTML = selected.map(({ exam, note }) =>
    `<li><span class="paper-code">${escapeHtml(exam.code)}</span><span class="paper-exam-copy"><span>${escapeHtml(exam.description)}</span>${note.trim() ? `<span class="paper-occurrence-note">${escapeHtml(note.trim())}</span>` : ''}</span></li>`
  ).join('');
  document.querySelector('#paper-empty').hidden = selected.length > 0;
  document.querySelector('#paper-exam-list').hidden = selected.length === 0;
  document.querySelector('#paper-indication').textContent = document.querySelector('#clinical-indication').value.trim();
  const orderDate = formatLongDate(document.querySelector('#order-date').value);
  document.querySelector('#paper-date').textContent = orderDate ? `Serra, ${orderDate}` : '';
  document.querySelector('#print-professional-name').textContent = document.querySelector('#professional-name').value.trim();
  const crm = document.querySelector('#professional-crm').value.trim();
  document.querySelector('#print-professional-crm').textContent = crm ? `CRM ${crm}` : '';
  const footerFields = [
    ['footer-name', 'print-footer-name'],
    ['footer-address-line-1', 'print-footer-address-line-1'],
    ['footer-address-line-2', 'print-footer-address-line-2'],
    ['footer-contact', 'print-footer-contact']
  ];
  footerFields.forEach(([inputId, printId]) => {
    const value = document.querySelector(`#${inputId}`).value.trim();
    const printElement = document.querySelector(`#${printId}`);
    printElement.textContent = value;
    printElement.hidden = !value;
  });
  document.querySelector('#recipe-print').classList.toggle('dense', selected.length > 13);
}

function showView(viewId) {
  document.querySelectorAll('.app-view').forEach((view) => { view.hidden = view.id !== viewId; });
  document.querySelectorAll('.workspace-tab').forEach((tab) => {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (viewId === 'recipe-view') {
    renderExamOptions();
    updateRecipePreview();
  }
}

function openForm(exam = null) {
  examForm.reset();
  document.querySelector('#exam-id').value = exam?.id ?? '';
  document.querySelector('#code').value = exam?.code ?? '';
  document.querySelector('#description').value = exam?.description ?? '';
  document.querySelector('#dialog-title').textContent = exam ? 'Editar exame' : 'Adicionar exame';
  document.querySelector('#dialog-kicker').textContent = exam ? 'EDITAR CADASTRO' : 'NOVO CADASTRO';
  document.querySelector('#save-exam').textContent = exam ? 'Salvar alterações' : 'Salvar exame';
  document.querySelector('#form-error').hidden = true;
  examDialog.showModal();
  document.querySelector('#code').focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

async function loadExams() {
  try {
    exams = await window.examStore.list();
    renderExams();
    renderExamOptions();
    updateRecipePreview();
  } catch (error) {
    showToast(`Não foi possível carregar os exames: ${error.message}`);
  }
}

async function loadFooter() {
  try {
    const footer = await window.examStore.getFooter();
    document.querySelector('#footer-name').value = footer.name;
    document.querySelector('#footer-address-line-1').value = footer.addressLine1;
    document.querySelector('#footer-address-line-2').value = footer.addressLine2;
    document.querySelector('#footer-contact').value = footer.contact;
    updateRecipePreview();
  } catch (error) {
    showToast(`Não foi possível carregar o rodapé: ${error.message}`);
  }
}

document.querySelector('#save-footer').addEventListener('click', async () => {
  const footer = {
    name: document.querySelector('#footer-name').value,
    addressLine1: document.querySelector('#footer-address-line-1').value,
    addressLine2: document.querySelector('#footer-address-line-2').value,
    contact: document.querySelector('#footer-contact').value
  };
  try {
    await window.examStore.saveFooter(footer);
    updateRecipePreview();
    showToast('Rodapé salvo com sucesso.');
  } catch (error) {
    showToast(`Não foi possível salvar o rodapé: ${error.message}`);
  }
});

document.querySelector('#add-exam').addEventListener('click', () => openForm());
document.querySelector('#empty-add').addEventListener('click', () => openForm());
document.querySelector('.close-dialog').addEventListener('click', () => examDialog.close());
document.querySelector('.cancel-dialog').addEventListener('click', () => examDialog.close());
document.querySelector('#cancel-delete').addEventListener('click', () => confirmDialog.close());
searchInput.addEventListener('input', renderExams);
document.querySelectorAll('.workspace-tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});
document.querySelector('#go-to-catalog').addEventListener('click', () => showView('catalog-view'));
document.querySelector('#recipe-search').addEventListener('input', renderExamOptions);
examOptions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-exam-id]');
  if (!button) return;
  selectedExamOccurrences.push({
    id: crypto.randomUUID(),
    examId: button.dataset.examId,
    note: ''
  });
  renderExamOptions();
  updateRecipePreview();
});
selectedExamsElement.addEventListener('input', (event) => {
  const textarea = event.target.closest('textarea[data-occurrence-id]');
  if (!textarea) return;
  const occurrence = selectedExamOccurrences.find((item) => item.id === textarea.dataset.occurrenceId);
  if (!occurrence) return;
  occurrence.note = textarea.value;
  updateRecipePreview();
});
selectedExamsElement.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-occurrence-id]');
  if (!button) return;
  const occurrenceIndex = selectedExamOccurrences.findIndex((item) => item.id === button.dataset.occurrenceId);
  if (occurrenceIndex < 0) return;
  selectedExamOccurrences.splice(occurrenceIndex, 1);
  renderExamOptions();
  updateRecipePreview();
});

['patient-name', 'patient-document', 'order-date', 'clinical-indication', 'professional-name', 'professional-crm',
  'footer-name', 'footer-address-line-1', 'footer-address-line-2', 'footer-contact']
  .forEach((id) => document.querySelector(`#${id}`).addEventListener('input', updateRecipePreview));

document.querySelector('#patient-document').addEventListener('input', (event) => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  event.target.value = digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    updateRecipePreview();
});

  document.querySelector('#export-exams').addEventListener('click', async () => {
    try {
      const result = await window.examStore.export();
      if (!result.canceled) showToast(`${result.count} ${result.count === 1 ? 'exame exportado' : 'exames exportados'}.`);
    } catch (error) {
      showToast(`Não foi possível exportar: ${error.message}`);
    }
  });
  document.querySelector('#import-exams').addEventListener('click', async () => {
    try {
      const result = await window.examStore.import();
      if (result.canceled) return;
      exams = await window.examStore.list();
      renderExams();
      renderExamOptions();
      updateRecipePreview();
      showToast(`Importação concluída: ${result.added} novos; ${result.ignored} já existentes ignorados.`);
    } catch (error) {
      showToast(`Não foi possível importar: ${error.message}`);
    }
  });
document.querySelector('#print-recipe').addEventListener('click', () => {
  const patientName = document.querySelector('#patient-name');
  if (!patientName.value.trim()) {
    showView('recipe-view');
    patientName.focus();
    showToast('Informe o nome do paciente antes de imprimir.');
    return;
  }
  const orderDate = document.querySelector('#order-date');
  if (!orderDate.value) {
    orderDate.focus();
    showToast('Informe a data do pedido antes de imprimir.');
    return;
  }
  if (selectedExamOccurrences.length === 0) {
    showToast('Adicione pelo menos um exame para imprimir.');
    return;
  }
  updateRecipePreview();
  window.print();
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !examDialog.open && !confirmDialog.open && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

examForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorElement = document.querySelector('#form-error');
  try {
    exams = await window.examStore.save({
      id: document.querySelector('#exam-id').value || undefined,
      code: document.querySelector('#code').value,
      description: document.querySelector('#description').value
    });
    examDialog.close();
    searchInput.value = '';
    renderExams();
    renderExamOptions();
    showToast('Exame salvo com sucesso.');
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
});

listElement.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const exam = exams.find((item) => item.id === button.dataset.id);
  if (!exam) return;
  if (button.dataset.action === 'edit') openForm(exam);
  if (button.dataset.action === 'delete') {
    pendingDeleteId = exam.id;
    document.querySelector('#confirm-description').textContent = `O exame ${exam.code} · ${exam.description} será removido permanentemente.`;
    confirmDialog.showModal();
  }
});

document.querySelector('#confirm-delete').addEventListener('click', async () => {
  try {
    const deletedId = pendingDeleteId;
    exams = await window.examStore.delete(deletedId);
    confirmDialog.close();
    pendingDeleteId = null;
    renderExams();
    for (let index = selectedExamOccurrences.length - 1; index >= 0; index -= 1) {
      if (selectedExamOccurrences[index].examId === deletedId) selectedExamOccurrences.splice(index, 1);
    }
    renderExamOptions();
    updateRecipePreview();
    showToast('Exame excluído.');
  } catch (error) {
    confirmDialog.close();
    showToast(`Não foi possível excluir: ${error.message}`);
  }
});

loadExams();
loadFooter();