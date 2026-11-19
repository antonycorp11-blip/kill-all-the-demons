# Kill All the Demons

Auto battler incremental em pixel art (landscape, mobile-first, também roda no desktop).
Toda a arte (soldados, demônios, chefes, cenários, fortaleza, ícones), efeitos e áudio são gerados por código — não há arquivos de imagem ou som.

## Como rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173 (use --host para testar no celular pela rede)
npm run build    # gera dist/ (estático, pode hospedar em qualquer lugar)
npm run preview  # serve o build
```

## Controles
- O exército luta, recruta e evolui sozinho.
- Barra inferior: Convocar Tropa (ou Espaço), Classes/Evoluir, Melhorias, Formação, Habilidades do Comandante e as 4 habilidades (teclas 1–4).
- Pausa: engrenagem, ESC/P ou toque com dois dedos.
- Velocidade 1x/2x/3x: pílula ao lado da onda ou nas Configurações.

## Estrutura
```
src/
  main.ts                 bootstrap do Phaser + save/áudio
  core/                   formatador numérico, estado/save versionado, modificadores derivados
  data/                   balanceamento: unidades, demônios, regiões, chefes, melhorias, árvore, bênçãos
  art/                    pintor de pixel art + geradores de humanos, demônios, chefes, cenários, FX, ícones
  battle/                 simulação: world (IA, combate, recompensas), army, waves, boss, skills, projéteis, fx, grid
  scenes/                 BootScene (gera arte), BattleScene (loop, câmera, fortaleza, regiões)
  ui/ui.ts + style.css    HUD, menus, acampamento, árvore, códex, resultado, tutorial
  audio/audio.ts          SFX e música procedurais (WebAudio)
  dev.ts                  bot de balanceamento (só em `npm run dev`): no console, __bot(300)
preview.html              galeria da arte gerada (npm run dev → /preview.html?m=units|demons|bosses|terrain0..5|icons)
```

Equilíbrio: todos os números ficam em `src/data/*` e nas curvas de `src/core/mods.ts`.
