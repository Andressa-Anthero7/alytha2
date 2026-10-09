# Comparação histórica CropSense com pandas

O módulo `app/historical_comparison.py` trata a série do mesmo recorte desde 2018 e compara os últimos 30 dias com períodos equivalentes de anos anteriores. O Gemini recebe uma evidência estruturada `historical_comparison` e interpreta a comparação em linguagem agrícola. Isso amplia o contexto da resposta; não treina nem altera os pesos do modelo Gemini.

Cada observação exige NDVI finito entre -1 e 1, pelo menos 50 pixels e fração observada de 50% a 100%. Datas inválidas são descartadas. Uma data duplicada conta uma vez, priorizando maior fração observada e quantidade de pixels. Os períodos de cinco dias só entram após seu término, limitado pela consulta anual e data final do histórico. Datas posteriores ao corte nunca entram na comparação. Não há interpolação ou preenchimento de lacunas.

Cada período exige três observações, intervalo observado mínimo de dez dias, leitura recente há no máximo quinze dias e nenhuma lacuna acima de quinze dias, inclusive nas bordas do período. Anos insuficientes aparecem explicitamente como não comparáveis. São necessários pelo menos três anos anteriores utilizáveis. O ano atual não integra sua própria referência.

A referência usa a mediana das médias de cada ano e a faixa central entre os percentis 25 e 75; os anos têm o mesmo peso. O dia e mês de corte são alinhados por calendário; 29 de fevereiro corresponde a 28 de fevereiro em anos comuns. A tendência recente usa a inclinação da vegetação por dia, com faixa experimental de estabilidade entre -0,002 e +0,002. Esse limite não classifica manejo.

A faixa histórica não é intervalo de confiança ou previsão de produção. Estar abaixo dela não confirma atraso de plantio, perda de produtividade ou safra ruim. A área pode ter culturas e manejos distintos nos diferentes anos; MapBiomas 2025 não identifica a cultura de todas as safras. A comparação de um recorte não representa o município inteiro.

Os agrupamentos exploratórios de vegetação também passam a usar somente leituras disponíveis até a data da análise, com cache separado por corte temporal. O agrupamento de uma data antiga não aprende com observações posteriores a essa data.

Instale as dependências com `python -m pip install -r requirements-ml.txt`. A comparação aparece na leitura do histórico e na resposta do assistente quando esse histórico está carregado. Use `/api/research/analyze` para obter o resultado estruturado.

Execute `python -m app.historical_comparison` para gerar o pacote do recorte de referência de Sorriso, ou acrescente `--dataset-id ID` para outro histórico carregado. O pacote em `data/outputs/historical/` inclui observações tratadas, comparação atual, manifesto e `janelas_historicas_ml.csv`. Cada linha contém características de uma janela e referências históricas calculadas somente com dados disponíveis naquela data. Referência insuficiente fica vazia, sem imputação. Os dados são características para ML, sem rótulos confirmados de cultura, manejo ou produtividade. Validação de modelos futuros deve separar áreas e períodos, respeitando a sobreposição entre janelas.

A base atual começa em 2018. Sentinel-2 foi lançado em 2015 ([ESA](https://esoc.esa.int/content/sentinel-2a)). Para investigar 1998, será necessário integrar o arquivo Landsat e validar diferenças de sensor, resolução e frequência, mantendo uma referência separada ou harmonizada. O arquivo [Landsat Collection 2](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-reflectance) oferece produtos dos sensores 4 a 9; uma série anterior a 2018 não está implementada neste módulo.
