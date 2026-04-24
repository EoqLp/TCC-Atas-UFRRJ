1. Iniciar o Elasticsearch em (C:\elasticsearch-9.3.1\bin) elasticsearch.bat


2. Testar Elastic em outro cmd (curl -u elastic:-FCypZTG*SPvCJ7tqNYv -k https://localhost:9200)

3. Iniciar o indexador, cmd na pasta dele (node index.cjs)

4. Indexar atas, no navegador (curl http://localhost:3000/indexar)

5. No cmd do elastic (passo 2), expor as atas (curl -u elastic:-FCypZTG*SPvCJ7tqNYv -k -X GET https://localhost:9200/atas/_search)
