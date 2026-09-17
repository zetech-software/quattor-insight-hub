# Teste real de recuperação de senha — conta Cliente

Executar o fluxo completo de recuperação de senha na conta `enzo@zeregistra.com.br`, definindo uma nova senha temporária forte, e devolver essa senha para os seus testes manuais. Nada mais é alterado: nenhuma mudança em Proprietário, Suporte, perfis, permissões ou código.

## Sequência do teste

1. Pedir a recuperação pela tela de entrada com o e-mail do cliente e confirmar a mensagem neutra.
2. Abrir a tela de redefinição por um link de recuperação válido dessa conta.
3. Definir uma nova senha temporária forte (12+ caracteres, letras, números e símbolo), gerada aleatoriamente na hora.
4. Confirmar que a senha antiga não entra mais.
5. Confirmar que a nova senha entra normalmente.
6. Confirmar que o perfil continua `client`, ativo, sem troca obrigatória pendente.
7. Com a nova senha, abrir calculadora, histórico próprio, Regina e Chamados.
8. Tentar as rotas administrativas (painel, clientes, relatórios) e confirmar o redirecionamento de volta.

## O que não muda

- Contas Proprietário e Suporte: intocadas.
- Papel, permissões, perfil e a marcação de troca obrigatória do cliente: sem alteração.
- Nenhum arquivo do projeto é modificado — é só teste.

## Entrega

Relatório curto com o resultado de cada item acima e a nova senha temporária do cliente, informada no chat para você continuar os testes manuais.

## Detalhes técnicos

- Sessão de recuperação obtida pelo mecanismo oficial de autenticação, restaurada no navegador de teste apenas para abrir `/reset-password`.
- Troca efetiva via `supabase.auth.updateUser` pela própria tela, não por escrita direta no banco.
- Verificação de senha antiga/nova por `signInWithPassword` contra a API de autenticação.
- Conferência de papel/perfil por consulta somente leitura em `user_roles` e `profiles`.
- Navegação e bloqueios verificados via Playwright em `http://localhost:8080`, sem reiniciar o servidor.
- A senha temporária aparecerá apenas na resposta do chat; não será gravada em arquivo, log ou código.
