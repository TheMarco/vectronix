// Pocket Swarm — transpiled from PICO-8 Lua to standalone JavaScript
// Uses P8 (pico8.js) for drawing/math and P8Sound (sound.js) for audio

// ============================================================
// 00_consts.lua
// ============================================================
const screen_w = 128;
const screen_h = 128;
const field_l = 8;
const field_r = 120;
const field_t = 10;
const field_b = 122;
const player_y = 116;
const formation_x = 19;
const formation_y = 18;
const formation_dx = 10;
const formation_dy = 10;

const enemy_codes = {
  g: "grunt", a: "attacker", c: "commander", s: "spinner",
  b: "bomber", d: "guardian", p: "phantom", w: "swarm", o: "boss"
};

const enemy_defs = {
  grunt:     { spr: [2,3],       w: 1, h: 1, hp: 1, score: 50,  dive_score: 100, shot: "straight", speed: 1.0 },
  attacker:  { spr: [4,5],       w: 1, h: 1, hp: 1, score: 80,  dive_score: 160, shot: "aim",      speed: 1.15 },
  commander: { spr: [6,7,8],     w: 1, h: 1, hp: 2, score: 250, dive_score: 600, shot: "spread",   speed: 0.95 },
  spinner:   { spr: [9,10,11,12],w: 1, h: 1, hp: 1, score: 100, dive_score: 200, shot: "straight", speed: 1.1 },
  bomber:    { spr: [13,14,15],  w: 1, h: 1, hp: 2, score: 200, dive_score: 500, shot: "bomb",     speed: 0.9 },
  guardian:  { spr: [16,17,18,19],w:1, h: 1, hp: 3, score: 400, dive_score: 800, shot: "none",     speed: 0.8 },
  phantom:   { spr: [20,21,22,23],w:1, h: 1, hp: 1, score: 160, dive_score: 350, shot: "straight", speed: 1.05 },
  swarm:     { spr: [24,25],     w: 1, h: 1, hp: 1, score: 30,  dive_score: 60,  shot: "straight", speed: 1.35 },
  boss:      { spr: [38,39,40,41],w:1, h: 1, hp: 2, score: 400, dive_score: 800, shot: "boss",     speed: 0.85 }
};

const player_frames = [0, 1];
const ufo_frames = [26, 27];
const fx_sprs = {
  player_bullet: 28, enemy_bullet: 29,
  burst: [30, 31, 32],
  rapid: 33, shield: 34, slow: 35, magnet: 36, freeze: 37
};

const power_order = ["extra", "rapid", "shield", "slow", "magnet", "freeze"];
const power_icons = {
  extra: player_frames[0],
  rapid: fx_sprs.rapid, shield: fx_sprs.shield,
  slow: fx_sprs.slow, magnet: fx_sprs.magnet, freeze: fx_sprs.freeze
};

const challenge_cycle = ["grunt", "attacker", "spinner", "phantom", "swarm", "bomber", "guardian"];

// --- Globals ---
let stars = [];
let form_t = 0;
let score_hi = 0, score_lo = 0;
let hi_hi = 0, hi_lo = 0;
let wave = 0, ships = 0;
let extra_life_awarded = false;
let bullets = [], ebullets = [], effects = [], powerups = [], enemies = [];
let rescue_ship = null, captured_boss = null, capture_anim = null;
let ufo = null, ufo_t = 0;
let rapid_t = 0, slow_t = 0, magnet_t = 0, freeze_t = 0, shield_t = 0;
let wave_banner_t = 0, wave_clear_t = 0;
let result_t = 0, result_bonus = 0;
let notice_t = 0, notice_text = "";
let demo_mode = false, demo_t = 0, gameover_t = 0;
let challenge = false, challenge_hits = 0, challenge_total = 0;
let dive_t = 0;
let mode = "title";
let title_t = 0, title_idle_t = 0;
let player = null;
let beam_sfx_active = false;
let pending_start_jingle = false;

const ufo_sfx_chan = 3;
const beam_sfx_chan = 3;
const capture_sfx_chan = 3;
const player_death_sfx_chan = 2;
const boss_pick_chances = [0.45, 0.7, 0.6, 0.55];
const boss_tractor_chances = [0.55, 0.72, 0.3, 0.45];
const boss_beam_lens = [80, 64, 88, 72];

// --- Utility ---
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }

function seg_point_dist2(ax, ay, bx, by, px, py) {
  const abx = bx - ax, aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 0) return dist2(ax, ay, px, py);
  let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  return dist2(cx, cy, px, py);
}

function enemy_slot_xy(row, col) {
  const sway = P8.sin(form_t / 240 + row * 0.03) * 6;
  const bob = P8.sin((form_t + col * 9) / 200) * 1.5;
  return [formation_x + col * formation_dx + sway, formation_y + row * formation_dy + bob];
}

function add_score(pts) {
  score_lo += pts;
  while (score_lo >= 1000) { score_lo -= 1000; score_hi += 1; }
  if (demo_mode) return;
  if (score_hi > hi_hi || (score_hi === hi_hi && score_lo > hi_lo)) {
    hi_hi = score_hi;
    hi_lo = score_lo;
    save_hi_score();
  }
  check_extra_life_reward();
}

function score_str(h, l) {
  if (h > 0) {
    let s = String(l);
    while (s.length < 3) s = "0" + s;
    return String(h) + s;
  }
  return String(l);
}

function make_stars() {
  stars = [];
  for (let i = 0; i < 24; i++) {
    stars.push({
      x: P8.rnd(screen_w), y: P8.rnd(screen_h),
      spd: 0.2 + P8.rnd(0.8),
      col: (i % 3 === 0) ? 6 : 5
    });
  }
}

// ============================================================
// 10_data.lua
// ============================================================
const wave_defs = [
  ["...oooo...", ".aaaaaaaa.", ".aaaaaaaa.", "gggggggggg", "gggggggggg"],
  ["...occo...", ".aaaaaaaa.", ".aaaaaaaa.", "gggggggggg", "gggggggggg"],
  ["...occo...", ".aaaaaaaa.", ".aaassaaa.", "gggggggggg", "gggggggggg"],
  ["...oooo...", ".aasaasaa.", ".asaaaasa.", "gggggggggg", "gggggggggg"],
  ["...oooo...", ".asaaaasa.", ".aabaabaa.", "gggggggggg", "gggggggggg"],
  ["...occo...", ".aadssdaa.", ".paabbaap.", "gggggggggg", "wggggggggw"],
  ["...occo...", ".sadaadas.", ".abaaaaba.", "ggwgppgwgg", "gggggggggg"],
  ["...oooo...", ".dasaasad.", ".baaaaaab.", "sggpggpggs", "gggwggwggg"],
  ["...occo...", ".sdbbdbbs.", ".apassapa.", "ggwggggwgg", "wgggwggggw"]
];

