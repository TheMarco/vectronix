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
 grunt={spr={2,3},w=1,h=1,hp=1,score=50,dive_score=100,shot="aim",speed=1.0},
 attacker={spr={4,5},w=1,h=1,hp=1,score=80,dive_score=160,shot="aim",speed=1.15},
 commander={spr={6,7,8},w=1,h=1,hp=2,score=250,dive_score=600,shot="aim",speed=0.95},
 spinner={spr={9,10,11,12},w=1,h=1,hp=1,score=100,dive_score=200,shot="spread",speed=1.1},
 bomber={spr={13,14,15},w=1,h=1,hp=2,score=200,dive_score=500,shot="bomb",speed=0.9},
 guardian={spr={16,17,18,19},w=1,h=1,hp=3,score=400,dive_score=800,shot="spread",speed=0.8},
 phantom={spr={20,21,22,23},w=1,h=1,hp=1,score=160,dive_score=350,shot="aim",speed=1.05},
 swarm={spr={24,25},w=1,h=1,hp=1,score=30,dive_score=60,shot="none",speed=1.35},
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

power_order={"rapid","shield","slow","magnet","freeze"}
power_icons={
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
 local idx=((n-1)%#wave_defs)+1
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
 local cycle_off=((wave/5)-1)%#challenge_cycle
 -- 5 groups of 4, staggered entry
 local patterns={1,2,3,4,1}
 -- rotate patterns based on wave
 local rot=flr(wave/5)%4
 for grp=0,4 do
  local pat=1+((grp+rot)%4)
  local dir=(grp%2==0) and 1 or -1
  local grp_delay=grp*80
  for j=0,3 do
   challenge_total+=1
   local kind=challenge_cycle[((challenge_total+cycle_off-1)%#challenge_cycle)+1]
   add(enemies,{
    kind=kind,
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
  anim=0
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
  end
 end
end

function update_player()
 if player.alive then
  local spd=player.dual and 1.75 or 2.25
  if btn(0) then player.x-=spd end
  if btn(1) then player.x+=spd end
  player.x=clamp(player.x,field_l+4,field_r-4)
  local fire=rapid_t>0 and (btn(4) or btn(5)) or (btnp(4) or btnp(5))
  if fire and player.fire_t<=0 and wave_banner_t<=0 then
   if fire_player() then
    player.fire_t=(rapid_t>0) and 4 or 8
   end
  end
 else
  if player.respawn_t>0 then
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
  add(bullets,{x=player.x-3,y=player.y-4,vx=0,vy=-3.4,t=0})
  add(bullets,{x=player.x+3,y=player.y-4,vx=0,vy=-3.4,t=0})
 else
  add(bullets,{x=player.x,y=player.y-4,vx=0,vy=-3.4,t=0})
 end
 sfx(0)
 return true
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
  p.y+=0.5
  p.t+=1
  if p.y>136 or p.t>480 then
   del(powerups,p)
  end
 end
end

function update_rescue_ship()
 if not rescue_ship then return end
 rescue_ship.y+=rescue_ship.vy
 rescue_ship.vy=min(rescue_ship.vy+0.03,1.4)
 rescue_ship.t-=1
 if rescue_ship.y>136 or rescue_ship.t<=0 then
  rescue_ship=nil
 end
end

function update_capture_anim()
 if not capture_anim then return end
 capture_anim.t+=1
 -- move into the beam center then straight up
 capture_anim.x=lerp(capture_anim.x,capture_anim.boss.x,0.15)
 capture_anim.y-=0.7
 -- reached the boss
 if capture_anim.y<=capture_anim.boss.y+6 then
  ships-=1
  player.respawn_t=90
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

function update_enemies()
 local mult=(slow_t>0) and 0.6 or 1
 if not challenge then
  dive_t-=1
  if dive_t<=0 and wave_banner_t<=0 then
   trigger_dive()
   local cycle=flr((wave-1)/9)
   dive_t=max(20,80-wave*3-cycle*10)
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
    if player.alive and not player.dual and ships>1 and not captured_boss and abs(player.x-e.x)<8 then
     capture_player(e)
    end
   end
  elseif e.state=="returning" then
   local tx,ty=enemy_slot_xy(e.row,e.col)
   e.tx=tx
   e.ty=ty
   e.x=lerp(e.x,e.tx,0.08*mult)
   e.y=lerp(e.y,e.ty,0.08*mult)
   if abs(e.x-e.tx)<1 and abs(e.y-e.ty)<1 then
    e.state="holding"
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
 else
  local tx=player.x-e.sx
  dx=tx*min(t,0.65)/0.65+sin(t)*8*e.dir
  dy=t*110
 end
 e.x=e.sx+dx
 e.y=e.sy+dy

 e.shot_t-=1
 local cycle=flr((wave-1)/9)
 if e.shot_t<=0 and e.y>18 and e.y<104 then
  enemy_fire(e)
  e.shot_t=max(15,35-cycle*5)+flr(rnd(max(15,40-cycle*8)))
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
 else
  -- enter from top corners, cross in center, exit opposite bottom
  local sx=e.dir==1 and (20+e.row*8) or (108-e.row*8)
  local ex=e.dir==1 and (108-e.row*8) or (20+e.row*8)
  e.x=lerp(sx,ex,t)
  e.y=-10+t*140+sin(t*0.6+off)*15
 end
 if t>1.1 then
  del(enemies,e)
 end
end

function trigger_dive()
 local pick=nil
 local best=999
 for e in all(enemies) do
  if e.state=="holding" then
   local rank=abs(e.x-player.x)+rnd(20)
   if e.kind=="swarm" then rank-=8 end
   if e.kind=="boss" and not captured_boss and ships>1 and not player.dual then rank-=12 end
   if rank<best then
    best=rank
    pick=e
   end
  end
 end
 if not pick then return end
 pick.state="diving"
 pick.t=0
 pick.sx=pick.x
 pick.sy=pick.y
 pick.dive_kind=1+flr(rnd(4))
 if pick.kind=="boss" and not captured_boss and ships>1 and not player.dual and not tractor_active() and rnd(1)<0.6 then
  pick.dive_kind=5
  pick.beam_x=player.x
  sfx(6)
 end
end

function tractor_active()
 for e in all(enemies) do
  if e.kind=="boss" and (e.state=="beaming" or (e.state=="diving" and e.dive_kind==5)) then
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
 if shot=="aim" or shot=="boss" then
  local dx=player.x-e.x
  local dy=max(8,player.y-e.y)
  local mag=max(1,sqrt(dx*dx+dy*dy))
  add(ebullets,{x=e.x,y=e.y+4,vx=dx/mag*1.5*spd,vy=dy/mag*1.5*spd})
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
 e.captured=true
 player.alive=false
 player.captured=true
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
 if e.state=="beaming" then sfx(-1,3) end
 if e.kind=="boss" and e.captured then
  if diving_kill then
   rescue_ship={x=e.x,y=e.y,vy=0.25,t=240}
  else
   rescue_ship=nil
  end
  captured_boss=nil
 end
 del(enemies,e)
end

function spawn_powerup(x,y)
 local kind=power_order[power_cycle]
 power_cycle=power_cycle%#power_order+1
 add(powerups,{kind=kind,x=x,y=y,t=0})
end

function apply_powerup(kind)
 sfx(4)
 if kind=="rapid" then
  rapid_t=720
 elseif kind=="shield" then
  shield_t=1200
 elseif kind=="slow" then
  slow_t=900
 elseif kind=="magnet" then
  magnet_t=600
 elseif kind=="freeze" then
  freeze_t=210
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
    if e.kind=="phantom" and enemy_frame(e)>=3 then
    elseif abs(b.x-e.x)<6+enemy_defs[e.kind].w*2 and abs(b.y-e.y)<6+enemy_defs[e.kind].h*2 then
     if e.kind=="spinner" and enemy_frame(e)%2==0 then
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
  if not challenge and player.alive and abs(b.x-player.x)<5 and abs(b.y-player.y)<5 then
   del(ebullets,b)
   hit_player()
   break
  end
 end

 if not challenge then
  for e in all(enemies) do
   if (e.state=="diving" or e.state=="beaming" or e.state=="returning") and player.alive and abs(e.x-player.x)<8 and abs(e.y-player.y)<8 then
    hit_player()
    break
   end
  end
 end

 if rescue_ship and player.alive and abs(rescue_ship.x-player.x)<8 and abs(rescue_ship.y-player.y)<8 then
  player.dual=true
  rescue_ship=nil
 end

 for p in all(powerups) do
  if player.alive and abs(p.x-player.x)<8 and abs(p.y-player.y)<8 then
   apply_powerup(p.kind)
   del(powerups,p)
   break
  end
 end
end

function check_wave_state()
 if #enemies>0 then return end
 if challenge and result_t==0 then
  result_bonus=challenge_hits*100
  if challenge_hits==challenge_total then
   result_bonus+=1000
  end
  add_score(result_bonus)
  result_t=140
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
  print("wave "..wave,52,62,10)
 end
 if result_t>0 then
  rectfill(18,52,110,76,1)
  print("challenge",46,56,10)
  print("hits "..challenge_hits.."/"..challenge_total,34,64,7)
  print("bonus "..result_bonus,38,72,11)
 end
end

function draw_player()
 if not player.alive then return end
 local flash=player.inv>0 and flr(player.inv/4)%2==0
 if flash then return end
 local frame=player_frames[1+flr(player.anim/10)%2]
 if player.dual then
  spr(frame,player.x-7,player.y-4)
  spr(frame,player.x+1,player.y-4)
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
 if e.state=="beaming" then
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
 if captured_boss then
  print("captured ship in play",18,111,14)
 end
end
__gfx__
000770000007700000600600006006000d0000d000000000a000000a0a0000a00a0000a0000dd000d000000d00d00d000d0000d0009009000090090000999000
00088000000880000448844004488440d000000d0d0000d0d00dd00d0d0dd0d00d0dd0d0000dd0000d0000d00d0000d000d00d00009999000099990004444400
00077000000770004846648448466484d40dd04d0d4dd4d0d0dddd0d0dddddd00dddddd0000e0000000e0000000e0000000e0000099999900999999099999990
00c70c0000c70c00840cc048840cc048d44cc44d0d4cc4d00ddeedd000deed0000deed00dde7e0dd00e7e00000e7e00000e7e000440440444400004444400440
07c00c7007c00c700400004004000040d40dd04d0d4dd4d00dd88dd000d88d000dd88dd0dd0eeedd000eee00000eee00000eee00099999900999999009999900
077cc770077cc7700440044004000040dd0000dd0dd00dd0d0dddd0d0dddddd00dddddd00000e0000000e000d000e00d0000e000004444000044440000444000
77777777777777770040040000400400d000000d0d0000d0d00aa00d0d0aa0d00a0dd0a0000dd0000d0000d00d0000d0d000000d006666000090090008066000
700880077008800700400400000000000d0000d000d00d00a000000a0a0000a0000aa000000dd000d000000d000000000d0000d0009009000000000000090000
000cc000000cc000000cc000000880000006600000000000000dd0000000000000a00a0000bbbb00000dd000000dd00000077000000000000000000000000000
00acca0000acca00006cc600006886000006600060066006000dd000d00dd00d00bbbb000bbbbbb000dddd0000dddd00000cc00000000000000000000a090000
0606606006066060068668600686686060dddd0660dddd06d044440dd044440d0bbbbbb0bbbbbbbb0dddddd00dddddd0000cc00000088000000a0000009a9000
ca0cc0acca0cc0acc60cc06c8608806866d88d6666d88d66dd4ee4dddd4ee4dd0ebbbbe0ebbbbbbe6666666666666666000cc000008aa80000a7700009a77900
ca0cc0acca0cc0acc60cc06c8608806860dbbd0660dbbd06d04bb40dd04bb40d0bbbbbb0bbbbbbbb0a6666a00c6666c0000cc000008aa800000a0000009a9000
0606606006066060060660600606606060dddd0660dddd06d044440dd044440d00bbbb000bbbbbb0006666000066660000077000000880000000000000090000
00cccc0000cccc0000cccc00008888006060060600600600d0d00d0d00d00d000000000000bbbb00000dd000000dd000000000000000000000000000000000a0
000aa000000aa0000006600000066000006006000000000000d00d00000000000000000000a00a00000000000000000000000000000000000000000000000000
a009000a0008800000cccc0000dddd000cc00cc0000bb000008888000088880000eeee0000888800000000000000000000000000000000000000000000000000
009a9000008888000cccccc00dd77dd00cc00cc0070bb07008cccc8008cccc800ecccce008cccc80000000000000000000000000000000000000000000000000
09a7a9000aaaaaa00cc77cc00dd777d00880088000bbbb0088c77c8888c77c88eec77cee88c77c88000000000000000000000000000000000000000000000000
9a777a90000880000cccccc00dd07dd008800880bbbbbbbb8888888888888888eeeeeeee08888880000000000000000000000000000000000000000000000000
09a7a9000088880000cccc000dd00dd00cc00cc0bbbbbbbb080880800088880000e00e0000888800000000000000000000000000000000000000000000000000
009a90000aaaaaa000cccc000dddddd00cccccc000bbbb0080000008008008000e0000e000800800000000000000000000000000000000000000000000000000
0009000000088000000cc00000dddd0000cccc00070bb07080000008008008000e0000e000088000000000000000000000000000000000000000000000000000
9000000900000000000000000000000000000000000bb000080000800008800000e00e0000000000000000000000000000000000000000000000000000000000
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
00010000000100010001000100011101010001001010101001010110010101000010011101000110100000100100000010001000000000000001000000000000
0110000100101100001001100110101010001001000001001011010100101001011001001010100011101000010000100010001010501100000011d111515051
000101000101001001011101001010011111111000111010010110111110101110011001001101010001010100011001511d31151ddd1d1111111ddd5dd55d5d
000000000000010100101011010105011100011011011011501011011011011110110110111110110101001050100015056ccc66d15151d666d6d51051151511
1010010010001010000110000100511111115050001011010110101111111111111110111010010101001001110101501cd3ddddd1215111d3c1221115110201
01010011011101010110111110501011101101051001001011111110111511dd11111111111111131111011100005550dd0551001dd2220110001ddd22112152
101001001000100011010010050311010501251011010101000101511111ddd6d1c151c111010cd1d313d1110100550dd0150001100000011101011020010000
01010001011011111111110011dd30505020505515d1d5511dd1111d11dddcdcdd1c1c1111116551115131511001511150110111010101001101100110101011
101010001011011011015ddd3d66d11115151d31dd1dd55dd5ddd111cddddd66cdcd6d15115dd55d111d151d321d5d5d5ddd5020202001011210001001010100
010013d3ddd3dd1d1115666c66666d3ddd5d5ddd51d3b1515d6dd6cc666666677666c66dc631dd5155d111d15dddbd6d6dd6d5ddd6d651106dddddddd3d50100
01110dddd6d6ddb6301dd55d53d55ddddddd531dd115155d1553dddcd66cc66666666d666ddd11d15d15d55d5ddd55d51d5d5dd666ddd51d66ddd6d6c6d10001
010011ddc1d1110d61561111151151111111113111311111d11d111d131cdcb6dc3d1116ddd15d121112d500102565012012dd26ddd25dd62dd12111dc111110
1111111d5cd6d6d1dddd1666b1d66666d66660d6d6d66d661bc6666c66666dc6666666d1665d666d6675125666115d066652216e767d156d266e7d1dd1010111
0111111cd167cd71d6d1d616dd66dd1dd1d7566d55d1557ddddd166d1d576d633ddd1d7351d6d15ddd7750d616612156d66026767dd6612167e66d5dd1115211
111d1dcdd6d66d6616d17136d7dddd6db665b61dddd6d6dd76ddd61d6d6dd7d6d6dcd5d71d77ddddd66d62dd006611161dd166ded72d6d166d66dded21d111d1
1111d1ddd6666dd6c1ddc16d6d16bdddd35361d6dddddd1ddddd6d16ddd51dddddddd606d66d66ddd6616ddd050660562dddd16dd27dd6661676deeddddd1111
d1d66cdd667666166dd6cd6cc616dddddd13616d111101111110dddd101151113d11d61dddd061111560ddd51651661d2dd5e26d22d7dd76d66777e6dcdcddd1
67666667777767c67c66d66c66cddcd6761cd16615d1d11d135163d61d31d7666d666d16ddd562d12d65dddd1671167d1d6dd16dd6dd7dd77e6777767c667676
ddd11d667777666d6766666d663cc6d6d113616d153d1151dd11dd3613d1db11dd1111660661612d21716ddd16d711672ddddd6ddddd6dd6666777676666dddd
1c1dd1ddc676dd6cd761661cd636ddd3131d6066011111101d11655613d16d16d66117601dd16112dde2dddd261d711d1dd5d2ddd1d7d17d166677dddd1ddd11
11111c1cdd66dc6616dd7dddd616cd3d66d165566d66c6d65011611615d0dd16d1d61d6106616666e67d7ddd1610d7011dd560620d7126dedd76ddedd1d1d111
11011111cdddddd66d1661d1d6d6dddd5d6dd6513dd3d37731d5d51603d163161116d1d610666ddd66d761ed16210d700d4d41ed16116d0f6dd7dd6ddd1d1111
0111111c11dd6d1676d71d550167dd3dd3d7dd6dd3d5ddd11d116d661dd0d6d71d1166d761067ddd76661266d705104756d26d667657502066d7721612211111
110111111d1d16116d6511d331166d6b66ddd15d66d6dd1051d156dd03dd566dcdd156d6d1116d667761d2d66d05d015ad21ddd5dd6d01d51d6d6521d2020000
00101011111111c100111d113dd130101110101011000105151510101c3d111c1cdd111010150111dddd2d1102115d10010100000010551511dd1215c1501110
01010111111015d1115131111ddd1c351d1d111351155051515511dddd6c6c6c6d66ddcdddd1dd2ddddd21d2115511d515155552151d52122dcdd1ddd1501010
1010100010110111511511010150d13511d1551105d015151151ddcd6c6c667767c666dc6ddd2222d221d202dd0501115052251522221101d1cd1d1115150100
01010110011011010110101110111111111111d115d151511511511d1cdccc666d6dd1c115dd1512121dd121d251111555112252252520200112100020000001
00010001000110101101101001051016011111115155111531101115d11dddcccdc1cd111101d2d522d1dd550511501110551d12011005010510501000100101
01511051dd50011000111511001501dd1050111151d13511c11101d111111dd61d11111111111d11551511501011000010000001111050110112010101001010
d5ddddddd6d11115116dd6d015511cc0150111111101101111001101111111ddc111101111010110001011010000010100101100000105002010010101101012
55151115135dcc6ccc15515d66d66d115101011501111110111111111011111d1111111101101001011010101011001011010111110110110101100010101000
001105101111ddd3c111110d35ddd111011011101111110110101011110111111111110110110100100001001100010101111000001001000011011000010000
15501002111110010100111010101010101111111101010011011110101011131011101010101001000101010001010100000501001110111000100100010000
10010101010001101001001111010101011100111011101110000111010111110101110101110100011000000110001010111000110101000100010000100001
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
