// index.cjs — CommonJS (ajustado para ES 8.x, TLS/CA, DOCS_PATH default)
const express = require('express');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// DOCS_PATH padrão ./docs (se não setado)
const pastaDocs = process.env.DOCS_PATH || path.join(process.cwd(), 'docs');
if (!fs.existsSync(pastaDocs)) {
  fs.mkdirSync(pastaDocs, { recursive: true });
  console.log(`Pasta de documentos criada em: ${pastaDocs} (coloque PDFs/arquivos aqui)`);
}

const indice = process.env.INDEX_NAME || 'documentos';

// configurações TLS / CA
const caPath = process.env.ELASTIC_CA_PATH || path.join(process.cwd(), 'http_ca.crt');
let tlsOptions = {};
if (fs.existsSync(caPath)) {
  try {
    tlsOptions.ca = fs.readFileSync(caPath);
    tlsOptions.rejectUnauthorized = true;
    console.log(`Usando CA em: ${caPath}`);
  } catch (err) {
    console.warn('Erro lendo CA file, ca não será usada:', err.message);
    tlsOptions.rejectUnauthorized = false;
  }
} else {
  // Em dev, para Docker ES 8.x com certificado autoassinado, permitir (mas avisar)
  tlsOptions.rejectUnauthorized = false;
  console.warn('CA não encontrada em', caPath, '- usando rejectUnauthorized: false (apenas DEV)');
}

// node URL (favor usar https:// para ES 8.x)
const nodeUrl = process.env.ELASTIC_URL || 'https://localhost:9200';

// credenciais
const esUser = process.env.ELASTIC_USER || 'elastic';
const esPass = process.env.ELASTIC_PASS || process.env.ELASTIC_PASSWORD || '123456';

const es = new Client({
  node: nodeUrl,
  auth: { username: esUser, password: esPass },
  tls: tlsOptions,
  sniffOnStart: false,
  sniffInterval: false,
  sniffOnConnectionFault: false,
  maxRetries: 3,
  requestTimeout: 60000
});

async function ensureIndex() {
  try {
    const existsRes = await es.indices.exists({ index: indice });
    // diferentes versões retornam boolean ou { body: boolean }
    const exists = (typeof existsRes === 'boolean' ? existsRes : (existsRes && existsRes.body)) || false;
    if (!exists) {
      await es.indices.create({
        index: indice,
        body: {
          mappings: {
            properties: {
              titulo: { type: 'text' },
              conteudo: { type: 'text' },
              data: { type: 'date' }
            }
          }
        }
      });
      console.log(`Índice criado: ${indice}`);
    } else {
      console.log(`Índice já existe: ${indice}`);
    }
  } catch (err) {
    console.error('Erro ao checar/criar índice:', err.message || err);
    throw err;
  }
}

async function lerConteudoArquivo(caminho) {
  const ext = path.extname(caminho).toLowerCase();
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(caminho);
    try {
      // pdf-parse normalmente funciona com Buffer
      const data = await pdf(buffer);
      return (data && data.text) ? String(data.text).trim() : '';
    } catch (err) {
      console.warn(`pdf-parse falhou para ${caminho}:`, err.message || err);
      // fallback: retorna vazio (pode implementar OCR aqui depois)
      return '';
    }
  }
  // outros tipos de arquivo simples
  try {
    return fs.readFileSync(caminho, 'utf8');
  } catch (err) {
    console.warn(`Não foi possível ler ${caminho}:`, err.message || err);
    return '';
  }
}

async function indexarArquivos() {
  if (!pastaDocs) throw new Error('DOCS_PATH não definido no .env (ou default ./docs)');

  await ensureIndex();

  const arquivos = fs.readdirSync(pastaDocs);
  for (const arquivo of arquivos) {
    const caminho = path.join(pastaDocs, arquivo);
    try {
      if (!fs.lstatSync(caminho).isFile()) continue;
    } catch (err) {
      console.warn('Erro ao checar arquivo:', arquivo, err.message || err);
      continue;
    }

    try {
      console.log(`Processando: ${arquivo}`);
      const conteudo = await lerConteudoArquivo(caminho);
      if (!conteudo || conteudo.trim().length === 0) {
        console.log(`Pulando (sem texto extraído): ${arquivo}`);
        continue;
      }

      await es.index({
        index: indice,
        document: { titulo: arquivo, conteudo, data: new Date() }
      });
      console.log(`Indexado: ${arquivo}`);
    } catch (err) {
      console.error(`Erro ao indexar ${arquivo}:`, err.message || err);
    }
  }

  try {
    await es.indices.refresh({ index: indice });
  } catch (err) {
    console.warn('Refresh do índice falhou:', err.message || err);
  }
  console.log('Indexação concluída.');
}

app.all('/indexar', async (_req, res) => {
  try {
    await indexarArquivos();
    res.json({ status: 'ok', message: 'Documentos indexados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err && err.message) || String(err) });
  }
});

app.get('/', (_req, res) => res.send('API Indexador Elastic rodando...'));

app.get('/buscar', async (req, res) => {

  const pergunta = req.query.q;

  if (!pergunta) {
    return res.status(400).json({ erro: "Informe uma pergunta" });
  }

  try {

    const resultado = await es.search({
      index: indice,
      query: {
        match: {
          conteudo: pergunta
        }
      },
      size: 3
    });

    const respostas = resultado.hits.hits.map(doc => ({
      titulo: doc._source.titulo,
      trecho: doc.highlight?.conteudo
        ? doc.highlight.conteudo[0]
        : doc._source.conteudo.substring(0, 400)
    }));

    res.json(respostas);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro na busca" });
  }

});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
