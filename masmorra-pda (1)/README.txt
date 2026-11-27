A MASMORRA — JOGO COM AUTÔMATO DE PILHA (PDA)

ENREDO
O mago Ilan perdeu o grimório numa masmorra. A saída é um portal protegido por duas
passagens seladas. A estrela dá a energia (E) do portal; cada passagem consome uma
chave (K). Há 3 chaves no mapa e só 2 passagens: faltar chave trava a passagem,
sobrar chave faz o portal rejeitar o mago.

ARQUIVOS
- index.html: estrutura da página.
- styles.css: aparência e layout.
- extra.css: estilos do enredo, do diagrama e do mapa maior.
- game.js: movimentação, pilha e regras do PDA.
- diagrama-pda.svg: diagrama de estados (usado se jflap-pda.png não existir).
- jflap-pda.png: (opcional) print do diagrama feito no JFLAP. Se esse arquivo estiver
  na mesma pasta, a página mostra ele no lugar do SVG.

COMO EXECUTAR LOCALMENTE
1. Extraia a pasta.
2. Abra index.html em um navegador moderno (Chrome, Edge ou Firefox).
3. Use W, A, S e D para movimentar o personagem.
4. Colete a estrela e depois quantas chaves quiser (cada chave empilha um K).
5. Fique ao lado de uma passagem e pressione E duas vezes:
   - primeira vez: abre a passagem (símbolo s, exige K no topo);
   - segunda vez: utiliza a chave (símbolo b, desempilha K).
6. Repita na segunda passagem e caminhe até o portal para processar c e alcançar q5.
7. Use o campo "Processar roteiro" para testar sequências diretamente.

REGRAS DO PDA (MESMAS DO DIAGRAMA JFLAP)
Estado inicial: q0
Estado final: q5 (aceitação por estado final)
Pilha inicial: vazia (como no JFLAP)

Origem | Entrada | Pop | Push | Destino
q0     | *       | λ   | E    | q1
q1     | a       | λ   | K    | q2
q2     | a       | λ   | K    | q2
q2     | s       | K   | K    | q3
q3     | b       | K   | λ    | q4
q4     | s       | K   | K    | q3
q4     | c       | E   | λ    | q5

Linguagem aceita: * a^n (s b)^n c, com n >= 1.
A pilha é o que obriga o número de chaves a ser igual ao número de passagens usadas:
- sobrou chave (ex.: *aasbc): em q4 o topo é K e o portal exige E, então rejeita;
- faltou chave (ex.: *asbsbc): a segunda passagem exige K no topo e encontra E, então rejeita.

EXEMPLOS NA INTERFACE
*asbc     aceita
*aasbsbc  aceita
*aasbc    rejeitada (sobrou chave)
*asbsbc   rejeitada (faltou chave)

A pilha é representada por um array JavaScript. O último elemento é o topo.

PUBLICAR NO GITHUB PAGES
1. Crie um repositório no GitHub.
2. Envie index.html, styles.css, extra.css, game.js, diagrama-pda.svg e, se tiver,
   jflap-pda.png (o README é opcional).
3. No repositório, abra Settings > Pages.
4. Em Build and deployment, escolha Deploy from a branch.
5. Selecione a branch main e a pasta / (root), depois clique em Save.
6. Aguarde a publicação e abra o endereço fornecido pelo GitHub Pages.

OBSERVAÇÃO
O jogo não utiliza bibliotecas externas. A fonte do Google Fonts é apenas decorativa;
se não houver internet, o navegador utilizará fontes locais alternativas.
