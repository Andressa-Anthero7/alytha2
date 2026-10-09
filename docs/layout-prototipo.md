# Layout do protótipo: notebook primeiro

Prioridade definida em 09/10/2026: organizar a experiência em notebook antes de desenvolver a versão responsiva completa.

O espaço de trabalho mantém busca e identificação no cabeçalho, ferramentas numa faixa lateral, filtros e análises na coluna esquerda, mapa no centro e um gráfico por vez na coluna direita. Período de consulta e botões de abrir/recolher os gráficos permanecem na barra inferior.

As colunas reservam espaço real: abrir um gráfico ou os filtros redimensiona o mapa, sem cobrir o município. O mapa preserva o centro ao mudar de tamanho. Fechar o gráfico amplia o mapa; a camada de atividade vegetativa e sua legenda continuam disponíveis. Culturas e camadas começam recolhidas no notebook, deixando as ferramentas de análise acessíveis. O assistente ocupa a coluna esquerda quando aberto, e o botão de menu retorna aos filtros.

A legenda do mapa tem informações adicionais recolhíveis. As colunas têm rolagem própria quando o conteúdo excede a altura da tela.

Validação principal: 1366 × 768. Também conferido em 1280 × 720 e 1440 × 900, com filtros, gráfico e classes municipais abertos. A configuração de notebook fica em `web/notebook-layout.css`; o redimensionamento dos mapas e controles de fechar ficam em `web/workspace-layout.js`. A versão para telas menores permanece uma etapa posterior; não foi tratada como entrega responsiva completa.
