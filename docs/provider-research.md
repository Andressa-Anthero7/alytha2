# Pesquisa: APIs para validação de produção agrícola

Pesquisado em 07/10/2026. Documentação, cobertura e preços devem ser reconfirmados antes de contratar.

## Conclusão

Há tecnologia pronta para apoiar a validação do plantio de lotes futuros. A opção mais alinhada à Alytha é o **Crop Monitor da Serasa Experian**: monitora talhões por satélite, informa área plantada e data estimada, identifica a cultura, acompanha desenvolvimento e sinaliza início e percentual de colheita. A Serasa informa que disponibiliza os resultados por API e revisa as análises com especialistas.

Parece tecnicamente viável para um piloto. A documentação pública explica o produto e os dados entregues, mas não publica especificação dos endpoints nem preços. A Serasa informa que a API é contratada separadamente e que fornece credenciais de homologação após a contratação.

O monitoramento é evidência de produção em desenvolvimento. Não comprova isoladamente titularidade, quantidade comercializável, ausência de gravames ou disponibilidade em armazém. Depois da colheita, a Alytha ainda precisará de documentos, pesagem e confirmação do armazenador.

## Plano B se a Serasa não for viável

**A Alytha consegue iniciar sem a Serasa.** Começar com um processo híbrido: cadastrar o talhão e a safra com declaração assinada/autorizada pelo produtor, reunir documentos agronômicos e consultar imagens abertas, com revisão por analista ou agrônomo. Fazer visita ou vistoria independente quando o valor, divergência ou inconclusividade justificar.

Uma alternativa pública melhor que o SATVeg exclusivamente MODIS é a nova versão do SATVeg da Embrapa, que oferece perfis de NDVI/EVI do Sentinel-2 a 10 m e série histórica desde 2018, além do MODIS a 250 m. A Embrapa descreve o SATVeg como ferramenta gratuita; o acesso à API AgroAPI requer conta/token e assinatura da API. A loja classifica SATVeg como gratuita, mas o PDF de preço ainda publicado descreve um mês/1.000 chamadas gratuitas e depois R$ 250 por 5.000 chamadas. Portanto, a interface gratuita serve para uma primeira revisão manual; para automação, confirmar por escrito a condição atual da API. Nenhuma dessas séries de índices confirma sozinha a cultura ou o estoque.

Outra rota é baixar/processar imagens Sentinel-2 diretamente via Copernicus, cujos dados são gratuitos, e calcular séries temporais de índices por polígono. Isso evita tarifa de dados, mas exige desenvolvimento geoespacial, operação de nuvens/ausência de imagens, validação agronômica e evidências auditáveis. MapBiomas pode acrescentar contexto histórico de cobertura/uso da terra, mas mapas anuais não servem como confirmação em tempo real de um plantio recém-iniciado.

### Fluxo inicial sem integração comercial

1. Capturar autorização do produtor e o polígono do talhão (GeoJSON, KML ou shapefile), safra, cultura, área, datas declaradas e estimativa de produção, guardando quem declarou e quando.
2. Vincular o imóvel ao produtor por CAR/SIGEF e documentação apresentada. Uma API de dados cadastrais pode ajudar a conferir imóvel/geometria; não prova domínio jurídico nem plantio.
3. Um analista confere séries/imagens SATVeg ou Sentinel-2 na janela da safra, registra fonte, imagem/datas utilizadas, cobertura de nuvens, índice observado e conclusão com justificativa.
4. Exigir vistoria independente ou evidência contemporânea adicional quando a área não puder ser distinguida, houver nuvens, divergência ou risco alto.
5. Atualizar a avaliação nas etapas declaradas de plantio, desenvolvimento, pré-colheita e colheita. Após colheita, reconciliar área/estimativa com notas, romaneios, pesagem e confirmação do armazém.

