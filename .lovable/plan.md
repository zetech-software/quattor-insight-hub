# Diagnóstico e melhorias futuras (nada será alterado agora)

Levantamento feito sobre o sistema atual: calculadora de recebimento de diesel,
histórico do cliente, área administrativa (painel, clientes, relatórios), assistente PET,
geração de PDFs e login por convite. Nenhuma tela, campo, regra ou dado é removido em
nenhuma das sugestões abaixo — todas são adições.

---

## Melhorias rápidas

### 1. Filtros no histórico do cliente (período, situação, placa)
- **Necessidade:** hoje há apenas uma busca por texto; encontrar entregas de um mês ou só as com falta exige rolar tudo.
- **Como funcionaria:** barra de filtros acima da tabela com intervalo de datas, situação (falta/sobra/conforme) e placa, somados à busca atual.
- **Benefício:** localização imediata de conferências específicas.
- **Impacto:** nenhum; só acrescenta controles.
- **Complexidade:** baixa · **Prioridade:** alta · **Sem alterar o atual:** sim

### 2. Totais e indicadores no topo do histórico
- **Necessidade:** o cliente não vê o acumulado de faltas e sobras do período.
- **Como funcionaria:** quatro cartões: número de conferências, litros de falta, litros de sobra, saldo líquido — recalculados conforme os filtros.
- **Benefício:** visão gerencial imediata de perdas.
- **Impacto:** nenhum.
- **Complexidade:** baixa · **Prioridade:** alta · **Sem alterar o atual:** sim

### 3. Confirmação antes de excluir um cálculo
- **Necessidade:** a exclusão no histórico é imediata e irreversível.
- **Como funcionaria:** caixa de confirmação com os dados da conferência antes de apagar.
- **Benefício:** evita perda acidental de conferência.
- **Impacto:** nenhum na regra; só um passo a mais.
- **Complexidade:** baixa · **Prioridade:** alta · **Sem alterar o atual:** sim

### 4. Ordenação por coluna e paginação na tabela
- **Necessidade:** com centenas de registros a tabela fica pesada e sem ordem escolhida.
- **Como funcionaria:** clique no cabeçalho ordena; carregamento por páginas.
- **Benefício:** rapidez e leitura mais confortável.
- **Impacto:** nenhum.
- **Complexidade:** baixa · **Prioridade:** média · **Sem alterar o atual:** sim

### 5. Exportação em CSV mais completa e também em Excel
- **Necessidade:** o CSV atual traz poucas colunas e não inclui situação da seta, temperaturas nem densidades.
- **Como funcionaria:** manter o CSV atual e acrescentar a opção "exportação completa" com todas as colunas, mais um formato Excel.
- **Benefício:** conferência e auditoria fora do sistema.
- **Impacto:** nenhum; formato atual preservado.
- **Complexidade:** baixa · **Prioridade:** média · **Sem alterar o atual:** sim

### 6. Melhorias de uso no celular
- **Necessidade:** a conferência acontece em campo, no telefone; tabelas largas e campos numéricos pequenos atrapalham.
- **Como funcionaria:** tabela vira lista de cartões em telas pequenas, teclado numérico nos campos de volume e temperatura, botões maiores.
- **Benefício:** preenchimento rápido na portaria.
- **Impacto:** apenas visual em telas pequenas.
- **Complexidade:** baixa/média · **Prioridade:** alta · **Sem alterar o atual:** sim

### 7. Duplicar uma conferência anterior
- **Necessidade:** entregas do mesmo fornecedor repetem quase todos os dados.
- **Como funcionaria:** botão "usar como base" no histórico, que abre a calculadora já preenchida.
- **Benefício:** menos digitação e menos erro.
- **Impacto:** nenhum.
- **Complexidade:** baixa · **Prioridade:** média · **Sem alterar o atual:** sim

---

## Melhorias de médio prazo

### 8. Painel do cliente com evolução no tempo
- **Necessidade:** o cliente só tem a lista; falta a leitura de tendência.
- **Como funcionaria:** nova página com gráfico mensal de falta/sobra, ranking de placas com mais divergência e percentual de aprovação de qualidade.
- **Benefício:** identifica fornecedor ou transportador problemático.
- **Complexidade:** média · **Prioridade:** alta · **Sem alterar o atual:** sim

### 9. Alertas automáticos de divergência
- **Necessidade:** faltas relevantes só aparecem se alguém abrir o sistema.
- **Como funcionaria:** limite configurável (litros ou percentual); ao ultrapassar, aviso na tela e e-mail ao responsável e ao administrador.
- **Benefício:** reação no mesmo dia da entrega.
- **Complexidade:** média · **Prioridade:** alta · **Sem alterar o atual:** sim

### 10. Registro de auditoria de ações
- **Necessidade:** não há rastro de quem criou, editou ou excluiu conferências e clientes.
- **Como funcionaria:** nova tabela de eventos, gravada em paralelo, com tela de consulta para administradores.
- **Benefício:** defesa em discussões contratuais e controle interno.
- **Complexidade:** média · **Prioridade:** alta · **Sem alterar o atual:** sim

### 11. Anexos e assinatura na conferência
- **Necessidade:** foto do lacre, do termômetro e da NF ficam fora do sistema.
- **Como funcionaria:** upload de imagens por conferência e campo de assinatura do conferente, ambos incluídos no PDF.
- **Benefício:** laudo mais robusto como evidência operacional.
- **Complexidade:** média · **Prioridade:** média · **Sem alterar o atual:** sim

