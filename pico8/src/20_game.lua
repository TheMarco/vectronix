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
