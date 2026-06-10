# Kit Clínico

Site estático de **calculadoras clínicas** para médicos, nutricionistas e
veterinários. Publicado via **GitHub Pages** em <https://kitclinico.com.br>.

## Estrutura

```
/
├── index.html                seletor de área
├── medicina.html             hub de calculadoras médicas (com busca)
├── nutricao.html             hub de nutrição
├── veterinaria.html          hub de veterinária
├── medicina/  nutricao/  veterinaria/   páginas das calculadoras
├── sobre.html, privacidade.html, 404.html
├── css/style.css             folha de estilo única (responsiva)
├── js/
│   ├── clinical.js           núcleo de fórmulas clínicas (testado)
│   ├── config.js             configuração (ID do AdSense)
│   └── app.js                menu, busca, anúncios, utilidades
├── CNAME, robots.txt, sitemap.xml, .nojekyll, favicon.svg, og-image.png
```

Sem etapa de build: HTML/CSS/JS puro.

## Rodar localmente

```bash
python -m http.server 8000   # acesse http://localhost:8000
```

## Publicar

O conteúdo é servido da branch `main`. O arquivo `CNAME` aponta o GitHub Pages
para `kitclinico.com.br`. No registrador do domínio, configure 4 registros `A`
para os IPs do GitHub Pages (185.199.108–111.153) e um `CNAME` de `www`.

## Monetização

Os espaços `<div class="ad-slot">` ficam ocultos enquanto `adsenseClient`
estiver vazio em `js/config.js`. Preencha o ID do AdSense quando aprovado.

## Núcleo de fórmulas

`js/clinical.js` reúne as fórmulas e índices (IMC, BSA, CKD-EPI, Cockcroft-Gault,
QTc, eletrólitos corrigidos, TMB, RER/MER veterinário,
entre outras), verificados contra valores de referência.

---

**Uso educacional.** As calculadoras não substituem o julgamento clínico de um
profissional de saúde habilitado.
