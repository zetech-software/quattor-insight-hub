# Verificação de segurança do perfil Suporte (somente teste)

Objetivo: comprovar, na prática, que a conta suporte@qu4ttuor.com.br não consegue alterar campos sensíveis do próprio cadastro, mesmo tendo acesso às telas administrativas. Nada será alterado se todas as tentativas forem recusadas.

## O que já foi conferido nas regras atuais

- Cadastro (perfis): a conta pode gravar apenas a própria linha, e uma regra automática recusa mudanças em situação ativa/inativa, troca obrigatória de senha, identificador, dono da linha e data de cadastro para quem não é Dono/Gestão.
- Papéis/permissões: gravar, criar ou apagar exige Dono. Suporte só tem leitura.
- Planos/assinaturas: qualquer alteração exige Dono. Suporte só tem leitura.

Ou seja, pelas regras, todas as seis tentativas devem falhar. O teste ao vivo serve para confirmar sem depender da leitura das regras.

## Teste que será executado

Entrando de verdade com a conta de Suporte e chamando o backend diretamente (fora das telas), tentar seis vezes:

1. Ativar/desativar a própria conta
2. Marcar troca obrigatória de senha
3. Mudar o próprio papel para Dono (e inserir novo papel)
4. Trocar o dono da linha do cadastro
5. Alterar a data de cadastro
6. Criar/alterar plano ou assinatura para si

Depois de cada tentativa, o cadastro é lido novamente para conferir se algum valor mudou. No fim, comparo os valores antes e depois.

O Dono não é testado com escrita: os poderes dele permanecem como estão.

## Resultado

- Se todas as seis tentativas forem recusadas ou ignoradas sem efeito: nada é alterado, e eu confirmo com o antes/depois.
- Se alguma passar: corrijo apenas essa falha (ajuste da regra correspondente), refaço o teste e devolvo o valor original.

## Detalhes técnicos

- Sessão real da conta de suporte via minter de sessão; chamadas REST autenticadas com a chave pública, sem chave de serviço.
- Snapshot antes/depois em `profiles`, `user_roles` e `subscriptions` para o usuário de suporte.
- Ao final: bateria de testes automatizados, verificação de tipos e build de produção.
