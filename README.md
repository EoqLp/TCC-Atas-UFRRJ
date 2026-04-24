## 📑 Sistema de Busca e Análise Inteligente de Documentos PDF
Este projeto consiste em um ecossistema escalável para indexação, busca semântica e análise de documentos PDF. Utilizando técnicas de Processamento de Linguagem Natural (PLN) e Recuperação de Informação (IR), o sistema permite encontrar informações específicas dentro de grandes volumes de texto com base em cálculos de relevância proporcional.

🚀 Tecnologias Utilizadas

    ◉ Botpress v12: Interface de chatbot e orquestração de diálogos.

    ◉ Elasticsearch 9.3.1: Motor de busca e análise distribuído de alta performance.

    ◉ Node.js: Servidor de backend para extração de texto, limpeza de dados e indexação.

    ◉ Axios & Express: Comunicação via API REST.

    ◉ PDF-Parse: Extração de dados brutos de arquivos PDF.

📋 Pré-requisitos:

Para rodar o ambiente completo, é necessário:

    ◉ Node.js (versão 16 ou superior)

    ◉ Node.js (versão 12 ou inferior para o Botpress)

    ◉ Elasticsearch

    ◉ Botpress v12

    ◉ Java Runtime Environment (JRE) (exigido pelo Elasticsearch)

🚦 Guia de Inicialização

Siga os passos abaixo na ordem exata para garantir que todos os serviços se comuniquem corretamente.

1. Iniciar o Banco de Dados (Elasticsearch)
Navegue até a pasta de binários do seu Elasticsearch e execute o motor:

```
cd C:\elasticsearch-9.3.1\bin
elasticsearch.bat
```

2. Validar o Status do Serviço

```    
curl -u elastic:suasenha -k https://localhost:9200
```

3. Iniciar o Servidor Indexador (Node.js)

```
Navegue até a pasta raiz do indexador e inicie a aplicação:

node index.cjs

O servidor será iniciado na porta 3000.
```

4. Indexar Documentos
Certifique-se de que seus arquivos PDF estão na pasta configurada (ex: /docs). Em seguida, dispare o gatilho de indexação via navegador ou curl:

```
curl http://localhost:3000/indexar
O sistema percorrerá todos os arquivos, extrairá o conteúdo textual e enviará para o Elasticsearch.
```

5. Consultar Dados Indexados
Para visualizar a lista completa de documentos no banco de dados:

```
curl -u elastic:-FCypZTG*SPvCJ7tqNYv -k -X GET https://localhost:9200/atas/_search
```

🔍 Inteligência de Busca
O sistema utiliza um algoritmo de Busca Proporcional customizado no chatbot, que funciona em duas etapas:

Filtragem de Stop Words: Antes da consulta, o sistema remove automaticamente ruídos linguísticos (artigos, preposições, interjeições e gírias) usando uma lista extensiva de mais de 300 termos. Isso garante que a busca foque apenas em palavras-chave de alto valor.

Cálculo de Precisão: O sistema retorna apenas os resultados que atingem um nível crítico de relevância (padrão: 65%). Caso nenhuma correspondência ideal seja encontrada, o sistema informa ao usuário sobre a baixa precisão do resultado mais próximo.