function template_for_wave(n) {
  const normal_n = n - P8.flr(n / 5);
  const idx = ((normal_n - 1) % wave_defs.length);
  return wave_defs[idx >= 0 ? idx : idx + wave_defs.length];
}

function spawn_wave_enemy(kind, row, col, slot) {
  const def = enemy_defs[kind];
  const [tx, ty] = enemy_slot_xy(row, col);
  const side = (slot % 2 === 0) ? -20 : 148;
  let boss_behavior = 0;
  if (kind === "boss") {
    if (wave >= 15) boss_behavior = (wave + col + slot) % 4;
    else if (wave >= 11) boss_behavior = (wave + col + slot) % 3;
    else if (wave >= 7) boss_behavior = (wave + col + slot) % 2;
  }
  return {
    kind, row, col,
    x: side, y: -16 - P8.rnd(24),
    tx, ty,
    sx: side, sy: -16 - P8.rnd(24),
    dir: (side < 0) ? 1 : -1,
    state: "queued",
    hp: def.hp,
    t: 0, anim: P8.flr(P8.rnd(60)),
    spawn_t: slot * 7 + row * 6,
    dive_kind: 1 + P8.flr(P8.rnd(4)),
    shot_t: 20 + P8.flr(P8.rnd(70)),
    shots: 0,
    target_x: tx,
    dive_slot: 0, dive_total: 1,
    captured: false,
    beam_t: 0, beam_x: 0, beam_len: 80,
    shot_max: 0,
    boss_behavior,
    px: undefined, py: undefined
  };
}

function build_normal_wave() {
  enemies = [];
  const tpl = template_for_wave(wave);
  let slot = 0;
  for (let row = 0; row <= 4; row++) {
    const rowdef = tpl[row];
    for (let col = 0; col <= 9; col++) {
      const code = rowdef[col];
      if (code !== ".") {
        slot++;
        enemies.push(spawn_wave_enemy(enemy_codes[code], row, col, slot));
      }
    }
  }
  challenge = false;
  challenge_hits = 0;
  challenge_total = 0;
}

function build_challenge_wave() {
  enemies = [];
  challenge = true;
  challenge_hits = 0;
  challenge_total = 0;
  const stage = P8.flr((wave / 5) - 1);
  const challenge_kind = challenge_cycle[stage % challenge_cycle.length];
  const layouts = [
    [1,2,4,3,1], [2,1,3,4,2], [4,3,1,2,5], [3,4,2,1,3], [5,1,4,3,5]
  ];
  const layout = layouts[stage % layouts.length];
  for (let grp = 0; grp <= 4; grp++) {
    const pat = layout[grp];
    const dir = (grp % 2 === 0) ? 1 : -1;
    const grp_delay = grp * 84;
    for (let j = 0; j <= 3; j++) {
      challenge_total++;
      enemies.push({
        kind: challenge_kind,
        row: j, col: grp,
        x: -20, y: -20,
        tx: 64, ty: 50,
        sx: 0, sy: 0,
        dir,
        state: "challenge",
        hp: 1,
        t: -(grp_delay + j * 10),
        anim: P8.flr(P8.rnd(60)),
        spawn_t: 0,
        dive_kind: pat,
        shot_t: 999, shots: 0,
        target_x: 64,
        dive_slot: j, dive_total: 4,
        captured: false,
        beam_t: 0, beam_x: 0, beam_len: 80,
        shot_max: 0,
        boss_behavior: 0,
        px: undefined, py: undefined
      });
    }
  }
}

// ============================================================
// 20_game.lua
// ============================================================
function load_hi_score() {
  const saved = Math.max(0, P8.flr(P8.dget(0)));
  hi_hi = P8.flr(saved / 1000);
  hi_lo = saved % 1000;
}

function save_hi_score() {
  P8.dset(0, hi_hi * 1000 + hi_lo);
}

function play_beam_sfx() {
  if (beam_sfx_active) return;
  P8Sound.sfx(21, beam_sfx_chan);
  beam_sfx_active = true;
}

function stop_ufo_sfx() { P8Sound.sfx(-1, ufo_sfx_chan); }
function stop_beam_sfx() {
  if (!beam_sfx_active) return;
  P8Sound.sfx(-1, beam_sfx_chan);
  beam_sfx_active = false;
}
function play_player_death_sfx() { P8Sound.sfx(7, player_death_sfx_chan); }
function stop_capture_sfx() { P8Sound.sfx(-1, capture_sfx_chan); }

function play_jingle(n) {
  stop_ufo_sfx(); stop_beam_sfx(); stop_capture_sfx();
  P8Sound.sfx(-1, player_death_sfx_chan);
  P8Sound.music(n);
}

function enter_gameover() {
  gameover_t = 0;
  mode = "gameover";
  play_jingle(2);
}

function return_to_title() {
  demo_mode = false;
  title_idle_t = 0;
  title_t = 0;
  gameover_t = 0;
  P8Sound.music(-1);
  stop_ufo_sfx(); stop_beam_sfx(); stop_capture_sfx();
  mode = "title";
}

function init_port() {
  hi_hi = 0; hi_lo = 0;
  P8.cartdata("vectronix_galaga_p8");
  load_hi_score();
  title_t = 0; title_idle_t = 0;
  beam_sfx_active = false;
  demo_mode = false;
  pending_start_jingle = false;
  mode = "title";
  reset_run(false);
}

function check_extra_life_reward() {
  if (extra_life_awarded || score_hi < 20) return;
  extra_life_awarded = true;
  if (ships < 3) {
    ships++;
    P8Sound.sfx(10, player_death_sfx_chan);
    show_notice("extra ship", 90);
    if (mode === "gameover") {
      mode = "play";
      gameover_t = 0;
    }
  }
}

function reset_run(run_demo) {
  score_hi = 0; score_lo = 0;
  wave = 0; ships = 3;
  extra_life_awarded = false;
  bullets = []; ebullets = []; effects = []; powerups = []; enemies = [];
  rescue_ship = null; captured_boss = null; capture_anim = null;
  ufo = null; ufo_t = 1200;
  rapid_t = 0; slow_t = 0; magnet_t = 0; freeze_t = 0; shield_t = 0;
  wave_banner_t = 0; wave_clear_t = 0;
  result_t = 0; result_bonus = 0;
  notice_t = 0; notice_text = "";
  demo_mode = run_demo || false;
  demo_t = 0; gameover_t = 0;
  challenge = false; challenge_hits = 0; challenge_total = 0;
  form_t = 0; dive_t = 90;
  stop_ufo_sfx(); stop_beam_sfx(); stop_capture_sfx();
  player = {
    x: 64, y: player_y,
    alive: true, respawn_t: 0, inv: 60,
    dual: false, captured: false,
    fire_t: 0, anim: 0, vx: 0
  };
  start_wave();
}

