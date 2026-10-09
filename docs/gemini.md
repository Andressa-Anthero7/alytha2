# Assistente Gemini

Configure no `.env` do servidor:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=sua_chave_do_google_ai_studio
GEMINI_MODEL=gemini-3.1-flash-lite
```

A chave fica no servidor. O navegador recebe somente o nome do provedor, modelo e indicação de configuração; essa indicação não comprova acesso ou saldo. As configurações são lidas a cada consulta. Atualize a página após salvar a chave para atualizar a indicação de conexão.

Abra o assistente no mapa e pergunte sobre a cidade selecionada ou o histórico carregado. Os dados disponíveis são recuperados no servidor; a resposta cita apenas referências existentes. As ações aceitas continuam limitadas a filtros de culturas, abertura de histórico e navegação para Sorriso. Falta de cota, resposta bloqueada ou incompleta gera uma mensagem, sem troca automática para um provedor pago.

Esta integração envia texto e evidências numéricas. Ainda não envia imagens nem implementa identificação das etapas de preparo ou janela provável de semeadura. Gemini não substitui as medições do cv2 nem transforma hipóteses em confirmação de manejo.

O plano gratuito está sujeito aos limites da conta e pode usar os dados enviados para melhorar os produtos do Google. Confira [preços e condições](https://ai.google.dev/gemini-api/docs/pricing). A resposta segue um esquema JSON e passa por validação local, conforme o suporte a [respostas estruturadas](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Para selecionar explicitamente a integração anterior, use `AI_PROVIDER=openai`. Sem seleção explícita, o sistema prioriza Gemini quando `GEMINI_API_KEY` está preenchida; caso contrário, usa OpenAI para compatibilidade com instalações anteriores.
