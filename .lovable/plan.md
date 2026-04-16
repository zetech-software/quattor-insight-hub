

## Plano: Trocar ordem dos campos 3 e 4

Trocar a posição das seções no formulário:

- **Campo 3 atual** (Cálculo VCT) → vira **Campo 4**
- **Campo 4 atual** (Fator de Correção do CT) → vira **Campo 3**

### Alterações em `src/pages/Index.tsx`:
1. Mover o bloco JSX da seção "Fator de Correção do CT" para antes do bloco "Cálculo VCT"
2. Atualizar os números nos badges circulares (3 ↔ 4)
3. Atualizar os títulos para refletir a nova numeração

Nenhuma alteração em lógica de cálculo ou banco de dados — apenas reordenação visual.

