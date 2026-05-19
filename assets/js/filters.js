// ─── Filter catalog ───────────────────────────────────────────────
export const FILTERS = [
  { id: 'none',       label: 'ไม่มี',  emoji: '○'  },
  { id: 'sunglasses', label: 'แว่น',  emoji: '😎' },
  { id: 'cat',        label: 'แมว',   emoji: '🐱' },
  { id: 'dog',        label: 'หมา',   emoji: '🐶' },
  { id: 'crown',      label: 'มงกุฎ', emoji: '👑' },
  { id: 'clown',      label: 'ตลก',   emoji: '🤡' },
  { id: 'fire',       label: 'ไฟ',    emoji: '🔥' },
];

// ─── Entry point ──────────────────────────────────────────────────
export function drawFilter(ctx, lm, W, H, filterId) {
  if (filterId === 'none' || !lm || lm.length < 100) return;

  const pt  = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
  const dst = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const mid = (a, b) => ({ x: (a.x + b.x) * .5, y: (a.y + b.y) * .5 });

  const lEO  = pt(33);
  const rEO  = pt(263);
  const top  = pt(10);
  const chin = pt(152);
  const nose = pt(4);

  const eyeDist = dst(lEO, rEO);
  const faceH   = dst(top, chin);
  const angle   = Math.atan2(rEO.y - lEO.y, rEO.x - lEO.x);

  const mag = faceH || 1;
  const uX  = (top.x - chin.x) / mag;
  const uY  = (top.y - chin.y) / mag;

  switch (filterId) {
    case 'sunglasses': _sunglasses(ctx, pt, dst, mid, angle, eyeDist); break;
    case 'cat':        _cat(ctx, pt, dst, nose, uX, uY, angle, eyeDist, faceH); break;
    case 'dog':        _dog(ctx, pt, nose, uX, uY, angle, eyeDist, faceH); break;
    case 'crown':      _crown(ctx, top, uX, uY, angle, eyeDist, faceH); break;
    case 'clown':      _clown(ctx, nose, eyeDist); break;
    case 'fire':       _fire(ctx, top, uX, uY, angle, eyeDist, faceH); break;
  }
}

// ─── Sunglasses ───────────────────────────────────────────────────
function _sunglasses(ctx, pt, dst, mid, angle, eyeDist) {
  const lOut = pt(33),  lIn  = pt(133);
  const rOut = pt(263), rIn  = pt(362);
  const lTop = pt(159), lBot = pt(145);
  const rTop = pt(386), rBot = pt(374);
  const lT   = pt(127), rT   = pt(356);

  const lC  = mid(lOut, lIn),   rC  = mid(rIn, rOut);
  const lRX = dst(lOut, lIn) * .72, lRY = dst(lTop, lBot) * .95;
  const rRX = dst(rIn, rOut) * .72, rRY = dst(rTop, rBot) * .95;
  const lw  = Math.max(1.5, eyeDist * .015);

  ctx.save();
  for (const [c, rx, ry] of [[lC, lRX, lRY], [rC, rRX, rRY]]) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,10,20,.78)';
    ctx.fill();
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-rx * .28, -ry * .3, rx * .22, ry * .16, -.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.17)';
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = '#3a3a4a';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(lIn.x, lIn.y); ctx.lineTo(rIn.x, rIn.y);
  ctx.moveTo(lOut.x, lOut.y); ctx.lineTo(lT.x, lT.y);
  ctx.moveTo(rOut.x, rOut.y); ctx.lineTo(rT.x, rT.y);
  ctx.stroke();
  ctx.restore();
}

// ─── Cat ──────────────────────────────────────────────────────────
function _cat(ctx, pt, dst, nose, uX, uY, angle, eyeDist, faceH) {
  const lBrow  = pt(70),  rBrow  = pt(300);
  const lCheek = pt(234), rCheek = pt(454);
  const earSz  = eyeDist * .54;
  const rX = -uY, rY = uX; // perpendicular-right to face-up

  const lEarX = lBrow.x - rX * earSz * .18 + uX * earSz * .28;
  const lEarY = lBrow.y - rY * earSz * .18 + uY * earSz * .28;
  const rEarX = rBrow.x + rX * earSz * .18 + uX * earSz * .28;
  const rEarY = rBrow.y + rY * earSz * .18 + uY * earSz * .28;

  _catEar(ctx, lEarX, lEarY, earSz, angle - .15);
  _catEar(ctx, rEarX, rEarY, earSz, angle + .15);

  // Pink nose
  const nR = eyeDist * .09;
  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, nR * 1.1, nR * .78, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9eb5';
  ctx.fill();
  ctx.restore();

  // Whiskers
  const wLen = eyeDist * .72;
  ctx.save();
  ctx.strokeStyle = 'rgba(55,55,55,.6)';
  ctx.lineWidth   = Math.max(1, eyeDist * .01);
  for (const [cx, cy, dir] of [[lCheek.x, lCheek.y, -1], [rCheek.x, rCheek.y, 1]]) {
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.translate(cx, cy + i * eyeDist * .06);
      ctx.rotate(angle + i * .12 * dir);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dir * wLen, i * eyeDist * .025);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function _catEar(ctx, cx, cy, sz, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -sz * .85);
  ctx.lineTo(-sz * .42, sz * .28);
  ctx.lineTo( sz * .42, sz * .28);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,155,175,.5)';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -sz * .57);
  ctx.lineTo(-sz * .22, sz * .14);
  ctx.lineTo( sz * .22, sz * .14);
  ctx.closePath();
  ctx.fillStyle = '#ffb3c8';
  ctx.fill();
  ctx.restore();
}

