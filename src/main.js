const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const dataFile = () => path.join(app.getPath('userData'), 'exames.json');
const footerFile = () => path.join(app.getPath('userData'), 'rodape.json');
const defaultFooter = {
  name: 'Espaço Taty Fukuda',
  addressLine1: 'Av. João Palácio, 300 · Shopping Mestre Álvaro · Bloco A, Salas 510/511',
  addressLine2: 'Eurico Salles · Serra – ES · CEP 29160-161',
  contact: 'Tel. (27) 3211-0606 · Cel. (27) 99877-7856 · espacopole@hotmail.com'
};

async function readFooter() {
  try {
    const content = await fs.readFile(footerFile(), 'utf8');
    const footer = JSON.parse(content);
    if (!footer || typeof footer !== 'object' || Array.isArray(footer)) {
      throw new Error('O arquivo do rodapé não tem o formato esperado.');
    }
    return Object.fromEntries(Object.entries(defaultFooter).map(([key, defaultValue]) => [
      key,
      typeof footer[key] === 'string' ? footer[key] : defaultValue
    ]));
  } catch (error) {
    if (error.code === 'ENOENT') return { ...defaultFooter };
    throw error;
  }
}

async function writeFooter(footer) {
  const values = Object.fromEntries(Object.keys(defaultFooter).map((key) => {
    const value = footer?.[key];
    if (typeof value !== 'string' || value.length > 200) {
      throw new Error('Revise os campos do rodapé: cada campo deve ter até 200 caracteres.');
    }
    return [key, value.trim()];
  }));
  const file = footerFile();
  const temporaryFile = `${file}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(temporaryFile, JSON.stringify(values, null, 2), 'utf8');
  await fs.rename(temporaryFile, file);
  return values;
}

async function readExams() {
  try {
    const content = await fs.readFile(dataFile(), 'utf8');
    const exams = JSON.parse(content);
    if (!Array.isArray(exams)) throw new Error('O arquivo de dados não tem o formato esperado.');
    return exams;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeExams(exams) {
  const file = dataFile();
  const temporaryFile = `${file}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(temporaryFile, JSON.stringify(exams, null, 2), 'utf8');
  await fs.rename(temporaryFile, file);
}

ipcMain.handle('exams:list', readExams);
ipcMain.handle('footer:get', readFooter);
ipcMain.handle('footer:save', (_event, footer) => writeFooter(footer));

ipcMain.handle('exams:export', async () => {
  const exams = await readExams();
  const result = await dialog.showSaveDialog({
    title: 'Exportar catálogo de exames',
    defaultPath: 'catalogo-de-exames.json',
    filters: [{ name: 'Arquivo JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const backup = {
    format: 'catalogo-de-exames',
    version: 1,
    exportedAt: new Date().toISOString(),
    exams: exams.map(({ code, description }) => ({ code, description }))
  };
  await fs.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
  return { canceled: false, count: exams.length };
});

ipcMain.handle('exams:import', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar catálogo de exames',
    properties: ['openFile'],
    filters: [{ name: 'Arquivo JSON', extensions: ['json'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const content = await fs.readFile(result.filePaths[0], 'utf8');
  let backup;
  try {
    backup = JSON.parse(content);
  } catch {
    throw new Error('O arquivo selecionado não contém um JSON válido.');
  }
  if (backup?.format !== 'catalogo-de-exames' || backup.version !== 1 || !Array.isArray(backup.exams)) {
    throw new Error('O arquivo não é uma exportação válida do Catálogo de Exames.');
  }

  const importedExams = backup.exams.map((exam) => ({
    code: String(exam?.code ?? '').trim(),
    description: String(exam?.description ?? '').trim()
  }));
  if (importedExams.some((exam) => !exam.code || !exam.description)) {
    throw new Error('O arquivo contém exames sem código ou descrição. Nenhum dado foi importado.');
  }

  const exams = await readExams();
  const existingCodes = new Set(exams.map((exam) => String(exam.code).toLocaleLowerCase('pt-BR')));
  let added = 0;
  for (const exam of importedExams) {
    const normalizedCode = exam.code.toLocaleLowerCase('pt-BR');
    if (existingCodes.has(normalizedCode)) continue;
    existingCodes.add(normalizedCode);
    exams.push({ id: crypto.randomUUID(), ...exam });
    added += 1;
  }

  if (added > 0) await writeExams(exams);
  return { canceled: false, added, ignored: importedExams.length - added };
});

ipcMain.handle('exams:save', async (_event, exam) => {
  const code = String(exam?.code ?? '').trim();
  const description = String(exam?.description ?? '').trim();
  if (!code || !description) throw new Error('Preencha o código e a descrição.');

  const exams = await readExams();
  const editingIndex = exams.findIndex((item) => item.id === exam.id);
  const duplicate = exams.some((item, index) =>
    index !== editingIndex && item.code.toLocaleLowerCase('pt-BR') === code.toLocaleLowerCase('pt-BR')
  );
  if (duplicate) throw new Error('Já existe um exame cadastrado com esse código.');

  const savedExam = {
    id: editingIndex >= 0 ? exams[editingIndex].id : crypto.randomUUID(),
    code,
    description
  };
  if (editingIndex >= 0) exams[editingIndex] = savedExam;
  else exams.push(savedExam);

  await writeExams(exams);
  return exams;
});

ipcMain.handle('exams:delete', async (_event, id) => {
  const exams = await readExams();
  const remaining = exams.filter((exam) => exam.id !== id);
  if (remaining.length === exams.length) throw new Error('Este exame não foi encontrado.');
  await writeExams(remaining);
  return remaining;
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#f5f7f4',
    title: 'Catálogo de Exames',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});