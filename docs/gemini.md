# Assistente Gemini

Edite a identidade, o tom e o roteiro agrícola em [`prompts/alytha-agro.md`](../prompts/alytha-agro.md). O servidor lê esse arquivo a cada pergunta: basta salvar e fazer uma nova consulta, sem reiniciar. Respostas já exibidas não são reescritas. As regras de evidências, o esquema de resposta e a validação de ações continuam no servidor. Arquivo ausente, vazio ou ilegível impede a consulta e informa o problema.

O foco da resposta é o andamento da lavoura, o monitoramento CropSense e as perspectivas de safra. Índices e sensores entram como suporte, não como assunto principal. As fontes aparecem em “Bases do acompanhamento”, recolhidas por padrão. Perspectivas condicionais não são previsões quantitativas: sem estimativa correspondente nas evidências, a Alytha não informa produtividade, produção, data de colheita ou probabilidades. O mapa e o gráfico usam “Vegetação mais expressiva no período” para áreas acima da faixa de baixo vigor em alguma observação, sem confirmar cultura ou safra implantada; cinza indica “Avaliação inconclusiva”.

No notebook, o modo I.A abre uma faixa horizontal acima da barra inferior. A conversa aparece acima e a pergunta ocupa uma linha de 34 px abaixo, com o botão Enviar ao lado. O painel começa compacto e cresce com o conteúdo até um limite; respostas longas rolam automaticamente até o final quando o texto é atualizado. O usuário pode rolar para reler. O mapa, o menu e os gráficos reservam a altura real dessa faixa. Enter envia; Ctrl + Enter também funciona. O contexto é enviado ao assistente sem um bloco de apresentação no painel.

A Alytha atua como auxiliar de inteligência agrícola do AgroSense Intelligence, interpretando o monitoramento CropSense. O roteiro orienta uma conversa próxima e objetiva, com respostas adaptadas à pergunta e, quando útil, uma pergunta curta para escolher o próximo foco. Não há apresentação repetida nem diagnóstico automático de plantio ou produtividade. Após uma resposta, os atalhos ajudam a perguntar pela prioridade, pelo próximo sinal ou pela comparação histórica; clicar preenche a pergunta para revisar e enviar.

As últimas três trocas bem-sucedidas são enviadas junto da nova pergunta para entender continuações como “e depois?”. O painel conserva até quatro pares visíveis, com rolagem. A conversa fica somente na memória desta página; recarregar a página ou mudar cidade, recorte, histórico ou data municipal reinicia esse contexto. Respostas atrasadas de outro contexto são descartadas. As trocas anteriores orientam a conversa, mas não são evidência: o servidor recupera os dados atuais a cada pergunta. Isso não treina nem atualiza o modelo de ML. A API aceita `conversation` como lista opcional de até três objetos com `question` e `answer`, ambos textos de até 3000 caracteres.

O contexto acompanha a pesquisa do mapa. Quando o gráfico municipal está carregado, o servidor recupera os dados dessa consulta e inclui apenas avaliações até a data selecionada. Consultas de outra cidade ou datas sem avaliação são rejeitadas. O histórico de um recorte é identificado como tal, sem extrapolação municipal. Se a cidade, área ou data mudar durante uma resposta, ela não executa ações no novo contexto.

Configure no `.env` do servidor:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=sua_chave_do_google_ai_studio
GEMINI_MODEL=gemini-3.1-flash-lite
```

A chave fica no servidor. O navegador recebe somente o nome do provedor, modelo e indicação de configuração; essa indicação não comprova acesso ou saldo. As configurações são lidas a cada consulta. Atualize a página após salvar a chave para atualizar a indicação de conexão.

Abra o assistente no mapa e pergunte sobre a cidade selecionada ou o histórico carregado. Os dados disponíveis são recuperados no servidor; a resposta cita apenas referências existentes. As ações aceitas continuam limitadas a filtros de culturas, abertura de histórico e navegação para Sorriso. Falta de cota, resposta bloqueada ou incompleta gera uma mensagem, sem troca automática para um provedor pago.

Esta integração envia texto e evidências numéricas. Ainda não envia imagens nem implementa identificação das etapas de preparo ou janela provável de semeadura. Gemini não substitui as medições do cv2 nem transforma hipóteses em confirmação de manejo.

Falhas temporárias HTTP 500, 502, 503 e 504 ou de conexão são repetidas até três tentativas, com intervalos crescentes e timeout de 60 segundos por tentativa, para comportar consultas com histórico e evidências completas. Erros de chave, permissão, configuração e cota não são repetidos. O log registra somente o provedor, código HTTP e número da tentativa, sem chave, pergunta ou corpo da resposta. Se a instabilidade persistir, a mensagem informa o código HTTP. Veja a [orientação oficial para retentativas](https://ai.google.dev/gemini-api/docs/troubleshooting).

O plano gratuito está sujeito aos limites da conta e pode usar os dados enviados para melhorar os produtos do Google. Confira [preços e condições](https://ai.google.dev/gemini-api/docs/pricing). A resposta segue um esquema JSON e passa por validação local, conforme o suporte a [respostas estruturadas](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Para selecionar explicitamente a integração anterior, use `AI_PROVIDER=openai`. Sem seleção explícita, o sistema prioriza Gemini quando `GEMINI_API_KEY` está preenchida; caso contrário, usa OpenAI para compatibilidade com instalações anteriores.
