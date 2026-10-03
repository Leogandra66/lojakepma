# Kepma shop

preciso criar um ecomerce que faça venda de produtos que estao em estoque e que faca venda de produtos que nao tem estoque mas que estejao marcados para venda por encomenda . Neste caso os produtos de venda por encomenda terao uma data prevista de entrega e será cobrado 40% do valor no ato da compra por encomenda e 60% na entrega do produto .Os produtos com estoque terão venda normal e os produtos sem estoque que não estejam marcados para venda por encomenda deverao ficar indisponiveis. Vamos utilizar o gateway de pagamentos da infinitypay que vai demandar acoes de backend para os pagamentos . Quando o pagamento da compra for solictado é criado uma chamada post a infinitypay que seu retorno sera o link externo onde o cliente tem que ser encaminhado para realizar o pagamento . Apos o pagamento a infinitypay redireciona o cliente novamente ao nosso site em uma url que devemos criar para receber esse retorno e que vai trazer na url informacaos do pagamento. Entao precisamos de um banco de dados para produtos, pedidos,clientes e usuarios . Para acessar o ecomerce nao é necessario cadastro de usuario mas será necessario para executar compras no site. Mandei a logo da marca em 2 formatos anexado para ser utilizada no site.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lojakepma.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8950058c-5f95-4283-ad3a-220724166484).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
