pico-8 cartridge // http://www.pico-8.com
version 41
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
 if score_hi>hi_hi or (score_hi==hi_hi and score_lo>hi_lo) then
  hi_hi=score_hi
  hi_lo=score_lo
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
  beam_x=0
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
  {1,2,3,4,5,2},
  {2,4,1,5,3,2},
  {5,3,4,1,2,5},
  {4,1,5,2,3,4},
  {3,5,2,4,1,3}
 }
 local layout=layouts[(stage%#layouts)+1]
 -- 6 groups of 4, staggered entry
 for grp=0,5 do
  local pat=layout[grp+1]
  local dir=(grp%2==0) and 1 or -1
  local grp_delay=grp*68
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
    t=-(grp_delay+j*8),
    anim=flr(rnd(60)),
    spawn_t=0,
    dive_kind=pat,
    shot_t=999,
    shots=0,
    target_x=64,
    dive_slot=j,
    dive_total=4,
    captured=false,
    beam_t=0
   })
  end
 end
end

-- 20_game.lua
function _init()
 make_stars()
 init_port()
end

function init_port()
 hi_hi=0
 hi_lo=0
 power_cycle=1
 title_t=0
 mode="title"
 reset_run()
end

function reset_run()
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
 wave_t=0
 wave_banner_t=0
 wave_clear_t=0
 result_t=0
 result_bonus=0
 notice_t=0
 notice_text=""
 challenge=false
 challenge_hits=0
 challenge_total=0
 form_t=0
 dive_t=90
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
 sfx(3)
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
  mode="play"
  reset_run()
 end
end

function update_gameover()
 if btnp(4) or btnp(5) then
  mode="title"
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
 if shield_t<=0 then shield_t=0 end

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
 if not extra_life_awarded and score_hi>=20 then
  extra_life_awarded=true
  if ships<3 then
   ships+=1
   sfx(5)
   show_notice("extra ship",90)
  end
 end
end

function update_player()
 if player.alive then
  local old_x=player.x
  local spd=player.dual and 1.75 or 2.25
  if btn(0) then player.x-=spd end
  if btn(1) then player.x+=spd end
  local margin=player.dual and 8 or 4
  player.x=clamp(player.x,field_l+margin,field_r-margin)
  player.vx=player.x-old_x
  local fire=rapid_t>0 and (btn(4) or btn(5)) or (btnp(4) or btnp(5))
  if fire and player.fire_t<=0 and wave_banner_t<=0 then
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
   mode="gameover"
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
  add(bullets,{x=player.x-4,y=player.y-4,vx=0,vy=-3.4,t=0})
  add(bullets,{x=player.x+4,y=player.y-4,vx=0,vy=-3.4,t=0})
 else
  add(bullets,{x=player.x,y=player.y-4,vx=0,vy=-3.4,t=0})
 end
 sfx(0)
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

function dive_shot_count(e)
 local wave_shots=min(3,1+flr((wave-1)/3))
 if e.kind=="guardian" then return 0 end
 if e.kind=="swarm" then return max(1,wave_shots-1) end
 if e.kind=="bomber" then return wave_shots+1 end
 return wave_shots
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
 e.shots=dive_shot_count(e)
 e.shot_t=12+flr(rnd(18))
 if dive_kind==5 or e.kind=="guardian" then
  e.shots=0
 end
end

function update_bullets()
 for b in all(bullets) do
  b.t+=1
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
    local dy=target.y-b.y
    local mag=max(0.1,sqrt(dx*dx+dy*dy))
    b.vx=clamp(b.vx+dx/mag*0.06,-2,2)
    b.vy=clamp(b.vy+dy/mag*0.04,-3.8,-1.2)
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
  capture_anim=nil
  return
 end
 capture_anim.t+=1
 capture_anim.x=lerp(capture_anim.x,capture_anim.boss.x,0.18)
 capture_anim.y-=0.7
 if capture_anim.y<=capture_anim.boss.y+6 then
  capture_anim.boss.captured=true
  capture_anim.boss.state="returning"
  sfx(-1,3)
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
  end
  return
 end
 ufo.anim+=1
 if not frozen_only then
  ufo.x+=ufo.dir*1.1
 end
 if ufo.x<-24 or ufo.x>152 then
  ufo=nil
 end
end

