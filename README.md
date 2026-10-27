# Império Camisas — Painel administrativo

Painel privado para acompanhar produtos, estoque, vendas e financeiro.

## Usar no computador

Abra `index.html` em um navegador. Os produtos, vendas e ajustes financeiros ficam no armazenamento local desse navegador. O projeto não envia esses registros para um servidor e não sincroniza dados entre dispositivos.

Na tela **Produtos & estoque**, use **Importar Excel** para selecionar um arquivo `.xlsx`, `.xls` ou `.csv`. O painel lê a planilha no navegador, identifica a aba pelos cabeçalhos e mostra uma prévia antes de salvar. Linhas já importadas são ignoradas.

Para a planilha `JM IMPORTS`, o leitor procura a aba que contém `Modelo`, `Time`, `Valor pago` e `Valor vendido`; a aba de despesas pessoais não é selecionada. Como não há colunas de quantidade, data da venda ou entrega, cada linha vale uma unidade, as vendas recebem a data da importação e ficam como **A entregar**. A coluna `despesas` é somada ao custo unitário.

## Publicar

O painel é um site estático: `index.html`, os arquivos JavaScript e CSS e as imagens da marca ficam na raiz do projeto. No Vercel, não é necessário comando de build nem diretório de saída. Conecte o repositório GitHub e mantenha a proteção de acesso ativada para produção.

Como este é um painel administrativo, a implantação deve exigir autenticação do Vercel em todos os ambientes, inclusive produção. O repositório GitHub também deve ser privado.
