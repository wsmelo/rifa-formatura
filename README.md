# Site da Rifa da Formatura

Site responsivo para selecionar números de 0 a 100, calcular automaticamente R$ 10,00 por número, reservar os números escolhidos e exibir os dados do Pix.

## Chave Pix e números vendidos

Esses dados ficam em `config.js`. A chave atual é `27 996039705` e os números 07, 13, 18, 27, 43 e 49 já começam bloqueados como vendidos.

## Rodar o site

```bash
npm install
npm run dev
```

## Ativar reservas compartilhadas

Sem banco configurado, o site funciona em modo de demonstração e salva novas reservas apenas no navegador atual.

Para impedir que outras pessoas escolham um número já reservado em qualquer celular:

1. Crie um projeto gratuito no Supabase.
2. Abra o SQL Editor do Supabase e execute todo o arquivo `supabase-setup.sql`.
3. Copie `.env.example` para `.env`.
4. Preencha em `.env` a URL e a chave pública `anon` do projeto.
5. Publique o site normalmente (Vercel, Netlify ou hospedagem equivalente).

O banco não permite leitura pública do nome ou WhatsApp. A reserva é atômica para evitar que duas pessoas reservem o mesmo número ao mesmo tempo.