O resultado deve usar estados como **declarado**, **monitoramento inconclusivo**, **plantio detectado**, **cultura compatível**, **vistoria confirmatória** e **quantidade/estoque comprovados**. “Plantio detectado” não promove o lote diretamente para “livre para venda”. O sistema deve preservar cada consulta como evidência datada, sem substituir o histórico anterior.

### Quando usar um fornecedor pago alternativo

Se a equipe não puder revisar imagens ou os lotes tiverem valor relevante, pedir pilotos em paralelo à EOSDA e Cropwise. Comparar cultura detectada, talhão mínimo, explicabilidade, alertas e datas, APIs/relatórios, integração de polígono, cobertura no Brasil, preço por talhão/safra e suporte agronômico. São alternativas de monitoramento, mas as páginas públicas não confirmam o custo nem que seus resultados comprovem juridicamente a produção.

**Recomendação:** lançar o processo interno/manual com imagens abertas e assistência de agrônomo para o primeiro pequeno conjunto de lotes; medir tempo e custo por lote; depois comparar o resultado com um piloto pago de fornecedor. Assim o projeto não fica bloqueado pela negociação da Serasa e evita construir um modelo próprio antes de saber volume e custo operacional.

## Comparação

| Fornecedor | O que valida ou informa | API e custo | Aderência |
|---|---|---|---|
| **Serasa Crop Monitor** | Por talhão: área plantada, data estimada, cultura, desenvolvimento e alertas de emergência, senescência e colheita. Atualização média de 5–10 dias, conforme imagens sem nuvens. | API ou portal web. API exige contratação; preço e documentação de integração não são públicos. Homologação disponibilizada após contratação. | **Mais aderente para piloto** de lote futuro; confirmar que atende intermediação comercial, não só crédito rural. |
| **Embrapa SATVeg** | Séries de NDVI/EVI por ponto ou polígono. MODIS: 250 m de resolução e observações a cada 16 dias. Mede vigor vegetal, sem identificar por si só soja/milho ou volume. | API com token. A loja atual a lista como gratuita; PDF de preço associado informa 1.000 chamadas grátis no primeiro mês e R$ 250/mês por 5.000 chamadas, com excedente. Há divergência entre as informações publicadas; confirmar preço vigente com a Embrapa. | Útil para protótipo barato de vegetação, fraco como evidência de cultura em talhão pequeno. |
| **EOSDA API Connect** | Imagens, índices vegetativos e dados meteorológicos; a interpretação agronômica fica a cargo do integrador/modelo. | Documentação REST pública e teste gratuito mediante solicitação. Preço depende do volume mensal; informado por vendas e cobrança anual segundo FAQ. | Alternativa comercial flexível, com maior trabalho de integração e validação. |
| **Cropwise AgInsights** | Modelos de estágio de crescimento, produtividade relativa e zonas de produtividade com localização, cultura e dados de safra. São previsões, não medição de estoque. | APIs documentadas e acesso autenticado; preço não encontrado publicamente. | Comparar no piloto se suportar as culturas, regiões e polígonos da Alytha. |
| **Copernicus Sentinel-2** | Imagens multiespectrais gratuitas e abertas; a Alytha pode calcular índices e desenvolver seu próprio modelo de classificação. | Dados gratuitos; APIs de processamento têm quotas e condições por conta. | Baixo custo direto de dados, alto custo de desenvolvimento; opção de longo prazo. |
| **Registro Rural Developers** | CAR/SICAR, SIGEF, INCRA/SNCR, CIB, polígonos, relações cadastrais e cruzamentos socioambientais. | Documentação de API pública e cota gratuita inicial anunciada; acesso sujeito à aprovação/escopos. Preço após cota não localizado. | Complementa validação de imóvel e produtor, mas não detecta plantio. |

## Informações publicadas pela Serasa

