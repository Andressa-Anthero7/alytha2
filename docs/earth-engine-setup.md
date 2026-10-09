# Configuracao local do Google Earth Engine

Defina `GEE_PROJECT_ID` no arquivo `.env` na raiz com o projeto Google Cloud que sera utilizado. O modelo nao configura um projeto real. A autenticacao local usa a conta Google da pessoa que executa o script e fica no perfil local, fora do repositorio. Esta integracao e opcional e ainda nao e utilizada pela tela.

## Preparar o ambiente

Na raiz do projeto, instale o cliente Python:

```powershell
python -m pip install -r requirements-earth-engine.txt
```

Depois autorize a conta Google e inicialize o projeto:

```powershell
python -m app.setup_earth_engine
```

O navegador abrira para o consentimento. A conta precisa ter permissao no projeto; a Earth Engine API precisa estar habilitada e o projeto precisa estar registrado no plano comercial da Alytha.

Nao coloque chave JSON de conta de servico no repositorio nem a envie pelo chat. Para producao, use Application Default Credentials numa infraestrutura Google Cloud ou um segredo de servidor gerenciado e restrito.

Este passo autentica e inicializa o cliente. Ele nao seleciona uma regiao, nao baixa mapas e nao executa uma classificacao. Escolha a regiao piloto e a cultura antes de iniciar processamento.
