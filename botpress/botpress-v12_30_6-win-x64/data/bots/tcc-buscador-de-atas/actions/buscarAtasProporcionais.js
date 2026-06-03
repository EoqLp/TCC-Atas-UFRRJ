/**
 * @title Busca Atas com Ranking %
 * @category Custom
 */
const axios = require('axios')

const buscarAtasProporcionais = async () => {
  const sess = event.state.session

  const queryRaw  = sess.queryConsolidada || ''
  const deptoNome = sess.deptoNome  || ''
  const deptoSigla = sess.deptoSigla || ''
  const dataInicio = sess.dataInicio || ''
  const dataFim    = sess.dataFim    || ''

  const temFiltros = queryRaw || deptoNome || deptoSigla || dataInicio || dataFim
  if (!temFiltros) return (temp.encontrou = false)

  // NFD + strip diacríticos para que "João" e "joao" sejam equivalentes
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const termosBusca = queryRaw ? normalize(queryRaw).match(/\w+/g) || [] : []
  const totalTermos = termosBusca.length

  try {
    // Monta params — URLSearchParams codifica os valores automaticamente
    const params = new URLSearchParams()
    if (queryRaw)   params.set('q', queryRaw)
    if (deptoNome)  params.set('depto_nome', deptoNome)
    if (deptoSigla) params.set('depto_sigla', deptoSigla)
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim)    params.set('ate', dataFim)

    const url = `http://localhost:3000/buscar?${params.toString()}`
    const { data } = await axios.get(url, { timeout: 5000 })

    if (data && data.length > 0) {
      const maxEsScore = data[0].score || 1

      const resultadosRanking = data.map(ata => {
        const textoNorm = normalize(ata.titulo + ' ' + ata.trecho)

        const termosEncontrados = totalTermos > 0
          ? termosBusca.filter(termo => textoNorm.includes(termo)).length
          : 0

        const percentual = totalTermos > 0
          ? ((termosEncontrados / totalTermos) * 100).toFixed(1)
          : null

        const esPercentual = ata.score != null
          ? ((ata.score / maxEsScore) * 100).toFixed(1)
          : null

        return {
          titulo: ata.titulo,
          percentual,
          esPercentual,
          resumo: ata.trecho.substring(0, 150) + '...'
        }
      })

      // Ordena por % proporcional (quando disponível) ou por esPercentual
      temp.topAtas = resultadosRanking
        .sort((a, b) => {
          const pA = a.percentual != null ? parseFloat(a.percentual) : parseFloat(a.esPercentual || 0)
          const pB = b.percentual != null ? parseFloat(b.percentual) : parseFloat(b.esPercentual || 0)
          return pB - pA
        })
        .slice(0, 3)

      temp.encontrou = true
    } else {
      temp.encontrou = false
    }
  } catch (err) {
    console.error('Erro na busca proporcional:', err.message)
    temp.encontrou = false
  }
}

return buscarAtasProporcionais()