- Detecta emergência de vegetação e identifica o cultivo no talhão.
- Retorna área total, hectares plantados e data estimada de plantio.
- Compara a cultura identificada com a cultura monitorada e considera a janela ZARC.
- Compara o desenvolvimento com a região e aponta risco de quebra.
- Sinaliza proximidade da colheita, início e percentual da área colhida.
- Entrega resultados por API ou portal e combina modelos de IA com validação de especialistas.
- Atualiza em média a cada 5–10 dias, sujeito à cobertura de nuvens.
- Culturas anunciadas incluem soja, milho, algodão, arroz e trigo.

## Piloto recomendado

1. Pedir à Serasa demonstração e proposta para uso pela Alytha como intermediadora de grãos, inicialmente em soja e milho.
2. Solicitar sandbox, documentação da API, exemplos, autenticação, limites, webhook ou consulta periódica, SLA e formatos de relatório/evidência.
3. Confirmar preço por talhão/safra/atualização, volume mínimo, onboarding, revisão humana, retenção e direito de compartilhar resultados com vendedor e comprador.
4. Avaliar de 10 a 20 talhões com autorização do produtor, polígono, cultura, safra, data e área declaradas, comparando os alertas com visita e documentos agronômicos.
5. Medir tempo para detectar plantio, taxa de inconclusivos, divergência de área, disponibilidade em período nublado e custo por lote. Não converter resultado inconclusivo em reprovação automática.
6. Comparar custo por lote com a margem da Alytha e custo de inspeção presencial antes de contratar em escala.

## Perguntas para a Serasa

- O Crop Monitor pode ser contratado para validação de lotes comerciais por uma intermediadora sem operação de crédito?
- Qual o preço por talhão, safra, atualização ou volume? Há mínimo, onboarding ou custo de análise humana?
- Como enviar os polígonos, qual o tamanho mínimo, e como tratar áreas pequenas ou talhões com plantio escalonado?
- Quais campos, confiança, identificadores e evidências/imagens vêm na API? Há relatório exportável e histórico imutável por análise?
- O percentual colhido é estimativa de área; há alguma estimativa de volume e quais são seus limites?
- Como são tratados nuvens, cultura incerta, safrinha, consórcio e contestação do resultado?
- Qual consentimento do produtor/proprietário é necessário e quais são as regras de retenção e compartilhamento?
- Qual SLA, suporte, frequência real e tratamento de indisponibilidade?

## Fontes

- [Serasa Crop Monitor: produto, ciclo, API e culturas](https://www.serasaexperian.com.br/solucoes/crop-monitor/)
- [Serasa: informações retornadas por fase](https://ajuda.agro.serasaexperian.com.br/hc/pt-br/articles/35525316963987-Quais-informa%C3%A7%C3%B5es-o-Crop-Monitor-me-retornar%C3%A1)
- [Serasa: resultados por API ou plataforma](https://ajuda.agro.serasaexperian.com.br/hc/pt-br/articles/35525264234003-Como-os-resultados-do-Crop-Monitor-s%C3%A3o-entregues)
- [Serasa: contratação e credencial de homologação da API](https://ajuda.agro.serasaexperian.com.br/hc/pt-br/articles/35409310340243-Como-conectar-API)
- [Serasa: frequência de atualização](https://ajuda.agro.serasaexperian.com.br/hc/pt-br/articles/35523811903507-Qual-a-frequ%C3%AAncia-de-atualiza%C3%A7%C3%A3o-da-an%C3%A1lise-do-Crop-Monitor-Sensoriamento-Remoto)
- [Embrapa AgroAPI SATVeg](https://www.agroapi.cnptia.embrapa.br/store/apis/info?name=SATVeg&provider=agroapi&version=v2)
- [Preço SATVeg disponibilizado pela Embrapa](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/satveg.pdf)
- [EOSDA API Connect](https://doc.eos.com/) e [FAQ de preços/teste](https://eos.com/pt/faq/)
- [Cropwise AgInsights API](https://open-platform.cropwise.com/docs/consuming-aginsights-engine-apis/)
- [Copernicus: dados Sentinel-2](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2)
- [Registro Rural Developers](https://developers.registrorural.com.br/)
