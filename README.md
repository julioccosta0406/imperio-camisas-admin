# Império Camisas — Painel administrativo

Painel privado para acompanhar produtos, estoque, vendas e financeiro.

## Usar no computador

Abra `index.html` em um navegador. Os produtos, vendas e ajustes financeiros ficam no armazenamento local desse navegador. O projeto não envia esses registros para um servidor e não sincroniza dados entre dispositivos.

## Publicar

O painel é um site estático: `index.html`, `enhancements.js` e as imagens da marca ficam na raiz do projeto. No Vercel, não é necessário comando de build nem diretório de saída. Conecte o repositório GitHub e mantenha a proteção de acesso ativada para produção.

Como este é um painel administrativo, a implantação deve exigir autenticação do Vercel em todos os ambientes, inclusive produção. O repositório GitHub também deve ser privado.
