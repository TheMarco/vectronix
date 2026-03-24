pico-8 cartridge // http://www.pico-8.com
version 43
__lua__
-- 00_consts.lua
screen_w=128
screen_h=128
field_l=8
field_r=120
field_t=10
field_b=122
player_y=116
formation_x=19
formation_y=18
formation_dx=10
formation_dy=10

enemy_codes={
 g="grunt",
 a="attacker",
 c="commander",
 s="spinner",
 b="bomber",
 d="guardian",
 p="phantom",
 w="swarm",
 o="boss"
}

enemy_defs={
 grunt={spr={2,3},w=1,h=1,hp=1,score=50,dive_score=100,shot="straight",speed=1.0},
 attacker={spr={4,5},w=1,h=1,hp=1,score=80,dive_score=160,shot="aim",speed=1.15},
 commander={spr={6,7,8},w=1,h=1,hp=2,score=250,dive_score=600,shot="spread",speed=0.95},
 spinner={spr={9,10,11,12},w=1,h=1,hp=1,score=100,dive_score=200,shot="straight",speed=1.1},
 bomber={spr={13,14,15},w=1,h=1,hp=2,score=200,dive_score=500,shot="bomb",speed=0.9},
 guardian={spr={16,17,18,19},w=1,h=1,hp=3,score=400,dive_score=800,shot="none",speed=0.8},
 phantom={spr={20,21,22,23},w=1,h=1,hp=1,score=160,dive_score=350,shot="straight",speed=1.05},
 swarm={spr={24,25},w=1,h=1,hp=1,score=30,dive_score=60,shot="straight",speed=1.35},
 boss={spr={38,39,40,41},w=1,h=1,hp=2,score=400,dive_score=800,shot="boss",speed=0.85}
}

player_frames={0,1}
ufo_frames={26,27}
fx_sprs={
 player_bullet=28,
 enemy_bullet=29,
 burst={30,31,32},
 rapid=33,
 shield=34,
 slow=35,
 magnet=36,
 freeze=37
}

power_order={"extra","rapid","shield","slow","magnet","freeze"}
power_icons={
 extra=player_frames[1],
 rapid=fx_sprs.rapid,
 shield=fx_sprs.shield,
 slow=fx_sprs.slow,
 magnet=fx_sprs.magnet,
 freeze=fx_sprs.freeze
}

challenge_cycle={"grunt","attacker","spinner","phantom","swarm","bomber","guardian"}

function clamp(v,a,b)
 if v<a then return a end
 if v>b then return b end
 return v
end

function lerp(a,b,t)
 return a+(b-a)*t
end

function dist2(x1,y1,x2,y2)
 local dx=x2-x1
 local dy=y2-y1
 return dx*dx+dy*dy
end

function seg_point_dist2(ax,ay,bx,by,px,py)
 local abx=bx-ax
 local aby=by-ay
 local ab2=abx*abx+aby*aby
 if ab2<=0 then
  return dist2(ax,ay,px,py)
 end
 local t=((px-ax)*abx+(py-ay)*aby)/ab2
 t=clamp(t,0,1)
 local cx=ax+abx*t
 local cy=ay+aby*t
 return dist2(cx,cy,px,py)
end

function enemy_slot_xy(row,col)
 local sway=sin(form_t/240+row*0.03)*6
 local bob=sin((form_t+col*9)/200)*1.5
 return formation_x+col*formation_dx+sway,formation_y+row*formation_dy+bob
end

function add_score(pts)
 score_lo+=pts
 while score_lo>=1000 do
  score_lo-=1000
  score_hi+=1
 end
 if demo_mode then return end
 if score_hi>hi_hi or (score_hi==hi_hi and score_lo>hi_lo) then
  hi_hi=score_hi
  hi_lo=score_lo
  if save_hi_score then
   save_hi_score()
  end
 end
 if check_extra_life_reward then
  check_extra_life_reward()
 end
end

function score_str(h,l)
 if h>0 then
  local s=tostr(l)
  while #s<3 do s="0"..s end
  return tostr(h)..s
 end
 return tostr(l)
end

function make_stars()
 stars={}
 for i=1,24 do
  add(stars,{
   x=rnd(screen_w),
   y=rnd(screen_h),
   spd=0.2+rnd(0.8),
   col=(i%3==0) and 6 or 5
  })
 end
end

-- 10_data.lua
wave_defs={
 {
  "...oooo...",
  ".aaaaaaaa.",
  ".aaaaaaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aaaaaaaa.",
  ".aaaaaaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aaaaaaaa.",
  ".aaassaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".aasaasaa.",
  ".asaaaasa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".asaaaasa.",
  ".aabaabaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aadssdaa.",
  ".paabbaap.",
  "gggggggggg",
  "wggggggggw"
 },
 {
  "...occo...",
  ".sadaadas.",
  ".abaaaaba.",
  "ggwgppgwgg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".dasaasad.",
  ".baaaaaab.",
  "sggpggpggs",
  "gggwggwggg"
 },
 {
  "...occo...",
  ".sdbbdbbs.",
  ".apassapa.",
  "ggwggggwgg",
  "wgggwggggw"
 }
}