function try_group_dive(pool)
 local best={}
 for row=0,4 do
  local row_pool={}
  for e in all(pool) do
   if e.row==row and e.kind~="boss" and e.kind~="commander" and e.kind~="guardian" then
    add(row_pool,e)
   end
  end
  if #row_pool>#best then
   best=row_pool
  end
 end
 if #best<3 then return false end
 local group_n=wave>=14 and 4 or 3
 group_n=min(group_n,#best)
 local start_idx=1
 if #best>group_n then
  start_idx=1+flr(rnd(#best-group_n+1))
 end
 local center_x=player.x
 for i=0,group_n-1 do
  local e=best[start_idx+i]
  del(pool,e)
  local offset=(i-(group_n-1)/2)*10
  start_enemy_dive(e,6,center_x+offset,-i*0.08,i,group_n)
 end
 return true
end

function launch_pool_dive(pool)
 local pick=nil
 if not player.dual and not captured_boss and ships>1 then
  for e in all(pool) do
   if e.kind=="boss" and rnd(1)<0.45 then
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

 if pick.kind=="boss" and not captured_boss and ships>1 and not player.dual and not tractor_active() and rnd(1)<0.55 then
  pick.state="diving"
  pick.t=0
  pick.sx=pick.x
  pick.sy=pick.y
  pick.dive_kind=5
  pick.beam_x=player.x
  pick.shots=0
  sfx(6)
  return
 end

 if pick.kind=="swarm" and #pool>0 then
  local buddy=pool[1+flr(rnd(#pool))]
  del(pool,buddy)
  if buddy then
   start_enemy_dive(buddy,2,player.x+6,-0.06,1,2)
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
   start_enemy_dive(escort,4,player.x+8,-0.05,1,2)
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
  if rnd(1)<0.5 then
   dive_kind=1
  else
   dive_kind=4
  end
 end
 start_enemy_dive(pick,dive_kind,player.x)
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
    sfx(-1,3)
   else
    if player.alive and ships>1 and not captured_boss and abs(player.x-e.x)<10 then
     if player.dual then
      player.dual=false
      player.inv=70
      explode_at(player.x+5,player.y)
      e.state="returning"
      sfx(-1,3)
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
 e.t+=0.012*enemy_defs[e.kind].speed*mult*(1+wave*0.03+cycle*0.15)
 if e.kind=="boss" and e.dive_kind==5 then
  e.x=lerp(e.sx,e.beam_x,e.t)
  e.y=e.sy+e.t*70
  if e.t>=0.85 then
   e.state="beaming"
   e.beam_t=80
   sfx(7,3)
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
 else
  local tx=e.target_x-e.sx
  dx=tx*min(t,0.92)+sin(t*0.35)*4*e.dir
  dy=t*118
 end
 e.x=e.sx+dx
 e.y=e.sy+dy

 if e.shots>0 then
  e.shot_t-=1
  if e.shot_t<=0 and e.y>18 and e.y<104 and t>0.18 then
   enemy_fire(e)
   e.shots-=1
   if e.shots>0 then
    e.shot_t=max(10,22-cycle*2)+flr(rnd(max(10,18-cycle)))
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
 local t=e.t/150
 local pat=e.dive_kind
 local off=e.row*0.06
 if pat==1 then
  -- swoop from left, arc down across screen, exit right
  local px=e.dir==1 and -10 or 138
  local ex=e.dir==1 and 138 or -10
  e.x=lerp(px,ex,t)
  e.y=20+sin(t*0.5+off)*45
 elseif pat==2 then
  -- dive from top center, fan out, loop back up and exit top
  local spread=(e.row-1.5)*14
  e.x=64+spread+sin(t*0.8)*12*e.dir
  e.y=-10+sin(min(t,0.5)*1.0)*130
 elseif pat==3 then
  -- enter from side, loop around center, exit same side
  local px=e.dir==1 and -10 or 138
  local ang=t*1.2+off
  e.x=px+e.dir*(t*40)+sin(ang)*25*e.dir
  e.y=55+cos(ang)*35
 elseif pat==4 then
  -- enter from top corners, cross in center, exit opposite bottom
  local sx=e.dir==1 and (20+e.row*8) or (108-e.row*8)
  local ex=e.dir==1 and (108-e.row*8) or (20+e.row*8)
  e.x=lerp(sx,ex,t)
  e.y=-10+t*140+sin(t*0.6+off)*15
 else
  -- spiral into the center, then dive out
  local ang=t*2.2+off*6
  local rad=max(6,34-t*22)
  e.x=64+cos(ang)*rad*e.dir
  e.y=16+t*108+sin(ang*0.7)*18
 end
 if t>1.1 then
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

 local group_chance=0
 if wave>=14 then
  group_chance=0.26
 elseif wave>=8 then
  group_chance=0.14
 end
 if not player.dual and group_chance>0 and rnd(1)<group_chance then
  if try_group_dive(holding) then
   return
  end
 end

 local dive_count=1
 if wave>=12 then
  dive_count=1+flr(rnd(3))
 elseif wave>=5 then
  dive_count=1+flr(rnd(2))
 end
 if wave>=16 and rnd(1)<0.35 then
  dive_count=min(3,max(2,dive_count))
 end

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

function enemy_fire(e)
 if challenge then return end
 local shot=enemy_defs[e.kind].shot
 if shot=="none" or shot=="boss" and e.dive_kind==5 then return end
 local spd=1+flr((wave-1)/9)*0.15
 if shot=="straight" then
  add(ebullets,{x=e.x,y=e.y+4,vx=0,vy=1.7*spd})
 elseif shot=="aim" then
  local dx=player.x-e.x
  local dy=max(8,player.y-e.y)
  local mag=max(1,sqrt(dx*dx+dy*dy))
  add(ebullets,{x=e.x,y=e.y+4,vx=dx/mag*1.5*spd,vy=dy/mag*1.5*spd})
 elseif shot=="boss" then
  local aim_x=player.x
  if e.hp<enemy_defs[e.kind].hp or wave>=8 then
   aim_x=clamp(player.x+player.vx*8,field_l+4,field_r-4)
  end
  local dx=aim_x-e.x
  local dy=max(8,player.y-e.y)
  local mag=max(1,sqrt(dx*dx+dy*dy))
  add(ebullets,{x=e.x,y=e.y+4,vx=dx/mag*1.55*spd,vy=dy/mag*1.55*spd})
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
 sfx(-1,3)
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
 sfx(1)
 if e.state=="beaming" or e.state=="capturing" then sfx(-1,3) end
 if capture_anim and capture_anim.boss==e then
  capture_anim=nil
  player.captured=false
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
 sfx(4)
 if kind=="extra" then
  if ships<3 then
   ships+=1
   sfx(5)
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
  return
 end
 player.alive=false
 player.respawn_t=90
 ships-=1
 explode_at(player.x,player.y)
 sfx(2)
 if ships<=0 then
  mode="gameover"
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
    elseif e.kind=="phantom" and enemy_frame(e)>=3 then
    elseif abs(b.x-e.x)<6+enemy_defs[e.kind].w*2 and abs(b.y-e.y)<6+enemy_defs[e.kind].h*2 then
     if e.kind=="spinner" and enemy_frame(e)==2 then
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
    del(bullets,b)
    ufo=nil
    break
   end
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
  rescue_ship=nil
 end

 for p in all(powerups) do
  if player_hit_test(p.x,p.y,8,8) then
   apply_powerup(p.kind)
   del(powerups,p)
   break
  end
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
    sfx(5)
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
  return (flr(e.anim/4)%4)+1
 elseif e.kind=="guardian" then
  if e.hp<=1 then return 4 end
  if e.hp==2 then return 3 end
  return (flr(e.anim/10)%2)+1
 elseif e.kind=="phantom" then
  if flr(e.anim/6)%4>=2 then return 3+flr(e.anim/12)%2 end
  return 1+flr(e.anim/10)%2
 elseif e.kind=="boss" then
  if e.state=="beaming" then return 4 end
  if e.hp<=1 then return 3 end
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
 -- game logo (128x48 from spritesheet y=80)
 sspr(0,80,128,48,0,2)
 -- instructions
 local blink=flr(title_t/20)%2==0
 if blink then
  print("\142/\151 to start",36,58,10)
 end
 print("\139\145 move  \142/\151 fire",16,70,6)
 -- studio logo (128x32 from spritesheet y=48)
 sspr(0,48,128,32,0,90)
end

function draw_playfield()
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
 local x=62
 if rapid_t>0 then spr(power_icons.rapid,x,120) x+=8 end
 if shield_t>0 then spr(power_icons.shield,x,120) x+=8 end
 if slow_t>0 then spr(power_icons.slow,x,120) x+=8 end
 if magnet_t>0 then spr(power_icons.magnet,x,120) x+=8 end
 if freeze_t>0 then spr(power_icons.freeze,x,120) end
 if notice_t>0 then
  print(notice_text,64-#notice_text*2,111,11)
 elseif player.captured then
  print("ship captured",34,111,8)
 elseif captured_boss and captured_boss.captured then
  print("captured ship in play",18,111,14)
 end
end
__gfx__
000070000000700000600600006006000d0000d000000000a000000a0a0000a00a0000a0000dd000d000000d00d00d000d0000d0009009000090090000999000
00007000000070000448844004488440d000000d0d0000d0d00dd00d0d0dd0d00d0dd0d0000dd0000d0000d00d0000d000d00d00009999000099990004444400
00088800000888004846648448466484d40dd04d0d4dd4d0d0dddd0d0dddddd00dddddd0000e0000000e0000000e0000000e0000099999900999999099999990
000c7c00000c7c00840cc048840cc048d44cc44d0d4cc4d00ddeedd000deed0000deed00dde7e0dd00e7e00000e7e00000e7e000440440444400004444400440
007c0c70007c0c700400004004000040d40dd04d0d4dd4d00dd88dd000d88d000dd88dd0dd0eeedd000eee00000eee00000eee00099999900999999009999900
0077c7700077c7700440044004000040dd0000dd0dd00dd0d0dddd0d0dddddd00dddddd00000e0000000e000d000e00d0000e000004444000044440000444000
07777777077777770040040000400400d000000d0d0000d0d00aa00d0d0aa0d00a0dd0a0000dd0000d0000d00d0000d0d000000d006666000090090008066000
070808070708080700400400000000000d0000d000d00d00a000000a0a0000a0000aa000000dd000d000000d000000000d0000d0009009000000000000090000
000cc000000cc000000cc000000880000006600000000000000dd0000000000000a00a0000bbbb00000dd000000dd00000007000000000000000000000000000
00acca0000acca00006cc600006886000006600060066006000dd000d00dd00d00bbbb000bbbbbb000dddd0000dddd000007a70000000000000000000a090000
0606606006066060068668600686686060dddd0660dddd06d044440dd044440d0bbbbbb0bbbbbbbb0dddddd00dddddd0000aaa0000088000000a0000009a9000
ca0cc0acca0cc0acc60cc06c8608806866d88d6666d88d66dd4ee4dddd4ee4dd0ebbbbe0ebbbbbbe666666666666666600099900008aa80000a7700009a77900
ca0cc0acca0cc0acc60cc06c8608806860dbbd0660dbbd06d04bb40dd04bb40d0bbbbbb0bbbbbbbb0a6666a00c6666c000009000008aa800000a0000009a9000
0606606006066060060660600606606060dddd0660dddd06d044440dd044440d00bbbb000bbbbbb0006666000066660000009000000880000000000000090000
00cccc0000cccc0000cccc00008888006060060600600600d0d00d0d00d00d000000000000bbbb00000dd000000dd000000000000000000000000000000000a0
000aa000000aa0000006600000066000006006000000000000d00d00000000000000000000a00a00000000000000000000009000000000000000000000000000
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
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000001003535310001ddddd00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
000000000000135c6c6bd001aaaaaadd100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000000dcddddd301aa99999aa000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000013ddc111d11aa99224999410000001ddd50001dd1000001d3dd31000005ddddd5001dddddd501dddd200dd5005dddd5002dd000dd100000000000
000000000001dcd100010da99100029aa100000016666000166100001b66666000000daaaaaa502aaaaaa219aaaaa50a7d05aaaaaa10daa200a7200000000000
000000000001cdd0000019aa2000019aa10000001bdb30101db1000036353d50000004a9449a905a9999902a9444aa19a409a9449a904aaa109a500000000000
000000000001ddc00000369a2000009aa10000001dbd31001bd100001cd1d210000004a4424a902a9444412a4224a909a404a4244a404aa9009a200000000000
000000000001cdd100013dd941000299910000001bdbd3001db1000056311151000004a4524a902aa222204a92129404a404a4554a404aa9209a500000000000
000000000001ddcd110bdbd4a4115a99410000001d1dbd001bd100001cd001dc100004a2002a905aa100002aa4014209a404a2002a404a99a14a200000000000
0000000000000cddd11dcddd4999999410000000db53d3001db100001dddcdc6d00004a2005a902aa2011059aa412509a404a20012504a29a14a500000000000
00000000000012d111dcddcddd499942000000056301bd001bd1000012cd6cdcc00004a2002a915a9aaa20244aa40019a404a20100004ad9a14a200000000000
000000000000001666ddcddcdd444210100000036301db101db1000001dc1dd6500004a2005a902aaaaa500124aa4009a404a202aa404a24aaaa500000000000
00000000000001dcdd1ddcddd4411121000000056d01bd001bd100001cd212cc200004a2002a905aa4441000144aa419a404a2029a404a11aaaa200000000000
0000000000001cdd11d1cddd4410124410000001b353d3501d3100005dd101dd1000049200594029942410100144940494049501494049119999500000000000
000000000001dd2211112dc44200144441000001d3d33d30135100001c5001dc0000049200294059411100242014941494049200294049102444200000000000
000000000001ddd1000111244000024941000013515253d013310000161001dd100004920059402990000049401194049404950059404910d499500000000000
000000000001dd2000001244100001444100001d521123301d5100001cd51dcd0000049444494059944441294444940494049444494049101499200000000000
0000000000011dd000001d42100000944100001b111113d0133100001ddcdcdd1000049999992029999992149999920494029999942049100299500000000000
0000000000012dd1000122d112000244d100001d10000551155100001ddd212dd0000244444420144444411244444d0242054444442024101244100000000000
000000000001112d111d1d20245244421000001d100001d111d1000011212111100001dddddd101dddddd111dddd210dd101dddddd101d1001dd100000000000
0000000000000212ddd21d0114444444000000010000011111100000011110111000011111110011111111011111100121001111110011100011100000000000
0000000000000112111110012d2ddd22100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000000001111100001d111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000077700770070017077770000676076706006077700700670007770000000000000000000000000000000000000
00000000000000000000000000000000000000600007007077077070000007000007007007070070707007070000000000000000000000000000000000000000
00000000000000000000000000000000000000707707776070707077700000770007007007070070707007007700000000000000000000000000000000000000
00000000000000000000000000000000000000700707007070007070000000007007007007070070707007000070000000000000000000000000000000000000
00000000000000000000000000000000000000077707007070007077770006770007000770077700700770077700000000000000000000000000000000000000
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
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000016dd50000000dddd00d6dddddddd6006dddddddd6106dddd6ddddd650ddddddd610000016ddddd610005ddd0000016dd0000556dd6000000ddddd000000
0000007556100000d656606600111115751750111111660d5011760111d70dd11111156500016501110675006d5660000dd56500d71661d60000d65d75000000
000000d505600000600d0dd055555556506505555555d076555dd05555606755555550165057d155555d5650d100d6000d50d50ddd106505700d600610000000
000000061061000dd05d1605655555550650d6dddddd01d5dddf016ddd00d5dd5dd5d605d06dd6ddddd60160d50006d005d0d1560d5006d056d6007500000000
0000000dd056000600605d0dd11111000d00d00000000000000d05500000000000000600d0d00d00000d10d0d105006d0d50d1550d5000650570075000000000
00000000610610dd05605d01d5d557d00d10d00000000000001605d00000dddddddddd0560d05d00000d50d0d507600655d0d15d0d500006505d650000000000
000000005605d06006105d000000dd000d10d00000000000001d05d0000165501155501710d01d00000d10d0d10dd600d750d15d0d50000d6007700000000000
000000000610d6d0d6005d056dd6d0000d10d00000000000001d05d00005d0055500056101d05d00000d10d0d50d0d6006d0d1550d5000560061560000000000
0000000005d0570060005d0dd00000000600610000000000000605d00001d0565d61066000601d00000d5060d10d00d60010d15d0d10057006710d6000000000
0000000000605d0dd00016056dddddd605605dd6dd6dd650005d05d00005d05d00570065006506dd6dd6d6d0d50d0006d000d15d0d5057006d06506d00000000
000000000056d0061000056d50000005d06d000000006600001d01d00001d05d0005600610066d000000d600600d00006d00d5550d116006d005610dd0000000
000000000006756500000057ddddddd5760665dddd56d0000006d6d000006d6d0000d656710066dd5ddd60006dd6000006dd6056d657656d000056d57d000000
00000000000055500000000055555555150055555555000000055500000055500000055550000555555500001551000000555005550155500000015515000000
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
__sfx__
01020000303502c343243250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400001867014660106500c63508625000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0106000024670206731c6631865314643106330c62508615000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
01080000181401c1512015124160281602c1550000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0104000024150281502b1603016030145000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010800002415024150281602b16030170301603014530125000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010800002424022243202431e2531c2531a2531825016240142401223500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
010400071204214052160521404212042140521605214042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
