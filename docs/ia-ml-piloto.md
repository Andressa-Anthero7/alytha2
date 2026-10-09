# Piloto Sorriso: histórico, ML e assistente

## Entregue

- Histórico Sentinel-2 L2A desde 2018 para pequenas áreas dentro da malha de Sorriso/MT, código IBGE 5107925. Consultas anuais em segundo plano, persistência, retomada de anos com falha e reaproveitamento do cache.
- Gráfico por ano e regras temporais que mostram hipóteses de crescimento, perda de vegetação ou baixo vigor. Nuvens e cobertura insuficiente tornam a análise inconclusiva.
- KMeans aplicado a janelas históricas de 90 dias: agrupamento de padrões de vegetação sem inventar rótulos de manejo. O agrupamento usa o histórico completo e serve para exploração retrospectiva, sem teste de previsão futura.
- Cadastro de registros conhecidos de campo, treinamento Random Forest, avaliação GroupKFold por área, métricas persistidas e inferência experimental após treinamento.
- Assistente OpenAI com evidências recuperadas no servidor, referências verificadas e ações limitadas a filtros de culturas, abertura do histórico e navegação para Sorriso. Nenhuma resposta executa código ou URLs arbitrárias.

## Verificação em 08/10/2026

A referência escolhida pelo piloto é uma mancha MapBiomas de soja de 2025 com aproximadamente 126,11 ha. Não é um talhão cadastral nem comprova soja em todas as safras.

| Ano | Observações disponíveis |
| --- | ---: |
| 2018 | 39 |
| 2019 | 41 |
| 2020 | 42 |
| 2021 | 44 |
| 2022 | 41 |
| 2023 | 47 |
| 2024 | 48 |
| 2025 | 42 |
| 2026, até 08/10 | 37 |
| Total | 381 |

O KMeans aprendeu quatro grupos a partir de 92 janelas do histórico real. Os grupos não têm acurácia agronômica medida e não confirmam plantio, preparo, pousio ou colheita. A interpretação das regras também varia com a data de corte e a janela analisada.

O treinamento supervisionado foi verificado em banco temporário com fixtures sintéticas, exclusivamente para testar o fluxo e a separação por área. A base real permanece sem registros de campo e sem modelo supervisionado treinado. Não há deep learning treinado nesta entrega.

A chamada real à OpenAI com a chave configurada retornou HTTP 429, apresentado como limite ou saldo insuficiente. O assistente foi validado também com respostas simuladas estruturadas e rejeição de referências inexistentes. A resposta real bem-sucedida depende de resolver o limite/saldo da conta.

## Como testar

1. Execute `python run.py` e abra `http://127.0.0.1:8765/?municipio=5107925`.
2. Expanda **Histórico e manejo · piloto Sorriso** e clique em **Iniciar piloto Sorriso**. Confirme o polígono selecionado e o andamento dos anos.
3. Alterne entre 2018 e 2026 e confira gráfico, quantidade de intervalos e hipóteses com suas limitações.
4. Desenhe outra área dentro do município e carregue seu histórico para criar uma referência independente.
5. Registre períodos e etapas cujo manejo é conhecido, informando a origem da confirmação. Períodos sobrepostos para a mesma geometria são rejeitados.
6. Depois de pelo menos 30 registros utilizáveis em três áreas, com duas etapas e cinco exemplos por etapa, treine o modelo. Confira a matriz de confusão e o relatório retornados por `POST /api/research/train`; não trate a acurácia interna como aprovação para produção.
7. Com chave e saldo disponíveis, abra **Modo I.A**, pergunte “O que o histórico desta área indica?” e solicite “Mostre soja no mapa”. Confira evidências citadas e atualização dos checkboxes.

## O que falta para validar manejo

Revisão após interrupção: históricos que ficaram em `loading` retomam o processamento quando reabertos, reutilizando os anos já armazenados no cache. A tela mostra os anos disponíveis durante o carregamento. Registros de campo respeitam também o último ano solicitado, mesmo quando o histórico foi criado em uma data posterior.

Coletar exemplos reais de áreas independentes, revisar sobreposição espacial, separar safras para avaliação temporal externa e comparar previsões com visitas ou registros de campo. NDVI sozinho não distingue todas as etapas de manejo, culturas ou disponibilidade da terra. SAR Sentinel-1, clima e registros operacionais podem complementar o sinal em uma próxima etapa. As regras e os agrupamentos atuais não fazem essa integração.

Embrapa permanece dependente de acesso AgroAPI e validação da chamada real. CONAB fornece contexto estadual, sem produção estimada para cada polígono. MapBiomas fornece uso anual, sem comprovar a safra anterior.

## APIs

| Método e rota | Função |
| --- | --- |
| `POST /api/research/pilot` | Inicia ou reutiliza o piloto Sorriso |
| `POST /api/research/history` | Histórico de uma geometria dentro de Sorriso |
| `GET /api/research/history/{id}` | Andamento e observações persistidas |
| `GET /api/research/status` | Disponibilidade da configuração e estado do modelo |
| `GET /api/research/events` | Registros de campo |
| `POST /api/research/events` | Adiciona um registro conhecido de campo |
| `POST /api/research/analyze` | Regras, agrupamento e inferência supervisionada quando disponível |
| `POST /api/research/train` | Treina e retorna métricas internas |
| `POST /api/assistant` | Resposta OpenAI e ação estruturada validada |

Faça backup do SQLite e de `data/models` com o servidor parado. O armazenamento é local, sem autenticação ou isolamento por usuário; mantenha o piloto na interface local até implementar essas funções.