function template_for_wave(n)
 local normal_n=n-flr(n/5)
 local idx=((normal_n-1)%#wave_defs)+1
 return wave_defs[idx]
end

function spawn_wave_enemy(kind,row,col,slot)
 local def=enemy_defs[kind]
 local tx,ty=enemy_slot_xy(row,col)
 local side=(slot%2==0) and -20 or 148
 local boss_behavior=0
 if kind=="boss" then
  if wave>=15 then
   boss_behavior=(wave+col+slot)%4
  elseif wave>=11 then
   boss_behavior=(wave+col+slot)%3
  elseif wave>=7 then
   boss_behavior=(wave+col+slot)%2
  end
 end
 return {
  kind=kind,
  row=row,
  col=col,
  x=side,
  y=-16-rnd(24),
  tx=tx,
  ty=ty,
  sx=side,
  sy=-16-rnd(24),
  dir=(side<0) and 1 or -1,
  state="queued",
  hp=def.hp,
  t=0,
  anim=flr(rnd(60)),
  spawn_t=slot*7+row*6,
  dive_kind=1+flr(rnd(4)),
  shot_t=20+flr(rnd(70)),
  shots=0,
  target_x=tx,
  dive_slot=0,
  dive_total=1,
  captured=false,
  beam_t=0,
  beam_x=0,
  beam_len=80,
  shot_max=0,
  boss_behavior=boss_behavior
 }
end

function build_normal_wave()
 enemies={}
 local tpl=template_for_wave(wave)
 local slot=0
 for row=0,4 do
  local rowdef=tpl[row+1]
  for col=0,9 do
   local code=sub(rowdef,col+1,col+1)
   if code~="." then
    slot+=1
    add(enemies,spawn_wave_enemy(enemy_codes[code],row,col,slot))
   end
  end
 end
 challenge=false
 challenge_hits=0
 challenge_total=0
end

function build_challenge_wave()
 enemies={}
 challenge=true
 challenge_hits=0
 challenge_total=0
 local stage=flr((wave/5)-1)
 local challenge_kind=challenge_cycle[(stage%#challenge_cycle)+1]
 local layouts={
  {1,2,4,3,1},
  {2,1,3,4,2},
  {4,3,1,2,5},
  {3,4,2,1,3},
  {5,1,4,3,5}
 }
 local layout=layouts[(stage%#layouts)+1]
 -- 5 groups of 4 enemies with slow, readable spacing
 for grp=0,4 do
  local pat=layout[grp+1]
  local dir=(grp%2==0) and 1 or -1
  local grp_delay=grp*84
  for j=0,3 do
   challenge_total+=1
   add(enemies,{
    kind=challenge_kind,
    row=j,
    col=grp,
    x=-20,
    y=-20,
    tx=64,
    ty=50,
    sx=0,
    sy=0,
    dir=dir,
    state="challenge",
    hp=1,
    t=-(grp_delay+j*10),
    anim=flr(rnd(60)),
    spawn_t=0,
    dive_kind=pat,
    shot_t=999,
    shots=0,
    target_x=64,
    dive_slot=j,
    dive_total=4,
    captured=false,
    beam_t=0,
    beam_x=0,
    beam_len=80,
    shot_max=0,
    boss_behavior=0
   })
  end
 end
end

-- 20_game.lua
function _init()
 make_stars()
 init_port()
end

ufo_sfx_chan=3
beam_sfx_chan=3
capture_sfx_chan=3
player_death_sfx_chan=2
boss_pick_chances={0.45,0.7,0.6,0.55}
boss_tractor_chances={0.55,0.72,0.3,0.45}
boss_beam_lens={80,64,88,72}

function load_hi_score()
 local saved=max(0,flr(dget(0)))
 hi_hi=flr(saved/1000)
 hi_lo=saved%1000
end

function save_hi_score()
 dset(0,hi_hi*1000+hi_lo)
end

function play_beam_sfx()
 if beam_sfx_active then return end
 sfx(21,beam_sfx_chan)
 beam_sfx_active=true
end

function stop_ufo_sfx()
 sfx(-1,ufo_sfx_chan)
end

function stop_beam_sfx()
 if not beam_sfx_active then return end
 sfx(-1,beam_sfx_chan)
 beam_sfx_active=false
end

function play_player_death_sfx()
 sfx(7,player_death_sfx_chan)
end

function stop_capture_sfx()
 sfx(-1,capture_sfx_chan)
end

function play_jingle(n)
 stop_ufo_sfx()
 stop_beam_sfx()
 stop_capture_sfx()
 sfx(-1,player_death_sfx_chan)
 music(n)
end

function enter_gameover()
 gameover_t=0
 mode="gameover"
 play_jingle(2)
end

function return_to_title()
 demo_mode=false
 title_idle_t=0
 title_t=0
 gameover_t=0
 music(-1)
 stop_ufo_sfx()
 stop_beam_sfx()
 stop_capture_sfx()
 mode="title"
end

function init_port()
 hi_hi=0
 hi_lo=0
 cartdata("vectronix_galaga_p8")
 load_hi_score()
 title_t=0
 title_idle_t=0
 beam_sfx_active=false
 demo_mode=false
 pending_start_jingle=false
 mode="title"
 reset_run(false)
end

function check_extra_life_reward()
 if extra_life_awarded or score_hi<20 then return end
 extra_life_awarded=true
 if ships<3 then
  ships+=1
  sfx(10,player_death_sfx_chan)
  show_notice("extra ship",90)
  if mode=="gameover" then
   mode="play"
   gameover_t=0
  end
 end
end

function reset_run(run_demo)
 score_hi=0
 score_lo=0
 wave=0
 ships=3
 extra_life_awarded=false
 bullets={}
 ebullets={}
 effects={}
 powerups={}
 enemies={}
 rescue_ship=nil
 captured_boss=nil
 capture_anim=nil
 ufo=nil
 ufo_t=1200
 rapid_t=0
 slow_t=0
 magnet_t=0
 freeze_t=0
 shield_t=0
 wave_banner_t=0
 wave_clear_t=0
 result_t=0
 result_bonus=0
 notice_t=0
 notice_text=""
 demo_mode=run_demo or false
 demo_t=0
 gameover_t=0
 challenge=false
 challenge_hits=0
 challenge_total=0
 form_t=0
 dive_t=90
 stop_ufo_sfx()
 stop_beam_sfx()
 stop_capture_sfx()
 player={
  x=64,
  y=player_y,
  alive=true,
  respawn_t=0,
  inv=60,
  dual=false,
  captured=false,
  fire_t=0,
  anim=0,
  vx=0
 }
 start_wave()
end

function start_wave()
 wave+=1
 bullets={}
 ebullets={}
 effects={}
 powerups={}
 rescue_ship=nil
 ufo=nil
 ufo_t=1000
 form_t=0
 dive_t=90
 wave_banner_t=70
 wave_clear_t=0
 result_t=0
 result_bonus=0
 music(-1)
 stop_ufo_sfx()
 stop_beam_sfx()
 stop_capture_sfx()
 if wave==1 then
  if pending_start_jingle and not demo_mode then
   play_jingle(0)
  end
  pending_start_jingle=false
 else
  sfx(8,player_death_sfx_chan)
 end
 clear_timed_powerups()
 if wave%5==0 then
  build_challenge_wave()
 else
  build_normal_wave()
 end
end

function _update()
 update_stars()
 title_t+=1
 if mode=="title" then
  update_title()
 elseif mode=="play" then
  update_play()
 elseif mode=="gameover" then
  update_gameover()
 end
end

function update_title()
 if btnp(4) or btnp(5) then
  pending_start_jingle=true
  mode="play"
  reset_run(false)
  return
 end
 if btnp(0) or btnp(1) then
  title_idle_t=0
 else
  title_idle_t+=1
 end
 if title_idle_t>=480 then
  pending_start_jingle=false
  mode="play"
  reset_run(true)
 end
end

function update_gameover()
 gameover_t+=1
 local accept_input=gameover_t>60
 if demo_mode then
  if (accept_input and (btnp(0) or btnp(1) or btnp(4) or btnp(5))) or gameover_t>90 then
   return_to_title()
  end
 elseif accept_input and (btnp(4) or btnp(5)) then
  return_to_title()
 end
end

function update_stars()
 for s in all(stars) do
  s.y+=s.spd
  if s.y>127 then
   s.y=0
   s.x=rnd(128)
  end
 end
end

function update_play()
 if demo_mode then
  demo_t+=1
  if btnp(0) or btnp(1) or btnp(4) or btnp(5) or demo_t>1800 then
   return_to_title()
   return
  end
 end
 player.anim+=1
 if player.fire_t>0 then player.fire_t-=1 end
 if player.inv>0 then player.inv-=1 end
 if wave_banner_t>0 then wave_banner_t-=1 end
 if notice_t>0 then notice_t-=1 end
 if rapid_t>0 then rapid_t-=1 end
 if slow_t>0 then slow_t-=1 end
 if magnet_t>0 then magnet_t-=1 end
 if freeze_t>0 then freeze_t-=1 end
 if shield_t>0 then shield_t-=1 end

 if freeze_t<=0 then
  form_t+=1
  if not challenge then update_ufo() end
  update_enemies()
  update_ebullets()
 else
  if ufo then update_ufo(true) end
 end

 update_player()
 update_bullets()
 update_powerups()
 update_effects()
 update_rescue_ship()
 update_capture_anim()
 check_collisions()
 check_wave_state()
end

function update_player()
 if player.alive then
  local old_x=player.x
  local spd=player.dual and 1.75 or 2.25
  local fire=false
  if demo_mode then
   fire=update_demo_player(spd)
  else
   if btn(0) then player.x-=spd end
   if btn(1) then player.x+=spd end
   fire=rapid_t>0 and (btn(4) or btn(5)) or (btnp(4) or btnp(5))
  end
  local margin=player.dual and 8 or 4
  player.x=clamp(player.x,field_l+margin,field_r-margin)
  player.vx=player.x-old_x
  if fire and player.fire_t<=0 and (challenge or wave_banner_t<=0) then
   if fire_player() then
    player.fire_t=(rapid_t>0) and 4 or 8
   end
  end
 else
  player.vx=0
  if player.captured then
  elseif player.respawn_t>0 then
   player.respawn_t-=1
  elseif ships>0 then
   player.alive=true
   player.captured=false
   player.inv=70
   player.x=64
   player.y=player_y
  else
   enter_gameover()
  end
 end
end

function fire_player()
 local cap=player.dual and 4 or 2
 if rapid_t>0 then cap+=1 end
 local n=0
 for b in all(bullets) do
  n+=1
 end
 if n>=cap then return false end
 if player.dual then
  add(bullets,{x=player.x-4,y=player.y-4,px=player.x-4,py=player.y-4,vx=0,vy=-3.4,t=0})
  add(bullets,{x=player.x+4,y=player.y-4,px=player.x+4,py=player.y-4,vx=0,vy=-3.4,t=0})
 else
  add(bullets,{x=player.x,y=player.y-4,px=player.x,py=player.y-4,vx=0,vy=-3.4,t=0})
 end
 sfx(5,player_death_sfx_chan)
 return true
end

function clear_timed_powerups()
 rapid_t=0
 slow_t=0
 magnet_t=0
 freeze_t=0
end

function show_notice(text,ttl)
 notice_text=text
 notice_t=ttl or 75
end

function player_hit_test(x,y,rx,ry)
 if not player.alive then return false end
 rx=rx or 5
 ry=ry or rx
 if abs(x-player.x)<rx and abs(y-player.y)<ry then
  return true
 end
 if player.dual then
  if abs(x-(player.x-4))<rx and abs(y-player.y)<ry then
   return true
  end
  if abs(x-(player.x+4))<rx and abs(y-player.y)<ry then
   return true
  end
 end
 return false
end

function bullet_enemy_hit(b,e)
 local rx=6+enemy_defs[e.kind].w*2
 local ry=6+enemy_defs[e.kind].h*2
 if abs(b.x-e.x)<rx and abs(b.y-e.y)<ry then
  return true
 end
 if not b.px or not e.px then
  return false
 end
 local hit_r=(challenge and 7 or 6)+enemy_defs[e.kind].w
 local mid_x=(e.x+e.px)*0.5
 local mid_y=(e.y+e.py)*0.5
 local best=min(
  seg_point_dist2(b.px,b.py,b.x,b.y,e.x,e.y),
  seg_point_dist2(b.px,b.py,b.x,b.y,e.px,e.py)
 )
 best=min(best,seg_point_dist2(b.px,b.py,b.x,b.y,mid_x,mid_y))
 return best<hit_r*hit_r
end

function spinner_deflects(e)
 return flr((e.anim+e.row*3+e.col*5)/2)%6==0
end

function phantom_intangible(e)
 return flr((e.anim+e.row*7+e.col*5)/3)%10>=7
end

function boss_target_x(e)
 local aim_x=player.x
 if e.hp<2 or e.boss_behavior==3 then
  aim_x=player.x+player.vx*10
 elseif e.boss_behavior==1 then
  aim_x=player.x+player.vx*6
 end
 return clamp(aim_x,field_l+6,field_r-6)
end

function dive_shot_count(e)
 local wave_shots=min(4,1+flr((wave-1)/3))
 if e.kind=="guardian" then return 0 end
 if e.kind=="bomber" or e.kind=="commander" or e.kind=="boss" then
  wave_shots+=1
 elseif e.kind=="swarm" then
  wave_shots=max(1,wave_shots-1)
 elseif e.kind=="attacker" and wave>=10 then
  wave_shots+=1
 end
 if e.kind=="boss" and (e.boss_behavior==1 or e.boss_behavior==3 or e.hp<2) then
  wave_shots+=1
 end
 return min(5,wave_shots)
end

function start_enemy_dive(e,dive_kind,target_x,delay,slot,total)
 e.state="diving"
 e.t=delay or 0
 e.sx=e.x
 e.sy=e.y
 e.target_x=target_x or player.x
 e.dive_kind=dive_kind
 e.dive_slot=slot or 0
 e.dive_total=total or 1
 e.shot_max=dive_shot_count(e)
 e.shots=e.shot_max
 e.shot_t=0.18+rnd(0.08)
 if (slot or 0)<=0 and (not delay or delay>=0) then sfx(26,player_death_sfx_chan) end
 if dive_kind==5 or e.kind=="guardian" then
  e.shots=0
  e.shot_max=0
 end
end

function update_demo_player(spd)
 local margin=player.dual and 8 or 4
 local target_x=64
 local threat=nil
 for b in all(ebullets) do
  if b.y>player.y-44 and b.y<player.y+6 and abs(b.x-player.x)<18 then
   threat=b
   break
  end
 end

 if threat then
  target_x=player.x+(threat.x<=player.x and 18 or -18)
 else
  local aim=nil
  local best=999
  for e in all(enemies) do
   if e.state~="queued" then
    local rank=abs(e.x-player.x)+abs(e.y-60)
    if rank<best then
     best=rank
     aim=e
    end
   end
  end
  if aim then
   target_x=aim.x
  end
 end

 target_x=clamp(target_x,field_l+margin,field_r-margin)
 if player.x<target_x-1 then
  player.x=min(target_x,player.x+spd)
 elseif player.x>target_x+1 then
  player.x=max(target_x,player.x-spd)
 end

 if wave_banner_t>0 or player.fire_t>0 or threat and abs(threat.x-player.x)<10 then return false end
 if ufo and abs(ufo.x-player.x)<14 then return true end
 for e in all(enemies) do
  if e.state~="queued" and e.y<player.y and abs(e.x-player.x)<12 then
   return true
  end
 end
 return rnd(1)<0.04
end

function update_bullets()
 for b in all(bullets) do
  b.t+=1
  b.px=b.x
  b.py=b.y
  if magnet_t>0 then
   local target=nil
   local best=99999
   for e in all(enemies) do
    if e.state~="queued" and e.state~="dead" then
     local d=dist2(b.x,b.y,e.x,e.y)
     if d<best then
      best=d
      target=e
     end
    end
   end
  if target then
   local dx=target.x-b.x
   local dy=min(-4,target.y-b.y)
   local mag=max(0.1,sqrt(dx*dx+dy*dy))
   b.vx=clamp(b.vx+dx/mag*0.2,-3,3)
   b.vy=clamp(b.vy+dy/mag*0.16,-4.2,-0.8)
   end
  end
  b.x+=b.vx
  b.y+=b.vy
  if b.y<-8 or b.x<-8 or b.x>136 then
   del(bullets,b)
  end
 end
end

function update_ebullets()
 local mult=(slow_t>0) and 0.6 or 1
 for b in all(ebullets) do
  b.x+=b.vx*mult
  b.y+=b.vy*mult
  if b.y>136 or b.x<-8 or b.x>136 then
   del(ebullets,b)
  end
 end
end

function update_effects()
 for fx in all(effects) do
  fx.t+=1
  if fx.t>=fx.ttl then
   del(effects,fx)
  end
 end
end

function update_powerups()
 for p in all(powerups) do
  p.y+=1.0
  p.t+=1
  if p.y>136 or p.t>480 then
   del(powerups,p)
  end
 end
end

function update_rescue_ship()
 if not rescue_ship then return end
 if player.alive then
  rescue_ship.x=lerp(rescue_ship.x,player.x+4,0.08)
  rescue_ship.y=lerp(rescue_ship.y,player.y,0.08)
 else
  rescue_ship.y+=rescue_ship.vy
  rescue_ship.vy=min(rescue_ship.vy+0.03,1.4)
 end
 rescue_ship.t-=1
 if rescue_ship.y>136 or rescue_ship.t<=0 then
  rescue_ship=nil
 end
end

function update_capture_anim()
 if not capture_anim then return end
 if capture_anim.boss.state~="capturing" then
  stop_capture_sfx()
  capture_anim=nil
  return
 end
 capture_anim.t+=1
 capture_anim.x=lerp(capture_anim.x,capture_anim.boss.x,0.18)
 capture_anim.y-=0.7
 if capture_anim.y<=capture_anim.boss.y+6 then
  capture_anim.boss.captured=true
  capture_anim.boss.state="returning"
  if ships<=0 then
   player.captured=false
   enter_gameover()
  else
   play_jingle(1)
  end
  capture_anim=nil
 end
end

function update_ufo(frozen_only)
 if not ufo then
  if frozen_only then return end
  ufo_t-=1
  if ufo_t<=0 then
   local dir=(rnd(1)<0.5) and 1 or -1
   ufo={
    x=(dir==1) and -16 or 144,
    y=14,
    dir=dir,
    anim=0
   }
   ufo_t=1500
   sfx(25,ufo_sfx_chan)
  end
  return
 end
 ufo.anim+=1
 if not frozen_only then
  ufo.x+=ufo.dir*1.1
 end
 if ufo.x<-24 or ufo.x>152 then
  stop_ufo_sfx()
  ufo=nil
 end
end

function try_group_dive(pool)
 local row=flr(rnd(5))
 local best={}
 for tries=1,5 do
  best={}
  for e in all(pool) do
   if e.row==row and e.kind~="boss" and e.kind~="commander" and e.kind~="guardian" then
    add(best,e)
   end
  end
  if #best>=3 then break end
  row=(row+1)%5
 end
 if #best<3 then return false end
 local group_n=wave>=12 and 4 or 3
 group_n=min(group_n,#best)
 local start_idx=1+flr(rnd(max(1,#best-group_n+1)))
 local center_x=player.x
 for i=0,group_n-1 do
  local e=best[start_idx+i]
  del(pool,e)
  start_enemy_dive(e,6,center_x,-i*0.08,i,group_n)
 end
 return true
end

function launch_pool_dive(pool)
 local pick=nil
 if not player.dual and not captured_boss and ships>1 then
  for e in all(pool) do
   if e.kind=="boss" and rnd(1)<boss_pick_chances[1+e.boss_behavior] then
    pick=e
    break
   end
  end
 end
 if not pick and #pool>0 then
  pick=pool[1+flr(rnd(#pool))]
 end
 if not pick then return end
 del(pool,pick)

 if pick.kind=="boss" and not captured_boss and ships>1 and not player.dual and not tractor_active() and rnd(1)<boss_tractor_chances[1+pick.boss_behavior] then
  pick.state="diving"
  pick.t=0
  pick.sx=pick.x
  pick.sy=pick.y
  pick.dive_kind=5
  pick.beam_x=boss_target_x(pick)
  pick.beam_len=boss_beam_lens[1+pick.boss_behavior]
  pick.shots=0
  sfx(11,capture_sfx_chan)
  return
 end

 if pick.kind=="swarm" and #pool>0 then
  local buddy=pool[1+flr(rnd(#pool))]
  del(pool,buddy)
  if buddy then
   start_enemy_dive(buddy,2,clamp(player.x+6,field_l+6,field_r-6),-0.06,1,2)
  end
 end

 if pick.kind=="commander" and #pool>0 then
  local escort=nil
  for e in all(pool) do
   if e.kind~="boss" and e.kind~="guardian" then
    escort=e
    break
   end
  end
  if escort then
   del(pool,escort)
   start_enemy_dive(escort,4,clamp(player.x+8,field_l+6,field_r-6),-0.05,1,2)
  end
 end

 local dive_kind=1
 if pick.kind=="grunt" then
  if (pick.row+pick.col+wave)%2==0 then
   dive_kind=1
  else
   dive_kind=2
  end
 elseif pick.kind=="attacker" then
  if rnd(1)<0.5 then
   dive_kind=4
  else
   dive_kind=2
  end
 elseif pick.kind=="spinner" then
  dive_kind=3
 elseif pick.kind=="bomber" then
  if rnd(1)<0.5 then
   dive_kind=1
  else
   dive_kind=3
  end
 elseif pick.kind=="phantom" then
  if rnd(1)<0.5 then
   dive_kind=2
  else
   dive_kind=4
  end
 elseif pick.kind=="swarm" then
  dive_kind=4
 elseif pick.kind=="guardian" then
  dive_kind=7
 elseif pick.kind=="commander" then
  if rnd(1)<0.5 then
   dive_kind=1
  else
   dive_kind=4
  end
 elseif pick.kind=="boss" then
  if pick.boss_behavior==3 then
   dive_kind=7
  else
   dive_kind=rnd(1)<0.5 and 1 or 3
  end
 end
 local target_x=clamp(player.x+rnd(24)-12,field_l+6,field_r-6)
 if pick.kind=="guardian" or pick.kind=="boss" then
  target_x=boss_target_x(pick)
 end
 start_enemy_dive(pick,dive_kind,target_x)
end

function update_enemies()
 local mult=(slow_t>0) and 0.6 or 1
 if not challenge then
  dive_t-=1
  if dive_t<=0 and wave_banner_t<=0 then
   trigger_dive()
   local cycle=flr((wave-1)/9)
   dive_t=max(18,78-wave*3-cycle*8)
  end
 end

 for e in all(enemies) do
  e.px=e.x
  e.py=e.y
  e.anim+=1
  if e.state=="queued" then
   e.spawn_t-=1
   if e.spawn_t<=0 then
    e.state="entering"
    e.t=0
    e.sx=e.x
    e.sy=e.y
   end
  elseif e.state=="entering" then
   local cycle=flr((wave-1)/9)
   e.t+=0.02*mult*(1+wave*0.02+cycle*0.15)
   local t=min(e.t,1)
   local arc=(0.5-abs(t-0.5))*2
   e.x=lerp(e.sx,e.tx,t)+e.dir*arc*18
   e.y=lerp(e.sy,e.ty,t)-arc*18
   if t>=1 then
    e.state="holding"
   end
  elseif e.state=="holding" then
   e.x,e.y=enemy_slot_xy(e.row,e.col)
  elseif e.state=="diving" then
   update_diving_enemy(e,mult)
  elseif e.state=="beaming" then
   e.beam_t-=1
   if e.beam_t<=0 then
    e.state="returning"
    stop_beam_sfx()
   else
    if player.alive and ships>1 and not captured_boss and abs(player.x-e.x)<10 then
     if player.dual then
      player.dual=false
      player.inv=70
      explode_at(player.x+5,player.y)
      e.state="returning"
      play_player_death_sfx()
      stop_beam_sfx()
     else
      capture_player(e)
     end
    end
   end
  elseif e.state=="capturing" then
   e.x=lerp(e.x,e.beam_x,0.12)
  elseif e.state=="returning" then
   local tx,ty=enemy_slot_xy(e.row,e.col)
   e.tx=tx
   e.ty=ty
   e.x=lerp(e.x,e.tx,0.08*mult)
   e.y=lerp(e.y,e.ty,0.08*mult)
   if abs(e.x-e.tx)<1 and abs(e.y-e.ty)<1 then
    e.state="holding"
    if player.captured and captured_boss==e then
     player.captured=false
    end
   end
  elseif e.state=="challenge" then
   update_challenge_enemy(e,mult)
  end
 end
end

function update_diving_enemy(e,mult)
 local cycle=flr((wave-1)/9)
 local speed=enemy_defs[e.kind].speed
 if e.kind=="boss" then
  if e.hp<2 then speed*=1.15 end
  if e.boss_behavior==1 then speed*=1.1 end
 end
 e.t+=0.012*speed*mult*(1+wave*0.03+cycle*0.15)
 if e.kind=="boss" and e.dive_kind==5 then
  e.x=lerp(e.sx,e.beam_x,e.t)
  e.y=e.sy+e.t*70
  if e.t>=0.85 then
   e.state="beaming"
   e.beam_t=e.beam_len or 80
   play_beam_sfx()
  end
  return
 end

 local t=e.t
 if t<0 then
  e.x=e.sx
  e.y=e.sy
  return
 end
 local dx=0
 local dy=0
 if e.dive_kind==1 then
  dx=sin(t*0.5)*30*e.dir
  dy=t*104
 elseif e.dive_kind==2 then
  dx=sin(t)*22*e.dir
  dy=t*96
 elseif e.dive_kind==3 then
  dx=sin(t)*16*e.dir
  dy=t*102-sin(t*0.5)*18
 elseif e.dive_kind==4 then
  local tx=e.target_x-e.sx
  dx=tx*min(t,0.65)/0.65+sin(t)*8*e.dir
  dy=t*110
 elseif e.dive_kind==6 then
  local tx=e.target_x-e.sx
  local offset=(e.dive_slot-(e.dive_total-1)/2)*8
  dx=tx*min(t,0.72)/0.72+offset+sin((t+e.dive_slot*0.14)*0.8)*6*e.dir
  dy=t*108
 elseif e.dive_kind==7 then
  local tx=e.target_x-e.sx
  dx=tx*min(t,0.96)+sin(t*0.45)*3*e.dir
  dy=t*118-sin(min(t,0.65)*1.2)*8
 else
  local tx=e.target_x-e.sx
  dx=tx*min(t,0.92)+sin(t*0.35)*4*e.dir
  dy=t*118
 end
 e.x=e.sx+dx
 e.y=e.sy+dy

 if e.kind=="spinner" then
  e.x+=sin(t*2.4+e.col*0.3)*4*e.dir
 elseif e.kind=="phantom" then
  e.x+=sin(t*3.2+e.col*0.4)*5*e.dir
 elseif e.kind=="boss" and e.boss_behavior==3 then
  e.x=lerp(e.x,boss_target_x(e),0.04)
 end

 if e.shots>0 then
  if e.y>18 and e.y<104 and t>=e.shot_t then
   enemy_fire(e)
   e.shots-=1
   if e.shots>0 then
    local fired=e.shot_max-e.shots
    e.shot_t=min(0.88,0.2+(fired/max(1,e.shot_max))*0.58+rnd(0.05))
   end
  end
 end

 if e.y>136 or e.t>=1.2 then
  e.state="returning"
 end
end

function update_challenge_enemy(e,mult)
 e.t+=1*mult
 if e.t<0 then
  e.x=-20
  e.y=-20
  return
 end
 local t=e.t
 local u=min(t/124,1)
  local pat=e.dive_kind
 local spread=(e.dive_slot-1.5)*14
  local start_x=e.dir==1 and -12 or 140
  local end_x=e.dir==1 and 140 or -12
 local base_y=26+e.dive_slot*18
  local pi=3.1415
 e.x=lerp(start_x,end_x,u)
 if pat==1 then
  e.y=base_y
 elseif pat==2 then
  e.y=base_y+sin(u*pi)*8
 elseif pat==3 then
  e.y=base_y+sin(u*pi*2+e.dive_slot*0.6)*6
 elseif pat==4 then
  e.y=base_y+cos(u*pi*2)*5
 else
  e.y=base_y+sin(u*pi*1.5)*10
 end
 if t>132 then
  del(enemies,e)
 end
end

function trigger_dive()
 local holding={}
 for e in all(enemies) do
  if e.state=="holding" and not (player.dual and e.kind=="boss") then
   add(holding,e)
  end
 end
 if #holding<1 then return end

 local group_chance=wave>=18 and 0.45 or wave>=12 and 0.35 or wave>=9 and 0.2 or wave>=8 and 0.1 or 0
 if not player.dual and group_chance>0 and rnd(1)<group_chance then
  if try_group_dive(holding) then
   return
  end
 end

 local max_divers=wave>=18 and 4 or wave>=9 and 3 or wave>=4 and 2 or 1
 local dive_count=min(#holding,max_divers)
 if rnd(1)<0.7 and dive_count>1 then dive_count-=1 end

 for i=1,dive_count do
  if #holding<1 then break end
  launch_pool_dive(holding)
 end
end

function tractor_active()
 for e in all(enemies) do
  if e.kind=="boss" and (e.state=="beaming" or e.state=="capturing" or (e.state=="diving" and e.dive_kind==5)) then
   return true
  end
 end
 return capture_anim~=nil
end

function fire_aim(x,y,tx,spd)
 local dx=tx-x
 local dy=max(8,player.y-y)
 local mag=max(1,sqrt(dx*dx+dy*dy))
 add(ebullets,{x=x,y=y+4,vx=dx/mag*spd,vy=dy/mag*spd})
end

function enemy_fire(e)
 if challenge then return end
 local shot=enemy_defs[e.kind].shot
 if shot=="none" or shot=="boss" and e.dive_kind==5 then return end
 local spd=1+flr((wave-1)/9)*0.15
 if shot=="straight" then
  add(ebullets,{x=e.x,y=e.y+4,vx=0,vy=1.7*spd})
 elseif shot=="aim" then
  fire_aim(e.x,e.y,player.x,1.5*spd)
 elseif shot=="boss" then
  local aim_x=(e.hp<2 or e.boss_behavior==3 or wave>=8) and boss_target_x(e) or player.x
  local boss_spd=1.55
  if e.boss_behavior==1 then boss_spd=1.7 end
  fire_aim(e.x,e.y,aim_x,boss_spd*spd)
 elseif shot=="spread" then
  add(ebullets,{x=e.x,y=e.y+4,vx=0,vy=1.7*spd})
  add(ebullets,{x=e.x,y=e.y+4,vx=-0.7*spd,vy=1.5*spd})
  add(ebullets,{x=e.x,y=e.y+4,vx=0.7*spd,vy=1.5*spd})
 elseif shot=="bomb" then
  add(ebullets,{x=e.x,y=e.y+4,vx=0,vy=1.2*spd})
 end
end

function capture_player(e)
 captured_boss=e
 player.alive=false
 player.captured=true
 player.respawn_t=90
 ships=max(0,ships-1)
 e.state="capturing"
 stop_beam_sfx()
 stop_capture_sfx()
 sfx(22,capture_sfx_chan)
 capture_anim={
  x=player.x,
  y=player.y,
  boss=e,
  t=0
 }
end

function explode_at(x,y)
 add(effects,{x=x,y=y,t=0,ttl=9})
end

function kill_enemy(e,diving_kill)
 local def=enemy_defs[e.kind]
 if challenge then
  add_score(100)
  challenge_hits+=1
 else
  add_score(diving_kill and def.dive_score or def.score)
 end
 explode_at(e.x,e.y)
 sfx(6,player_death_sfx_chan)
 if e.state=="beaming" or e.state=="capturing" then stop_beam_sfx() end
 if e.state=="capturing" then stop_capture_sfx() end
 if capture_anim and capture_anim.boss==e then
  capture_anim=nil
  player.captured=false
  stop_capture_sfx()
 end
 if e.kind=="boss" then
  if e.captured then
   if diving_kill then
    rescue_ship={x=e.x,y=e.y,vy=0.25,t=240}
   else
    rescue_ship=nil
   end
  end
  if captured_boss==e then
   captured_boss=nil
   player.captured=false
  end
 end
 del(enemies,e)
end

function spawn_powerup(x,y)
 local kind=power_order[1+flr(rnd(#power_order))]
 if kind=="extra" and ships>=3 then
  kind=power_order[2+flr(rnd(#power_order-1))]
 end
 add(powerups,{kind=kind,x=x,y=y,t=0})
end

function apply_powerup(kind)
 sfx(9,player_death_sfx_chan)
 if kind=="extra" then
  if ships<3 then
   ships+=1
   sfx(10,player_death_sfx_chan)
  end
  show_notice("extra ship",90)
 elseif kind=="rapid" then
  rapid_t=720
  show_notice("rapid fire",75)
 elseif kind=="shield" then
  shield_t=1200
  show_notice("shield",75)
 elseif kind=="slow" then
  slow_t=900
  show_notice("slowdown",75)
 elseif kind=="magnet" then
  magnet_t=600
  show_notice("magnet",75)
 elseif kind=="freeze" then
  freeze_t=210
  show_notice("time freeze",75)
 end
end

function hit_player()
 if player.inv>0 or not player.alive then return end
 if shield_t>0 then
  shield_t=0
  player.inv=30
  explode_at(player.x,player.y)
  return
 end
 if player.dual then
  player.dual=false
  player.inv=70
  explode_at(player.x+5,player.y)
  play_player_death_sfx()
  return
 end
 player.alive=false
 player.respawn_t=90
 ships-=1
 explode_at(player.x,player.y)
 play_player_death_sfx()
 if ships<=0 then
  enter_gameover()
 end
end

function check_collisions()
 for b in all(bullets) do
  for e in all(enemies) do
   if e.state~="queued" then
    if e.captured and abs(b.x-e.x)<5 and abs(b.y-(e.y-5))<6 then
     explode_at(e.x,e.y-5)
     del(bullets,b)
     e.captured=false
     if captured_boss==e then
      captured_boss=nil
      if player.captured then
       player.captured=false
      end
     end
     break
    elseif not challenge and e.kind=="phantom" and phantom_intangible(e) then
    elseif bullet_enemy_hit(b,e) then
     if not challenge and e.kind=="spinner" and spinner_deflects(e) then
      explode_at(b.x,b.y)
      del(bullets,b)
      break
     end
     e.hp-=1
     del(bullets,b)
     if e.hp<=0 then
      kill_enemy(e,e.state~="holding" and e.state~="entering")
     else
      explode_at(e.x,e.y)
     end
     break
    end
   end
  end
 end

 if ufo then
  for b in all(bullets) do
  if abs(b.x-ufo.x)<10 and abs(b.y-ufo.y)<6 then
    add_score(300)
    explode_at(ufo.x,ufo.y)
    spawn_powerup(ufo.x,ufo.y)
    stop_ufo_sfx()
    del(bullets,b)
    ufo=nil
    break
   end
  end
 end

 for p in all(powerups) do
  if player_hit_test(p.x,p.y,8,8) then
   apply_powerup(p.kind)
   del(powerups,p)
   break
  end
 end

 for b in all(ebullets) do
  if not challenge and player_hit_test(b.x,b.y,5,5) then
   del(ebullets,b)
   hit_player()
   break
  end
 end

 if not challenge then
  for e in all(enemies) do
   if (e.state=="diving" or e.state=="capturing" or e.state=="returning") and player_hit_test(e.x,e.y,8,8) then
    kill_enemy(e,true)
    hit_player()
    break
   end
  end
 end

 if rescue_ship and player_hit_test(rescue_ship.x,rescue_ship.y,8,8) then
  if player.dual then
   add_score(2000)
   show_notice("2000",60)
  else
   player.dual=true
   show_notice("dual fighter",90)
  end
  sfx(24,capture_sfx_chan)
  rescue_ship=nil
 end
end

function check_wave_state()
 if #enemies>0 then return end
 clear_timed_powerups()
 if challenge and result_t==0 then
  result_bonus=challenge_hits*100
  if challenge_hits==challenge_total then
   result_bonus+=10000
   if ships<3 then
    ships+=1
    sfx(10,player_death_sfx_chan)
    show_notice("perfect! ship+",120)
   else
    show_notice("perfect!",90)
   end
  end
  add_score(result_bonus)
  result_t=180
  return
 end
 if result_t>0 then
  result_t-=1
  if result_t<=0 then
   start_wave()
  end
  return
 end
 if wave_clear_t==0 then
  wave_clear_t=80
 else
  wave_clear_t-=1
  if wave_clear_t<=0 then
   start_wave()
  end
 end
end

function enemy_frame(e)
 local def=enemy_defs[e.kind]
 if e.kind=="spinner" then
  if spinner_deflects(e) then return 2 end
  return (flr(e.anim/4)%4)+1
 elseif e.kind=="guardian" then
  if e.hp<=1 then return 4 end
  if e.hp==2 then return 3 end
  return (flr(e.anim/10)%2)+1
 elseif e.kind=="phantom" then
  if phantom_intangible(e) then return 3+flr(e.anim/12)%2 end
  return 1+flr(e.anim/10)%2
 elseif e.kind=="boss" then
  if e.state=="beaming" then return 4 end
  if e.hp<2 then return 3 end
  return 1+flr(e.anim/10)%2
 elseif e.kind=="commander" or e.kind=="bomber" then
  if e.hp<enemy_defs[e.kind].hp then return 3 end
  return 1+flr(e.anim/10)%2
 else
  return 1+flr(e.anim/10)%#def.spr
 end
end

-- 30_draw.lua
function _draw()
 cls(0)
 draw_stars()
 if mode=="title" then
  draw_title()
  return
 end
 draw_playfield()
 if mode=="gameover" then
  rectfill(24,50,104,80,1)
  print("game over",46,58,7)
  print("press z/x",42,68,6)
 end
end

function draw_stars()
 for s in all(stars) do
  pset(s.x,s.y,s.col)
 end
end

function draw_title()
 -- game logo (128x56 from spritesheet y=72)
 sspr(0,72,128,56,0,0)
 -- instructions
 local blink=flr(title_t/20)%2==0
 if blink then
  print("\142/\151 to start",36,60,10)
 end
 print("\139\145 move  \142/\151 fire",16,72,6)
 print("hi "..score_str(hi_hi,hi_lo),42,82,7)
 print("demo after idle",30,90,5)
 -- studio logo (128x24 from spritesheet y=48)
 sspr(0,48,128,24,0,102)
end

function draw_playfield()
 draw_planet_surface()
 draw_bg_status()
 if ufo then draw_ufo() end
 draw_captured_ships()
 for e in all(enemies) do
  draw_enemy(e)
 end
 if rescue_ship then draw_rescue_ship() end
 for b in all(bullets) do
  spr(fx_sprs.player_bullet,b.x-4,b.y-4)
 end
 for b in all(ebullets) do
  spr(fx_sprs.enemy_bullet,b.x-4,b.y-4)
 end
 for p in all(powerups) do
  spr(power_icons[p.kind],p.x-4,p.y-4)
 end
 for fx in all(effects) do
  local frame=fx_sprs.burst[min(3,1+flr(fx.t/3))]
  spr(frame,fx.x-4,fx.y-4)
 end
 draw_player()
 draw_capture_anim()
 draw_hud()
 if wave_banner_t>0 then
  if challenge then
   print("challenging",34,58,10)
   print("stage",52,66,10)
  else
   print("wave "..wave,52,62,10)
  end
 end
 if result_t>0 then
  rectfill(14,52,114,84,1)
  print("challenge",46,56,10)
  print("hits "..challenge_hits.."/"..challenge_total,34,64,7)
  print("bonus "..result_bonus,38,72,11)
  if challenge_hits==challenge_total then
   print("perfect!",44,80,14)
  end
 end
end

function draw_planet_surface()
 -- planet surface strip (128x8 from spritesheet y=40)
 sspr(0,40,128,8,0,120)
end

function draw_bg_status()
 if notice_t>0 then return end
 local text=nil
 local x=nil
 if player.captured then
  text="ship captured"
  x=64-#text*2
 elseif captured_boss and captured_boss.captured then
  text="captured ship in play"
  x=64-#text*2
 elseif demo_mode then
  text="demo"
  x=97
 end
 if text then
  print(text,x,111,1)
 end
end

function draw_player()
 if not player.alive then return end
 local flash=player.inv>0 and flr(player.inv/4)%2==0
 if flash then return end
 local frame=player_frames[1+flr(player.anim/10)%2]
 if player.dual then
  spr(frame,player.x-8,player.y-4)
  spr(frame,player.x,player.y-4)
 else
  spr(frame,player.x-4,player.y-4)
 end
 if shield_t>0 then
  circ(player.x,player.y,5,12)
 end
end

function draw_captured_ships()
 for e in all(enemies) do
  if e.captured then
   local pf=player_frames[1+flr(player.anim/10)%2]
   spr(pf,e.x-4,e.y-9)
  end
 end
end

function draw_enemy(e)
 local def=enemy_defs[e.kind]
 local frame=def.spr[enemy_frame(e)]
 local x=e.x-def.w*4
 local y=e.y-def.h*4
 spr(frame,x,y,def.w,def.h,e.dir<0)
 if e.state=="beaming" or e.state=="capturing" then
  for sy=e.y+4,118,4 do
   line(e.x-2,sy,e.x+2,sy,12)
  end
 end
end

function draw_ufo()
 local frame=ufo_frames[1+flr(ufo.anim/12)%2]
 spr(frame,ufo.x-4,ufo.y-4,1,1,ufo.dir<0)
end

function draw_rescue_ship()
 local frame=player_frames[1+flr(player.anim/10)%2]
 spr(frame,rescue_ship.x-4,rescue_ship.y-4)
end

function draw_capture_anim()
 if not capture_anim then return end
 local flash=flr(capture_anim.t/3)%2==0
 if flash then
  local frame=player_frames[1]
  spr(frame,capture_anim.x-4,capture_anim.y-4)
 end
end

function draw_hud()
 print("1up "..score_str(score_hi,score_lo),2,1,7)
 print("hi "..score_str(hi_hi,hi_lo),48,1,6)
 print("wv "..wave,102,1,10)
 print("ships "..max(ships-1,0),2,121,6)
 if notice_t>0 then
  print(notice_text,64-#notice_text*2,111,11)
 end
end
__gfx__
000070000000700000600600000660000d0000d000d00d00a000000a0a0000a00a0000a0000dd000d000000d00d00d000d0000d0c008800c0008800000088000
000070000000700004488440004444006000000606000060d00dd00d0d0dd0d00d0dd0d0000dd0000d0000d00d0000d000d00d00c00dd00c0c0dd0c0000dd000
00088800000888004846648404866840640dd046064dd460d0dddd0d0dddddd00dddddd0000e0000000e0000000e0000000e00000cddddc00cddddc00cddddc0
000c7c00000c7c00840cc048084cc480644cc446064cc4600ddeedd000deed0000deed00dde7e0dd00e7e00000e7e00000e7e0000c0000c00c0000c00c0000c0
007c0c70007c0c700400004000400400640dd046064dd4600dd88dd000d88d000dd88dd0dd0eeedd000eee00000eee00000eee00c0d00d0c0cd00dc000d00d00
0077c7700077c77004400440004004006d0000d606d00d60d0dddd0d0dddddd00dddddd00000e0000000e000d000e00d0000e000c0dddd0c00dddd0000dddd00
077777770777777700400400000440006000000606000060d00aa00d0d0aa0d00a0dd0a0000dd0000d0000d00d0000d0d000000d007dd70000dddd00007dd700
070808070708080700400400000000000d0000d000d00d00a000000a0a0000a0000aa000000dd000d000000d000000000d0000d0000770000007700000077000
067777600677776006777760067777600006600000000000000dd00000000000b0aaaa0b00aaaa00000660000006600000007000000000000000000000000000
daaddaadddddddddd80dd08dd80dd08d0006600060066006000dd000d00dd00dbbbbbbbbbbbbbbbb0dddddd00dddddd00007a70000000000000000000a090000
00dddd00009dd90000dd0d0000d00d0060dddd0660dddd06d044440dd044440d0b0000b00b0000b0daaddaadaddaadda000aaa0000088000000a0000009a9000
000aa00000099000000080000000000066d88d6666d88d66dd4ee4dddd4ee4dd0bb00bb00bb00bb00dddddd00dddddd000099900008aa80000a7700009a77900
000aa00000099000000800000000000060dbbd0660dbbd06d04bb40dd04bb40db0bbbb0bb0bbbb0b000000000000000000009000008aa800000a0000009a9000
00dddd00009dd90000d0dd0000d00d0060dddd0660dddd06d044440dd044440db0bbbb0be0bbbb0e00dddd0000dddd0000009000000880000000000000090000
daaddaadddddddddd80dd08dd80dd08d6060060600600600d0d00d0d00d00d00e00bb00e000ee0000000000000000000000000000000000000000000000000a0
06777760067777600677776006777760006006000000000000d00d0000000000000ee00000000000000660000006600000009000000000000000000000000000
a009000a0000000000888000006666000cc00cc0c00cc00c008888000088880000eeee0000888800000000000000000000000000000000000000000000000000
009a90000000000008aaa800060000600cc00cc00707707008cccc8008cccc800ecccce008cccc80000000000000000000000000000000000000000000000000
09a7a90000700070aabbbaa0600d7006088008800070070088c77c8888c77c88eec77cee88c77c88000000000000000000000000000000000000000000000000
9a777a9007700770bb000bb060dd7d0608800880c707707c8888888888888888eeeeeeee08888880000000000000000000000000000000000000000000000000
09a7a9000aa00aa00007000060777d060cc00cc0c707707c080880800088880000e00e0000888800000000000000000000000000000000000000000000000000
009a90000990099000777000600dd0060cccccc00070070080000008008008000e0000e000800800000000000000000000000000000000000000000000000000
0009000009000900007770000600006000cccc000707707080000008008008000e0000e000088000000000000000000000000000000000000000000000000000
9000000909000900077077000066660000000000c00cc00c080000800008800000e00e0000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000010111111111111115151551515515151515111151111111111101010000000000000000000000000000000000
00000000000000000000000000010111111115155555555555555555555555551555555555555555555555555555555555111110100000000000000000000000
00000000000000000000111111515555555555551515151515151515151515115515111115151555555555555555555555555555555511111100000000000000
00000000000101111515555555555151515151515151515151515151515151551151551551515151151515151515555555555555555555555555111110000000
00000111111555555151515151515515555555151515151515151515151515115111115115151515515151515151515155555555555555555555555555551110
11111515555151151555151515151151111111515151515111515151115111111151511511515151151515151515151515115155555555555555555555555555
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000000005dd500d7765000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
000000000000005d55d0d76677100000000088800088000000888000888088088888000000888880088888008888008800088880088808800000000000000000
00000000000001d50001760057600000000088800088000000888000888088088888800000888888088888088888808800888888088808800000000000000000
00000000000005d00006700007700000000080800088000000808000888088088008800000880088088000088008808800880088088808800000000000000000
00000000000005d500177d0017600000000080800088000000808000888088088008800000880088088000088008808800880088088808800000000000000000
00000000000000dd006777dd77500000000880880088000008808800888088088008800000880088088000088800008800880088088808800000000000000000
00000000000000005677777761000000000880880088000008808800888888088008800000880088088888008880008800880000088888800000000000000000
00000000000000577777776101000000000880880088000008808800880888088008800000880088088888000888008800880888088088800000000000000000
0000000000000177556777005d100000000880880088000008808800880888088008800000880088088000000088008800880888088088800000000000000000
0000000000000d75000775000dd00000000880880088000008808800880888088008800000880088088000000008808800880088088088800000000000000000
0000000000000d71000770000dd00000000888880088000008888800880888088008800000880088088000088008808800880088088088800000000000000000
000000000000057600d750001d500000008888888088000088888880880888088008800000880088088000088008808800880088088088800000000000000000
00000000000000d777760ddddd000000008800088088000088000880880088088888800000888888088888088888808800888888088008800000000000000000
000000000000000567d0055d50000000008800088088000088000880880088088888000000888880088888008888008800088880088008800000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000777007700700370777700006760767060060777007006700077700000000000000000000000000000000000000000
00000000000000000000000000000000006000070070770770700000070000070070070700707070070700000000000000000000000000000000000000000000
00000000000000000000000000000000007077077760707070777000007700070070070700707070070077000000000000000000000000000000000000000000
00000000000000000000000000000000007007070070700070700000000070070070070700707070070000700000000000000000000000000000000000000000
00000000000000000000000000000000000777070070700070777700067700070007700777007007700777000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000002222222222220002222222222000222222222222222220022222222222222222222222222222220000000000000000000000000
00000000000000000000000088888888888888288888888888802888888888888888888888888888888888888888888888888888200000000000000000000000
000000000000000000000002803333333330088200333333008882033333333320333088203303203333333333033333333333088000000000a0900000000000
00000000000000a090000002837777777776202027777777600880c777777776027773280c776002777777777327777777777732800000000009a90000000000
0000000000000009a90000028377777777777302777777777600027777777776027772002777603677777777732777777777773280000000009a779000000000
000000000000009a77900002837776ccc6777c0c7777777777200677777777760277720077773027777777777327777777777732800000000009a90000000000
0000000000000009a90000028377720003777c07777233c7776027777c32222302777306777c003777c22222203223c777232208800000000000900000000000
00000a0900000000900000028377733880677c0777c0000677c02777600233082377732777608237773000002820203777302288200000000000000a00000000
0000009a90000000000a00028377720200677c077730880677603777608888882377767777328237772003088888833777388282000000000000000000000000
000009a7790000000000000283777c333c7772077720880677603777608888882377777773088237777677208888803777382000000000000000000000000000
0000009a900000000000000283777777777770077720880677602777608888882377777760088237777777c0888880377738200000a090000000000000000000
000000090000000000000002837777777777c007772088067760377760888888237776777c0282377766672088888037773820000009a9000000000000000000
0000000000a000000000000283777c2222c30207772088067760377760888888237773c777c08237773000088888803777382000009a77900000000000000000
000000000000000000000002837772000000880777c00006776027776000000223777037776002377730000003888037773820000009a9000000000000000000
00000000000000a0900000028377732888888807777c226777603777762222c3027772027776003777c2ccc22028803777382000000090000000000000000000
0000000000000009a9000002837773288888880c77777777773006777777777602777200c77760277777777773288037773820000000000a0000000000000000
000000000000009a7790000283777208888888037777777776030277777777760277732207776037777777777328803777382000000000000000000000000000
0000000000000009a9000002836773088888888036766667630880276666667c037773280c77600c766666676328803776382000000000000000000000000000
00000000000000009000000280000088888888880000000000888800000000038000008820000220000000000088880000088288000000000000000a09000000
0000000000000000000a00008882288200088888888888888888888288888828888888888828888828888888888888888888888880000000000000009a900000
000000000000000000000028888000032230883002888888888800300288880000388888820000000038888820000288888800028800000000000009a7790000
0000000000000000000008882000ccc677c00002c028888888803c02c088802cc200888000cccccccc3028880c32208888800cc038800000000000009a900000
00000000000000000000882002677776220037327008888888803727608830c777c088036777777777760088066670088880677c028800000000000009000000
0000000000000000000882026777777777c337c3720888888880c627608806677773280c777777777777608806777608880c777720888000000000000000a000
0000000000000000002820c7777777777763076c760888888880776760802777777c000677776666777773000677773082067777608880000000000000000000
000000000000000000880c7777777777c2c337777608888888806777638067777777c00277773000c7777600c777776020c77777738880000000000000000000
0000000000000000008806777777c333000037777608888888037777600067777777c020677702820c777600c777777600677777708880000000000000000000
00000000000000000088067777630282888202777c088000880677773006777c27772080777702f802777600c777777703777777603880000000000000000000
00000000000000000088067777c008888888027776033363080c777730377773c7777300777702803677760367777777cc777777730882000000000000000000
00000000a090000000880677776220000888037777200677300c777600377770277772007777200267777c0277777777777767777c0882000a09000000000000
0000000009a900000088027777777c620008206777c02777c037776300c777c00c777200677776677777c0027777c677777702777c088200009a900000000000
000000009a7790000028802777777777772000c77720677760277760836777202c77760027777777776208237777c377777602777c08820009a7790000000000
0000000009a9000000088803677777777772006777237777722777600377776677777720277777777720282377773067777c02777c088200009a900000000000
00000000009000000000888003666777777720c77777777776c777600677777777777760277777777773082377760027777202777c0882000009000000000000
0000000000000a0000000888800002c777776007777776c7777777203777777776777772277763c777760823777600067760027776028800000000a000000000
0000000000000000000000888888200277776037777776067777773037777766202777723777600c7777c0037776082066323277773088000000000000000000
000000000000000000000000288882027777600c77777c027777773037777200220677720c777c037777720c7776088000082067772088000000000000000000
0000000000000000000288882882002777777002777770006777760067776028880677760c777c003777760677760888888880c7772388000000000000000000
00000000000000000028828200002c777777c00277772020c777720067776088880677760c7772080c77770c77730888888880c7772388000000000000000000
00000000000000000088033336667777777c0220677720820677720067776088880377770c777208206777c0c773288222388067772088000000000000000000
000000000000000000880cc77777777777c02880277c02880277730c7777208888007777cc777208802777720c7328800008806cc72088000000000000000000
0000000000000000008803c6777777777c02888006602888202760027776028828237c772c777c088206777200c3288000088066072088000000000000000000
00000000000a090000882376777776cc002888880000888882020220227c0888082372620663c30888007730820088800008806606338800000000a090000000
0000000000009a90000880c77623300008888028888888208820088200cc088808837300033000888880cc0888888880000880330308880000000009a9000000
000000000009a7790008800000020288888800028888880008888888820028820280003282088888838800888888880000028802828888000000009a77900000
0000000000009a9000008888888888888820000028222000008888228888888000888888888888880028888880288000000028888888800000000009a9000000
00000000000009000000088888888882000000000000000000022000088888200008888888888200000288880000000000000288888800000000000090000000
0000000000000000a0000088888820000000000000000000000000000028820000028882000000000000288000000000000000000000000000000000000a0000
__sfx__
4d0210201842418441184511844118431184311843118431184311843118431184311843118431184311843118421184211842118421184211842118421184211842118421184211842118421184211842118421
050110200025400251002510023100231002210022100221001210012100121001210012100121001110011100011000110001100011000110001100011000110001100011000110001100011000110001100011
000f18002485024850238502385021850218501f8501f8501c8501c8501a8501a8501885018850178501785015850158501385013850108501085015850158500140001400014000140001400014000140001400
000f1800219502195021950219501c9501c9501c9501c9501d9501d9501d9501d950189501895018950189501f9501f9501f9501f950219502195021950219500140001400014000140001400014000140001400
000f180018850188501c8501c8501f8501f850248502485021850218501f8501f8501c8501c8501a8501a8501c8501c8501f8501f8501d8501d85018850188500140001400014000140001400014000140001400
01020000303502c343243250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400001867014660106500c63508625000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010500002e7522a76326471224631e2631a25316650126430e6350a62500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
01080000181401c1512015124160281602c1550000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0104000024150281502b1603016030145000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010800002415024150281602b16030170301603014530125000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0106000022540205411d5501955116462124530f44500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400071204214052160521404212042140521605214042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0105000716430194401d4401944014430184401b44018440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
01070000185401f5501c4611745313445000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010500001c1402015023160281602c1702f1650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400071a7321e742227521e742187321c742207521c742000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010200002a76226762227621e7521a752167421273500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
000f1800189501895018950189501f9501f9501f9501f950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501f9501f95018950189500140001400014000140001400014000140001400
000f1800158501585018850188501c8501c8501885018850158501585018850188501a8501a850188501885017850178501585015850138501385015850158500140001400014000140001400014000140001400
000f180021950219502195021950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501c9501c9501c9501c9501c9501c95021950219500140001400014000140001400014000140001400
010400071204214052160521404212042140521605214042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0105000716430194401d4401944014430184401b44018440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
01070000185401f5501c4611745313445000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010500001c1402015023160281602c1702f1650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400071a7321e742227521e742187321c742207521c742000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010200002a76226762227621e7521a752167421273500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
__music__
04 04124040
04 13144040
04 02034040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040
00 40404040

