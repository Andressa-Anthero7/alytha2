# Descoberta assistida de areas produtoras

## Objetivo

O Modo I.A deve ajudar a encontrar e priorizar areas com potencial de producao de soja, milho e sorgo no Brasil. O fluxo parte de uma regiao e uma safra, combina mapas de uso agricola e observacoes de satelite e apresenta areas candidatas para revisao. Quando houver um lote declarado, a ferramenta compara as evidencias com o poligono e os documentos enviados pelo produtor.

A IA nao deve inventar nome de fazenda, produtor, titularidade, volume ou existencia de estoque. Um pixel ou poligono classificado como lavoura e uma indicacao espacial a verificar.

## Fontes e papel de cada uma

| Fonte | Uso na Alytha | Limite |
| --- | --- | --- |
| MapBiomas Agricultura | Criar uma camada historica de areas agricolas e recortes por safra. A Colecao 11 cobre 1985-2025; o produto de primeira safra tem classe especifica para soja e o produto de segunda safra inclui milho e classes agregadas. | A classificacao e raster de 30 m e nao identifica propriedade, produtor ou estoque. Sorgo nao aparece como classe especifica confirmada no produto consultado; precisa de amostras ou uma fonte complementar. |
| IBGE/SIDRA - PAM | Priorizar municipios por area plantada/colhida e quantidade de soja, milho e sorgo, como contexto para a busca. | Estatistica municipal anual; nao aponta a fazenda ou o talhao. |
| SICAR/CAR | Sobrepor limites declarados de imoveis rurais e ajudar a organizar candidatos dentro de um imovel. | Cadastro ambiental autodeclaratorio. O poligono nao prova dominio, posse, operacao agricola atual ou direito sobre graos. A consulta e o download tem limites operacionais e devem respeitar privacidade e termos de uso. |
| Copernicus Sentinel-2 L2A | Acompanhar vigor e mudancas recentes com imagens multitemporais, nuvens e indices como NDVI. | NDVI sozinho nao identifica de forma conclusiva cultura, produtividade ou quantidade colhida. |
| Embrapa AgroAPI SATVeg | Serie historica de NDVI/EVI como contexto de vigor. | MODIS tem pixel de 250 m e composicao de 16 dias, inadequados para delimitar pequenos talhoes; requer token da AgroAPI. |
| CONAB | Contextualizar safra, cultura, area e producao em nivel agregado e comparar com os resultados regionais. | Boletins e estimativas agregadas nao validam um lote individual. |

## Fluxo proposto

1. **Busca regional:** escolher cultura, safra, estado/municipio ou desenhar uma area de interesse no mapa.
2. **Priorizacao municipal:** usar IBGE e CONAB para ordenar municipios com historico e estimativas relevantes para a cultura.
3. **Mapa de candidatos:** recortar a classificacao MapBiomas para a regiao, separar classes/safras disponiveis e agrupar pixels contiguos em areas candidatas. Registrar fonte, colecao, ano, classe, resolucao e confianca.
4. **Atualizacao por satelite:** consultar Sentinel-2 (e, posteriormente, Sentinel-1 para reduzir dependencia de nuvens) para avaliar atividade e fenologia recente.
5. **Associacao a imovel/talhao:** cruzar candidatos com poligono autorizado do produtor ou limites publicos do CAR, mostrando sobreposicao e divergencias sem inferir titularidade.
6. **Revisao de lote:** comparar area, cultura e janela de colheita declaradas com as evidencias, documentos, vistoria e registros de carga. Manter decisao humana e trilha de auditoria.

## Implementacao da PoC

- Primeira entrega: busca de candidatos por cultura, safra e regiao, com resultados no mapa e metadados das fontes.
- A camada de sorgo deve ser marcada como inconclusiva ate haver mapeamento separado ou amostras verificadas suficientes. Nao converter a classe agregada de outras culturas em sorgo.
- Separar o catalogo historico de culturas do monitoramento da safra corrente. Nao treinar um classificador nacional antes de montar amostras rotuladas e validar por regiao e safra.
- Guardar para cada resultado: geometria, fonte, data/colecao, metodo, resolucao, indicadores de qualidade, versao do modelo e revisao do analista.
- Enviar a um eventual modelo de linguagem apenas resumos e evidencias necessarias. Coordenadas, documentos e dados pessoais permanecem no backend e nao devem ser enviados a um provedor sem decisao e contrato especificos.

## Requisito de acesso e custo

O MapBiomas publica dados abertos com atribuicao. Os recortes personalizados podem ser obtidos pela plataforma ou via Google Earth Engine. Como Alytha pretende usar os resultados em uma operacao comercial, o projeto do Earth Engine precisa estar registrado para uso comercial com plano pago; o acesso gratuito nao comercial nao deve ser usado para uma operacao comercial. A chave do Google Maps da PoC nao concede acesso ao Earth Engine. A alternativa de menor custo inicial e baixar um GeoTIFF da regiao-alvo e processa-lo localmente, sujeito ao tamanho do arquivo e a disponibilidade de processamento raster.

## Referencias oficiais

- MapBiomas, Uso Agricola: https://brasil.mapbiomas.org/iniciativas-e-produtos/cobertura-e-uso-da-terra/agricultura/uso-agricola/
- MapBiomas, downloads GeoTIFF: https://brasil.mapbiomas.org/downloads/mapas-para-download-geotiff/
- MapBiomas, assets no Earth Engine: https://brasil.mapbiomas.org/downloads/assets-no-google-earth-engine/
- IBGE, Producao Agricola Municipal/SIDRA: https://sidra.ibge.gov.br/pesquisa/pam/tabelas/
- Consulta publica do CAR: https://consulta.car.gov.br/
- Embrapa AgroAPI SATVeg: https://www.agroapi.cnptia.embrapa.br/store/apis/info?name=SATVeg&provider=agroapi&version=v2
- Copernicus Data Space, STAC: https://documentation.dataspace.copernicus.eu/APIs/STAC.html
- Google Earth Engine, acesso comercial e nao comercial: https://developers.google.com/earth-engine/guides/access
- Google Earth Engine, transicao para uso comercial: https://developers.google.com/earth-engine/guides/transition_to_commercial
