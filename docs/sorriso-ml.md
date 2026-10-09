# Sorriso: ambiente de coleta e preparação de ML

O ambiente usa os requisitos geoespaciais, de machine learning e do Earth Engine. A coleta municipal atual usa Copernicus e MapBiomas; não exige autenticar o Earth Engine.

```powershell
python -m pip install -r requirements-geospatial.txt -r requirements-ml.txt -r requirements-earth-engine.txt
python -m pip check
python run.py
```

Abra `http://127.0.0.1:8765/?municipio=5107925`. O gráfico **Atividade da soja** acompanha Sorriso e retoma a leitura municipal quando necessário. Não exige preencher um seletor dentro do gráfico.

**Classes no mapa**, no gráfico de atividade, exibe os polígonos de soja histórica nas mesmas cores da legenda: baixo vigor persistente, sem persistência de baixo vigor e sem classificação. Selecionar uma barra ou usar as setas atualiza o mapa e os detalhes da área na mesma data, sem novas consultas ao satélite. A camada permanece ao recolher o gráfico; desmarque a opção ou use o botão de fechar da legenda para ocultá-la. Trocar de município limpa os resultados anteriores. Fragmentos menores que 5 ha permanecem na base de hectares, mas não são desenhados nessa camada. Durante a coleta, mapa e gráfico usam a mesma quantidade de polígonos consultados.

Para gerar a base com as leituras já coletadas:

```powershell
python -m app.ml_dataset
```

O comando cria CSVs, GeoJSON, ficha de referências de campo, manifesto e ZIP em `data/outputs/ml`. Preserva as exportações anteriores. Não consulta serviços externos nem modifica os registros de campo. Se a coleta ainda estiver em andamento, o manifesto identifica a base parcial; execute novamente após a conclusão.

As leituras atuais cobrem 60 dias e permitem preparar características e explorar padrões de vegetação. Não substituem um histórico de várias safras, que será necessário para comparar períodos agrícolas e avaliar previsões em anos diferentes. O histórico de referência do piloto desde 2018 continua disponível no painel de histórico.

O aprendizado por satélite funciona sem visitas ou registros de campo. No painel **Leitura por satélite · piloto Sorriso**, use **Atualizar padrões com as leituras coletadas**, ou execute:

```powershell
python -m app.satellite_learning
```

O modelo agrupa comportamentos de vegetação e destaca recortes diferentes do conjunto observado na cidade. Usa uma janela recente por recorte, com pelo menos cinco leituras úteis e 20 dias de acompanhamento, para não favorecer áreas com mais imagens. Exclui janelas cuja data final está há mais de 20 dias da data da coleta. Precisa de pelo menos dez recortes e diversidade nos dados. Não usa registros de campo nem hipóteses automáticas como respostas corretas.

O pacote inclui `perfis_satelite.csv`, `perfis_satelite.geojson` e `aprendizado_satelite.json`; o modelo fica em `data/models/satellite-5107925.joblib`. Os perfis são ordenados pela presença média de vegetação; as diferenças apontadas pelo modelo não confirmam terra parada, abandono, plantio, colheita ou produtividade. Recortes são unidades de processamento e podem pertencer à mesma mancha, não talhões independentes. A área em hectares representa somente os recortes com leituras suficientes, não uma estimativa extrapolada para a cidade inteira.

Se a coleta estiver parcial, o modelo também será parcial: atualize depois da conclusão. Trata-se de aprendizado exploratório do período observado, sem previsão ou acurácia agronômica validada. A comparação municipal entre safras e o uso de radar Sentinel-1 ainda não estão implementados. O histórico desde 2018 é de uma área de referência, não de toda a cidade.

Registros de manejo são opcionais e só são necessários para o modelo separado que aprende etapas confirmadas. Não use as hipóteses automáticas como verdade para esse classificador. Avaliações futuras devem separar safras e áreas espacialmente independentes, incluindo controle de proximidade entre recortes.