function start_wave() {
  wave++;
  bullets = []; ebullets = []; effects = []; powerups = [];
  rescue_ship = null; ufo = null; ufo_t = 1000;
  form_t = 0; dive_t = 90;
  wave_banner_t = 70; wave_clear_t = 0;
  result_t = 0; result_bonus = 0;
  P8Sound.music(-1);
  stop_ufo_sfx(); stop_beam_sfx(); stop_capture_sfx();
  if (wave === 1) {
    if (pending_start_jingle && !demo_mode) play_jingle(0);
    pending_start_jingle = false;
  } else {
    P8Sound.sfx(8, player_death_sfx_chan);
  }
  clear_timed_powerups();
  if (wave % 5 === 0) build_challenge_wave();
  else build_normal_wave();
}

function clear_timed_powerups() {
  rapid_t = 0; slow_t = 0; magnet_t = 0; freeze_t = 0;
}

function show_notice(text, ttl) {
  notice_text = text;
  notice_t = ttl || 75;
}

function player_hit_test(x, y, rx, ry) {
  if (!player.alive) return false;
  rx = rx || 5;
  ry = ry || rx;
  if (P8.abs(x - player.x) < rx && P8.abs(y - player.y) < ry) return true;
  if (player.dual) {
    if (P8.abs(x - (player.x - 4)) < rx && P8.abs(y - player.y) < ry) return true;
    if (P8.abs(x - (player.x + 4)) < rx && P8.abs(y - player.y) < ry) return true;
  }
  return false;
}

function bullet_enemy_hit(b, e) {
  const rx = 6 + enemy_defs[e.kind].w * 2;
  const ry = 6 + enemy_defs[e.kind].h * 2;
  if (P8.abs(b.x - e.x) < rx && P8.abs(b.y - e.y) < ry) return true;
  if (b.px === undefined || e.px === undefined) return false;
  const hit_r = (challenge ? 7 : 6) + enemy_defs[e.kind].w;
  const mid_x = (e.x + e.px) * 0.5;
  const mid_y = (e.y + e.py) * 0.5;
  let best = Math.min(
    seg_point_dist2(b.px, b.py, b.x, b.y, e.x, e.y),
    seg_point_dist2(b.px, b.py, b.x, b.y, e.px, e.py)
  );
  best = Math.min(best, seg_point_dist2(b.px, b.py, b.x, b.y, mid_x, mid_y));
  return best < hit_r * hit_r;
}

function spinner_deflects(e) {
  return P8.flr((e.anim + e.row * 3 + e.col * 5) / 2) % 6 === 0;
}

function phantom_intangible(e) {
  return P8.flr((e.anim + e.row * 7 + e.col * 5) / 3) % 10 >= 7;
}

function boss_target_x(e) {
  let aim_x = player.x;
  if (e.hp < 2 || e.boss_behavior === 3) aim_x = player.x + player.vx * 10;
  else if (e.boss_behavior === 1) aim_x = player.x + player.vx * 6;
  return clamp(aim_x, field_l + 6, field_r - 6);
}

function dive_shot_count(e) {
  let wave_shots = P8.min(4, 1 + P8.flr((wave - 1) / 3));
  if (e.kind === "guardian") return 0;
  if (e.kind === "bomber" || e.kind === "commander" || e.kind === "boss") wave_shots++;
  else if (e.kind === "swarm") wave_shots = P8.max(1, wave_shots - 1);
  else if (e.kind === "attacker" && wave >= 10) wave_shots++;
  if (e.kind === "boss" && (e.boss_behavior === 1 || e.boss_behavior === 3 || e.hp < 2)) wave_shots++;
  return P8.min(5, wave_shots);
}

function start_enemy_dive(e, dive_kind, target_x, delay, slot, total) {
  e.state = "diving";
  e.t = delay || 0;
  e.sx = e.x; e.sy = e.y;
  e.target_x = target_x || player.x;
  e.dive_kind = dive_kind;
  e.dive_slot = slot || 0;
  e.dive_total = total || 1;
  e.shot_max = dive_shot_count(e);
  e.shots = e.shot_max;
  e.shot_t = 0.18 + P8.rnd(0.08);
  if ((slot || 0) <= 0 && (!delay || delay >= 0)) P8Sound.sfx(26, player_death_sfx_chan);
  if (dive_kind === 5 || e.kind === "guardian") {
    e.shots = 0; e.shot_max = 0;
  }
}

// --- _update ---
function _update() {
  update_stars();
  title_t++;
  if (mode === "title") update_title();
  else if (mode === "play") update_play();
  else if (mode === "gameover") update_gameover();
}

function update_title() {
  const tapped = typeof consumeMobileTap !== 'undefined' && consumeMobileTap();
  if (P8.btnp(4) || P8.btnp(5) || tapped) {
    pending_start_jingle = true;
    mode = "play";
    reset_run(false);
    return;
  }
  if (P8.btnp(0) || P8.btnp(1)) title_idle_t = 0;
  else title_idle_t++;
  if (title_idle_t >= 480) {
    pending_start_jingle = false;
    mode = "play";
    reset_run(true);
  }
}

function update_gameover() {
  gameover_t++;
  const accept_input = gameover_t > 60;
  const tapped = typeof consumeMobileTap !== 'undefined' && consumeMobileTap();
  if (demo_mode) {
    if ((accept_input && (P8.btnp(0) || P8.btnp(1) || P8.btnp(4) || P8.btnp(5) || tapped)) || gameover_t > 90) return_to_title();
  } else if (accept_input && (P8.btnp(4) || P8.btnp(5) || tapped)) {
    return_to_title();
  }
}

function update_stars() {
  for (const s of stars) {
    s.y += s.spd;
    if (s.y > 127) { s.y = 0; s.x = P8.rnd(128); }
  }
}

function update_play() {
  if (demo_mode) {
    demo_t++;
    if (P8.btnp(0) || P8.btnp(1) || P8.btnp(4) || P8.btnp(5) || demo_t > 1800) {
      return_to_title(); return;
    }
  }
  player.anim++;
  if (player.fire_t > 0) player.fire_t--;
  if (player.inv > 0) player.inv--;
  if (wave_banner_t > 0) wave_banner_t--;
  if (notice_t > 0) notice_t--;
  if (rapid_t > 0) rapid_t--;
  if (slow_t > 0) slow_t--;
  if (magnet_t > 0) magnet_t--;
  if (freeze_t > 0) freeze_t--;
  if (shield_t > 0) shield_t--;

  if (freeze_t <= 0) {
    form_t++;
    if (!challenge) update_ufo(false);
    update_enemies();
    update_ebullets();
  } else {
    if (ufo) update_ufo(true);
  }

  update_player();
  update_bullets();
  update_powerups();
  update_effects();
  update_rescue_ship();
  update_capture_anim();
  check_collisions();
  check_wave_state();
}