// ─── Dog ──────────────────────────────────────────────────────────
function _dog(ctx, pt, nose, uX, uY, angle, eyeDist, faceH) {
  const lT = pt(127), rT = pt(356);
  const eW = eyeDist * .4, eH = faceH * .42;

  for (const [p, sign] of [[lT, -1], [rT, 1]]) {
    ctx.save();
    ctx.translate(p.x + sign * (-uY) * eW * .25, p.y + sign * uX * eW * .25 + eH * .4);
    ctx.rotate(angle + sign * .12);
    ctx.beginPath();
    ctx.ellipse(0, 0, eW, eH, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8B6914';
    ctx.fill();
    ctx.strokeStyle = '#6b5010';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Wet nose
  const nR = eyeDist * .12;
  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, nR * 1.3, nR * .88, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0e00';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-nR * .3, -nR * .26, nR * .35, nR * .22, -.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fill();
  ctx.restore();

  // Tongue
  const mBot = pt(17);
  const tW = eyeDist * .22, tH = eyeDist * .28;
  ctx.save();
  ctx.translate(mBot.x, mBot.y + tH * .35);
  ctx.rotate(angle);
  _roundRect(ctx, -tW / 2, 0, tW, tH, tW / 2);
  ctx.fillStyle = '#ff6b8a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, tH * .08);
  ctx.lineTo(0, tH * .82);
  ctx.strokeStyle = '#d94e6a';
  ctx.lineWidth = Math.max(1.2, eyeDist * .011);
  ctx.stroke();
  ctx.restore();
}

// ─── Crown ────────────────────────────────────────────────────────
function _crown(ctx, top, uX, uY, angle, eyeDist, faceH) {
  const cW = eyeDist * 1.15, cH = faceH * .26;
  const bH = cH * .38,       tH = cH * .62;
  const w2 = cW / 2;

  ctx.save();
  ctx.translate(top.x - uX * cH * .22, top.y - uY * cH * .22);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(-w2, 0);
  ctx.lineTo(-w2, -bH);
  ctx.lineTo(-w2 * .62, -bH - tH);
  ctx.lineTo(-w2 * .28, -bH);
  ctx.lineTo(0,          -bH - tH * 1.18);
  ctx.lineTo( w2 * .28,  -bH);
  ctx.lineTo( w2 * .62,  -bH - tH);
  ctx.lineTo( w2,        -bH);
  ctx.lineTo( w2,         0);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -bH - tH, 0, 0);
  g.addColorStop(0,   '#ffe566');
  g.addColorStop(.55, '#ffd700');
  g.addColorStop(1,   '#b8860b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#a07800';
  ctx.lineWidth = 2;
  ctx.lineJoin  = 'round';
  ctx.stroke();

  const jR = cH * .065;
  for (const [jx, jy, jc] of [
    [-w2 * .62, -bH - tH * .92, '#e74c3c'],
    [0,          -bH - tH * 1.1, '#3498db'],
    [ w2 * .62,  -bH - tH * .92, '#2ecc71'],
  ]) {
    ctx.beginPath();
    ctx.arc(jx, jy, jR, 0, Math.PI * 2);
    ctx.fillStyle = jc;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(jx - jR * .3, jy - jR * .32, jR * .3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fill();
  }
  ctx.restore();
}

// ─── Clown nose ───────────────────────────────────────────────────
function _clown(ctx, nose, eyeDist) {
  const r = eyeDist * .115;
  ctx.save();
  ctx.beginPath();
  ctx.arc(nose.x + r * .1, nose.y + r * .12, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.13)';
  ctx.fill();

  const g = ctx.createRadialGradient(
    nose.x - r * .28, nose.y - r * .28, r * .08,
    nose.x, nose.y, r
  );
  g.addColorStop(0, '#ff6b6b');
  g.addColorStop(1, '#c0000a');
  ctx.beginPath();
  ctx.arc(nose.x, nose.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(nose.x - r * .3, nose.y - r * .33, r * .24, r * .16, -.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.52)';
  ctx.fill();
  ctx.restore();
}

// ─── Fire ─────────────────────────────────────────────────────────
function _fire(ctx, top, uX, uY, angle, eyeDist, faceH) {
  const t      = Date.now() / 700;
  const n      = 6;
  const spread = eyeDist * .55;
  const maxH   = faceH   * .38;
  const rX = -uY, rY = uX; // right dir perpendicular to up

  ctx.save();
  for (let i = 0; i < n; i++) {
    const norm  = i / (n - 1) - .5;
    const phase = t + i * 1.1;
    const sway  = Math.sin(phase * 1.3) * eyeDist * .033;
    const scl   = (.7 + .3 * Math.sin(phase)) * (1 - Math.abs(norm) * .55);
    const fH    = maxH * scl;
    const fw    = eyeDist * .15 * scl;

    const ox = top.x + rX * norm * spread * 2 + rX * sway;
    const oy = top.y + rY * norm * spread * 2 + rY * sway;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angle);

    const g = ctx.createRadialGradient(0, 0, 0, 0, -fH * .5, fH * 1.1);
    g.addColorStop(0,   'rgba(255,250,180,.95)');
    g.addColorStop(.25, 'rgba(255,180, 30,.85)');
    g.addColorStop(.6,  'rgba(255, 60,  0,.65)');
    g.addColorStop(1,   'rgba(180,  0,  0, 0)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-fw, -fH * .35, -fw * .55, -fH * .75, 0, -fH);
    ctx.bezierCurveTo( fw * .55, -fH * .75, fw, -fH * .35, 0, 0);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ─── Util ─────────────────────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
