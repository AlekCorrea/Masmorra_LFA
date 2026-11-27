(() => {
  'use strict';

  // PDA equivalente ao diagrama criado no JFLAP.
  // Linguagem aceita: * a^n (s b)^n c, com n >= 1.
  // A pilha é um array: o último elemento é o topo. Começa vazia (como no JFLAP).
  const INITIAL_STACK = [];
  const FINAL_STATE = 'q5';
  const transitions = {
    'q0|*': { pop: null, push: 'E', next: 'q1' }, // coletar a estrela
    'q1|a': { pop: null, push: 'K', next: 'q2' }, // primeira chave
    'q2|a': { pop: null, push: 'K', next: 'q2' }, // mais uma chave (laço)
    'q2|s': { pop: 'K', push: 'K', next: 'q3' },  // abrir passagem (exige K no topo)
    'q3|b': { pop: 'K', push: null, next: 'q4' }, // usar a chave (consome K)
    'q4|s': { pop: 'K', push: 'K', next: 'q3' },  // abrir a próxima passagem
    'q4|c': { pop: 'E', push: null, next: 'q5' }  // portal: só abre se não sobrou K
  };

  const SYMBOL_NAMES = {
    '*': 'coletar estrela',
    a: 'coletar chave',
    s: 'abrir passagem',
    b: 'usar chave',
    c: 'entrar no portal'
  };

  // Dicas quando a pilha é o motivo da rejeição (símbolo|topo).
  const STACK_HINTS = {
    's|E': 'Não há chave sobrando na pilha: colete mais chaves antes de abrir esta passagem.',
    's|vazio': 'Não há chave na pilha.',
    'c|K': 'Ainda sobraram chaves na pilha: o portal só abre se todas as chaves foram usadas.',
    'b|E': 'Não há chave para usar.'
  };

  const mapEl = document.getElementById('gameMap');
  const messageEl = document.getElementById('gameMessage');
  const stateEl = document.getElementById('currentState');
  const symbolEl = document.getElementById('currentSymbol');
  const stackEl = document.getElementById('stackView');
  const routeEl = document.getElementById('routeView');
  const routeCountEl = document.getElementById('routeCount');
  const statusEl = document.getElementById('pdaStatus');
  const sequenceForm = document.getElementById('sequenceForm');
  const sequenceInput = document.getElementById('sequenceInput');
  const sequenceResult = document.getElementById('sequenceResult');

  const COLS = 15;
  const ROWS = 5;
  mapEl.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;

  // Paredes: borda + pilares que formam os nichos das chaves e fecham as passagens.
  const walls = new Set();
  for (let x = 0; x < COLS; x++) { walls.add(`${x},0`); walls.add(`${x},${ROWS - 1}`); }
  for (let y = 0; y < ROWS; y++) { walls.add(`0,${y}`); walls.add(`${COLS - 1},${y}`); }
  [3, 5, 7, 9, 10, 12].forEach(x => { walls.add(`${x},1`); walls.add(`${x},3`); });

  const START = { x: 1, y: 2 };

  const initialGame = () => ({
    player: { ...START },
    star: { x: 2, y: 2, collected: false },
    keys: [
      { x: 4, y: 1, collected: false },
      { x: 6, y: 3, collected: false },
      { x: 8, y: 1, collected: false }
    ],
    // stage 0 = fechada, 1 = aberta com 's' (falta usar a chave), 2 = liberada com 'b'
    gates: [
      { x: 10, y: 2, stage: 0 },
      { x: 12, y: 2, stage: 0 }
    ],
    portal: { x: 13, y: 2 },
    state: 'q0',
    stack: [...INITIAL_STACK],
    route: [],
    lastSymbol: null,
    finished: false,
    failed: false
  });
  let game = initialGame();

  // Uma etapa do PDA, usada tanto pelo jogo quanto pelo testador de sequências.
  function step(state, stack, symbol) {
    const rule = transitions[`${state}|${symbol}`];
    if (!rule) {
      return { ok: false, reason: `não existe transição de ${state} lendo '${symbol}'.` };
    }
    const top = stack[stack.length - 1];
    if (rule.pop !== null && top !== rule.pop) {
      return {
        ok: false,
        stackFail: true,
        top,
        reason: `a transição exige ${rule.pop} no topo da pilha, mas o topo é ${top ?? 'vazio'}.`
      };
    }
    const newStack = [...stack];
    if (rule.pop !== null) newStack.pop();
    if (rule.push !== null) newStack.push(rule.push);
    return { ok: true, state: rule.next, stack: newStack };
  }

  function setMessage(text, type = 'neutral') {
    messageEl.textContent = text;
    statusEl.className = `pda-status ${type}`;
    const label = type === 'accept' ? 'Sequência aceita' : type === 'reject' ? 'Ação rejeitada' : 'Em andamento';
    statusEl.innerHTML = `<span class="status-icon">${type === 'accept' ? '✓' : type === 'reject' ? '✕' : '●'}</span><span>${label}</span>`;
  }

  function render() {
    stateEl.textContent = game.state;
    symbolEl.textContent = game.lastSymbol ?? '—';
    stackEl.innerHTML = '';
    [...game.stack].reverse().forEach((token, index) => {
      const span = document.createElement('span');
      span.className = 'stack-token';
      span.textContent = token;
      span.title = index === 0 ? 'Topo da pilha' : 'Elemento da pilha';
      stackEl.appendChild(span);
    });
    if (!game.stack.length) stackEl.textContent = 'Pilha vazia';
    routeCountEl.textContent = `${game.route.length} símbolo${game.route.length === 1 ? '' : 's'}`;
    routeEl.innerHTML = '';
    if (!game.route.length) routeEl.textContent = 'Ainda não há símbolos.';
    game.route.forEach(symbol => {
      const span = document.createElement('span');
      span.className = 'route-symbol';
      span.textContent = symbol;
      routeEl.appendChild(span);
    });

    mapEl.innerHTML = '';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = document.createElement('div');
        const key = `${x},${y}`;
        tile.className = `tile ${walls.has(key) ? 'wall' : 'floor'}`;
        const gate = game.gates.find(g => g.x === x && g.y === y);
        if (x === game.player.x && y === game.player.y) {
          tile.classList.add('player'); tile.innerHTML = '<span class="sprite">🧙</span>';
        } else if (x === game.star.x && y === game.star.y && !game.star.collected) {
          tile.innerHTML = '<span class="sprite">⭐</span>';
        } else if (game.keys.some(k => k.x === x && k.y === y && !k.collected)) {
          tile.innerHTML = '<span class="sprite">🗝️</span>';
        } else if (gate) {
          tile.innerHTML = `<span class="sprite">${gate.stage === 2 ? '🚪' : '🔒'}</span>`;
          if (gate.stage === 2) tile.classList.add('exit');
        } else if (x === game.portal.x && y === game.portal.y) {
          tile.innerHTML = '<span class="sprite">🌀</span>';
          tile.classList.add('exit');
        } else if (x === START.x && y === START.y) {
          tile.classList.add('exit');
        }
        mapEl.appendChild(tile);
      }
    }
  }

  function processSymbol(symbol) {
    const result = step(game.state, game.stack, symbol);
    if (!result.ok) {
      game.failed = true;
      const hint = result.stackFail ? STACK_HINTS[`${symbol}|${result.top ?? 'vazio'}`] : '';
      setMessage(
        `Ação '${symbol}' (${SYMBOL_NAMES[symbol]}) rejeitada: ${result.reason}${hint ? ' ' + hint : ''} Reinicie para tentar novamente.`,
        'reject'
      );
      render();
      return false;
    }
    game.state = result.state;
    game.stack = result.stack;
    game.lastSymbol = symbol;
    game.route.push(symbol);
    if (game.state === FINAL_STATE) {
      game.finished = true;
      setMessage('Parabéns! Você alcançou o portal sem nenhuma chave sobrando e chegou ao estado final q5. Sequência aceita!', 'accept');
    } else {
      const descriptions = {
        '*': 'Estrela coletada! (E empilhado)',
        a: 'Chave coletada! (K empilhado)',
        s: 'Passagem aberta! Pressione E de novo para usar a chave.',
        b: 'Chave utilizada! (K desempilhado)'
      };
      setMessage(`${descriptions[symbol] || 'Símbolo processado.'} Estado atual: ${game.state}.`, 'neutral');
    }
    render();
    return true;
  }

  function move(direction) {
    if (game.finished || game.failed) return;
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
    const nx = game.player.x + delta[0];
    const ny = game.player.y + delta[1];
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || walls.has(`${nx},${ny}`)) return;
    const gate = game.gates.find(g => g.x === nx && g.y === ny);
    if (gate && gate.stage < 2) {
      setMessage('A passagem está bloqueada. Aproxime-se dela e pressione E (uma vez para abrir, outra para usar a chave).', 'neutral');
      return;
    }
    game.player = { x: nx, y: ny };

    if (nx === game.star.x && ny === game.star.y && !game.star.collected) {
      if (!processSymbol('*')) return;
      game.star.collected = true;
    } else {
      const key = game.keys.find(k => k.x === nx && k.y === ny && !k.collected);
      if (key) {
        if (!processSymbol('a')) return;
        key.collected = true;
      } else if (nx === game.portal.x && ny === game.portal.y) {
        processSymbol('c');
        return;
      }
    }
    render();
  }

  function interact() {
    if (game.finished || game.failed) return;
    const gate = game.gates.find(g =>
      g.stage < 2 && Math.abs(game.player.x - g.x) + Math.abs(game.player.y - g.y) <= 1
    );
    if (!gate) {
      setMessage('Aproxime-se de uma passagem fechada para interagir com ela.', 'neutral');
      return;
    }
    if (gate.stage === 0) {
      if (processSymbol('s')) gate.stage = 1;
    } else if (gate.stage === 1) {
      if (processSymbol('b')) {
        gate.stage = 2;
        const left = game.gates.some(g => g.stage < 2);
        setMessage(
          left
            ? `Chave utilizada! Passagem liberada. Estado atual: ${game.state}. Siga até a próxima passagem.`
            : `Chave utilizada! Última passagem liberada. Estado atual: ${game.state}. Siga até o portal!`,
          'neutral'
        );
        render();
      }
    }
  }

  function resetGame() {
    game = initialGame();
    sequenceResult.className = 'sequence-result';
    sequenceResult.textContent = 'O resultado do teste aparecerá aqui.';
    sequenceInput.value = '';
    setMessage('Colete a estrela e as chaves (cada passagem consome uma). Aproxime-se da passagem e pressione E duas vezes: primeiro para abrir, depois para usar a chave.');
    render();
  }

  function runSequence(sequence) {
    const clean = sequence.trim();
    if (!clean) {
      sequenceResult.className = 'sequence-result reject';
      sequenceResult.textContent = 'Digite uma sequência para testar.';
      return;
    }
    let state = 'q0';
    let stack = [...INITIAL_STACK];
    let failure = '';
    let position = 0;
    for (const symbol of clean) {
      position++;
      const result = step(state, stack, symbol);
      if (!result.ok) {
        failure = `no símbolo ${position} ('${symbol}'), ${result.reason}`;
        break;
      }
      state = result.state;
      stack = result.stack;
    }
    const stackText = stack.length ? stack.join('') + ' (topo à direita)' : 'vazia';
    if (!failure && state === FINAL_STATE) {
      sequenceResult.className = 'sequence-result accept';
      sequenceResult.textContent = `ACEITA — processamento terminou em ${state}. Pilha final: ${stackText}.`;
    } else {
      sequenceResult.className = 'sequence-result reject';
      sequenceResult.textContent = `REJEITADA — ${failure || `a sequência terminou em ${state}, e não no estado final ${FINAL_STATE}.`}`;
    }
  }

  document.addEventListener('keydown', event => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const key = event.key.toLowerCase();
    const directions = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
    if (directions[key]) { event.preventDefault(); move(directions[key]); }
    else if (key === 'e' || key === ' ') { event.preventDefault(); interact(); }
  });
  document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => move(button.dataset.move)));
  document.getElementById('interactButton').addEventListener('click', interact);
  document.getElementById('resetGame').addEventListener('click', resetGame);
  sequenceForm.addEventListener('submit', event => { event.preventDefault(); runSequence(sequenceInput.value); });
  document.querySelectorAll('[data-sequence]').forEach(button => button.addEventListener('click', () => {
    sequenceInput.value = button.dataset.sequence;
    runSequence(button.dataset.sequence);
  }));

  render();
})();