function update_player() {
  if (player.alive) {
    const old_x = player.x;
    const spd = player.dual ? 1.75 : 2.25;
    let fire = false;
    if (demo_mode) {
      fire = update_demo_player(spd);
    } else if (typeof MOBILE !== 'undefined' && MOBILE) {
      // Mobile: touch position drives movement, auto-fire always on
      const mt = mobileTouch();
      if (mt.active) {
        const targetX = field_l + mt.x * (field_r - field_l);
        if (player.x < targetX - 1.5) player.x += spd;
        else if (player.x > targetX + 1.5) player.x -= spd;
      }
      fire = true; // auto-fire
    } else {
      if (P8.btn(0)) player.x -= spd;
      if (P8.btn(1)) player.x += spd;
      fire = rapid_t > 0 ? (P8.btn(4) || P8.btn(5)) : (P8.btnp(4) || P8.btnp(5));
    }
    const margin = player.dual ? 8 : 4;
    player.x = clamp(player.x, field_l + margin, field_r - margin);
    player.vx = player.x - old_x;
    if (fire && player.fire_t <= 0 && (challenge || wave_banner_t <= 0)) {
      if (fire_player()) {
        player.fire_t = (rapid_t > 0) ? 4 : 8;
      }
    }
  } else {
    player.vx = 0;
    if (player.captured) {
      // wait
    } else if (player.respawn_t > 0) {
      player.respawn_t--;
    } else if (ships > 0) {
      player.alive = true;
      player.captured = false;
      player.inv = 70;
      player.x = 64;
      player.y = player_y;
    } else {
      enter_gameover();
    }
  }
}

function fire_player() {
  let cap = player.dual ? 4 : 2;
  if (rapid_t > 0) cap++;
  if (bullets.length >= cap) return false;
  if (player.dual) {
    bullets.push({ x: player.x - 4, y: player.y - 4, px: player.x - 4, py: player.y - 4, vx: 0, vy: -3.4, t: 0 });
    bullets.push({ x: player.x + 4, y: player.y - 4, px: player.x + 4, py: player.y - 4, vx: 0, vy: -3.4, t: 0 });
  } else {
    bullets.push({ x: player.x, y: player.y - 4, px: player.x, py: player.y - 4, vx: 0, vy: -3.4, t: 0 });
  }
  P8Sound.sfx(5, player_death_sfx_chan);
  return true;
}

function update_demo_player(spd) {
  const margin = player.dual ? 8 : 4;
  let target_x = 64;
  let threat = null;
  for (const b of ebullets) {
    if (b.y > player.y - 44 && b.y < player.y + 6 && P8.abs(b.x - player.x) < 18) {
      threat = b; break;
    }
  }
  if (threat) {
    target_x = player.x + (threat.x <= player.x ? 18 : -18);
  } else {
    let aim = null, best = 999;
    for (const e of enemies) {
      if (e.state !== "queued") {
        const rank = P8.abs(e.x - player.x) + P8.abs(e.y - 60);
        if (rank < best) { best = rank; aim = e; }
      }
    }
    if (aim) target_x = aim.x;
  }
  target_x = clamp(target_x, field_l + margin, field_r - margin);
  if (player.x < target_x - 1) player.x = P8.min(target_x, player.x + spd);
  else if (player.x > target_x + 1) player.x = P8.max(target_x, player.x - spd);

  if (wave_banner_t > 0 || player.fire_t > 0 || (threat && P8.abs(threat.x - player.x) < 10)) return false;
  if (ufo && P8.abs(ufo.x - player.x) < 14) return true;
  for (const e of enemies) {
    if (e.state !== "queued" && e.y < player.y && P8.abs(e.x - player.x) < 12) return true;
  }
  return P8.rnd(1) < 0.04;
}

function update_bullets() {
  for (const b of P8.all(bullets)) {
    b.t++;
    b.px = b.x; b.py = b.y;
    if (magnet_t > 0) {
      let target = null, best = 99999;
      for (const e of enemies) {
        if (e.state !== "queued" && e.state !== "dead") {
          const d = dist2(b.x, b.y, e.x, e.y);
          if (d < best) { best = d; target = e; }
        }
      }
      if (target) {
        const dx = target.x - b.x;
        const dy = P8.min(-4, target.y - b.y);
        const mag = P8.max(0.1, P8.sqrt(dx * dx + dy * dy));
        b.vx = clamp(b.vx + dx / mag * 0.2, -3, 3);
        b.vy = clamp(b.vy + dy / mag * 0.16, -4.2, -0.8);
      }
    }
    b.x += b.vx;
    b.y += b.vy;
    if (b.y < -8 || b.x < -8 || b.x > 136) P8.del(bullets, b);
  }
}

function update_ebullets() {
  const mult = (slow_t > 0) ? 0.6 : 1;
  for (const b of P8.all(ebullets)) {
    b.x += b.vx * mult;
    b.y += b.vy * mult;
    if (b.y > 136 || b.x < -8 || b.x > 136) P8.del(ebullets, b);
  }
}

function update_effects() {
  for (const fx of P8.all(effects)) {
    fx.t++;
    if (fx.t >= fx.ttl) P8.del(effects, fx);
  }
}

function update_powerups() {
  for (const p of P8.all(powerups)) {
    p.y += 1.0;
    p.t++;
    if (p.y > 136 || p.t > 480) P8.del(powerups, p);
  }
}

function update_rescue_ship() {
  if (!rescue_ship) return;
  if (player.alive) {
    rescue_ship.x = lerp(rescue_ship.x, player.x + 4, 0.08);
    rescue_ship.y = lerp(rescue_ship.y, player.y, 0.08);
  } else {
    rescue_ship.y += rescue_ship.vy;
    rescue_ship.vy = P8.min(rescue_ship.vy + 0.03, 1.4);
  }
  rescue_ship.t--;
  if (rescue_ship.y > 136 || rescue_ship.t <= 0) rescue_ship = null;
}

function update_capture_anim() {
  if (!capture_anim) return;
  if (capture_anim.boss.state !== "capturing") {
    stop_capture_sfx();
    capture_anim = null;
    return;
  }
  capture_anim.t++;
  capture_anim.x = lerp(capture_anim.x, capture_anim.boss.x, 0.18);
  capture_anim.y -= 0.7;
  if (capture_anim.y <= capture_anim.boss.y + 6) {
    capture_anim.boss.captured = true;
    capture_anim.boss.state = "returning";
    if (ships <= 0) {
      player.captured = false;
      enter_gameover();
    } else {
      play_jingle(1);
    }
    capture_anim = null;
  }
}

function update_ufo(frozen_only) {
  if (!ufo) {
    if (frozen_only) return;
    ufo_t--;
    if (ufo_t <= 0) {
      const dir = (P8.rnd(1) < 0.5) ? 1 : -1;
      ufo = { x: (dir === 1) ? -16 : 144, y: 14, dir, anim: 0 };
      ufo_t = 1500;
      P8Sound.sfx(25, ufo_sfx_chan);
    }
    return;
  }
  ufo.anim++;
  if (!frozen_only) ufo.x += ufo.dir * 1.1;
  if (ufo.x < -24 || ufo.x > 152) {
    stop_ufo_sfx();
    ufo = null;
  }
}

