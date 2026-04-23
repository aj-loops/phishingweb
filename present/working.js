const EX = {
    phish: `Dear Customer,\n\nYour PayPal account has been suspended due to unusual activity. You must verify your account immediately to avoid permanent suspension.\n\nClick here: http://paypal-secure-login.xyz/verify-now\n\nAct now or your account will be permanently closed.\n\n- The PayPal Security Team`,
    short: `Hey! Check this deal: https://bit.ly/3xDeaL99 — free shipping. Click before it expires tonight!`,
    prize: `CONGRATULATIONS! You've won $5,000! Claim your prize, verify your bank details at http://prizewin.top/claim — Limited time! Act now!`,
    sms: `[BANK ALERT] Your account has been compromised. Verify at http://secure-bankofamerica.weblogin.top/verify or your card will be blocked. Do not ignore.`,
    legit: `Hi Sarah,\n\nJust following up on our Monday meeting. I've attached the proposal you asked for. Let me know if you have questions!\n\nBest,\nJames`
};
function lo(k) { document.getElementById('inp').value = EX[k] }
function clearAll() { document.getElementById('inp').value = ''; document.getElementById('results').innerHTML = '' }

const KW = [
    { r: /\burgent\b/i, l: 'Urgency trigger', w: 15 }, { r: /\bact now\b/i, l: 'Urgency trigger', w: 15 },
    { r: /\bverify (now|immediately|your account)\b/i, l: 'Verify now', w: 20 },
    { r: /\b(suspended|blocked|compromised)\b/i, l: 'Account threat', w: 15 },
    { r: /\bclick here\b/i, l: 'Click-bait phrase', w: 10 }, { r: /\bfree\b/i, l: 'Free offer', w: 8 },
    { r: /\bcongratulations\b/i, l: 'Prize lure', w: 12 }, { r: /\byou('ve| have) won\b/i, l: 'Prize lure', w: 18 },
    { r: /\b(claim|redeem) (your )?(prize|reward|gift)\b/i, l: 'Prize lure', w: 18 },
    { r: /\bpassword\b/i, l: 'Password mention', w: 8 }, { r: /\bbank (details|info)\b/i, l: 'Financial data request', w: 22 },
    { r: /\b(credit|debit) card\b/i, l: 'Financial data request', w: 15 },
    { r: /\bsocial security\b/i, l: 'SSN mention', w: 25 }, { r: /\b(otp|one.time (password|code))\b/i, l: 'OTP request', w: 22 },
    { r: /\b(lottery|jackpot)\b/i, l: 'Lottery scam', w: 20 }, { r: /\blimited time\b/i, l: 'Time pressure', w: 12 },
    { r: /\b(confirm|update) (your )?(billing|payment)\b/i, l: 'Payment data request', w: 22 },
    { r: /\bdo not (ignore|delay)\b/i, l: 'Fear tactic', w: 12 },
];
const SHORT = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly', 'tiny.cc', 'is.gd', 'bl.ink', 'rb.gy', 'cutt.ly', 'short.io', 'adf.ly', 'bitly.com', 'x.co', 'snip.ly'];
const BADTLD = ['.xyz', '.top', '.club', '.online', '.site', '.work', '.live', '.email', '.vip', '.icu', '.buzz', '.fun', '.biz', '.gq', '.tk', '.ml', '.cf', '.ga', '.pw', '.click'];
const LEGIT = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'paypal.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'github.com', 'netflix.com', 'youtube.com', 'gmail.com', 'outlook.com', 'yahoo.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com'];

function xURLs(t) { return [...new Set((t.match(/https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+/gi) || []))] }
function dom(u) { try { return (u.startsWith('http') ? new URL(u) : new URL('https://' + u)).hostname.toLowerCase().replace(/^www\./, '') } catch { return u.toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0] } }
function isIP(u) { return /https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(u) }
function isSpoof(d) { return LEGIT.some(l => d !== l && d.includes(l)) }

function runRules(text) {
    let sc = 0; const fi = [];
    const urls = xURLs(text), doms = urls.map(dom);
    const sf = urls.filter(u => SHORT.includes(dom(u)));
    const ip = urls.filter(isIP);
    const bt = urls.filter(u => BADTLD.some(t => dom(u).endsWith(t)));
    const sp = doms.filter(isSpoof);
    const ht = urls.filter(u => u.startsWith('http://'));
    const ms = doms.filter(d => d.split('.').length > 3);

    if (sf.length) { sc += 30; fi.push({ t: 'flag', i: '⚠', h: `Shortened URL (${sf.length} found)`, d: `${sf.map(dom).join(', ')} — real destination is completely hidden.` }) }
    if (ip.length) { sc += 35; fi.push({ t: 'flag', i: '⚠', h: 'Raw IP address in URL', d: `${ip[0]} — no legitimate service links to a bare IP address.` }) }
    if (bt.length) { sc += 20; fi.push({ t: 'flag', i: '⚠', h: 'Suspicious domain extension', d: `${[...new Set(bt.map(dom))].join(', ')} — these TLDs are heavily abused by phishing campaigns.` }) }
    if (sp.length) { sc += 40; fi.push({ t: 'flag', i: '⚠', h: 'Domain impersonation detected', d: `${sp.join(', ')} — this domain is impersonating a trusted brand.` }) }
    if (ht.length) { sc += 15; fi.push({ t: 'warn', i: '!', h: 'No HTTPS encryption', d: 'Link uses HTTP — your data is unencrypted if you visit.' }) }
    if (ms.length) { sc += 10; fi.push({ t: 'warn', i: '!', h: 'Suspicious subdomain structure', d: `${ms.join(', ')} — layered subdomains are a common disguise tactic.` }) }

    const hits = []; KW.forEach(k => { if (k.r.test(text)) { sc += k.w; hits.push(k.l) } });
    const uq = [...new Set(hits)];
    if (uq.length) fi.push({ t: uq.length >= 3 ? 'flag' : 'warn', i: '!', h: `Scam language (${uq.length} signal${uq.length > 1 ? 's' : ''})`, d: uq.join(' · ') });

    const urg = (text.match(/\b(urgent|immediately|act now|expir|limited time|24 hours)\b/gi) || []).length;
    if (urg >= 2) { sc += 15; fi.push({ t: 'flag', i: '⚠', h: 'Heavy urgency pressure', d: `${urg} urgency phrases — designed to stop you thinking clearly.` }) }
    if (!fi.length) fi.push({ t: 'ok', i: '✓', h: 'No suspicious patterns found', d: 'No known phishing or scam signals detected.' });

    return { score: Math.min(sc, 100), fi, urls, doms, sf, ip, bt, sp, ht, ms };
}

async function testAPI() {
    const url = document.getElementById('apiUrl').value.trim() || window.location.origin;
    const el = document.getElementById('cbadge');
    el.className = 'cbadge chk'; el.textContent = 'testing...';
    try {
        const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
        const d = await r.json();
        if (d.status === 'ok') { el.className = 'cbadge ok'; el.textContent = '● connected' }
        else { el.className = 'cbadge err'; el.textContent = '● unexpected' }
    } catch (e) { el.className = 'cbadge err'; el.textContent = '● not reachable' }
}

async function callML(text) {
    const url = document.getElementById('apiUrl').value.trim() || window.location.origin;
    const r = await fetch(`${url}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
}

async function analyze() {
    const text = document.getElementById('inp').value.trim();
    if (!text) return;
    const btn = document.getElementById('scanBtn');
    btn.disabled = true; btn.textContent = '⟳  Scanning...';
    const r = runRules(text);
    const gk = document.getElementById('gsbKey').value.trim();
    render(r, null, true);
    let ml = null;
    try { ml = await callML(text) } catch (e) { ml = { error: e.message } }
    render(r, ml, false);
    if (gk && r.urls.length) checkGSB(r.urls, gk);
    btn.disabled = false; btn.textContent = '⟳  Scan message';
}

function render(r, ml, loading) {
    const { score, fi, urls, doms, sf, ip, bt, sp, ht, ms } = r;
    const LV = [
        { l: 'safe', lb: 'Looks Safe', sb: 'No significant threats detected', ic: '✓', c: 'var(--green)' },
        { l: 'low', lb: 'Low Risk', sb: 'Minor signals — proceed with caution', ic: '!', c: 'var(--amber)' },
        { l: 'medium', lb: 'Medium Risk', sb: 'Multiple suspicious signals found', ic: '!', c: 'var(--amber)' },
        { l: 'high', lb: 'High Risk', sb: 'Do not click links or share information', ic: '⚠', c: 'var(--red)' }
    ];
    const lv = score < 15 ? LV[0] : score < 35 ? LV[1] : score < 65 ? LV[2] : LV[3];

    // ML block
    let mlH = '';
    if (loading) {
        mlH = `<div class="rc"><div class="rc-hd"><div class="rc-title">ML Model</div><span class="cbadge chk">analyzing...</span></div><div class="rc-bd"><div class="ml-off">Waiting for API response...</div></div></div>`;
    } else if (ml && !ml.error) {
        const sp2 = Math.round(ml.spam_probability * 100), hp = 100 - sp2, cf = Math.round(ml.confidence * 100);
        const sc2 = sp2 > 60 ? 'var(--red)' : sp2 > 30 ? 'var(--amber)' : 'var(--green)';
        mlH = `<div class="rc"><div class="rc-hd"><div class="rc-title">ML Model — Stacking Classifier</div><span class="cbadge ${ml.is_spam ? 'err' : 'ok'}">${ml.is_spam ? '● SPAM' : '● HAM'}</span></div><div class="rc-bd">
      <div class="ml-label" style="color:${ml.is_spam ? 'var(--red)' : 'var(--green)'}">${ml.is_spam ? 'Spam detected' : 'Legitimate message'} <span style="font-size:13px;font-weight:400;color:var(--text2)">${cf}% confidence</span></div>
      <div class="ml-br"><span class="ml-blbl">Spam</span><div class="ml-bg"><div class="ml-bf" style="width:${sp2}%;background:${sc2}"></div></div><span class="ml-pct">${sp2}%</span></div>
      <div class="ml-br"><span class="ml-blbl">Ham</span><div class="ml-bg"><div class="ml-bf" style="width:${hp}%;background:var(--blue)"></div></div><span class="ml-pct">${hp}%</span></div>
      <div style="font-size:11px;color:var(--text3);margin-top:8px;font-family:var(--mono)">1,849 SMS messages · TF-IDF + LR + DT + KNN + RF stacked</div>
    </div></div>`;
    } else if (ml && ml.error) {
        mlH = `<div class="rc"><div class="rc-hd"><div class="rc-title">ML Model</div><span class="cbadge err">● offline</span></div><div class="rc-bd"><div class="ml-off">Server not running.<br>Run <code>uvicorn api:app --reload</code> in your project folder, then click Test connection.<br><span style="color:var(--red-bd);font-size:11px;margin-top:4px;display:block">${ml.error}</span></div></div></div>`;
    }

    // URL pills
    let urlH = '';
    if (urls.length) {
        const pills = urls.map(u => { const d = dom(u); const bad = sf.includes(u) || bt.includes(u) || ip.includes(u) || sp.includes(d); const warn = !bad && (ht.includes(u) || ms.includes(d)); return `<span class="upill ${bad ? 'd' : warn ? 'w' : 'g'}" title="${u}">${d}</span>` }).join('');
        urlH = `<div class="rc" style="margin-bottom:1rem"><div class="rc-hd"><div class="rc-title">URLs detected (${urls.length})</div></div><div class="rc-bd"><div class="upills">${pills}</div></div></div>`;
    }

    const fiH = fi.map(f => `<div class="finding ${f.t}"><div class="fi">${f.i}</div><div><div class="ft">${f.h}</div><div class="fd">${f.d}</div></div></div>`).join('');
    const gsbH = (!loading && document.getElementById('gsbKey').value.trim() && urls.length)
        ? `<div id="gsbBlock" class="rc" style="margin-top:1rem"><div class="rc-hd"><div class="rc-title">Google Safe Browsing</div><span class="cbadge chk">checking...</span></div><div class="rc-bd"><div class="ml-off">Querying Google's live threat database...</div></div></div>` : '';

    document.getElementById('results').innerHTML = `
  <div class="verdict ${lv.l}">
    <div class="v-icon">${lv.ic}</div>
    <div><div class="v-label">${lv.lb}</div><div class="v-sub">${lv.sb}</div></div>
    <div class="v-score"><div class="v-num">${score}</div><div class="v-den">/ 100 risk</div></div>
  </div>
  <div class="sbar-wrap"><div class="sbar" style="width:${score}%;background:${lv.c}"></div></div>
  <div class="two-col">
    ${mlH}
    <div class="rc"><div class="rc-hd"><div class="rc-title">Rule-based scan — ${fi.length} finding${fi.length !== 1 ? 's' : ''}</div></div><div class="rc-bd"><div class="findings">${fiH}</div></div></div>
  </div>
  ${urlH}${gsbH}`;
}

async function checkGSB(urls, key) {
    const p = { client: { clientId: 'phishguard', clientVersion: '1.0' }, threatInfo: { threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: urls.map(u => ({ url: u })) } };
    try {
        const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        const d = await r.json();
        const el = document.getElementById('gsbBlock'); if (!el) return;
        if (d.error) { el.innerHTML = `<div class="rc-hd"><div class="rc-title">Google Safe Browsing</div><span class="cbadge err">API error</span></div><div class="rc-bd"><div class="ml-off">${d.error.message}</div></div>` }
        else if (d.matches && d.matches.length) { el.innerHTML = `<div class="rc-hd"><div class="rc-title">Google Safe Browsing</div><span class="cbadge err">● ${d.matches.length} threat${d.matches.length > 1 ? 's' : ''} found</span></div><div class="rc-bd"><div class="findings"><div class="finding flag"><div class="fi">⚠</div><div><div class="ft">Flagged by Google's database</div><div class="fd">${[...new Set(d.matches.map(m => m.threat.url))].join('<br>')}</div></div></div></div></div>` }
        else { el.innerHTML = `<div class="rc-hd"><div class="rc-title">Google Safe Browsing</div><span class="cbadge ok">● clean</span></div><div class="rc-bd"><div class="findings"><div class="finding ok"><div class="fi">✓</div><div><div class="ft">Not in Google's threat database</div><div class="fd">None of the detected URLs matched known phishing or malware sites.</div></div></div></div></div>` }
    } catch (e) { const el = document.getElementById('gsbBlock'); if (el) el.innerHTML = `<div class="rc-hd"><div class="rc-title">Google Safe Browsing</div><span class="cbadge err">failed</span></div><div class="rc-bd"><div class="ml-off">Request failed — check your API key.</div></div>` }
}