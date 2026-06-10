
/**
 * @title Consolidar Dados para Busca
 * @category Custom
 */

// Normaliza string: minúsculas + remove acentos (usa escapes Unicode para garantir compatibilidade)
function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Tenta parsear "março 2026 a abril 2026", "03/2026 a 04/2026", etc.
// Retorna { inicio: 'YYYY-MM', fim: 'YYYY-MM' } ou null
function parsePeriodo(texto) {
  if (!texto) return null

  const mesesNum = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02',
    mar: '03', marco: '03', abr: '04', abril: '04',
    mai: '05', maio: '05', jun: '06', junho: '06',
    jul: '07', julho: '07', ago: '08', agosto: '08',
    set: '09', setembro: '09', out: '10', outubro: '10',
    nov: '11', novembro: '11', dez: '12', dezembro: '12'
  }

  const t = norm(texto).replace(/\bde\b/g, ' ').replace(/\s+/g, ' ').trim()

  // MM/YYYY a MM/YYYY
  let m = t.match(/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{4})/)
  if (m) return { inicio: `${m[2]}-${m[1]}`, fim: `${m[4]}-${m[3]}` }

  // YYYY-MM a YYYY-MM
  m = t.match(/(\d{4})-(\d{2})\s+a\s+(\d{4})-(\d{2})/)
  if (m) return { inicio: `${m[1]}-${m[2]}`, fim: `${m[3]}-${m[4]}` }

  // "março 2026 a abril 2026" | "março a abril de 2026"
  const nomes = Object.keys(mesesNum).sort((a, b) => b.length - a.length)
  const pat = nomes.join('|')
  const re = new RegExp(`(${pat})(?: (\\d{4}))? a (${pat})(?: (\\d{4}))?`)
  m = t.match(re)
  if (m) {
    const anoInicio = m[2] || m[4]
    const anoFim = m[4] || m[2]
    if (!anoInicio) return null
    return {
      inicio: `${anoInicio}-${mesesNum[m[1]]}`,
      fim: `${anoFim}-${mesesNum[m[3]]}`
    }
  }

  // Mês único: MM/YYYY, YYYY-MM ou "março 2026" / "março de 2026"
  m = t.match(/(\d{2})\/(\d{4})/)
  if (m) return { inicio: `${m[2]}-${m[1]}`, fim: `${m[2]}-${m[1]}` }

  m = t.match(/(\d{4})-(\d{2})/)
  if (m) return { inicio: `${m[1]}-${m[2]}`, fim: `${m[1]}-${m[2]}` }

  m = t.match(new RegExp(`(${pat}) (\\d{4})`))
  if (m) return { inicio: `${m[2]}-${mesesNum[m[1]]}`, fim: `${m[2]}-${mesesNum[m[1]]}` }

  return null
}

const consolidarDados = async () => {
  // Limpa resultados do turno anterior para evitar contaminação entre buscas
  session.queryConsolidada = ''
  session.deptoNome = null
  session.deptoSigla = null
  session.dataInicio = null
  session.dataFim = null

  const {
    nomeDepartamento, nomeDisciplina, nomeProfessores, periodo,
    nomeDiscentes, numeroProcessoEdital, termoProgressao, assuntosGerais
  } = session

  // ── Departamento: separar nome e sigla para busca OR no Elasticsearch ──
  let deptoNome = null
  let deptoSigla = null
  if (nomeDepartamento && nomeDepartamento.trim()) {
    const sep = nomeDepartamento.indexOf(' - ')
    if (sep !== -1) {
      deptoNome = nomeDepartamento.substring(0, sep).trim()
      deptoSigla = nomeDepartamento.substring(sep + 3).trim()
    } else {
      // usuário digitou sigla ou nome não reconhecido — busca como token único
      deptoNome = nomeDepartamento.trim()
    }
  }
  session.deptoNome = deptoNome
  session.deptoSigla = deptoSigla

  // ── Período: tentar parsear como intervalo (ou mês único) de datas ───
  let dataInicio = null
  let dataFim = null
  if (periodo && periodo.trim()) {
    const parsed = parsePeriodo(periodo)
    if (parsed) {
      dataInicio = parsed.inicio
      dataFim = parsed.fim
    } else {
      // Não deu para interpretar como data: vira assunto de busca livre
      session.assuntosGerais = [periodo, assuntosGerais].filter(val => val && val.trim() !== '').join(' ')
    }
  }
  session.dataInicio = dataInicio
  session.dataFim = dataFim

  // ── Query consolidada: usada apenas para o % de termos no ranking local ─
  const termosValidos = [
    nomeDisciplina,
    nomeProfessores,
    nomeDiscentes,
    numeroProcessoEdital,
    termoProgressao,
    session.assuntosGerais
  ].filter(val => val && val.trim() !== '')

  session.queryConsolidada = termosValidos.join(' ')

  console.log('Query texto:', session.queryConsolidada)
  console.log('Depto:', deptoNome, '|', deptoSigla)
  console.log('Período:', dataInicio, 'a', dataFim)
}

return consolidarDados()
