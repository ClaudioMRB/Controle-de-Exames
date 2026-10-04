const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('examStore', {
  list: () => ipcRenderer.invoke('exams:list'),
  save: (exam) => ipcRenderer.invoke('exams:save', exam),
  delete: (id) => ipcRenderer.invoke('exams:delete', id),
  export: () => ipcRenderer.invoke('exams:export'),
  import: () => ipcRenderer.invoke('exams:import'),
  getFooter: () => ipcRenderer.invoke('footer:get'),
  saveFooter: (footer) => ipcRenderer.invoke('footer:save', footer)
});