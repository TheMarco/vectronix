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
