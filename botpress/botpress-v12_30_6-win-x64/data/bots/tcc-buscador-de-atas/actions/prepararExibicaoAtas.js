/**
 * @title Preparar Atas para Exibição
 * @category Custom
 */
const prepararExibicao = async () => {
  const atas = temp.topAtas || []

  if (atas.length > 0) {
    temp.ata1_nome = atas[0].titulo
    temp.ata1_link = `http://localhost:3000/arquivos/${atas[0].titulo}`
    temp.ata1_pct = atas[0].percentual
    temp.ata1_esscore = atas[0].esPercentual
  }

  if (atas.length > 1) {
    temp.ata2_nome = atas[1].titulo
    temp.ata2_link = `http://localhost:3000/arquivos/${atas[1].titulo}`
    temp.ata2_pct = atas[1].percentual
    temp.ata2_esscore = atas[1].esPercentual
  }

  if (atas.length > 2) {
    temp.ata3_nome = atas[2].titulo
    temp.ata3_link = `http://localhost:3000/arquivos/${atas[2].titulo}`
    temp.ata3_pct = atas[2].percentual
    temp.ata3_esscore = atas[2].esPercentual
  }
}

return prepararExibicao()
