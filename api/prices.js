const COMMODITIES = [
  { symbol: 'XAU', label: 'GOLD (XAU/USD)',       ticker: 'GC=F' },
  { symbol: 'XAG', label: 'SILVER (XAG/USD)',      ticker: 'SI=F' },
  { symbol: 'XPT', label: 'PLATINUM (XPT/USD)',    ticker: 'PL=F' },
  { symbol: 'XPD', label: 'PALLADIUM (XPD/USD)',   ticker: 'PA=F' },
  { symbol: 'oil', label: 'CRUDE OIL (CL1)',        ticker: 'CL=F' },
];

async function fetchYahoo(ticker) {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=1m`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('no meta');
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  return { price, changePct };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  const results = await Promise.allSettled(
    COMMODITIES.map((c) =>
      fetchYahoo(c.ticker).then((d) => ({ symbol: c.symbol, label: c.label, ...d }))
    )
  );

  const prices = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  res.status(200).json(prices);
}