function try_group_dive(pool) {
  let row = P8.flr(P8.rnd(5));
  let best = [];
  for (let tries = 0; tries < 5; tries++) {
    best = [];
    for (const e of pool) {
      if (e.row === row && e.kind !== "boss" && e.kind !== "commander" && e.kind !== "guardian") {
        best.push(e);
      }
    }
    if (best.length >= 3) break;
    row = (row + 1) % 5;
  }
  if (best.length < 3) return false;
  let group_n = wave >= 12 ? 4 : 3;
  group_n = P8.min(group_n, best.length);
  const start_idx = P8.flr(P8.rnd(P8.max(1, best.length - group_n + 1)));
  const center_x = player.x;
  for (let i = 0; i < group_n; i++) {
    const e = best[start_idx + i];
    P8.del(pool, e);
    start_enemy_dive(e, 6, center_x, -i * 0.08, i, group_n);
  }
  return true;
}

function launch_pool_dive(pool) {
  let pick = null;
  if (!player.dual && !captured_boss && ships > 1) {
    for (const e of pool) {
      if (e.kind === "boss" && P8.rnd(1) < boss_pick_chances[e.boss_behavior]) {
        pick = e; break;
      }
    }
  }
  if (!pick && pool.length > 0) {
    pick = pool[P8.flr(P8.rnd(pool.length))];
  }
  if (!pick) return;
  P8.del(pool, pick);

  if (pick.kind === "boss" && !captured_boss && ships > 1 && !player.dual && !tractor_active() && P8.rnd(1) < boss_tractor_chances[pick.boss_behavior]) {
    pick.state = "diving";
    pick.t = 0;
    pick.sx = pick.x; pick.sy = pick.y;
    pick.dive_kind = 5;
    pick.beam_x = boss_target_x(pick);
    pick.beam_len = boss_beam_lens[pick.boss_behavior];
    pick.shots = 0;
    P8Sound.sfx(11, capture_sfx_chan);
    return;
  }

  if (pick.kind === "swarm" && pool.length > 0) {
    const buddy = pool[P8.flr(P8.rnd(pool.length))];
    P8.del(pool, buddy);
    if (buddy) start_enemy_dive(buddy, 2, clamp(player.x + 6, field_l + 6, field_r - 6), -0.06, 1, 2);
  }

  if (pick.kind === "commander" && pool.length > 0) {
    let escort = null;
    for (const e of pool) {
      if (e.kind !== "boss" && e.kind !== "guardian") { escort = e; break; }
    }
    if (escort) {
      P8.del(pool, escort);
      start_enemy_dive(escort, 4, clamp(player.x + 8, field_l + 6, field_r - 6), -0.05, 1, 2);
    }
  }

  let dive_kind = 1;
  if (pick.kind === "grunt") {
    dive_kind = ((pick.row + pick.col + wave) % 2 === 0) ? 1 : 2;
  } else if (pick.kind === "attacker") {
    dive_kind = (P8.rnd(1) < 0.5) ? 4 : 2;
  } else if (pick.kind === "spinner") {
    dive_kind = 3;
  } else if (pick.kind === "bomber") {
    dive_kind = (P8.rnd(1) < 0.5) ? 1 : 3;
  } else if (pick.kind === "phantom") {
    dive_kind = (P8.rnd(1) < 0.5) ? 2 : 4;
  } else if (pick.kind === "swarm") {
    dive_kind = 4;
  } else if (pick.kind === "guardian") {
    dive_kind = 7;
  } else if (pick.kind === "commander") {
    dive_kind = (P8.rnd(1) < 0.5) ? 1 : 4;
  } else if (pick.kind === "boss") {
    dive_kind = (pick.boss_behavior === 3) ? 7 : (P8.rnd(1) < 0.5 ? 1 : 3);
  }

  let target_x = clamp(player.x + P8.rnd(24) - 12, field_l + 6, field_r - 6);
  if (pick.kind === "guardian" || pick.kind === "boss") target_x = boss_target_x(pick);
  start_enemy_dive(pick, dive_kind, target_x);
}

function update_enemies() {
  const mult = (slow_t > 0) ? 0.6 : 1;
  if (!challenge) {
    dive_t--;
    if (dive_t <= 0 && wave_banner_t <= 0) {
      trigger_dive();
      const cycle = P8.flr((wave - 1) / 9);
      dive_t = P8.max(18, 78 - wave * 3 - cycle * 8);
    }
  }

  for (const e of P8.all(enemies)) {
    e.px = e.x; e.py = e.y;
    e.anim++;
    if (e.state === "queued") {
      e.spawn_t--;
      if (e.spawn_t <= 0) {
        e.state = "entering"; e.t = 0;
        e.sx = e.x; e.sy = e.y;
      }
    } else if (e.state === "entering") {
      const cycle = P8.flr((wave - 1) / 9);
      e.t += 0.02 * mult * (1 + wave * 0.02 + cycle * 0.15);
      const t = P8.min(e.t, 1);
      const arc = (0.5 - P8.abs(t - 0.5)) * 2;
      e.x = lerp(e.sx, e.tx, t) + e.dir * arc * 18;
      e.y = lerp(e.sy, e.ty, t) - arc * 18;
      if (t >= 1) e.state = "holding";
    } else if (e.state === "holding") {
      const [ex, ey] = enemy_slot_xy(e.row, e.col);
      e.x = ex; e.y = ey;
    } else if (e.state === "diving") {
      update_diving_enemy(e, mult);
    } else if (e.state === "beaming") {
      e.beam_t--;
      if (e.beam_t <= 0) {
        e.state = "returning";
        stop_beam_sfx();
      } else {
        if (player.alive && ships > 1 && !captured_boss && P8.abs(player.x - e.x) < 10) {
          if (player.dual) {
            player.dual = false;
            player.inv = 70;
            explode_at(player.x + 5, player.y);
            e.state = "returning";
            play_player_death_sfx();
            stop_beam_sfx();
          } else {
            capture_player(e);
          }
        }
      }
    } else if (e.state === "capturing") {
      e.x = lerp(e.x, e.beam_x, 0.12);
    } else if (e.state === "returning") {
      const [tx, ty] = enemy_slot_xy(e.row, e.col);
      e.tx = tx; e.ty = ty;
      e.x = lerp(e.x, e.tx, 0.08 * mult);
      e.y = lerp(e.y, e.ty, 0.08 * mult);
      if (P8.abs(e.x - e.tx) < 1 && P8.abs(e.y - e.ty) < 1) {
        e.state = "holding";
        if (player.captured && captured_boss === e) player.captured = false;
      }
    } else if (e.state === "challenge") {
      update_challenge_enemy(e, mult);
    }
  }
}

