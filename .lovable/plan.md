# Redefinir as senhas das três contas

As senhas atuais não podem ser lidas (ficam guardadas de forma criptografada). A solução é definir senhas novas e te entregar aqui no chat.

## Contas que receberão senha nova

| E-mail | Perfil | Onde entra |
| --- | --- | --- |
| admin@qu4ttuor.com.br | Administrador | Painel administrativo |
| admin@quattuor.com | Administrador | Painel administrativo |
| teste@qu4ttuor.com.br | Cliente | Calculadora e histórico |

## O que será feito

1. Definir uma senha forte e diferente para cada uma das três contas.
2. Garantir que os três e-mails estejam confirmados e as contas ativas, para o acesso funcionar de primeira.
3. Informar as três senhas na resposta do chat, junto com o endereço da tela de login.
4. Recomendar a troca da senha depois do primeiro acesso, pela opção "Esqueceu a senha?".

Nada mais será alterado: cálculos, dados, histórico, relatórios e telas ficam exatamente como estão.

## Detalhe técnico

A troca é feita pela API administrativa de autenticação do backend (atualização de senha por usuário), sem migração de banco e sem mexer em tabelas do projeto.
