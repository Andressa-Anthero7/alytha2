# Visão espacial com cv2 + preparação para ML

A primeira versão usa a mesma origem Copernicus Sentinel-2 L2A e a seleção de áreas existente. Não exige drone, outro satélite, visita ao campo ou rótulos de manejo.

## Uso

```powershell
python -m pip install -r requirements-cv.txt -r requirements-ml.txt
python -m pip check
python run.py
```

No painel lateral, abra **Manchas de pouca vegetação · visão espacial** e pressione **Analisar manchas por satélite**. Com uma área selecionada, analisa esse recorte. Sem seleção, usa a referência de Sorriso já armazenada, somente uma amostra da cidade. Fora desse piloto, selecione um recorte. Conclua qualquer desenho antes de iniciar.

Os contornos aparecem no mapa Google ou Leaflet. O painel informa períodos, hectares observados, cobertura comum, regiões menores e alcance da análise. É possível baixar os contornos como GeoJSON. Trocar a área remove resultados anteriores; pedidos em andamento não substituem resultados da nova seleção.

## Método e limites

- Grade UTM local de 10 m, fixa em todos os períodos. Imagens com grade divergente são rejeitadas. Limite de dois milhões de pixels e 2.000 pixels por dimensão; recortes maiores devem ser divididos, sem diminuir a resolução.
- Três janelas de até cinco dias, não sobrepostas, nos últimos 35 dias. O início da primeira e da última deve estar separado por pelo menos dez dias. Última janela útil no máximo 15 dias antes da análise. Datas futuras não entram.
- Cada janela retorna NDVI numérico FLOAT32 e qualidade no GeoTIFF. Copernicus combina imagens dentro da janela; não significa uma única aquisição nem comprova vegetação continuamente baixa entre as observações.
- Exclui nuvens, sombras, água, neve e pixels inválidos com a classificação SCL. Essa máscara é uma estimativa do sensor, sujeita a erros.
- A conclusão usa somente pixels válidos nos três períodos. Exige cobertura comum de pelo menos 50% do recorte e 50 pixels. Cobertura insuficiente gera resultado inconclusivo e nenhum contorno ou característica para ML.
- Pouca vegetação significa NDVI ≤ 0,25 nos três períodos, limite experimental. OpenCV conecta pixels por vizinhança de oito direções e mantém regiões com pelo menos 100 pixels (1 ha). Não preenche buracos nem transforma pixels sem leitura em baixa vegetação.
- Rasterio conserva buracos e georreferenciamento dos contornos. Hectares são estimativas da grade UTM: pixels de borda são selecionados pelo centro e seus contornos representam a célula completa. Não representam limites cadastrais.
- O sinal não identifica abandono, manejo, produtividade, linhas individuais de plantio ou terra disponível. Vegetação espontânea e cobertura do solo podem alterar a interpretação.

## Dados e machine learning

Imagens numéricas ficam em `data/rasters`, ignoradas pelo Git, com cache por geometria, grade, janela e versão do processamento. Jobs e progresso ficam no SQLite. Consultar um job interrompido retoma o trabalho usando o cache.

Cada resultado fica em `data/outputs/cv/<id>` com `analise.json`, `manchas.geojson` e, quando conclusivo, `caracteristicas_ml.csv`. As características são cobertura comum, fração persistente de baixo vigor, dispersão do NDVI recente, mudança média entre primeira e última janela, quantidade de manchas por 100 ha e fração da maior mancha. Não são rótulos verdadeiros de manejo.

`python -m app.ml_dataset` também inclui `caracteristicas_espaciais.csv`, somente quando a geometria é idêntica à de um recorte municipal e a observação está dentro do período exportado. A referência do piloto pode ter geometria diferente da grade municipal; nesse caso, seu CSV permanece no pacote próprio de visão espacial. Nunca combinar características espaciais com janelas anteriores à última imagem utilizada.

O modelo de perfis já existente continua usando as características temporais. Esta entrega prepara observações espaciais reais; o treino conjunto exige coletá-las em mais recortes, comparar a contribuição das novas características e avaliar em áreas e períodos independentes. A amostra inicial não justifica afirmar melhoria de acurácia.

Próximas etapas: coleta espacial em lote por município, exploração conjunta de textura e faixas largas, agrupamento com características espaciais e temporais, comparação entre safras. Agendamento automático e Sentinel-1 ainda não fazem parte desta entrega.

Referências: [Process API e saída numérica](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/getting_started/data_download_process_request.html), [componentes conectados do OpenCV](https://docs.opencv.org/4.13.0/d3/dc0/group__imgproc__shape.html).
