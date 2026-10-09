# Meta atual: cv2 + ML

Definida em 09/10/2026: investigar manchas persistentes de pouca vegetação nas áreas de soja histórica, usando Copernicus Sentinel-2 e MapBiomas, sem depender de visitas ao campo.

O primeiro módulo deve ler NDVI numérico e qualidade por pixel em uma grade georreferenciada comum; comparar três datas distintas; delimitar regiões persistentes com OpenCV; apresentar contornos, hectares e cobertura no mapa; exportar características espaciais para o ML. Ausência de leitura nunca pode ser interpretada como ausência de vegetação. Não confirmar abandono, disponibilidade de terra, manejo ou linhas individuais de plantio.

A primeira entrega analisa um recorte selecionado ou a área de referência já coletada em Sorriso. Deve explicitar esse alcance: não representa o município inteiro. O processamento municipal em lote e a integração de radar são etapas posteriores.

As características espaciais devem ser alinhadas à geometria e à data das janelas de ML, sem usar imagens futuras ou sinais automáticos como rótulos verdadeiros. Resultados reais e testes sintéticos devem permanecer separados.