### 12. Cadastros auxiliares de transportadora, placa e fornecedor
- **Necessidade:** placa e município são digitados livremente, gerando grafias diferentes do mesmo veículo.
- **Como funcionaria:** listas com sugestão automática, mantendo a digitação livre como alternativa.
- **Benefício:** relatórios por transportador confiáveis.
- **Complexidade:** média · **Prioridade:** média · **Sem alterar o atual:** sim

### 13. PDF com identidade visual e versão resumida
- **Necessidade:** o laudo atual é funcional, mas não tem logo, numeração de laudo nem versão de uma página para o motorista.
- **Como funcionaria:** cabeçalho com logo e número sequencial, rodapé com validade e disclaimer legal, e opção "resumo em uma página".
- **Benefício:** apresentação profissional ao fornecedor.
- **Complexidade:** média · **Prioridade:** média · **Sem alterar o atual:** sim

### 14. Validações adicionais no preenchimento
- **Necessidade:** valores impossíveis (temperatura fora de faixa, densidade fora do diesel, volume zero) passam hoje.
- **Como funcionaria:** avisos não bloqueantes com faixas esperadas, e bloqueio somente para o que é claramente inválido.
- **Benefício:** menos laudo refeito.
- **Complexidade:** baixa/média · **Prioridade:** alta · **Sem alterar o atual:** sim

### 15. Relatório mensal automático por e-mail
- **Necessidade:** o fechamento do mês é manual.
- **Como funcionaria:** envio programado do consolidado em PDF para cliente e administrador.
- **Benefício:** recorrência de valor percebido, sem esforço.
- **Complexidade:** média · **Prioridade:** média · **Sem alterar o atual:** sim

### 16. Gestão de acesso mais completa para administradores
- **Necessidade:** hoje há criação de cliente e ativação; falta reenvio de convite, redefinição forçada de senha e visão de último acesso.
- **Como funcionaria:** ações adicionais na tela de clientes.
- **Benefício:** menos suporte manual.
- **Complexidade:** média · **Prioridade:** média · **Sem alterar o atual:** sim

---

## Melhorias estratégicas / futuras

### 17. Múltiplos usuários por empresa e unidades (bases)
- **Necessidade:** hoje o cálculo pertence a um usuário; empresas com várias bases não compartilham histórico.
- **Como funcionaria:** conceito de empresa com usuários vinculados e filtro por base, mantendo o vínculo atual por usuário.
- **Benefício:** venda para clientes maiores.
- **Complexidade:** alta · **Prioridade:** alta · **Sem alterar o atual:** sim, se adicionado como camada acima

### 18. Leitura automática da NF (XML ou chave de acesso)
- **Necessidade:** volume, densidade e número da NF são digitados manualmente.
- **Como funcionaria:** importação do XML da nota preenchendo os campos, com edição livre depois.
- **Benefício:** rapidez e eliminação de erro de digitação.
- **Complexidade:** alta · **Prioridade:** alta · **Sem alterar o atual:** sim

### 19. Cobrança e planos integrados
- **Necessidade:** as assinaturas existem no banco, mas sem cobrança automática.
- **Como funcionaria:** checkout, renovação e bloqueio automático ao expirar.
- **Benefício:** receita recorrente sem controle manual.
- **Complexidade:** alta · **Prioridade:** média · **Sem alterar o atual:** sim

### 20. Aplicativo instalável e uso sem internet
- **Necessidade:** pátios e bases têm sinal ruim.
- **Como funcionaria:** app instalável no celular, com cálculo local e envio quando a conexão voltar.
- **Benefício:** conferência nunca para.
- **Complexidade:** alta · **Prioridade:** média · **Sem alterar o atual:** sim

### 21. Integração com ERP e API pública
- **Necessidade:** os dados ficam isolados do sistema de estoque do cliente.
- **Como funcionaria:** interface de integração para enviar conferências ao ERP.
- **Benefício:** posicionamento como parte do processo, não ferramenta avulsa.
- **Complexidade:** alta · **Prioridade:** média · **Sem alterar o atual:** sim

### 22. PET com contexto dos dados do cliente
- **Necessidade:** o assistente explica regras, mas não comenta os números do próprio cliente.
- **Como funcionaria:** o PET passa a responder sobre as conferências do usuário ("por que faltou nessa entrega?").
- **Benefício:** diferencial competitivo forte.
- **Complexidade:** alta · **Prioridade:** média · **Sem alterar o atual:** sim

---

## Melhorias técnicas e de segurança (só adição)

- Registro central de erros e monitoramento, hoje inexistente.
- Carregamento em páginas nas consultas do painel administrativo, que hoje trazem todos os registros de uma vez.
- Ampliar a suíte automatizada para telas e geração de PDF (hoje cobre bem os cálculos).
- Revisão periódica automática das regras de acesso ao banco.
- Acessibilidade: contraste, navegação por teclado e leitura por leitores de tela nos formulários.
- Guardar a versão da regra de cálculo em cada conferência, para que registros antigos sempre possam ser explicados.

---

## As 10 melhorias prioritárias para a diretoria

1. Alertas automáticos de divergência de volume
2. Filtros e totais no histórico do cliente
3. Painel do cliente com evolução mensal e ranking de transportadores
4. Registro de auditoria de ações
5. Melhorias de uso no celular para conferência em campo
6. Leitura automática da NF a partir do XML
7. Anexos (fotos) e assinatura do conferente no laudo
8. PDF com identidade visual, numeração de laudo e resumo de uma página
9. Validações adicionais no preenchimento
10. Múltiplos usuários e bases por empresa

Nenhuma implementação foi feita: este documento é apenas diagnóstico e priorização.