function update_diving_enemy(e, mult) {
  const cycle = P8.flr((wave - 1) / 9);
  let speed = enemy_defs[e.kind].speed;
  if (e.kind === "boss") {
    if (e.hp < 2) speed *= 1.15;
    if (e.boss_behavior === 1) speed *= 1.1;
  }
  e.t += 0.012 * speed * mult * (1 + wave * 0.03 + cycle * 0.15);

  if (e.kind === "boss" && e.dive_kind === 5) {
    e.x = lerp(e.sx, e.beam_x, e.t);
    e.y = e.sy + e.t * 70;
    if (e.t >= 0.85) {
      e.state = "beaming";
      e.beam_t = e.beam_len || 80;
      play_beam_sfx();
    }
    return;
  }

  const t = e.t;
  if (t < 0) { e.x = e.sx; e.y = e.sy; return; }

  let dx = 0, dy = 0;
  if (e.dive_kind === 1) {
    dx = P8.sin(t * 0.5) * 30 * e.dir;
    dy = t * 104;
  } else if (e.dive_kind === 2) {
    dx = P8.sin(t) * 22 * e.dir;
    dy = t * 96;
  } else if (e.dive_kind === 3) {
    dx = P8.sin(t) * 16 * e.dir;
    dy = t * 102 - P8.sin(t * 0.5) * 18;
  } else if (e.dive_kind === 4) {
    const tx = e.target_x - e.sx;
    dx = tx * P8.min(t, 0.65) / 0.65 + P8.sin(t) * 8 * e.dir;
    dy = t * 110;
  } else if (e.dive_kind === 6) {
    const tx = e.target_x - e.sx;
    const offset = (e.dive_slot - (e.dive_total - 1) / 2) * 8;
    dx = tx * P8.min(t, 0.72) / 0.72 + offset + P8.sin((t + e.dive_slot * 0.14) * 0.8) * 6 * e.dir;
    dy = t * 108;
  } else if (e.dive_kind === 7) {
    const tx = e.target_x - e.sx;
    dx = tx * P8.min(t, 0.96) + P8.sin(t * 0.45) * 3 * e.dir;
    dy = t * 118 - P8.sin(P8.min(t, 0.65) * 1.2) * 8;
  } else {
    const tx = e.target_x - e.sx;
    dx = tx * P8.min(t, 0.92) + P8.sin(t * 0.35) * 4 * e.dir;
    dy = t * 118;
  }
  e.x = e.sx + dx;
  e.y = e.sy + dy;

  if (e.kind === "spinner") e.x += P8.sin(t * 2.4 + e.col * 0.3) * 4 * e.dir;
  else if (e.kind === "phantom") e.x += P8.sin(t * 3.2 + e.col * 0.4) * 5 * e.dir;
  else if (e.kind === "boss" && e.boss_behavior === 3) e.x = lerp(e.x, boss_target_x(e), 0.04);

  if (e.shots > 0) {
    if (e.y > 18 && e.y < 104 && t >= e.shot_t) {
      enemy_fire(e);
      e.shots--;
      if (e.shots > 0) {
        const fired = e.shot_max - e.shots;
        e.shot_t = P8.min(0.88, 0.2 + (fired / P8.max(1, e.shot_max)) * 0.58 + P8.rnd(0.05));
      }
    }
  }

  if (e.y > 136 || e.t >= 1.2) e.state = "returning";
}

function update_challenge_enemy(e, mult) {
  e.t += 1 * mult;
  if (e.t < 0) { e.x = -20; e.y = -20; return; }
  const t = e.t;
  const u = P8.min(t / 124, 1);
  const pat = e.dive_kind;
  const spread = (e.dive_slot - 1.5) * 14;
  const start_x = e.dir === 1 ? -12 : 140;
  const end_x = e.dir === 1 ? 140 : -12;
  const base_y = 26 + e.dive_slot * 18;
  const pi = 3.1415;
  e.x = lerp(start_x, end_x, u);
  if (pat === 1) e.y = base_y;
  else if (pat === 2) e.y = base_y + Math.sin(u * pi) * 8;
  else if (pat === 3) e.y = base_y + Math.sin(u * pi * 2 + e.dive_slot * 0.6) * 6;
  else if (pat === 4) e.y = base_y + Math.cos(u * pi * 2) * 5;
  else e.y = base_y + Math.sin(u * pi * 1.5) * 10;
  if (t > 132) P8.del(enemies, e);
}

function trigger_dive() {
  const holding = [];
  for (const e of enemies) {
    if (e.state === "holding" && !(player.dual && e.kind === "boss")) holding.push(e);
  }
  if (holding.length < 1) return;

  const group_chance = wave >= 18 ? 0.45 : wave >= 12 ? 0.35 : wave >= 9 ? 0.2 : wave >= 8 ? 0.1 : 0;
  if (!player.dual && group_chance > 0 && P8.rnd(1) < group_chance) {
    if (try_group_dive(holding)) return;
  }

  let max_divers = wave >= 18 ? 4 : wave >= 9 ? 3 : wave >= 4 ? 2 : 1;
  let dive_count = P8.min(holding.length, max_divers);
  if (P8.rnd(1) < 0.7 && dive_count > 1) dive_count--;

  for (let i = 0; i < dive_count; i++) {
    if (holding.length < 1) break;
    launch_pool_dive(holding);
  }
}

function tractor_active() {
  for (const e of enemies) {
    if (e.kind === "boss" && (e.state === "beaming" || e.state === "capturing" || (e.state === "diving" && e.dive_kind === 5))) return true;
  }
  return capture_anim !== null;
}

function fire_aim(x, y, tx, spd) {
  const dx = tx - x;
  const dy = P8.max(8, player.y - y);
  const mag = P8.max(1, P8.sqrt(dx * dx + dy * dy));
  ebullets.push({ x, y: y + 4, vx: dx / mag * spd, vy: dy / mag * spd });
}

function enemy_fire(e) {
  if (challenge) return;
  const shot = enemy_defs[e.kind].shot;
  if (shot === "none" || (shot === "boss" && e.dive_kind === 5)) return;
  const spd = 1 + P8.flr((wave - 1) / 9) * 0.15;
  if (shot === "straight") {
    ebullets.push({ x: e.x, y: e.y + 4, vx: 0, vy: 1.7 * spd });
  } else if (shot === "aim") {
    fire_aim(e.x, e.y, player.x, 1.5 * spd);
  } else if (shot === "boss") {
    const aim_x = (e.hp < 2 || e.boss_behavior === 3 || wave >= 8) ? boss_target_x(e) : player.x;
    let boss_spd = 1.55;
    if (e.boss_behavior === 1) boss_spd = 1.7;
    fire_aim(e.x, e.y, aim_x, boss_spd * spd);
  } else if (shot === "spread") {
    ebullets.push({ x: e.x, y: e.y + 4, vx: 0, vy: 1.7 * spd });
    ebullets.push({ x: e.x, y: e.y + 4, vx: -0.7 * spd, vy: 1.5 * spd });
    ebullets.push({ x: e.x, y: e.y + 4, vx: 0.7 * spd, vy: 1.5 * spd });
  } else if (shot === "bomb") {
    ebullets.push({ x: e.x, y: e.y + 4, vx: 0, vy: 1.2 * spd });
  }
}

