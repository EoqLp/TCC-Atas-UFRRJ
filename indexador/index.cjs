const express = require('express');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const port = 3000;

const pastaDocs = process.env.DOCS_PATH || path.join(process.cwd(), 'docs');
if (!fs.existsSync(pastaDocs)) {
  fs.mkdirSync(pastaDocs, { recursive: true });
}

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

// ── Extrai data do nome do arquivo (ex: "ata_marco_2026.pdf" → "2026-03-01") ──
function extrairDataDoNome(nome) {
  const mesesPT = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02',
    mar: '03', marco: '03', abr: '04', abril: '04',
    mai: '05', maio: '05', jun: '06', junho: '06',
    jul: '07', julho: '07', ago: '08', agosto: '08',
    set: '09', setembro: '09', out: '10', outubro: '10',
    nov: '11', novembro: '11', dez: '12', dezembro: '12'
  };

  // Normaliza: minúsculas, sem acento, sem extensão
  const n = nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.[^/.]+$/, '');

  // Padrão: YYYY-MM ou YYYY_MM
  let m = n.match(/(\d{4})[-_](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-01`;

  // Padrão: nome do mês (mais longo primeiro para evitar match parcial)
  const nomesMeses = Object.keys(mesesPT).sort((a, b) => b.length - a.length);
  for (const mes of nomesMeses) {
    const idx = n.indexOf(mes);
    if (idx === -1) continue;
    const depois = n.slice(idx).match(/(\d{4})/);
    if (depois) return `${depois[1]}-${mesesPT[mes]}-01`;
    const antes = n.slice(0, idx).match(/(\d{4})/);
    if (antes) return `${antes[1]}-${mesesPT[mes]}-01`;
  }

  return null;
}

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
              titulo:  { type: 'text' },
              conteudo: { type: 'text' },
              data:    { type: 'date' },
              dataAta: { type: 'date', format: 'yyyy-MM-dd' }
            }
          }
        }
      });
    } else {
      // Adiciona o campo dataAta caso o índice já exista sem ele
      try {
        await es.indices.putMapping({
          index: indice,
          body: { properties: { dataAta: { type: 'date', format: 'yyyy-MM-dd' } } }
        });
      } catch (_) {}
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

      const dataAta = extrairDataDoNome(arquivo);

      await es.index({
        index: indice,
        body: {
          titulo: arquivo,
          conteudo,
          data: new Date(),
          ...(dataAta && { dataAta })
        }
      });
      console.log(`> ${arquivo} enviado${dataAta ? ` (data: ${dataAta})` : ''}.`);
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
  let pergunta   = req.query.q          || '';
  const deptoNome  = req.query.depto_nome  || '';
  const deptoSigla = req.query.depto_sigla || '';
  const dataInicio = req.query.de          || ''; // YYYY-MM
  const dataFim    = req.query.ate         || ''; // YYYY-MM

  const temAlgumFiltro = pergunta || deptoNome || deptoSigla || dataInicio || dataFim;
  if (!temAlgumFiltro) {
    return res.status(400).json({ erro: 'Nenhum critério de busca informado.' });
  }

  try {
    if (pergunta) {
      pergunta = pergunta
        .replace(/&#x2F;/g, '/')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
    }

    const boolQuery = {};

    // MUST — texto geral
    if (pergunta) {
      boolQuery.must = [{ match: { conteudo: pergunta } }];
    }

    // SHOULD — nome OU sigla do departamento (busca OR)
    if (deptoNome || deptoSigla) {
      boolQuery.should = [];
      if (deptoNome)  boolQuery.should.push({ match_phrase: { conteudo: deptoNome } });
      if (deptoSigla) boolQuery.should.push({ match: { conteudo: deptoSigla } });
      // minimum_should_match garante que pelo menos uma das cláusulas should case
      boolQuery.minimum_should_match = 1;
    }

    // FILTER — intervalo de datas (não afeta score, só filtra)
    if (dataInicio || dataFim) {
      const range = {};
      if (dataInicio) {
        range.gte = `${dataInicio}-01`;
      }
      if (dataFim) {
        const [ano, mes] = dataFim.split('-');
        const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        range.lte = `${dataFim}-${String(ultimoDia).padStart(2, '0')}`;
      }
      boolQuery.filter = [{ range: { dataAta: range } }];
    }

    // ─── DUMP LIMPO DA QUERY EXIBIDO NO CMD ─────────────────────────────
    console.log("\n--- ELASTICSEARCH QUERY DUMP ---");
    console.log(JSON.stringify({ query: { bool: boolQuery } }, null, 2));
    console.log("--------------------------------\n");
    // ───────────────────────────────────────────────────────────────────

    const resultado = await es.search({
      index: indice,
      body: {
        query: { bool: boolQuery },
        highlight: {
          fields: {
            conteudo: {
              type: 'plain',
              fragment_size: 250,
              number_of_fragments: 1
            }
          }
        },
        size: 3
      }
    });

    const hits = (resultado.body && resultado.body.hits)
      ? resultado.body.hits.hits
      : (resultado.hits ? resultado.hits.hits : []);

    const respostas = hits.map(doc => {
      let trechoFinal = '';
      const source = doc._source || {};

      if (doc.highlight && doc.highlight.conteudo && doc.highlight.conteudo.length > 0) {
        trechoFinal = doc.highlight.conteudo[0];
      } else if (source.conteudo) {
        trechoFinal = source.conteudo.substring(0, 400);
      } else {
        trechoFinal = 'Trecho não disponível';
      }

      return {
        titulo: source.titulo || 'Ata_Sem_Nome.pdf',
        trecho: trechoFinal,
        score: doc._score
      };
    });

    res.json(respostas);
  } catch (erro) {
    console.error('Erro na busca:', erro.message);
    res.status(500).json({ erro: 'Erro ao processar busca', detalhes: erro.message });
  }
});

app.listen(port, () => {
  console.log(`Indexador rodando na porta: ${port}`);
});