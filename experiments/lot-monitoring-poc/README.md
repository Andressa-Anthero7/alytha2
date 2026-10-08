# PoC: monitoramento e levantamento de dados de lotes

Área experimental paralela ao produto Alytha. Aqui ficam os estudos e protótipos de fontes externas para apoiar a validação de lotes, principalmente lotes futuros.

## Limites desta PoC

- Não altera o backend, banco ou fluxo de aprovação da Alytha.
- Não transforma observação de satélite em prova de titularidade, volume ou estoque.
- Não altera o backend nem persiste os arquivos de talhão enviados pela tela.
- A tela inicia sem poligono; apenas areas GeoJSON fornecidas pelo operador sao desenhadas e enviadas ao Copernicus. O arquivo de exemplo continua disponivel para exploracoes pela linha de comando.
- Mantém Serasa e outros fornecedores comerciais como integrações futuras, atrás de adaptadores; credenciais e contratos ainda são necessários para explorá-los.

## Estrutura

- `docs/provider-research.md`: levantamento de fornecedores, fontes públicas, limites e perguntas de contratação.
- `docs/product-direction.md`: visão do produto, fontes e etapas para construir o monitoramento Alytha.
- A tela inicia sem poligono; apenas areas GeoJSON fornecidas pelo operador sao desenhadas e enviadas ao Copernicus. O arquivo de exemplo continua disponivel para exploracoes pela linha de comando.
- `scripts/catalog_search.py`: busca metadados STAC para cenas Sentinel-2 que cruzam um polígono e uma janela de datas.
- `scripts/web_app.py`: página local com mapa, consulta de cenas e série NDVI via Sentinel Hub.
- `outputs/`: reservado para resultados locais; conteúdo não deve ser versionado.

## Primeira exploração

Requer Python 3.10 ou superior e acesso à internet; usa somente a biblioteca padrão.

### Abrir a tela no navegador

Na raiz do projeto, inicie o servidor local:

```powershell
python experiments/lot-monitoring-poc/scripts/web_app.py
```

Depois abra `http://127.0.0.1:8765`. O mapa inicia sem poligono. Carregue um GeoJSON autorizado para consultar cenas ou calcular NDVI. Selecione o periodo e use os controles na barra inferior. A pagina le `VITE_GOOGLE_MAPS_API_KEY` e `VITE_GOOGLE_MAPS_MAP_ID` de `frontend/.env`. A chave de navegador e entregue ao Google Maps pela pagina; nao copie o segredo OAuth CDSE para o navegador. Mantenha o terminal aberto e pressione `Ctrl+C` para encerrar.

Para habilitar o processamento NDVI, copie `experiments/lot-monitoring-poc/.env.example` para `experiments/lot-monitoring-poc/.env`, preencha as credenciais OAuth CDSE e reinicie o servidor. Siga a [documentação de autenticação do Copernicus](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html). Verifique as quotas da conta antes de processar muitos polígonos ou longos períodos.

O explorador de terminal continua disponível:

```powershell
python experiments/lot-monitoring-poc/scripts/catalog_search.py --from 2026-01-01 --to 2026-10-07
```

Para usar outro GeoJSON:

```powershell
python experiments/lot-monitoring-poc/scripts/catalog_search.py --geojson caminho/do/talhao.geojson --from 2026-01-01 --to 2026-10-07 --max-cloud 30
```

O GeoJSON pode ser uma geometria, `Feature` ou `FeatureCollection` com uma única geometria. As coordenadas devem seguir GeoJSON (longitude, latitude; WGS84). O script de terminal imprime identificador, data, cobertura de nuvens e links de metadados; o processamento de NDVI está disponível pela tela web e requer OAuth CDSE. A PoC ainda não classifica cultura.

## Próximos passos

1. Explorar cobertura e frequência de imagens para talhões autorizados e casos de teste.
2. Registrar fonte, consulta, cena, nuvens e revisão humana como evidência reproduzível.
3. Comparar a revisão manual com SATVeg/Embrapa e propostas de fornecedores pagos.
4. Definir adaptador de monitoramento comum antes de integrar qualquer fornecedor; reativar Serasa quando houver autorização, documentação e sandbox.
5. Só depois avaliar processamento de índices e integração com o fluxo produtivo.

O endpoint e a coleção padrão seguem a documentação atual do Copernicus Data Space Ecosystem: `https://stac.dataspace.copernicus.eu/v1/`, coleção `sentinel-2-l2a`. Consulte a licença e os termos do provedor antes de distribuir derivados ou operar em produção.
