# SCOOPÉ — Helado artesanal (site demo)

Landing page cinematográfica de uma heladería fictícia em Madri (projeto de portfólio).
Feita com **Vite + Three.js + GSAP/ScrollTrigger + Lenis**, sem framework. Pronta para GitHub e Vercel.

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera /dist
npm run preview   # serve /dist em http://localhost:4173
```

## Deploy na Vercel

1. Suba a pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project → Import** o repositório. O framework "Vite" é detectado sozinho (`vercel.json` já configura build e cache).
3. Deploy. Não há variáveis de ambiente.

## O que tem

| Seção | Destaques |
|---|---|
| Loader | Casquinha enchendo conforme o carregamento real (fontes + 3D) e saída com wipe |
| Hero | Taça 3D gerada em código (bolas com textura cremosa, calda escorrendo, barquilho, menta, morangos, chocolate). Parallax com mouse e toque, partículas, intro em que as bolas caem na taça |
| Marquees | Duas faixas cruzadas que aceleram e invertem conforme a velocidade do scroll |
| Sabores | Carrossel com swipe nativo, arraste com mouse, setas, teclado e barra de progresso. Cards com tilt 3D e brilho |
| **Monta tu copa** | Seção fixada (pin) com scroll scrubbed: a taça é montada passo a passo e o preço sobe. Totalmente reversível |
| Más que helado | Máscara que se abre no scroll, parallax, contadores animados |
| Ingredientes | Linha sinuosa desenhada pelo scroll e ícones desenhados em traço |
| Encuéntranos | Mapa ilustrado com rota animada, status "Abierto/Cerrado" ao vivo (fuso de Madri), horário do dia destacado |
| Newsletter | Validação, mensagem de sucesso e confete (demo, sem backend) |
| Carta | Modal com busca sem acento, filtros (Frutales/Cremosos/Veganos), abre destacando o sabor clicado |

## Robustez

- **DPR** máximo 2 (1,75 em telas touch). O 3D pausa fora da viewport e com a aba oculta.
- **Sem WebGL:** imagem estática (`copa.webp`) no lugar do 3D.
- **prefers-reduced-motion:** sem Lenis, sem pin, tudo visível e a taça já montada.
- **Safari/iOS:** `svh`, `overflow: clip` com fallback, `-webkit-` em mask/backdrop, `ignoreMobileResize`.
- **Failsafe:** se o JS não iniciar em 8 s, o loader sai e o conteúdo aparece.
- O Three.js fica em um chunk separado (o bundle principal tem cerca de 58 KB gzip).

## Trocar imagens

Veja `PROMPTS-FOTOS.md`. É só substituir os arquivos em `public/images/` mantendo os nomes.

## Ferramentas de QA (dev)

```bash
npm run dev
node tools/qa.mjs          # screenshots desktop 1440 + iPhone 390×844, scroll ida e volta, erros de console
node tools/interact.mjs    # menu, carta, busca, filtros, carrossel, newsletter, reduced-motion, sem WebGL
```

> Endereço, telefone e dados são fictícios.
