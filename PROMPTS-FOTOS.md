# Prompts de fotos (ChatGPT) — SCOOPÉ

O site já vem com **renders 3D próprios** em `public/images/`. As fotos são opcionais. Se quiser deixar o site mais "real", gere as imagens abaixo e:

- **Opção A (recomendada):** me envie as imagens. Eu recorto, otimizo para `.webp` e encaixo.
- **Opção B:** converta para `.webp` (por exemplo em squoosh.app), use **exatamente o mesmo nome** e substitua o arquivo em `public/images/`.

> Os cards usam imagens **sem fundo (PNG transparente)**. Por isso todo prompt pede "transparent background". Se o ChatGPT entregar com fundo, peça: *"remove the background, transparent PNG"*.

Estilo comum (cole no início de cada prompt):

```
Premium food photography, artisanal gelato, soft cinematic studio light from the upper left, warm rim light, creamy realistic texture with visible scoop ridges, shallow depth of field, color palette: cream #F6EDE1, raspberry #8F2436, pink #E8A3AB, sage #C9C993, chocolate #5B3324. No text, no logos, no hands.
```

| Arquivo | Onde aparece | Prompt (depois do estilo comum) |
|---|---|---|
| `sabor-fresa.webp` | Card "Fresa Bliss" + newsletter | `One single scoop of strawberry gelato with glossy red berry syrup dripping down the sides and small strawberry pieces, 3/4 view, transparent background, PNG, 1:1` |
| `sabor-pistacho.webp` | Card "Sueño de Pistacho" | `One single scoop of pistachio gelato, soft sage green, sprinkled with chopped pistachios, 3/4 view, transparent background, PNG, 1:1` |
| `sabor-chocolate.webp` | Card "Obsesión de Chocolate" | `One single scoop of dark chocolate gelato with chocolate chunks and shavings, glossy, 3/4 view, transparent background, PNG, 1:1` |
| `sabor-vainilla.webp` | Card "Vainilla Bourbon" | `One single scoop of vanilla bean gelato with visible black vanilla seeds, ivory color, 3/4 view, transparent background, PNG, 1:1` |
| `sabor-turron.webp` | Card "Turrón de Jijona" | `One single scoop of Spanish turrón (almond nougat) gelato, light caramel beige, with toasted almond pieces and a drizzle of honey, transparent background, PNG, 1:1` |
| `sabor-mango.webp` | Card "Mango & Maracuyá" | `One single scoop of mango passion fruit sorbet, vibrant orange, a few passion fruit seeds on top, transparent background, PNG, 1:1` |
| `cucuruchos.webp` | Seção "Más que helado" (painel escuro) | `Two waffle cones side by side slightly tilted toward each other, left with strawberry gelato, right with vanilla gelato, transparent background, PNG, portrait 4:5` |
| `copa.webp` | Só aparece se o 3D falhar (fallback) | `Cream ceramic bowl with three scoops: strawberry with red syrup, pistachio, dark chocolate, a fan wafer and mint leaves on top, chocolate chunks and fresh strawberries beside it, transparent background, PNG, 1:1` |
| `og.jpg` | Prévia no WhatsApp/Instagram | Já gerado automaticamente (print do hero). Mantenha 1200×630. |

**Dica:** peça no ChatGPT *"same lighting and camera angle as the previous image"* entre um sabor e outro. Assim os cards ficam consistentes.
