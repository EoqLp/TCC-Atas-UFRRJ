const express = require('express');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

// Ignora erro de certificado autoassinado para o ambiente de desenvolvimento
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
// PORTA DEFINIDA COMO 3000 PARA O INDEXADOR
const port = 3000;

const pastaDocs = process.env.DOCS_PATH || path.join(process.cwd(), 'docs');
if (!fs.existsSync(pastaDocs)) {
  fs.mkdirSync(pastaDocs, { recursive: true });
}

// CONFIGURAÇÃO PARA SERVIR OS ARQUIVOS PDF FISICAMENTE
// Isso permite acessar a ata via: http://localhost:3000/arquivos/NOME_DO_ARQUIVO.pdf
app.use('/arquivos', express.static(pastaDocs));

const indice = process.env.INDEX_NAME || 'documentos';

const caPath = process.env.ELASTIC_CA_PATH || path.join(process.cwd(), 'http_ca.crt');
let tlsOptions = { rejectUnauthorized: false };

if (fs.existsSync(caPath)) {
  try {
    tlsOptions.ca = fs.readFileSync(caPath);
    tlsOptions.rejectUnauthorized = true;
  } catch (err) {
    tlsOptions.rejectUnauthorized = false;
  }
}

const nodeUrl = process.env.ELASTIC_URL || 'https://localhost:9200';
const esUser = process.env.ELASTIC_USER || 'elastic';
const esPass = process.env.ELASTIC_PASS || process.env.ELASTIC_PASSWORD || '123456';

const es = new Client({
  node: nodeUrl,
  auth: { username: esUser, password: esPass },
  tls: tlsOptions,
  maxRetries: 3,
  requestTimeout: 60000,
  enableMetaHeader: true
});

async function ensureIndex() {
  try {
    const existsRes = await es.indices.exists({ index: indice });
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
    }
  } catch (err) {
    console.error('Falha ao validar o índice:', err.message);
    throw err;
  }
}

async function lerConteudoArquivo(caminho) {
  const ext = path.extname(caminho).toLowerCase();
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(caminho);
    try {
      const data = await pdf(buffer);
      return (data && data.text) ? String(data.text).trim() : '';
    } catch (err) {
      return '';
    }
  }
  try {
    return fs.readFileSync(caminho, 'utf8');
  } catch (err) {
    return '';
  }
}

async function indexarArquivos() {
  await ensureIndex();
  const arquivos = fs.readdirSync(pastaDocs);
  for (const arquivo of arquivos) {
    const caminho = path.join(pastaDocs, arquivo);
    try {
      if (!fs.lstatSync(caminho).isFile()) continue;
      const conteudo = await lerConteudoArquivo(caminho);
      if (!conteudo) continue;

      await es.index({
        index: indice,
        body: { titulo: arquivo, conteudo, data: new Date() }
      });
      console.log(`> ${arquivo} enviado.`);
    } catch (err) {
      console.error(`Erro no arquivo ${arquivo}:`, err.message);
    }
  }
  await es.indices.refresh({ index: indice });
}

app.all('/indexar', async (_req, res) => {
  try {
    await indexarArquivos();
    res.json({ status: 'sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/', (_req, res) => res.send('Indexador Ativo na Porta 3000'));

app.get('/buscar', async (req, res) => {
  let pergunta = req.query.q;

  if (!pergunta) {
    return res.status(400).json({ erro: "Cade a pergunta?" });
  }

  try {
    // LIMPEZA: Traduz caracteres especiais que o Botpress envia
    pergunta = pergunta
      .replace(/&#x2F;/g, '/')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

    const resultado = await es.search({
      index: indice,
      body: {
        query: {
          match: { conteudo: pergunta }
        },
        highlight: {
          fields: { 
            conteudo: {
              "type": "plain",
              "fragment_size": 250,
              "number_of_fragments": 1
            } 
          }
        },
        size: 3
      }
    });

    const hits = (resultado.body && resultado.body.hits) ? resultado.body.hits.hits : 
                 (resultado.hits ? resultado.hits.hits : []);

    const respostas = hits.map(doc => {
      let trechoFinal = '';
      const source = doc._source || {};
      
      if (doc.highlight && doc.highlight.conteudo && doc.highlight.conteudo.length > 0) {
        trechoFinal = doc.highlight.conteudo[0];
      } else if (source.conteudo) {
        trechoFinal = source.conteudo.substring(0, 400);
      } else {
        trechoFinal = "Trecho não disponível";
      }

      return {
        titulo: source.titulo || 'Ata_Sem_Nome.pdf',
        trecho: trechoFinal
      };
    });

    res.json(respostas);
  } catch (erro) {
    console.error('Erro na busca:', erro.message);
    res.status(500).json({ erro: "Erro ao processar busca", detalhes: erro.message });
  }
});

app.listen(port, () => {
  console.log(`Indexador rodando na porta: ${port}`);
});