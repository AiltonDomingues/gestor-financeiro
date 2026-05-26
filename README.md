# Gestor Financeiro

App desktop de finanças pessoais. Construído com Tauri + React + SQLite.

## Desenvolvimento

```bash
cd frontend
npm install
npm run tauri:dev
```

Abre o app com hot-reload. Alterações no frontend aparecem automaticamente.

## Produção (gerar instalador)

```bash
cd frontend
npm run tauri:build
```

Os instaladores ficam em:
- `src-tauri/target/release/bundle/nsis/Gestor Financeiro_x.x.x_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/Gestor Financeiro_x.x.x_x64_en-US.msi`

Para instalar direto pelo prompt após o build:

```powershell
Start-Process "src-tauri\target\release\bundle\nsis\Gestor Financeiro_0.1.0_x64-setup.exe" -Wait:$false
```
