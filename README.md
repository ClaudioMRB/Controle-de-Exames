# Catálogo de Exames

npm run dist

Aplicativo desktop para cadastrar, pesquisar, editar e excluir códigos e descrições de exames. Os dados são armazenados localmente no perfil do usuário do Windows.

O catálogo pode ser exportado e importado em JSON pela tela principal. A importação adiciona códigos novos e ignora códigos que já existem, sem substituir os cadastros atuais.

Na seção **Montar receita**, é possível incluir o mesmo exame mais de uma vez. Cada inclusão é independente e aceita uma observação própria, que também aparece na prévia e na impressão A4. O catálogo continua impedindo códigos duplicados.

A seção **Receita livre** oferece um modelo independente com texto editável, sem exigir paciente, data ou exames selecionados. Também é possível imprimir o modelo em branco para preencher à mão.

## Executar em desenvolvimento

Requer Node.js 20 ou superior.

```powershell
npm install
npm start
```

## Gerar instalador do Windows

```powershell
npm run dist
```

O instalador NSIS de 64 bits será criado na pasta `dist`. Durante a instalação, é possível escolher o diretório e criar atalhos na área de trabalho e no menu Iniciar.