function capture_player(e) {
  captured_boss = e;
  player.alive = false;
  player.captured = true;
  player.respawn_t = 90;
  ships = P8.max(0, ships - 1);
  e.state = "capturing";
  stop_beam_sfx();
  stop_capture_sfx();
  P8Sound.sfx(22, capture_sfx_chan);
  capture_anim = { x: player.x, y: player.y, boss: e, t: 0 };
}

function explode_at(x, y) {
  effects.push({ x, y, t: 0, ttl: 9 });
}

function kill_enemy(e, diving_kill) {
  const def = enemy_defs[e.kind];
  if (challenge) {
    add_score(100);
    challenge_hits++;
  } else {
    add_score(diving_kill ? def.dive_score : def.score);
  }
  explode_at(e.x, e.y);
  P8Sound.sfx(6, player_death_sfx_chan);
  if (e.state === "beaming" || e.state === "capturing") stop_beam_sfx();
  if (e.state === "capturing") stop_capture_sfx();
  if (capture_anim && capture_anim.boss === e) {
    capture_anim = null;
    player.captured = false;
    stop_capture_sfx();
  }
  if (e.kind === "boss") {
    if (e.captured) {
      rescue_ship = diving_kill ? { x: e.x, y: e.y, vy: 0.25, t: 240 } : null;
    }
    if (captured_boss === e) {
      captured_boss = null;
      player.captured = false;
    }
  }
  P8.del(enemies, e);
}

function spawn_powerup(x, y) {
  let kind = power_order[P8.flr(P8.rnd(power_order.length))];
  if (kind === "extra" && ships >= 3) {
    kind = power_order[1 + P8.flr(P8.rnd(power_order.length - 1))];
  }
  powerups.push({ kind, x, y, t: 0 });
}

function apply_powerup(kind) {
  P8Sound.sfx(9, player_death_sfx_chan);
  if (kind === "extra") {
    if (ships < 3) { ships++; P8Sound.sfx(10, player_death_sfx_chan); }
    show_notice("extra ship", 90);
  } else if (kind === "rapid") {
    rapid_t = 720; show_notice("rapid fire", 75);
  } else if (kind === "shield") {
    shield_t = 1200; show_notice("shield", 75);
  } else if (kind === "slow") {
    slow_t = 900; show_notice("slowdown", 75);
  } else if (kind === "magnet") {
    magnet_t = 600; show_notice("magnet", 75);
  } else if (kind === "freeze") {
    freeze_t = 210; show_notice("time freeze", 75);
  }
}

function hit_player() {
  if (player.inv > 0 || !player.alive) return;
  if (shield_t > 0) {
    shield_t = 0;
    player.inv = 30;
    explode_at(player.x, player.y);
    return;
  }
  if (player.dual) {
    player.dual = false;
    player.inv = 70;
    explode_at(player.x + 5, player.y);
    play_player_death_sfx();
    return;
  }
  player.alive = false;
  player.respawn_t = 90;
  ships--;
  explode_at(player.x, player.y);
  play_player_death_sfx();
  if (ships <= 0) enter_gameover();
}

function check_collisions() {
  // Bullets vs enemies
  for (const b of P8.all(bullets)) {
    for (const e of P8.all(enemies)) {
      if (e.state !== "queued") {
        if (e.captured && P8.abs(b.x - e.x) < 5 && P8.abs(b.y - (e.y - 5)) < 6) {
          explode_at(e.x, e.y - 5);
          P8.del(bullets, b);
          e.captured = false;
          if (captured_boss === e) {
            captured_boss = null;
            if (player.captured) player.captured = false;
          }
          break;
        } else if (!challenge && e.kind === "phantom" && phantom_intangible(e)) {
          // pass through
        } else if (bullet_enemy_hit(b, e)) {
          if (!challenge && e.kind === "spinner" && spinner_deflects(e)) {
            explode_at(b.x, b.y);
            P8.del(bullets, b);
            break;
          }
          e.hp--;
          P8.del(bullets, b);
          if (e.hp <= 0) {
            kill_enemy(e, e.state !== "holding" && e.state !== "entering");
          } else {
            explode_at(e.x, e.y);
          }
          break;
        }
      }
    }
  }

  // Bullets vs UFO
  if (ufo) {
    for (const b of P8.all(bullets)) {
      if (P8.abs(b.x - ufo.x) < 10 && P8.abs(b.y - ufo.y) < 6) {
        add_score(300);
        explode_at(ufo.x, ufo.y);
        spawn_powerup(ufo.x, ufo.y);
        stop_ufo_sfx();
        P8.del(bullets, b);
        ufo = null;
        break;
      }
    }
  }

  // Player vs powerups
  for (const p of P8.all(powerups)) {
    if (player_hit_test(p.x, p.y, 8, 8)) {
      apply_powerup(p.kind);
      P8.del(powerups, p);
      break;
    }
  }

  // Enemy bullets vs player
  for (const b of P8.all(ebullets)) {
    if (!challenge && player_hit_test(b.x, b.y, 5, 5)) {
      P8.del(ebullets, b);
      hit_player();
      break;
    }
  }

  // Body collisions
  if (!challenge) {
    for (const e of P8.all(enemies)) {
      if ((e.state === "diving" || e.state === "capturing" || e.state === "returning") && player_hit_test(e.x, e.y, 8, 8)) {
        kill_enemy(e, true);
        hit_player();
        break;
      }
    }
  }

  // Rescue ship
  if (rescue_ship && player_hit_test(rescue_ship.x, rescue_ship.y, 8, 8)) {
    if (player.dual) {
      add_score(2000);
      show_notice("2000", 60);
    } else {
      player.dual = true;
      show_notice("dual fighter", 90);
    }
    P8Sound.sfx(24, capture_sfx_chan);
    rescue_ship = null;
  }
}

function check_wave_state() {
  if (enemies.length > 0) return;
  clear_timed_powerups();
  if (challenge && result_t === 0) {
    result_bonus = challenge_hits * 100;
    if (challenge_hits === challenge_total) {
      result_bonus += 10000;
      if (ships < 3) {
        ships++;
        P8Sound.sfx(10, player_death_sfx_chan);
        show_notice("perfect! ship+", 120);
      } else {
        show_notice("perfect!", 90);
      }
    }
    add_score(result_bonus);
    result_t = 180;
    return;
  }
  if (result_t > 0) {
    result_t--;
    if (result_t <= 0) start_wave();
    return;
  }
  if (wave_clear_t === 0) {
    wave_clear_t = 80;
  } else {
    wave_clear_t--;
    if (wave_clear_t <= 0) start_wave();
  }
}

