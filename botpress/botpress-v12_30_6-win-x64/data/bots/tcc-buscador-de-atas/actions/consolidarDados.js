
/**
 * @title Consolidar Dados para Busca
 * @category Custom
 */
const consolidarDados = async () => {
  // Pega as gavetas da session
  const { nomeProfessores, periodo, nomeDiscentes, numeroProcessoEdital, assuntosGerais } = session

  // Filtra apenas o que não está vazio e junta tudo com espaços
  const termosValidos = [
    nomeProfessores,
    periodo,
    nomeDiscentes,
    numeroProcessoEdital,
    assuntosGerais
  ].filter(val => val && val.trim() !== '')

  // Cria a string final de busca
  const queryFinal = termosValidos.join(' ')

  // Guarda na session para o próximo nó usar na API
  session.queryConsolidada = queryFinal
  
  // Log para você acompanhar no terminal do Botpress
  console.log('Query gerada para o Elastic:', queryFinal)
}

return consolidarDados()