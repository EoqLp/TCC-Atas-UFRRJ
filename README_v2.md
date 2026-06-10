# 🛠️ Guia de Instalação do Indexador (v2)

Guia complementar ao `README.md`, focado em configurar o **Indexador Node.js** (`index.cjs` e `discord_bot.js`) em uma máquina nova do zero.

## ⚠️ Versão do Node.js

A pasta `indexador` precisa de **Node.js 20 LTS ou superior**.

- Node 12/14: erro `Cannot find module 'node:events'` (prefixo `node:` não suportado)
- Node 18 (< 20): erro `ReferenceError: File is not defined` ao usar `@elastic/elasticsearch` (depende de `undici`, que requer o global `File`, disponível só a partir do Node 20)

Baixe o instalador em https://nodejs.org/ e confira com:

```powershell
node -v
```

Se houver múltiplas versões instaladas (ex: `C:\node18`, `C:\node22`), use o caminho completo do executável:

```powershell
C:\node22\node.exe index.cjs
C:\node22\npm.cmd install <pacote>
```

## 📦 Instalação das dependências

A pasta `indexador` não possui `package.json`. Crie um do zero e instale as dependências usadas em `index.cjs` e `discord_bot.js`:

```powershell
cd indexador
npm init -y
npm install express pdf-parse @elastic/elasticsearch dotenv discord.js axios
```

## ▶️ Rodando os serviços

Sempre execute os comandos **dentro da pasta `indexador`**:

```powershell
cd C:\caminho\para\TCC-Atas-UFRRJ\indexador

# Servidor de indexação (porta 3000)
node index.cjs

# Bot do Discord
node discord_bot.js
```

## 🐛 Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `Cannot find module 'express'` | `npm install` não rodado | `npm install` na pasta `indexador` |
| `Cannot find module 'node:events'` | Node muito antigo (< 14.18) | Atualizar para Node 20 |
| `Cannot find module 'pdf-parse'` / `'discord.js'` / `'axios'` | Dependência faltando | `npm install <pacote>` |
| `ReferenceError: File is not defined` (em `undici`) | Node < 20 com `@elastic/elasticsearch` | Atualizar para Node 20+ |
| `Cannot find module 'C:\Users\<user>\node_modules\...'` | `node_modules` instalado na pasta errada (raiz do usuário) | Apagar o `node_modules` da raiz e reinstalar dentro de `indexador` |
| `Cannot find module 'C:\...\discord_bot.js'` | Comando rodado fora da pasta `indexador`, ou `node` passado como argumento extra | `cd indexador` e usar `node discord_bot.js` (sem repetir `node`) |