function enemy_frame(e) {
  const def = enemy_defs[e.kind];
  if (e.kind === "spinner") {
    if (spinner_deflects(e)) return 1; // 0-based index 1 = 2nd sprite
    return (P8.flr(e.anim / 4) % 4);
  } else if (e.kind === "guardian") {
    if (e.hp <= 1) return 3;
    if (e.hp === 2) return 2;
    return (P8.flr(e.anim / 10) % 2);
  } else if (e.kind === "phantom") {
    if (phantom_intangible(e)) return 2 + P8.flr(e.anim / 12) % 2;
    return P8.flr(e.anim / 10) % 2;
  } else if (e.kind === "boss") {
    if (e.state === "beaming") return 3;
    if (e.hp < 2) return 2;
    return P8.flr(e.anim / 10) % 2;
  } else if (e.kind === "commander" || e.kind === "bomber") {
    if (e.hp < enemy_defs[e.kind].hp) return 2;
    return P8.flr(e.anim / 10) % 2;
  } else {
    return P8.flr(e.anim / 10) % def.spr.length;
  }
}

// ============================================================
// 30_draw.lua
// ============================================================
function _draw() {
  P8.cls(0);
  draw_stars();
  if (mode === "title") { draw_title(); return; }
  draw_playfield();
  if (mode === "gameover") {
    P8.rectfill(24, 50, 104, 80, 1);
    P8.print("game over", 41, 58, 7);
    P8.print("press space", 36, 68, 6);
  }
}

function draw_stars() {
  for (const s of stars) P8.pset(s.x, s.y, s.col);
}

function draw_title() {
  // Game logo (128x56 from spritesheet y=72)
  P8.sspr(0, 72, 128, 56, 0, 0);
  // Instructions
  const blink = P8.flr(title_t / 20) % 2 === 0;
  const mob = typeof MOBILE !== 'undefined' && MOBILE;
  if (blink) P8.print(mob ? "tap to start" : "press space", mob ? 31 : 36, 60, 10);
  if (!mob) P8.print("a/d move  space fire", 9, 72, 6);
  P8.print("hi " + score_str(hi_hi, hi_lo), 42, 82, 7);
  // Studio logo (128x24 from spritesheet y=48)
  P8.sspr(0, 48, 128, 24, 0, 102);
}

function draw_playfield() {
  draw_planet_surface();
  draw_bg_status();
  if (ufo) draw_ufo();
  draw_captured_ships();
  for (const e of enemies) draw_enemy(e);
  if (rescue_ship) draw_rescue_ship();
  for (const b of bullets) P8.spr(fx_sprs.player_bullet, b.x - 4, b.y - 4);
  for (const b of ebullets) P8.spr(fx_sprs.enemy_bullet, b.x - 4, b.y - 4);
  for (const p of powerups) P8.spr(power_icons[p.kind], p.x - 4, p.y - 4);
  for (const fx of effects) {
    const frame = fx_sprs.burst[P8.min(2, P8.flr(fx.t / 3))];
    P8.spr(frame, fx.x - 4, fx.y - 4);
  }
  draw_player();
  draw_capture_anim();
  draw_hud();
  if (wave_banner_t > 0) {
    if (challenge) {
      P8.print("challenging", 34, 58, 10);
      P8.print("stage", 52, 66, 10);
    } else {
      P8.print("wave " + wave, 52, 62, 10);
    }
  }
  if (result_t > 0) {
    P8.rectfill(14, 52, 114, 84, 1);
    P8.print("challenge", 46, 56, 10);
    P8.print("hits " + challenge_hits + "/" + challenge_total, 34, 64, 7);
    P8.print("bonus " + result_bonus, 38, 72, 11);
    if (challenge_hits === challenge_total) P8.print("perfect!", 44, 80, 14);
  }
}

function draw_planet_surface() {
  P8.sspr(0, 40, 128, 8, 0, 120);
}

function draw_bg_status() {
  if (notice_t > 0) return;
  let text = null, x = null;
  if (player.captured) {
    text = "ship captured";
    x = 64 - text.length * 2.5;
  } else if (captured_boss && captured_boss.captured) {
    text = "captured ship in play";
    x = 64 - text.length * 2.5;
  } else if (demo_mode) {
    text = "demo"; x = 97;
  }
  if (text) P8.print(text, x, 111, 1);
}

function draw_player() {
  if (!player.alive) return;
  const flash = player.inv > 0 && P8.flr(player.inv / 4) % 2 === 0;
  if (flash) return;
  const frame = player_frames[P8.flr(player.anim / 10) % 2];
  if (player.dual) {
    P8.spr(frame, player.x - 8, player.y - 4);
    P8.spr(frame, player.x, player.y - 4);
  } else {
    P8.spr(frame, player.x - 4, player.y - 4);
  }
  if (shield_t > 0) P8.circ(player.x, player.y, 5, 12);
}

function draw_captured_ships() {
  for (const e of enemies) {
    if (e.captured) {
      const pf = player_frames[P8.flr(player.anim / 10) % 2];
      P8.spr(pf, e.x - 4, e.y - 9);
    }
  }
}

function draw_enemy(e) {
  const def = enemy_defs[e.kind];
  const frameIdx = enemy_frame(e);
  const frame = def.spr[frameIdx];
  const x = e.x - def.w * 4;
  const y = e.y - def.h * 4;
  P8.spr(frame, x, y, def.w, def.h, e.dir < 0);
  if (e.state === "beaming" || e.state === "capturing") {
    for (let sy = e.y + 4; sy <= 118; sy += 4) {
      P8.line(e.x - 2, sy, e.x + 2, sy, 12);
    }
  }
}

function draw_ufo() {
  const frame = ufo_frames[P8.flr(ufo.anim / 12) % 2];
  P8.spr(frame, ufo.x - 4, ufo.y - 4, 1, 1, ufo.dir < 0);
}

function draw_rescue_ship() {
  const frame = player_frames[P8.flr(player.anim / 10) % 2];
  P8.spr(frame, rescue_ship.x - 4, rescue_ship.y - 4);
}

function draw_capture_anim() {
  if (!capture_anim) return;
  const flash = P8.flr(capture_anim.t / 3) % 2 === 0;
  if (flash) {
    const frame = player_frames[0];
    P8.spr(frame, capture_anim.x - 4, capture_anim.y - 4);
  }
}

function draw_hud() {
  P8.print("1up " + score_str(score_hi, score_lo), 2, 1, 7);
  P8.print("hi " + score_str(hi_hi, hi_lo), 48, 1, 6);
  P8.print("wv " + wave, 102, 1, 10);
  P8.print("ships " + P8.max(ships - 1, 0), 2, 121, 6);
  if (notice_t > 0) {
    P8.print(notice_text, 64 - notice_text.length * 2.5, 111, 11);
  }
}

// ============================================================
// Main entry: _init, game loop
// ============================================================
function _init() {
  make_stars();
  init_port();
}
