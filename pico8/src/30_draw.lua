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
