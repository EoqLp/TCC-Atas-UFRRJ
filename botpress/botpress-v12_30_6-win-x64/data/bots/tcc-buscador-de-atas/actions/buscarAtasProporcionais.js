/**
 * @title Busca Atas com Ranking %
 * @category Custom
 * @author Gemini
 */
const axios = require('axios')

const buscarAtasProporcionais = async () => {
  const queryRaw = event.state.session.queryConsolidada
  if (!queryRaw) return (temp.encontrou = false)

  // Prepara os termos da query (minusculo e sem pontuação)
  const termosBusca = queryRaw.toLowerCase().match(/\w+/g) || []
  const totalTermos = termosBusca.length

  try {
    const url = `http://localhost:3000/buscar?q=${encodeURIComponent(queryRaw)}`
    const { data } = await axios.get(url, { timeout: 5000 })

    if (data && data.length > 0) {
      // Processa cada ata para calcular a porcentagem de palavras encontradas
      const resultadosRanking = data.map(ata => {
        const textoParaBusca = (ata.titulo + ' ' + ata.trecho).toLowerCase()
        
        // Conta quantos termos da query aparecem no resultado
        const termosEncontrados = termosBusca.filter(termo => 
          textoParaBusca.includes(termo)
        ).length

        // Cálculo da proporção (%)
        const porcentagem = totalTermos > 0 
          ? ((termosEncontrados / totalTermos) * 100).toFixed(1) 
          : 0

        return {
          titulo: ata.titulo,
          percentual: porcentagem,
          resumo: ata.trecho.substring(0, 150) + '...'
        }
      })

      // Ordena pela maior porcentagem e pega as top 3
      temp.topAtas = resultadosRanking
        .sort((a, b) => b.percentual - a.percentual)
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