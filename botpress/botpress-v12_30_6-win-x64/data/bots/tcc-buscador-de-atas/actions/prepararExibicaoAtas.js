/**
 * @title Preparar Atas para Exibição
 * @category Custom
 */
const prepararExibicao = async () => {
  const atas = temp.topAtas || []

  if (atas.length > 0) {
    // Pegamos os dados da 1ª ata e salvamos em variáveis simples
    temp.ata1_nome = atas[0].titulo
    temp.ata1_link = `http://localhost:3000/arquivos/${atas[0].titulo}`
    temp.ata1_pct = atas[0].percentual
  }

  if (atas.length > 1) {
    // Pegamos os dados da 2ª ata se ela existir
    temp.ata2_nome = atas[1].titulo
    temp.ata2_link = `http://localhost:3000/arquivos/${atas[1].titulo}`
    temp.ata2_pct = atas[1].percentual
  }
}

return prepararExibicao()